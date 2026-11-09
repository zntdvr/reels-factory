"""
РАСПОЗНАВАНИЕ РЕЧИ. Вызывается из scripts/transcribe.mjs, руками не запускается.

    python transcribe.py --wav source-16k.wav --out transcript.json --models models
    python transcribe.py --models models --download-only    только скачать модели
    python transcribe.py --models models --check            модели на месте?

Конвейер:
  1. Silero VAD находит участки речи — тишина в распознавание не попадает.
  2. Участки собираются в куски не длиннее 25 с: это предел, на котором
     GigaAM распознаёт без потери качества. Длинная речь без пауз режется
     окнами с перекрытием, чтобы слово на границе не разрубилось пополам.
  3. GigaAM v3 e2e RNN-T распознаёт куски пачкой — с пунктуацией и временем
     каждого токена.
  4. На перекрытиях соседних окон одно и то же слово распознано дважды —
     дубли снимаются по середине перекрытия.

Всё локально, на процессоре, через ONNX: видеокарта не нужна, сеть нужна
только для первой загрузки моделей.
"""

import argparse
import json
import sys
import wave
from pathlib import Path

import numpy as np
import onnx_asr

RATE = 16_000
ASR_MODEL = 'gigaam-v3-e2e-rnnt'
ASR_REPO = 'istupakov/gigaam-v3-onnx'
ASR_FILES = ['v3_e2e_rnnt_encoder', 'v3_e2e_rnnt_decoder', 'v3_e2e_rnnt_joint']
VAD_MODEL = 'silero'
VAD_REPO = 'istupakov/silero-vad-onnx'
# Шаг кадра GigaAM: 10 мс окно признаков × прореживание 4. Токен RNN-T
# испускается в начале своего кадра, поэтому конец слова — это последний
# токен плюс кадр.
FRAME = 0.04


def fetch(models, quantization):
    """
    Модели скачиваются в папку models один раз. Скачивание докачивает
    оборванное, поэтому повторный запуск после обрыва просто продолжает.
    onnx-asr сам качать не годится: увидев папку, он считает её полной, и
    оборванная загрузка ломала бы распознавание навсегда.
    """
    from huggingface_hub import snapshot_download

    suffix = f'.{quantization}' if quantization else ''
    snapshot_download(VAD_REPO, local_dir=models / 'silero-vad',
                      allow_patterns=['config.json', 'silero_vad.onnx'])
    snapshot_download(ASR_REPO, local_dir=models / ASR_MODEL,
                      allow_patterns=['config.json', 'v3_e2e_rnnt_vocab.txt',
                                      *(f'{name}{suffix}.onnx' for name in ASR_FILES)])


def has_models(models, quantization):
    suffix = f'.{quantization}' if quantization else ''
    need = [models / 'silero-vad' / 'silero_vad.onnx', models / ASR_MODEL / 'v3_e2e_rnnt_vocab.txt',
            *(models / ASR_MODEL / f'{name}{suffix}.onnx' for name in ASR_FILES)]
    return all(f.is_file() for f in need)


def read_wav(path):
    with wave.open(str(path), 'rb') as f:
        if f.getframerate() != RATE or f.getnchannels() != 1 or f.getsampwidth() != 2:
            sys.exit('Ожидается wav 16 кГц моно 16 бит — его готовит transcribe.mjs.')
        data = f.readframes(f.getnframes())
    return np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0


def speech_segments(vad, audio, opts):
    """Участки речи в секундах. Длинные не дробим здесь — это делает chunks()."""
    segments = next(iter(vad.segment_batch(
        audio[None, :],
        np.array([len(audio)], dtype=np.int64),
        RATE,
        threshold=opts.vad_threshold,
        min_speech_duration_ms=250,
        min_silence_duration_ms=opts.min_silence_ms,
        speech_pad_ms=opts.speech_pad_ms,
        max_speech_duration_s=10**9,
    )))
    return [(start / RATE, end / RATE) for start, end in segments]


