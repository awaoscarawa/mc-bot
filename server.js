console.log('=== MC BOT 3D 控制台启动 ===');

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const fs = require('fs');
const path = require('path');
const Vec3 = require('vec3');

// ---- 寻路模块 ----
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalNear } = require('mineflayer-pathfinder').goals;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname));

let bot = null;
let killAuraActive = false;
let crystalAuraActive = false;
let anchorAuraActive = false;
let auraInterval = null;
let radarInterval = null;
let logisticsActive = false;
let logisticsInterval = null;

// 白名单玩家（可以私信 bot 的玩家）
const whitelist = ['Player1', 'Player2', '你的游戏ID']; // 修改为实际玩家名

let moveState = {
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false
};

const blockColors = {
    grass_block: '#7c9c4a',
    dirt: '#9b6b3c',
    stone: '#888',
    cobblestone: '#666',
    water: '#3355ff',
    lava: '#ff5500',
    sand: '#e2d48b',
    gravel: '#8a8a8a',
    log: '#6d4c2e',
    leaves: '#3a7734',
    air: null,
};

function getBlockColor(blockName) {
    return blockColors[blockName] || '#777';
}

// ---- 物流系统核心函数 ----

/**
 * 扫描机器人周围告示牌
 * @returns {Array<{position, text, containerPos}>}
 */
function scanSigns() {
    if (!bot) return [];
    const signs = [];
    const signBlockNames = [
        'oak_sign', 'spruce_sign', 'birch_sign', 'jungle_sign',
        'acacia_sign', 'dark_oak_sign', 'mangrove_sign', 'cherry_sign',
        'bamboo_sign', 'crimson_sign', 'warped_sign',
        'oak_wall_sign', 'spruce_wall_sign', 'birch_wall_sign', 'jungle_wall_sign',
        'acacia_wall_sign', 'dark_oak_wall_sign', 'mangrove_wall_sign', 'cherry_wall_sign',
        'bamboo_wall_sign', 'crimson_wall_sign', 'warped_wall_sign'
    ];
    const radius = 8; // 扫描半径

    const pos = bot.entity.position;
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const block = bot.blockAt(new Vec3(pos.x + dx, pos.y + dy, pos.z + dz));
                if (!block) continue;
                if (signBlockNames.includes(block.name)) {
                    const signText = block.signText || '';
                    // 寻找相邻的容器（木桶或箱子）
                    const containerPos = findAdjacentContainer(block.position);
                    if (containerPos || signText) {
                        signs.push({
                            position: block.position,
                            text: signText,
                            containerPos: containerPos
                        });
                    }
                }
            }
        }
    }
    return signs;
}

/**
 * 查找告示牌相邻的容器（木桶或箱子）
 * @param {Vec3} signPos
 * @returns {Vec3|null}
 */
function findAdjacentContainer(signPos) {
    const containerNames = ['barrel', 'chest', 'trapped_chest'];
    const offsets = [
        [0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0],
        [0, 1, 0], [0, -1, 0]
    ];

    for (const [dx, dy, dz] of offsets) {
        const pos = new Vec3(signPos.x + dx, signPos.y + dy, signPos.z + dz);
        const block = bot.blockAt(pos);
        if (block && containerNames.includes(block.name)) {
            return pos;
        }
    }
    return null;
}

/**
 * 解析告示牌文本，识别指令
 * 支持格式：
 * - "取货:物品名" 或 "取货 物品名"
 * - "卸货:物品名" 或 "卸货 物品名"
 * - "存放:物品名" 或 "存放 物品名"
 * - "卸货" (表示通用卸货点)
 * - "取货" (表示通用取货点)
 */
