# EffectCraft и редактируемый FilmCraft

Remotion остаётся сборщиком MP4. EffectCraft создаёт отдельные графические сцены,
FilmCraft получает монтажный проект `.fcproj` с медиа рядом. Проверено с
FilmCraft CLI **0.18.0**, EffectCraft CLI **0.22.0**.

## Установка

Нужны официальные CLI из релизов:
- https://github.com/storytold/filmcraft/releases/tag/v0.18.0
- https://github.com/storytold/effectcraft/releases/tag/v0.22.0

На macOS приложения `.app` не содержат CLI: скачайте отдельные
`filmcraft-cli-0.18.0-macos-universal.zip` и
`effectcraft-cli-0.22.0-macos-universal.zip`. Распакуйте релизы с лицензиями в
удобное место. Укажите абсолютные пути в `config/project.json`:

```json
{
  "effectcraft": { "cli": "/absolute/path/effectcraft-cli" },
  "filmcraft": { "cli": "/absolute/path/filmcraft-cli", "exportOnRender": true }
}
```

Также поддерживаются `EFFECTCRAFT_CLI`, `FILMCRAFT_CLI`, локальная папка
`tools/craft/bin/` и PATH (имя с `.exe` на Windows). Бинарники в git не входят.
На этой машине они подготовлены в `tools/craft/bin/` текущего worktree.

```sh
npm install
npm run doctor
npm test
npx tsc --noEmit
```

`npm test` требует обеих CLI и ffmpeg: интеграционные проверки используют настоящие
редакторы, не подмены. Для только быстрых проверок: `node --test tests/craft.test.mjs`.

## Основной процесс

План → утверждение → черновик → правки в открытом FilmCraft → экспорт по команде.
Инструкция: [`EDITING.md`](EDITING.md). Команды: `npm run edit -- plan|approve|prepare|open|inspect|command|update --project ID`.
Для проекта с edit-сессией `npm run render -- --project ID` экспортирует текущий
FilmCraft-монтаж. Просчёт сцен при prepare обязателен, финальный MP4 не создаётся.

## Старые проекты без edit-сессии

```sh
npm run render -- --project ID
```

При `filmcraft.exportOnRender: true` после MP4 создаётся новая папка
`ID-filmcraft-XXXXXX` рядом с готовым видео. Внутри:

- `ID.fcproj`: редактируемый проект;
- `media/`: отдельные клипы сцен, объектов и WAV-дорожки;
- `reference.mp4`: эталон Remotion только при явном флаге `--reference`;
- `objects.json`: соответствие имён объектов и ID FilmCraft;
- `manifest.json`, `inspection.json`: описание и фактический таймлайн;
- `README.md`: ограничения именно этого экспорта;
- `effectcraft-sources/`: исходники композиций, если они есть.

Экспорт самостоятельно, без основного MP4:

```sh
npm run filmcraft -- --project ID
npm run filmcraft -- --project ID --out projects/ID/out
npm run filmcraft -- --project ID --reference # дополнительно полный эталон
```

Папки не перезаписываются: ручные правки FilmCraft сохраняются при повторном
экспорте фабрики. Переносите **всю папку**, не один `.fcproj`: ссылки на медиа
относительные. Внешние исходники `.ecproj` могут ссылаться на дополнительные
медиа — их нужно переносить отдельно. Подключайте те же шрифты в ОС.

Только MP4: `npm run render -- --project ID --no-filmcraft` или настройка
`filmcraft.exportOnRender: false`. Если FilmCraft CLI не установлен, сборка MP4
проходит как обычно, экспорт пропускается с пометкой, а `doctor` только
предупреждает. Если экспорт оборвался, готовый MP4 остаётся, сборка не считается
упавшей, а неполная папка содержит `EXPORT-FAILED.txt`; повторите команду экспорта.

## Что можно редактировать

| Элемент | В FilmCraft |
|---|---|
| Блоки ролика | Отдельные клипы: обрезать, удалить, заменить |
| `layers` с `kind: 'text'` | Настоящий текст: исправить слова, цвет, размер, положение |
| `layers` с `kind: 'render'` | Отдельный прозрачный ProRes 4444: удалить, переместить, обрезать |
| Субтитры | Нативные текстовые страницы с таймкодами чистой речи |
| Голос, музыка, SFX | Отдельные WAV-дорожки; менять громкость или отключать |
| EffectCraft-сцена | Клип; внутренности правятся в `.ecproj` и рендерятся заново |
| Старый произвольный JSX внутри `scene` / `inset` | Цельное изображение: внутренний текст не редактируется |

