#!/bin/bash
# Установка на Mac. Запуск: правой кнопкой по файлу -> «Открыть».
# Скрипт ничего не ставит молча: он проверяет окружение и говорит, что сделать.

cd "$(dirname "$0")" || exit 1

echo ""
echo "  Фабрика роликов — установка"
echo "  ---------------------------"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "  Не найден Node.js."
  echo "  Скачайте его с nodejs.org (версия 20 или новее), установите"
  echo "  и запустите этот файл снова."
  echo ""
  read -r -p "  Нажмите Enter, чтобы закрыть."
  exit 1
fi

echo "  Устанавливаю библиотеки. Первый раз это занимает несколько минут..."
echo ""
npm install || {
  echo ""
  echo "  Установка библиотек не удалась. Покажите этот текст поддержке."
  read -r -p "  Нажмите Enter, чтобы закрыть."
  exit 1
}

if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "  Создан файл .env для ключей сервисов."
fi

echo ""
node scripts/install-deps.mjs

echo ""
node scripts/doctor.mjs

echo ""
echo "  Готово. Осталось соединить эту папку с Клодом:"
echo ""
echo "    1. запустите приложение Claude"
echo "    2. сверху по центру нажмите вкладку Code — не Chat"
echo "    3. окружение Local, кнопка Select folder, выберите папку reelfactory"
echo "       (именно её, а не папку уровнем выше)"
echo "    4. напишите: проверь, всё ли на месте"
echo ""
echo "  Подробнее — docs/GUIDE.md, раздел «Установка»."
echo ""
read -r -p "  Нажмите Enter, чтобы закрыть."
