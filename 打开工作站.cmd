@echo off
chcp 65001 >nul
title OC 工作站
rem 一键打开 OC 工作站：在本机开一个小服务器（端口 8796），然后用浏览器打开工作站。
rem 用法：双击。想打开别的 OC：在命令行里运行  打开工作站.cmd mimi
set "OC=%~1"
if "%OC%"=="" set "OC=guodong"
set "PORT=8796"
set "ROOT=%~dp0"
set "URL=http://127.0.0.1:%PORT%/%OC%/studio.html"

if not exist "%ROOT%%OC%\studio.html" (
  echo 找不到 %OC%\studio.html，检查一下 OC 文件夹的名字。
  pause & exit /b 1
)

rem 服务器已经开着：直接打开浏览器
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
  echo 工作站的服务器已经在运行了，直接打开：%URL%
  start "" "%URL%"
  "%SystemRoot%\System32\timeout.exe" /t 3 >nul
  exit /b 0
)

set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY where py >nul 2>nul && set "PY=py"
if not defined PY (
  echo 没找到 Python。请先安装 Python（https://www.python.org/downloads/ ，安装时勾选 Add to PATH）。
  pause & exit /b 1
)

echo.
echo   OC 工作站：%URL%
echo   游戏预览：http://127.0.0.1:%PORT%/%OC%/
echo   素材模板：http://127.0.0.1:%PORT%/%OC%/templates.html
echo.
echo   用完直接关掉这个窗口就行（草稿存在浏览器里，不会丢）。
echo.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process '%URL%'"
%PY% -m http.server %PORT% --bind 127.0.0.1 --directory "%ROOT:~0,-1%"
pause
