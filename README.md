<div align="center">

# 🤖 NodeMC-Bot · 智能 Minecraft 机器人

<div style="margin: 20px 0;">
  <a href="?plain=1#readme" style="background:#2c3e50; color:white; text-decoration:none; padding:8px 20px; margin:0 10px; border-radius:30px; display:inline-block;">🇨🇳 中文</a>
  <a href="README.en.md" style="background:#2c3e50; color:white; text-decoration:none; padding:8px 20px; margin:0 10px; border-radius:30px; display:inline-block;">🇬🇧 English</a>
</div>

</div>

> **注意**：点击 English 会跳转到英文版文档（需在仓库根目录创建 `README.en.md` 文件）。  
> 中文版内容如下：

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0-green.svg)](https://nodejs.org/)
[![mineflayer](https://img.shields.io/badge/mineflayer-4.15.0-blue)](https://github.com/PrismarineJS/mineflayer)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

**全功能 Web 控制台 + 3D 地图 + 机器人指令系统**  
通过浏览器实时控制机器人，支持寻路、移动、光环、物流管理等。

[✨ 特性](#-特性) • [📋 命令](#-命令大全) • [🚀 快速开始](#-快速部署) • [🌐 Web 控制台](#-web-控制台使用指南) • [⚠️ 物流状态](#-物流系统未完工)

---

## 📌 项目简介

**Node.js 后端 + Web 前端** 可视化控制 Minecraft 机器人（基于 Mineflayer）。无需游戏内输入，所有指令通过浏览器发送。

### 核心亮点

- 🖥️ **3D 地图**：实时显示地形、玩家、告示牌、容器
- ⚙️ **20+ 命令**：`say`, `pos`, `goto`, `killaura`, `logistics` 等
- 🛒 **物流系统** 🚧 *（开发中，见下方说明）*
- ⚔️ **多光环**：杀戮、水晶、重生锚光环
- 🎮 **键盘移动**：WASD 实时控制

---

## 📋 命令大全

| 类别     | 命令格式                           | 说明                                                         |
|----------|------------------------------------|--------------------------------------------------------------|
| **基础** | `say <消息>`                       | 发送聊天消息                                                 |
|          | `pos`                              | 显示坐标 (x, y, z)                                           |
|          | `health`                           | 显示生命值、饥饿度                                           |
|          | `list`                             | 列出在线玩家                                                 |
|          | `disconnect`                       | 断开机器人                                                   |
|          | `help`                             | 显示帮助                                                     |
| **移动** | `goto <x> <y> <z>`                 | 自动寻路至坐标                                               |
|          | `stop`                             | 停止所有动作                                                 |
|          | `move <方向> <start\|stop>`        | 手动移动（forward/back/left/right/jump/sprint）             |
| **光环** | `killaura on\|off`                 | 杀戮光环（自动攻击怪物）                                     |
|          | `crystal on\|off`                  | 水晶光环（末地水晶）                                         |
|          | `anchor on\|off`                   | 重生锚光环                                                   |
|          | `aura stop`                        | 停止所有光环                                                 |
| **物流** | `logistics on\|off`                | 🚧 **未完工** – 开启/关闭物流系统（自动存取）                |
|          | `signs`                            | 🚧 **未完工** – 扫描附近告示牌                               |
| **其他** | `pm`                               | 截图保存到服务器                                             |
|          | *WASD 键盘*                        | 前端实时移动                                                 |

> ⚠️ **物流系统 (logistics / signs) 当前为占位实现，尚未完成自动存取逻辑。欢迎贡献！**

---

## 🚀 快速部署

### 1. 环境要求
- Node.js **18+**
- Minecraft 服务器 (Java 1.8~1.20+)

### 2. 克隆与安装
```bash
git clone https://github.com/your-username/mc-bot-webconsole.git
cd mc-bot-webconsole
npm install
