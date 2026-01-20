@echo off
setlocal
cd /d "%~dp0" || exit /b 1
title Bookstore Desk
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Ask your administrator to install a supported Node.js LTS version.
  pause
  exit /b 1
)
if not exist "node_modules\pg\package.json" (
  echo Ask your administrator to finish the one-time setup in UI-SETUP.md.
  pause
  exit /b 1
)
echo Keep this window open while using Bookstore Desk. You can minimize it.
node "web\server.mjs" --open
set "bookstoreExit=%errorlevel%"
if not "%bookstoreExit%"=="0" pause
exit /b %bookstoreExit%
