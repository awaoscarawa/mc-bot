@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ======================================
echo 正在生成所有必要文件...
echo ======================================

:: 生成 package.json
echo { > package.json
echo   "name": "mc-bot", >> package.json
echo   "version": "1.0.0", >> package.json
echo   "main": "server.js", >> package.json
echo   "scripts": { >> package.json
echo     "start": "node server.js" >> package.json
echo   }, >> package.json
echo   "dependencies": { >> package.json
echo     "express": "^4.18.2", >> package.json
echo     "socket.io": "^4.7.2", >> package.json
echo     "mineflayer": "^4.14.0", >> package.json
echo     "open": "^9.1.0" >> package.json
echo   } >> package.json
echo } >> package.json

:: 生成 server.js
(
echo console.log^('=== SERVER STARTING ==='^);
echo.
echo const express = require^('express'^);
echo const http = require^('http'^);
echo const socketIo = require^('socket.io'^);
echo const mineflayer = require^('mineflayer'^);
echo const open = require^('open'^);
echo.
echo const app = express^(^);
echo const server = http.createServer^(app^);
echo const io = socketIo^(server^);
echo.
echo app.use^(express.static^(__dirname^)^);
echo.
echo let bot = null;
echo.
echo function createBot^(config, socket^) {
echo     if ^(bot^) {
echo         socket.emit^('bot-log', '机器人已在线，请先断开'^);
echo         return;
echo     }
echo.
echo     bot = mineflayer.createBot^({
echo         host: config.host,
echo         port: config.port,
echo         username: config.username,
echo         auth: config.auth ^|^| 'offline',
echo         version: config.version ^|^| false
echo     }^);
echo.
echo     bot.on^('spawn', ^(^) =^> {
echo         socket.emit^('bot-log', `机器人 ${bot.username} 已进入世界`^);
echo         socket.emit^('bot-status', true^);
echo     }^);
echo.
echo     bot.on^('chat', ^(username, message^) =^> {
echo         socket.emit^('bot-chat', { username, message }^);
echo     }^);
echo.
echo     bot.on^('kicked', ^(reason^) =^> {
echo         socket.emit^('bot-log', `被踢出: ${reason}`^);
echo         socket.emit^('bot-status', false^);
echo         bot = null;
echo     }^);
echo.
echo     bot.on^('error', err =^> socket.emit^('bot-log', `错误: ${err.message}`^)^);
echo     bot.on^('end', ^(^) =^> {
echo         socket.emit^('bot-log', '机器人已断开'^);
echo         socket.emit^('bot-status', false^);
echo         bot = null;
echo     }^);
echo }
echo.
echo io.on^('connection', ^(socket^) =^> {
echo     console.log^('前端已连接'^);
echo.
echo     socket.on^('connect-bot', config =^> createBot^(config, socket^)^);
echo.
echo     socket.on^('bot-command', cmdLine =^> {
echo         if ^(!bot^) return socket.emit^('bot-log', '机器人未连接'^);
echo         const args = cmdLine.trim^(^).split^(/\s+/^);
echo         const cmd = args[0].toLowerCase^(^);
echo         try {
echo             switch ^(cmd^) {
echo                 case 'say':
echo                     const msg = args.slice^(1^).join^(' '^);
echo                     if ^(msg^) { bot.chat^(msg^); socket.emit^('bot-log', `说: ${msg}`^); }
echo                     else socket.emit^('bot-log', '用法: say ^<消息^>'^);
echo                     break;
echo                 case 'pos':
echo                     const p = bot.entity.position;
echo                     socket.emit^('bot-log', `坐标: ${p.x.toFixed^(1^)}, ${p.y.toFixed^(1^)}, ${p.z.toFixed^(1^)}`^);
echo                     break;
echo                 case 'health':
echo                     socket.emit^('bot-log', `生命: ${bot.health} / 饥饿: ${bot.food}`^);
echo                     break;
echo                 case 'list':
echo                     const players = Object.keys^(bot.players^).join^(', '^);
echo                     socket.emit^('bot-log', `玩家: ${players ^|^| '无'}`^);
echo                     break;
echo                 case 'disconnect':
echo                     bot.end^(^);
echo                     socket.emit^('bot-log', '主动断开'^);
echo                     break;
echo                 default:
echo                     socket.emit^('bot-log', `未知命令: ${cmd}`^);
echo             }
echo         } catch ^(e^) {
echo             socket.emit^('bot-log', `执行出错: ${e.message}`^);
echo         }
echo     }^);
echo.
echo     socket.on^('disconnect-bot', ^(^) =^> {
echo         if ^(bot^) bot.end^(^);
echo         bot = null;
echo     }^);
echo }^);
echo.
echo server.listen^(3000, ^(^) =^> {
echo     console.log^('服务已启动：http://localhost:3000'^);
echo     open^('http://localhost:3000'^);
echo }^);
) > server.js