def chunks(segments, limit, overlap):
    """
    Куски для распознавания: соседние участки речи склеиваются, пока кусок
    укладывается в предел; участок длиннее предела режется окнами внахлёст.
    Возвращает (начало, конец, граница_слева, граница_справа): слова кусков
    принимаются только между своими границами — так снимаются дубли перекрытия.
    """
    windows = []
    for start, end in segments:
        if end - start <= limit:
            if windows and windows[-1][2] == 'whole' and end - windows[-1][0] <= limit:
                windows[-1][1] = end
            else:
                windows.append([start, end, 'whole'])
            continue
        step = limit - overlap
        t = start
        while True:
            w_end = min(t + limit, end)
            windows.append([t, w_end, 'split'])
            if w_end >= end:
                break
            t += step

    result = []
    for i, (start, end, _) in enumerate(windows):
        left = -np.inf
        right = np.inf
        if i > 0 and windows[i - 1][1] > start:
            left = (windows[i - 1][1] + start) / 2
        if i + 1 < len(windows) and windows[i + 1][0] < end:
            right = (end + windows[i + 1][0]) / 2
        result.append((start, end, left, right))
    return result


def words_from(result, offset, chunk_end):
    """Токены SentencePiece → слова. «▁» в начале токена открывает новое слово."""
    words = []
    tokens = result.tokens or []
    stamps = result.timestamps or []
    for token, stamp in zip(tokens, stamps):
        t = offset + stamp
        piece = token.replace('▁', ' ')
        if not piece.strip():
            # отдельный токен-пробел: следующий токен начнёт новое слово
            if words:
                words[-1]['closed'] = True
            continue
        if piece.startswith(' ') or not words or words[-1].get('closed'):
            words.append({'text': piece.strip(), 'start': t, 'last': t})
        else:
            words[-1]['text'] += piece
            words[-1]['last'] = t
    out = []
    for i, w in enumerate(words):
        end = w['last'] + FRAME * 2
        if i + 1 < len(words):
            end = min(end, words[i + 1]['start'])
        end = min(end, chunk_end)
        out.append({'text': w['text'], 'start': w['start'], 'end': max(end, w['start'] + FRAME)})
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--wav')
    parser.add_argument('--out')
    parser.add_argument('--models', required=True, help='папка, куда кладутся и откуда берутся модели')
    parser.add_argument('--quantization', default='', help='пусто — полная модель, int8 — лёгкая')
    # Предел куска: дальше GigaAM теряет качество (см. описание конвейера).
    parser.add_argument('--chunk', type=float, default=25.0)
    parser.add_argument('--overlap', type=float, default=2.0)
    parser.add_argument('--batch', type=int, default=4)
    parser.add_argument('--vad-threshold', type=float, default=0.5)
    # Короткая пауза дробит речь мелко, и куски режутся по паузам, а не окнами.
    parser.add_argument('--min-silence-ms', type=float, default=100)
    parser.add_argument('--speech-pad-ms', type=float, default=200)
    parser.add_argument('--download-only', action='store_true', help='только скачать модели')
    parser.add_argument('--check', action='store_true', help='только проверить, что модели на месте')
    opts = parser.parse_args()

    models = Path(opts.models)
    quantization = opts.quantization or None
    if opts.check:
        sys.exit(0 if has_models(models, quantization) else 1)
    if opts.download_only or not has_models(models, quantization):
        fetch(models, quantization)
    if opts.download_only:
        print('модели на месте')
        return
    if not opts.wav or not opts.out:
        sys.exit('Нужны --wav и --out.')

    # Только процессор: CoreML на части маков падает при расчёте модели.
    cpu = ['CPUExecutionProvider']
    vad = onnx_asr.load_vad(VAD_MODEL, models / 'silero-vad', providers=cpu)
    asr = onnx_asr.load_model(ASR_MODEL, models / ASR_MODEL, quantization=quantization, providers=cpu).with_timestamps()

    audio = read_wav(opts.wav)
    segments = speech_segments(vad, audio, opts)
    pieces = chunks(segments, opts.chunk, opts.overlap)

    words = []
    for i in range(0, len(pieces), opts.batch):
        batch = pieces[i:i + opts.batch]
        waves = [audio[int(s * RATE):int(e * RATE)] for s, e, _, _ in batch]
        for (start, end, left, right), result in zip(batch, asr.recognize(waves, sample_rate=RATE)):
            for w in words_from(result, start, end):
                if left <= w['start'] < right:
                    words.append(w)

    words.sort(key=lambda w: w['start'])
    for w in words:
        w['start'] = round(w['start'], 3)
        w['end'] = round(w['end'], 3)

    Path(opts.out).write_text(json.dumps({
        'engine': ASR_MODEL,
        'speech': [{'start': round(s, 3), 'end': round(e, 3)} for s, e in segments],
        'words': words,
    }, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