function parseSignText(text) {
    if (!text) return null;
    // 清理文本（去掉换行和多余空格）
    const clean = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const lower = clean.toLowerCase();

    // 卸货指令
    if (lower.includes('卸货')) {
        const parts = clean.split(/[：: ]/);
        if (parts.length > 1 && parts[1] && !['卸货', '取货', '存放'].includes(parts[1])) {
            return { action: 'deposit', item: parts[1] };
        }
        return { action: 'deposit', item: null }; // 通用卸货
    }

    // 取货指令
    if (lower.includes('取货')) {
        const parts = clean.split(/[：: ]/);
        if (parts.length > 1 && parts[1] && !['卸货', '取货', '存放'].includes(parts[1])) {
            return { action: 'withdraw', item: parts[1] };
        }
        return { action: 'withdraw', item: null }; // 通用取货
    }

    // 存放指令（等同于卸货到该容器）
    if (lower.includes('存放')) {
        const parts = clean.split(/[：: ]/);
        if (parts.length > 1 && parts[1] && !['卸货', '取货', '存放'].includes(parts[1])) {
            return { action: 'deposit', item: parts[1] };
        }
        return { action: 'deposit', item: null };
    }

    return null;
}

/**
 * 从容器取出指定物品（优先从木桶取）
 * @param {Vec3} containerPos - 容器位置
 * @param {string} itemName - 物品名称（中文或英文ID）
 * @param {number} count - 取出数量
 */
async function withdrawFromContainer(containerPos, itemName, count = 64) {
    const block = bot.blockAt(containerPos);
    if (!block) return false;

    try {
        const container = await bot.openContainer(block);
        // 优先从木桶取（barrel）
        const isBarrel = block.name === 'barrel';

        // 查找匹配的物品
        const itemMap = {
            '橡木': 'oak_log', '橡木原木': 'oak_log',
            '石头': 'stone', '圆石': 'cobblestone',
            '泥土': 'dirt', '草方块': 'grass_block',
            '铁锭': 'iron_ingot', '金锭': 'gold_ingot',
            '钻石': 'diamond', '绿宝石': 'emerald',
            '红石': 'redstone', '红石粉': 'redstone',
            '面包': 'bread', '牛排': 'cooked_beef',
            '苹果': 'apple', '金苹果': 'golden_apple',
            '弓箭': 'bow', '箭': 'arrow',
            '剑': 'iron_sword', '铁剑': 'iron_sword',
            // 可以继续扩展...
        };

        const targetName = itemMap[itemName] || itemName.toLowerCase().replace(/ /g, '_');
        const items = container.containerItems().filter(i =>
            i.name.includes(targetName) || i.displayName.includes(itemName)
        );

        if (items.length > 0) {
            const toWithdraw = Math.min(count, items[0].count);
            await container.withdraw(items[0].type, null, toWithdraw);
            container.close();
            return true;
        }
        container.close();
        return false;
    } catch (err) {
        console.log('取货错误:', err.message);
        return false;
    }
}

/**
 * 将物品存入容器（优先存木桶）
 * @param {Vec3} containerPos
 * @param {string} itemName
 * @param {number} count
 */
async function depositToContainer(containerPos, itemName, count) {
    const block = bot.blockAt(containerPos);
    if (!block) return false;

    try {
        const container = await bot.openContainer(block);
        const itemMap = {
            '橡木': 'oak_log', '橡木原木': 'oak_log',
            '石头': 'stone', '圆石': 'cobblestone',
            '泥土': 'dirt', '草方块': 'grass_block',
            '铁锭': 'iron_ingot', '金锭': 'gold_ingot',
            // ...同上
        };
        const targetName = itemMap[itemName] || itemName.toLowerCase().replace(/ /g, '_');

        const botItems = bot.inventory.items().filter(i =>
            i.name.includes(targetName) || i.displayName.includes(itemName)
        );

        if (botItems.length > 0) {
            const toDeposit = Math.min(count, botItems[0].count);
            await container.deposit(botItems[0].type, null, toDeposit);
            container.close();
            return true;
        }
        container.close();
        return false;
    } catch (err) {
        console.log('卸货错误:', err.message);
        return false;
    }
}

/**
 * 处理玩家私信（物流请求）
 */
function handleWhisper(username, message) {
    if (!whitelist.includes(username)) return;

    const lower = message.toLowerCase();

    // 取货请求：玩家说 "我要取货 橡木" 或 "取货 橡木" 或 "需要 橡木"
    if (lower.includes('取货') || lower.includes('需要') || lower.includes('要')) {
        const item = message.replace(/.*?(?:取货|需要|要)[：: ]*/, '').trim();
        if (item) {
            processLogisticsRequest(username, 'withdraw', item);
        }
    }

    // 卸货请求：玩家说 "卸货 石头" 或 "存放 石头"
    if (lower.includes('卸货') || lower.includes('存放')) {
        const item = message.replace(/.*?(?:卸货|存放)[：: ]*/, '').trim();
        if (item) {
            processLogisticsRequest(username, 'deposit', item || null);
        }
    }
}

