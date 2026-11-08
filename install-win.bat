@echo off
chcp 65001 >nul
rem Установка на Windows. Запуск: двойной щелчок по файлу.
rem Скрипт ничего не ставит молча: он проверяет окружение и говорит, что сделать.

cd /d "%~dp0"

echo.
echo   Фабрика роликов — установка
echo   ---------------------------
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo   Не найден Node.js.
  echo   Скачайте его с nodejs.org ^(версия 20 или новее^), установите
  echo   и запустите этот файл снова.
  echo.
  pause
  exit /b 1
)

echo   Устанавливаю библиотеки. Первый раз это занимает несколько минут...
echo.
call npm install
if errorlevel 1 (
  echo.
  echo   Установка библиотек не удалась. Покажите этот текст поддержке.
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo.
  echo   Создан файл .env для ключей сервисов.
)

echo.
node scripts\install-deps.mjs

echo.
node scripts\doctor.mjs

echo.
echo   Готово. Осталось соединить эту папку с Клодом:
echo.
echo     1. запустите приложение Claude
echo     2. сверху по центру нажмите вкладку Code — не Chat
echo     3. окружение Local, кнопка Select folder, выберите папку reelfactory
echo        ^(именно её, а не папку уровнем выше^)
echo     4. напишите: проверь, всё ли на месте
echo.
echo   Подробнее — docs\GUIDE.md, раздел «Установка».
echo.
pause