Конвертера произвольных React/SVG/CSS-сцен в векторные объекты FilmCraft нет.
Нужный для правок текст следует вынести в `layers`, **удалив его из JSX сцены**.
Штатный scaffold уже создаёт подпись отдельно. Для старой сцены это явная миграция.
Все неподелённые сцены отмечаются в отчёте; пустая scene также консервативно
попадает в этот список.

## Как писать новые сцены

Общий контракт в `core/editable.tsx`. Координаты в пикселях полного кадра, время в
кадрах относительно начала блока. Палитра и типографика берутся из стиль-пака.
Порядок в `layers` — снизу вверх. Слои не оборачиваются в переход основной сцены;
это одинаково работает в Remotion и FilmCraft. Компонент render должен сам
возвращать прозрачный кадр без Stage/Backdrop и не содержать Audio.

```tsx
import { color, type, PAGE_PAD, VIDEO, safe } from '../../core';

// Внутри блока reel.tsx:
layers: [
  { id: 'packet', kind: 'render', component: AnimatedPacket },
  {
    id: 'title', kind: 'text', text: 'Защищённое соединение',
    x: PAGE_PAD, y: safe.top + 100, width: VIDEO.width - PAGE_PAD * 2,
    fontFamily: type.title.family, fontSize: type.title.size,
    fontWeight: type.title.weight, color: color.text,
    from: 0, frames: 60,
  },
],
```

`from` и `frames` необязательны, по умолчанию весь блок. `id` уникален внутри блока,
латинские буквы, цифры, дефис. `color` — `#RRGGBB`. Для текста есть `align` и
`background`. Анимация render-компонента начинается с нулевого локального кадра
его собственного интервала. Графические layers не разрешены на камерных блоках:
для существующего ограниченного дополнения к камере остаётся `inset`.

Нативный текст может немного отличаться от Chromium по метрикам и начертанию.
Субтитры сохраняют страницы, но не покадровую подсветку и pop-анимацию.
Переходы базовых сцен и движения render-объектов запечены в их клипах.
SFX сведены в отдельную дорожку. Финальная LUFS-нормализация MP4 не применяется
к отдельным дорожкам FilmCraft: после ручного монтажа проверьте итоговую громкость.

## EffectCraft

1. Выберите `visualizer: "effectcraft"` у графического блока в `work/blocks.json`.
2. `npm run scaffold -- --project ID` создаст `effectcraft/B01.json`.
3. Заполните `steps` командами EffectCraft, либо сохраните готовую композицию в
   `projects/ID/effectcraft/B01.ecproj`.
4. `npm run effectcraft -- --project ID --block B01` создаст прозрачный WebM.

Пример команд есть в `projects/craft-demo/effectcraft/B02.json`. Формат шага:
`{"command":"layer.newSolid","params":{...}}`. `$1.layer` ссылается на слой из
первого шага batch. Композицию создаёт обвязка, `comp.new` в steps не нужен.
Не добавляйте команды файлового экспорта в steps: очередью управляет фабрика.

Существующий `.ecproj` имеет приоритет над JSON-планом и не перезаписывается.
Редактируйте его в приложении и повторите рендер. Чтобы построить сцену заново
из JSON, сначала сохраните/переименуйте прежний `.ecproj`.
Размер, FPS и длительность задаются из проекта в рабочей копии композиции.
Проверяются число кадров, размер, FPS и наличие alpha; старый клип заменяется
только после успешной проверки. После изменения длительности блока повторите
EffectCraft-рендер; экспорт FilmCraft также проверяет соответствие клипа блоку.
При выборе другой сцены в многокомпозиционном `.ecproj` перед сохранением сделайте
её активной. Сохранённая очередь чужих рендеров отключается в рабочей копии.

Команды доступны через встроенные headless MCP-сессии; постоянно подключать MCP
в конфигурации агента не требуется. Официальные контракты:
- https://github.com/storytold/effectcraft/blob/main/docs/agents.md
- https://github.com/storytold/filmcraft/blob/main/docs/agents.md

## Проверяемый пример

```sh
npm run craft-demo
```

Создаёт короткий тестовый ролик со звуковым тоном: отдельный объект Remotion,
EffectCraft-сцена, редактируемые русские подписи и субтитры. Результат находится в
`projects/craft-demo/out/`. Это технический пример, не готовый сценарий рилса.