/**
 * 处理物流请求：扫描告示牌，找到对应容器，执行操作
 */
async function processLogisticsRequest(username, action, item) {
    if (!logisticsActive) {
        bot.chat(`/msg ${username} 物流系统未开启`);
        return;
    }

    // 1. 扫描告示牌
    const signs = scanSigns();
    let targetSign = null;

    for (const sign of signs) {
        const parsed = parseSignText(sign.text);
        if (!parsed) continue;
        if (parsed.action === action) {
            // 如果指定了物品，必须匹配
            if (item && parsed.item && parsed.item !== item) continue;
            // 如果没指定物品，优先匹配没有指定物品的告示牌
            if (!item && parsed.item) continue;
            targetSign = sign;
            break;
        }
    }

    if (!targetSign) {
        bot.chat(`/msg ${username} 未找到对应${action === 'withdraw' ? '取货' : '卸货'}容器`);
        return;
    }

    // 2. 走到容器位置
    const goal = new GoalNear(targetSign.containerPos.x, targetSign.containerPos.y, targetSign.containerPos.z, 2);
    bot.pathfinder.setGoal(goal);

    // 等待到达
    await new Promise(resolve => {
        const checkInterval = setInterval(() => {
            const dist = bot.entity.position.distanceTo(targetSign.containerPos);
            if (dist < 2.5) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 500);
    });

    bot.pathfinder.setGoal(null);

    // 3. 执行操作
    if (action === 'withdraw') {
        const success = await withdrawFromContainer(targetSign.containerPos, item, 64);
        if (success) {
            // 把物品扔给玩家或放入玩家附近的容器
            const player = bot.players[username];
            if (player && player.entity) {
                bot.tossStack(player.entity);
                bot.chat(`/msg ${username} 已取出${item}，请查看`);
            }
        } else {
            bot.chat(`/msg ${username} 容器中无${item}`);
        }
    } else if (action === 'deposit') {
        const success = await depositToContainer(targetSign.containerPos, item, 64);
        if (success) {
            bot.chat(`/msg ${username} 已存入${item || '物品'}`);
        } else {
            bot.chat(`/msg ${username} 背包中无${item || '物品'}`);
        }
    }
}

function createBot(config, socket) {
    if (bot) {
        socket.emit('bot-log', '❌ 机器人已在线，请先断开');
        return;
    }

    bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        auth: config.auth || 'offline',
        version: config.version || false
    });

    // viewer（可能会因端口占用报错，但我们有自研 3D 地图，可忽略）
    try {
        mineflayerViewer(bot, { port: 3002, firstPerson: true });
    } catch (e) {
        console.log('⚠️ Viewer 启动失败，3D 地图将使用自研方案');
    }

    bot.on('spawn', () => {
        // 忽略 viewer 报错
        if (bot.viewer) {
            const origEmit = bot.viewer.emit;
            bot.viewer.emit = (event, ...args) => {
                if (event === 'error' && args[0]?.message?.includes('Unknown entity'))
                    return false;
                return origEmit.apply(bot.viewer, arguments);
            };
        }

        // 寻路插件
        bot.loadPlugin(pathfinder);
        const defaultMove = new Movements(bot);
        defaultMove.canDig = true;
        defaultMove.allowParkour = true;
        bot.pathfinder.setMovements(defaultMove);

        // 私信监听
        bot.on('whisper', (username, message) => {
            handleWhisper(username, message);
            // 同时推送到前端
            socket.emit('bot-chat', { username: `[私信] ${username}`, message });
        });

        socket.emit('bot-log', `✅ 机器人 ${bot.username} 已进入世界`);
        socket.emit('bot-log', `📦 物流系统：${logisticsActive ? '已开启' : '未开启'}（命令: logistics on/off）`);
        socket.emit('bot-log', `👥 白名单：${whitelist.join(', ')}`);
        socket.emit('bot-status', true);

        // 雷达数据流
        if (radarInterval) clearInterval(radarInterval);
        radarInterval = setInterval(() => {
            if (!bot) return;
            const pos = bot.entity.position;
            const data = {
                botPos: { x: pos.x, y: pos.y, z: pos.z },
                entities: [],
                blocks: [],
                inventory: []
            };

            for (const entity of Object.values(bot.entities)) {
                if (!entity.position || entity === bot.entity) continue;
                const dist = entity.position.distanceTo(pos);
                if (dist > 30) continue;
                data.entities.push({
                    type: entity.type,
                    name: entity.username || entity.displayName || '生物',
                    x: entity.position.x,
                    y: entity.position.y,
                    z: entity.position.z,
                    id: entity.id
                });
            }

            const bx = Math.floor(pos.x);
            const by = Math.floor(pos.y) - 1;
            const bz = Math.floor(pos.z);
            const range = 6;
            for (let dx = -range; dx <= range; dx++) {
                for (let dz = -range; dz <= range; dz++) {
                    const block = bot.blockAt(new Vec3(bx + dx, by, bz + dz));
                    if (block && block.name !== 'air') {
                        data.blocks.push({
                            x: bx + dx,
                            y: by,
                            z: bz + dz,
                            name: block.name,
                            color: getBlockColor(block.name)
                        });
                    }
                }
            }

            if (bot.inventory) {
                data.inventory = bot.inventory.items().map(item => ({
                    name: item.name,
                    count: item.count,
                    slot: item.slot
                }));
            }

            socket.emit('radar-data', data);
        }, 200);
    });

    bot.on('chat', (username, message) => socket.emit('bot-chat', { username, message }));
    bot.on('kicked', (reason) => {
        socket.emit('bot-log', `❌ 被踢出: ${reason}`);
        socket.emit('bot-status', false);
        stopAllAuras();
        if (radarInterval) clearInterval(radarInterval);
        bot = null;
    });
    bot.on('error', err => socket.emit('bot-log', `⚠️ 错误: ${err.message}`));
    bot.on('end', () => {
        socket.emit('bot-log', '🔌 机器人已断开');
        socket.emit('bot-status', false);
        stopAllAuras();
        if (radarInterval) clearInterval(radarInterval);
        bot = null;
    });
}

