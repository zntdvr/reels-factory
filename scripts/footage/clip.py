#!/usr/bin/env python3
"""
СРАВНЕНИЕ КАДРОВ С ОПИСАНИЕМ — CLIP через ONNX, локально, на процессоре.

Модель ставит каждому кадру оценку, насколько он похож на текст вроде
«aerial view of London skyline». Токены ИИ на это не тратятся: всё считается
здесь, а ИИ потом смотрит одну картинку-раскадровку с лучшими вариантами.

    python clip.py check  --models models/clip
    python clip.py embed  --models models/clip --frames DIR
    python clip.py score  --models models/clip --request request.json
    python clip.py sheet  --request sheet.json

Вызывается из scripts/footage.mjs, руками запускать не нужно.

КАДР СМОТРИТСЯ ТРЕМЯ КВАДРАТАМИ. Ролик вертикальный, а исходник обычно
горизонтальный, и в кадр попадёт только полоса шириной примерно в треть. Поэтому
каждый кадр оценивается по трём квадратам — слева, по центру, справа, — и лучший
квадрат заодно подсказывает, где резать вертикаль. Для вертикального исходника
квадрат один, по центру.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)
SIZE = 224
BATCH = 32
# Кроп по горизонтали: доли «насколько вправо» для трёх квадратов.
OFFSETS = (0.0, 0.5, 1.0)
# Отрицательные описания штрафуют, только если они ближе к кадру, чем запрос.
NEGATIVE_WEIGHT = 0.6


class Clip:
    def __init__(self, models: Path):
        import onnxruntime as ort
        from tokenizers import Tokenizer

        options = ort.SessionOptions()
        options.log_severity_level = 3
        providers = ['CPUExecutionProvider']
        self.vision = ort.InferenceSession(str(models / 'vision_model.onnx'), options, providers=providers)
        self.text = ort.InferenceSession(str(models / 'text_model.onnx'), options, providers=providers)
        self.tokenizer = Tokenizer.from_file(str(models / 'tokenizer.json'))
        self.tokenizer.enable_truncation(77)
        self.tokenizer.enable_padding(length=77, pad_id=self._pad_id())

    def _pad_id(self) -> int:
        for token in ('<|endoftext|>', '[PAD]', '<pad>'):
            found = self.tokenizer.token_to_id(token)
            if found is not None:
                return found
        return 0

    @staticmethod
    def _output(session, outputs, wanted: str) -> np.ndarray:
        names = [o.name for o in session.get_outputs()]
        index = names.index(wanted) if wanted in names else 0
        return outputs[index]

    def embed_text(self, texts: list[str]) -> np.ndarray:
        encoded = self.tokenizer.encode_batch(texts)
        feed = {}
        for spec in self.text.get_inputs():
            if spec.name == 'input_ids':
                feed[spec.name] = np.array([e.ids for e in encoded], dtype=np.int64)
            elif spec.name == 'attention_mask':
                feed[spec.name] = np.array([e.attention_mask for e in encoded], dtype=np.int64)
        out = self.text.run(None, feed)
        vectors = self._output(self.text, out, 'text_embeds').astype(np.float32)
        return normalize(vectors)

    def embed_images(self, images: list[Image.Image]) -> np.ndarray:
        result = []
        name = self.vision.get_inputs()[0].name
        for start in range(0, len(images), BATCH):
            batch = np.stack([pixels(img) for img in images[start:start + BATCH]])
            out = self.vision.run(None, {name: batch})
            result.append(self._output(self.vision, out, 'image_embeds').astype(np.float32))
        if not result:
            return np.zeros((0, 512), dtype=np.float32)
        return normalize(np.concatenate(result))


def normalize(vectors: np.ndarray) -> np.ndarray:
    return vectors / np.maximum(np.linalg.norm(vectors, axis=-1, keepdims=True), 1e-8)


def squares(image: Image.Image) -> list[Image.Image]:
    """Три квадрата по ширине для горизонтального кадра, один — для остальных."""
    w, h = image.size
    if w <= h * 1.15:
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        return [image.crop((left, top, left + side, top + side))] * len(OFFSETS)
    return [image.crop((int((w - h) * o), 0, int((w - h) * o) + h, h)) for o in OFFSETS]


def pixels(image: Image.Image) -> np.ndarray:
    image = image.convert('RGB').resize((SIZE, SIZE), Image.BICUBIC)
    array = (np.asarray(image, dtype=np.float32) / 255.0 - MEAN) / STD
    return array.transpose(2, 0, 1)


def frame_files(folder: Path) -> list[Path]:
    return sorted(folder.glob('f_*.jpg'))


def embed_folder(clip: Clip, folder: Path) -> np.ndarray:
    """Вектора кадров папки: [кадр, квадрат, 512]. Считаются один раз и лежат рядом."""
    files = frame_files(folder)
    cache = folder / 'emb.npy'
    if cache.exists():
        stored = np.load(cache)
        if stored.shape[0] == len(files):
            return stored
    crops = []
    for file in files:
        with Image.open(file) as image:
            crops.extend(squares(image.convert('RGB')))
    vectors = clip.embed_images(crops).reshape(len(files), len(OFFSETS), -1)
    np.save(cache, vectors)
    return vectors


def score(clip: Clip, request: dict) -> dict:
    queries = [q for q in request.get('query', []) if q.strip()]
    if not queries:
        raise SystemExit('Пустой запрос: опишите кадр словами по-английски.')
    negatives = [n for n in request.get('negative', []) if n.strip()]
    target = normalize(clip.embed_text(queries).mean(axis=0, keepdims=True))[0]
    negative = clip.embed_text(negatives) if negatives else None

    result = {}
    for item in request['items']:
        vectors = embed_folder(clip, Path(item['frames']))
        if not len(vectors):
            result[item['id']] = {'scores': [], 'crop': [], 'adjacent': []}
            continue
        positive = vectors @ target  # [кадр, квадрат]
        if negative is not None:
            worst = (vectors @ negative.T).max(axis=-1)
            positive = positive - NEGATIVE_WEIGHT * np.maximum(worst - positive, 0)
        best_crop = positive.argmax(axis=1)
        best = positive.max(axis=1)
        centre = vectors[:, 1, :]
        adjacent = (centre[1:] * centre[:-1]).sum(axis=-1) if len(centre) > 1 else np.zeros(0)
        result[item['id']] = {
            'scores': [round(float(x), 4) for x in best],
            'crop': [float(OFFSETS[i]) for i in best_crop],
            'adjacent': [round(float(x), 4) for x in adjacent],
        }
    return result


def sheet(request: dict) -> None:
    """Раскадровка для проверки глазами: варианты в ряд, у каждого номер и подпись."""
    tiles = request['tiles']
    width, height = 270, 480
    gap, label = 12, 70
    canvas = Image.new('RGB', (gap + len(tiles) * (width + gap), height + label + gap * 2), (24, 24, 28))
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype(request.get('font') or 'Arial.ttf', 22)
        small = ImageFont.truetype(request.get('font') or 'Arial.ttf', 16)
    except OSError:
        font = small = ImageFont.load_default()
    for index, tile in enumerate(tiles):
        x = gap + index * (width + gap)
        with Image.open(tile['image']) as image:
            image = image.convert('RGB')
            w, h = image.size
            crop_w = min(w, int(h * width / height))
            left = int((w - crop_w) * float(tile.get('crop', 0.5)))
            image = image.crop((left, 0, left + crop_w, h)).resize((width, height), Image.BICUBIC)
            canvas.paste(image, (x, gap))
        draw.text((x, height + gap + 6), f"{index + 1}. {tile.get('label', '')}"[:26], fill=(240, 240, 240), font=font)
        detail = str(tile.get('detail', ''))
        draw.text((x, height + gap + 36), detail[:30], fill=(170, 170, 180), font=small)
    canvas.save(request['out'], quality=88)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['check', 'embed', 'score', 'sheet'])
    parser.add_argument('--models', type=Path)
    parser.add_argument('--frames', type=Path)
    parser.add_argument('--request', type=Path)
    a = parser.parse_args()

    if a.command == 'sheet':
        sheet(json.loads(a.request.read_text('utf8')))
        return
    if not a.models or not (a.models / 'vision_model.onnx').exists():
        raise SystemExit('Нет модели CLIP. Поставьте её: npm run install-deps')
    clip = Clip(a.models)
    if a.command == 'check':
        clip.embed_text(['check'])
        print('ok')
    elif a.command == 'embed':
        vectors = embed_folder(clip, a.frames)
        print(json.dumps({'frames': int(vectors.shape[0])}))
    elif a.command == 'score':
        json.dump(score(clip, json.loads(a.request.read_text('utf8'))), sys.stdout)


if __name__ == '__main__':
    main()
