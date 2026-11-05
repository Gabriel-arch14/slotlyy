@echo off
chcp 65001 >nul
title Slotlyy - онлайн
cd /d "%~dp0"
call npm run online
pause