:: 生成 index.html
(
echo ^<!DOCTYPE html^>
echo ^<html^>
echo ^<head^>
echo     ^<meta charset="UTF-8"^>
echo     ^<title^>MC Bot 控制台^</title^>
echo     ^<link rel="stylesheet" href="style.css"^>
echo ^</head^>
echo ^<body^>
echo     ^<div class="container"^>
echo         ^<h1^>🤖 Minecraft 机器人控制台^</h1^>
echo         ^<div class="card"^>
echo             ^<h2^>服务器连接配置^</h2^>
echo             ^<label^>地址: ^<input id="host" value="localhost"^>^</label^>
echo             ^<label^>端口: ^<input id="port" value="25565"^>^</label^>
echo             ^<label^>用户名: ^<input id="username" value="MyBot"^>^</label^>
echo             ^<label^>认证: ^<select id="auth"^>^<option value="offline"^>离线^</option^>^<option value="microsoft"^>微软^</option^>^</select^>^</label^>
echo             ^<label^>版本: ^<input id="version" placeholder="自动检测"^>^</label^>
echo             ^<button id="connectBtn"^>连接^</button^>
echo             ^<button id="disconnectBtn" disabled^>断开^</button^>
echo         ^</div^>
echo         ^<div class="card"^>
echo             ^<h2^>聊天消息^</h2^>
echo             ^<div id="chatBox" class="chat-box"^>^</div^>
echo         ^</div^>
echo         ^<div class="card"^>
echo             ^<h2^>命令终端^</h2^>
echo             ^<div id="terminalOutput" class="terminal-output"^>^</div^>
echo             ^<input id="terminalInput" placeholder="输入命令，例如 say Hello" disabled^>
echo         ^</div^>
echo     ^</div^>
echo     ^<script src="/socket.io/socket.io.js"^>^</script^>
echo     ^<script src="renderer.js"^>^</script^>
echo ^</body^>
echo ^</html^>
) > index.html

:: 生成 style.css
(
echo body { background: #1e1e2f; color: #eee; font-family: Consolas; padding: 20px; }
echo .container { max-width: 900px; margin: auto; }
echo .card { background: #2d2d44; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
echo input, select, button { padding: 8px; margin: 5px; background: #1e1e2f; color: white; border: 1px solid #555; border-radius: 6px; }
echo button { background: #0d6efd; cursor: pointer; }
echo button:disabled { opacity: 0.5; }
echo .chat-box, .terminal-output { height: 200px; overflow-y: auto; background: #0c0c1a; border: 1px solid #444; padding: 10px; margin: 10px 0; }
echo #terminalInput { width: 100%; }
) > style.css

:: 生成 renderer.js
(
echo const socket = io^(^);
echo const host = document.getElementById^('host'^);
echo const port = document.getElementById^('port'^);
echo const username = document.getElementById^('username'^);
echo const auth = document.getElementById^('auth'^);
echo const version = document.getElementById^('version'^);
echo const connectBtn = document.getElementById^('connectBtn'^);
echo const disconnectBtn = document.getElementById^('disconnectBtn'^);
echo const terminalInput = document.getElementById^('terminalInput'^);
echo const terminalOutput = document.getElementById^('terminalOutput'^);
echo const chatBox = document.getElementById^('chatBox'^);
echo.
echo function addTerminalLine^(text^) {
echo     const line = document.createElement^('div'^);
echo     line.textContent = text;
echo     terminalOutput.appendChild^(line^);
echo     terminalOutput.scrollTop = terminalOutput.scrollHeight;
echo }
echo.
echo function setUIState^(connected^) {
echo     connectBtn.disabled = connected;
echo     disconnectBtn.disabled = ^!connected;
echo     terminalInput.disabled = ^!connected;
echo     host.disabled = connected;
echo     port.disabled = connected;
echo     username.disabled = connected;
echo     auth.disabled = connected;
echo     version.disabled = connected;
echo     if ^(connected^) terminalInput.focus^(^);
echo }
echo.
echo connectBtn.addEventListener^('click', ^(^) =^> {
echo     const config = {
echo         host: host.value.trim^(^),
echo         port: parseInt^(port.value^),
echo         username: username.value.trim^(^) ^|^| 'MyBot',
echo         auth: auth.value,
echo         version: version.value.trim^(^) ^|^| false
echo     };
echo     socket.emit^('connect-bot', config^);
echo     addTerminalLine^(`正在连接 ${config.host}:${config.port}...`^);
echo }^);
echo.
echo disconnectBtn.addEventListener^('click', ^(^) =^> {
echo     socket.emit^('disconnect-bot'^);
echo     addTerminalLine^('正在断开...'^);
echo }^);
echo.
echo terminalInput.addEventListener^('keydown', e =^> {
echo     if ^(e.key === 'Enter'^) {
echo         const cmd = terminalInput.value.trim^(^);
echo         if ^(cmd^) {
echo             addTerminalLine^(`$ ${cmd}`^);
echo             socket.emit^('bot-command', cmd^);
echo             terminalInput.value = '';
echo         }
echo     }
echo }^);
echo.
echo socket.on^('bot-log', addTerminalLine^);
echo socket.on^('bot-chat', data =^> {
echo     const div = document.createElement^('div'^);
echo     div.innerHTML = `^<b^>${data.username}^</b^>: ${data.message}`;
echo     chatBox.appendChild^(div^);
echo     chatBox.scrollTop = chatBox.scrollHeight;
echo }^);
echo socket.on^('bot-status', setUIState^);
) > renderer.js

echo.
echo ======================================
echo 文件生成完毕，正在安装依赖...
echo ======================================
call npm install

echo.
echo ======================================
echo 启动服务器...
echo ======================================
node server.js

pause
