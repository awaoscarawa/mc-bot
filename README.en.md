<div align="center">

# 🤖 NodeMC-Bot · Smart Minecraft Bot with Web Console

<div style="margin: 20px 0;">
  <a href="README.md" style="background:#2c3e50; color:white; text-decoration:none; padding:8px 20px; margin:0 10px; border-radius:30px; display:inline-block;">🇨🇳 中文</a>
  <a href="README.en.md" style="background:#2c3e50; color:white; text-decoration:none; padding:8px 20px; margin:0 10px; border-radius:30px; display:inline-block;">🇬🇧 English</a>
</div>

</div>

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0-green.svg)](https://nodejs.org/)
[![mineflayer](https://img.shields.io/badge/mineflayer-4.15.0-blue)](https://github.com/PrismarineJS/mineflayer)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

**Full-featured Web Console + 3D Map + Bot Command System**  
Control your Minecraft bot via browser – pathfinding, movement, auras, logistics (WIP), and more.

[✨ Features](#-features) • [📋 Commands](#-command-list) • [🚀 Quick Start](#-quick-start) • [🌐 Web Console](#-web-console-usage) • [⚠️ Logistics Status](#-logistics-system-work-in-progress)

---

## 📌 Introduction

**Node.js backend + Web frontend** – visual control for your Minecraft bot (using Mineflayer). No in‑game typing, all commands via browser.

### Highlights

- 🖥️ **3D Map** – terrain, players, signs, containers in real time
- ⚙️ **20+ Commands** – `say`, `pos`, `goto`, `killaura`, `logistics`, etc.
- 🛒 **Logistics** 🚧 *Work in Progress (see below)*
- ⚔️ **Multiple Auras** – kill, crystal, respawn anchor
- 🎮 **Keyboard Movement** – WASD real‑time control

---

## 📋 Command List

| Category     | Command format                        | Description                                                       |
|--------------|---------------------------------------|-------------------------------------------------------------------|
| **Basic**    | `say <message>`                       | Send chat message                                                 |
|              | `pos`                                 | Show coordinates (x, y, z)                                        |
|              | `health`                              | Show health & hunger                                              |
|              | `list`                                | List online players                                               |
|              | `disconnect`                          | Disconnect bot                                                    |
|              | `help`                                | Show help                                                         |
| **Movement** | `goto <x> <y> <z>`                    | Auto pathfind to coordinates                                      |
|              | `stop`                                | Stop all actions                                                  |
|              | `move <direction> <start\|stop>`      | Manual movement (forward/back/left/right/jump/sprint)             |
| **Auras**    | `killaura on\|off`                    | Kill aura (auto‑attack monsters)                                  |
|              | `crystal on\|off`                     | Crystal aura (end crystals)                                       |
|              | `anchor on\|off`                      | Respawn anchor aura                                               |
|              | `aura stop`                           | Stop all auras                                                    |
| **Logistics**| `logistics on\|off`                   | 🚧 **WIP** – enable/disable logistics (auto deposit/withdraw)    |
|              | `signs`                               | 🚧 **WIP** – scan nearby signs                                    |
| **Other**    | `pm`                                  | Take screenshot (server side)                                     |
|              | *WASD keys*                           | Real‑time movement from frontend                                  |

> ⚠️ **Logistics (`logistics` / `signs`) is currently a stub – not yet functional. Contributions welcome!**

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js **18+**
- Minecraft server (Java 1.8~1.20+)

### 2. Clone & Install
```bash
git clone https://github.com/your-username/mc-bot-webconsole.git
cd mc-bot-webconsole
npm install