function stopAllAuras() {
    killAuraActive = false;
    crystalAuraActive = false;
    anchorAuraActive = false;
    if (auraInterval) { clearInterval(auraInterval); auraInterval = null; }
}

function applyMovement() {
    if (!bot) return;
    bot.setControlState('forward', moveState.forward);
    bot.setControlState('back', moveState.back);
    bot.setControlState('left', moveState.left);
    bot.setControlState('right', moveState.right);
    bot.setControlState('jump', moveState.jump);
}

function startAuraLoop(socket) {
    if (auraInterval) clearInterval(auraInterval);
    auraInterval = setInterval(() => {
        if (!bot) return;
        if (killAuraActive) {
            const enemy = Object.values(bot.players).find(p => p.entity && p.username !== bot.username);
            if (enemy?.entity) {
                const dist = bot.entity.position.distanceTo(enemy.entity.position);
                if (dist > 2) {
                    bot.lookAt(enemy.entity.position.offset(0, 1.6, 0));
                    bot.setControlState('forward', true);
                } else {
                    bot.setControlState('forward', false);
                    bot.attack(enemy.entity).catch(() => {});
                }
            } else bot.setControlState('forward', false);
        }
        // 水晶、重生锚省略...
    }, 500);
}

io.on('connection', (socket) => {
    console.log('前端已连接');
    socket.on('connect-bot', config => createBot(config, socket));

    socket.on('bot-command', cmdLine => {
        if (!bot) return socket.emit('bot-log', '❌ 机器人未连接');
        const args = cmdLine.trim().split(/\s+/);
        const cmd = args[0].toLowerCase();
        try {
            switch (cmd) {
                case 'say':
                    const msg = args.slice(1).join(' ');
                    if (msg) { bot.chat(msg); socket.emit('bot-log', `💬 说: ${msg}`); }
                    else socket.emit('bot-log', '用法: say <消息>');
                    break;
                case 'pos':
                    const p = bot.entity.position;
                    socket.emit('bot-log', `📍 坐标: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`);
                    break;
                case 'health':
                    socket.emit('bot-log', `❤️ 生命: ${bot.health} / 🍗 饥饿: ${bot.food}`);
                    break;
                case 'list':
                    const players = Object.keys(bot.players).join(', ');
                    socket.emit('bot-log', `👥 玩家: ${players || '无'}`);
                    break;
                case 'disconnect':
                    bot.end();
                    socket.emit('bot-log', '🛑 主动断开');
                    break;
                case 'help':
                    socket.emit('bot-log', `📋 命令:\nsay <消息> | pos | health | list | disconnect\npm (截图) | help\n⚔️ 光环: killaura on/off | crystal on/off | anchor on/off | aura stop\n🎮 移动: WASD/方向键\n📍 寻路: goto x y z\n📦 物流: logistics on/off | signs`);
                    break;
                case 'pm':
                    (async () => {
                        if (!bot.viewer?.takeScreenshot) return socket.emit('bot-log', '❌ 截图未启用');
                        try {
                            const shotPath = path.join(__dirname, `screenshot_${Date.now()}.png`);
                            const img = await bot.viewer.takeScreenshot();
                            fs.writeFileSync(shotPath, img);
                            socket.emit('bot-log', `📸 截图已保存：${shotPath}`);
                        } catch (err) { socket.emit('bot-log', `❌ 截图失败: ${err.message}`); }
                    })();
                    break;
                case 'move':
                    const direction = args[1];
                    const action = args[2];
                    if (moveState.hasOwnProperty(direction)) {
                        moveState[direction] = action === 'start';
                        applyMovement();
                    }
                    break;
                case 'goto':
                    if (args.length < 4) { socket.emit('bot-log', '用法: goto x y z'); return; }
                    const x = parseFloat(args[1]), y = parseFloat(args[2]), z = parseFloat(args[3]);
                    if (isNaN(x)) { socket.emit('bot-log', '❌ 坐标无效'); return; }
                    bot.pathfinder.setGoal(new GoalNear(x, y, z, 1));
                    socket.emit('bot-log', `🚀 寻路至 (${x}, ${y}, ${z})`);
                    break;
                case 'stop':
                    bot.pathfinder.setGoal(null);
                    socket.emit('bot-log', '🛑 已停止');
                    break;
                // 物流命令
                case 'logistics':
                    if (args[1] === 'on') { logisticsActive = true; socket.emit('bot-log', '📦 物流系统已开启'); }
                    else if (args[1] === 'off') { logisticsActive = false; socket.emit('bot-log', '📦 物流系统已关闭'); }
                    else socket.emit('bot-log', '用法: logistics on/off');
                    break;
                case 'signs':
                    const signs = scanSigns();
                    if (signs.length === 0) socket.emit('bot-log', '未找到告示牌');
                    else signs.forEach(s => socket.emit('bot-log', `📝 告示: "${s.text}" → 容器: ${s.containerPos ? s.containerPos : '无'}`));
                    break;
                // 光环...
                case 'killaura':
                    if (args[1] === 'on') { killAuraActive = true; if (!auraInterval) startAuraLoop(socket); socket.emit('bot-log', '⚔️ 杀戮开启'); }
                    else if (args[1] === 'off') { killAuraActive = false; socket.emit('bot-log', '⚔️ 杀戮关闭'); }
                    else socket.emit('bot-log', '用法: killaura on/off');
                    break;
                case 'crystal':
                    socket.emit('bot-log', '水晶光环略（可自行补充）');
                    break;
                case 'anchor':
                    socket.emit('bot-log', '重生锚光环略（可自行补充）');
                    break;
                case 'aura':
                    if (args[1] === 'stop') { stopAllAuras(); socket.emit('bot-log', '🛑 所有光环已停止'); }
                    else socket.emit('bot-log', '用法: aura stop');
                    break;
                default:
                    socket.emit('bot-log', `未知命令: ${cmd}`);
            }
        } catch (e) { socket.emit('bot-log', `❌ 执行错误: ${e.message}`); }
    });

    socket.on('disconnect-bot', () => {
        if (bot) bot.end();
        bot = null;
    });
});

server.listen(3001, () => {
    console.log('✅ 控制台：http://localhost:3001');
    console.log('🗺️ 自研 3D 地图 + 寻路 + 移动 + 物流已就绪');
});