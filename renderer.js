const socket = io();
// ---- DOM ----
const host = document.getElementById('host');
const port = document.getElementById('port');
const username = document.getElementById('username');
const auth = document.getElementById('auth');
const version = document.getElementById('version');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const terminalInput = document.getElementById('terminalInput');
const terminalOutput = document.getElementById('terminalOutput');
const chatBox = document.getElementById('chatBox');
const threeContainer = document.getElementById('threeContainer');
const inventoryBar = document.getElementById('inventoryBar');

// ---- Three.js 场景 ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
const camera = new THREE.PerspectiveCamera(50, threeContainer.clientWidth / threeContainer.clientHeight, 0.5, 200);
camera.position.set(0, 20, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
threeContainer.appendChild(renderer.domElement);

const gridHelper = new THREE.GridHelper(20, 20, 0x335555, 0x224444);
scene.add(gridHelper);
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 5);
scene.add(dirLight);

const blockMeshes = new Map();
const entityMeshes = new Map();
const selfMarker = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshBasicMaterial({ color: 0x3388ff }));
scene.add(selfMarker);

function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }
animate();

window.addEventListener('resize', () => {
    camera.aspect = threeContainer.clientWidth / threeContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
});

// ---- 雷达数据更新 3D ----
socket.on('radar-data', (data) => {
    update3DMap(data);
    updateInventory(data.inventory || []);
});

function update3DMap(data) {
    const { botPos, blocks, entities } = data;
    selfMarker.position.set(botPos.x, botPos.y + 1, botPos.z);
    camera.position.set(botPos.x, botPos.y + 20, botPos.z + 0.1);
    camera.lookAt(botPos.x, botPos.y, botPos.z);
    gridHelper.position.set(botPos.x, botPos.y - 2, botPos.z);

    const existBlockKeys = new Set(blockMeshes.keys());
    const newBlockKeys = new Set();
    for (const block of blocks) {
        const key = `${block.x},${block.y},${block.z}`;
        newBlockKeys.add(key);
        if (!blockMeshes.has(key)) {
            const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
            const mat = new THREE.MeshLambertMaterial({ color: block.color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
            scene.add(mesh);
            blockMeshes.set(key, mesh);
        }
    }
    for (const key of existBlockKeys) {
        if (!newBlockKeys.has(key)) {
            scene.remove(blockMeshes.get(key));
            blockMeshes.delete(key);
        }
    }

    const existEntityIds = new Set(entityMeshes.keys());
    const newEntityIds = new Set();
    for (const ent of entities) {
        newEntityIds.add(ent.id);
        if (!entityMeshes.has(ent.id)) {
            let mesh;
            if (ent.type === 'player') {
                const group = new THREE.Group();
                const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.8), new THREE.MeshBasicMaterial({ color: 0xff3333, wireframe: true }));
                box.position.y = 0.9;
                group.add(box);
                mesh = group;
            } else {
                mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
            }
            mesh.position.set(ent.x, ent.y, ent.z);
            scene.add(mesh);
            entityMeshes.set(ent.id, mesh);
        } else {
            entityMeshes.get(ent.id).position.set(ent.x, ent.y, ent.z);
        }
    }
    for (const id of existEntityIds) {
        if (!newEntityIds.has(id)) {
            scene.remove(entityMeshes.get(id));
            entityMeshes.delete(id);
        }
    }
}

// ---- 背包更新 ----
function updateInventory(items) {
    inventoryBar.innerHTML = '';
    if (!items.length) {
        inventoryBar.innerHTML = '<span style="color:#666;">背包为空</span>';
        return;
    }
    for (const item of items) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        const img = document.createElement('img');
        img.src = `https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/items/${item.name}.png`;
        img.onerror = () => { img.style.display = 'none'; };
        slot.appendChild(img);
        const count = document.createElement('span');
        count.className = 'inventory-count';
        count.textContent = item.count > 1 ? item.count : '';
        slot.appendChild(count);
        inventoryBar.appendChild(slot);
    }
}

// ---- 屏幕移动按钮事件 ----
const moveButtons = document.querySelectorAll('.move-btn');
moveButtons.forEach(btn => {
    const dir = btn.dataset.dir;
    const sendMove = (action) => {
        socket.emit('bot-command', `move ${dir} ${action}`);
    };
    btn.addEventListener('mousedown', () => sendMove('start'));
    btn.addEventListener('mouseup', () => sendMove('stop'));
    btn.addEventListener('mouseleave', () => sendMove('stop'));
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); sendMove('start'); });
    btn.addEventListener('touchend', () => sendMove('stop'));
});

// ---- 键盘操控（方向键） ----
const pressedKeys = new Set();
const keyMap = {
    'arrowup': 'forward',
    'arrowleft': 'left',
    'arrowdown': 'back',
    'arrowright': 'right',
    ' ': 'jump'
};

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const dir = keyMap[e.key.toLowerCase()];
    if (dir && !pressedKeys.has(dir)) {
        pressedKeys.add(dir);
        socket.emit('bot-command', `move ${dir} start`);
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    const dir = keyMap[e.key.toLowerCase()];
    if (dir && pressedKeys.has(dir)) {
        pressedKeys.delete(dir);
        socket.emit('bot-command', `move ${dir} stop`);
    }
});

window.addEventListener('blur', () => {
    pressedKeys.forEach(dir => {
        socket.emit('bot-command', `move ${dir} stop`);
    });
    pressedKeys.clear();
});

// ---- 原有控制功能 ----
function addTerminalLine(text) {
    const line = document.createElement('div');
    line.textContent = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function setUIState(connected) {
    connectBtn.disabled = connected;
    disconnectBtn.disabled = !connected;
    terminalInput.disabled = !connected;
    host.disabled = connected;
    port.disabled = connected;
    username.disabled = connected;
    auth.disabled = connected;
    version.disabled = connected;
    if (connected) terminalInput.focus();
}

connectBtn.addEventListener('click', () => {
    const config = {
        host: host.value.trim(),
        port: parseInt(port.value),
        username: username.value.trim() || 'MyBot',
        auth: auth.value,
        version: version.value.trim() || false
    };
    socket.emit('connect-bot', config);
    addTerminalLine(`🔌 正在连接 ${config.host}:${config.port} ...`);
});

disconnectBtn.addEventListener('click', () => {
    socket.emit('disconnect-bot');
    addTerminalLine('⏳ 正在断开...');
});

terminalInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const cmd = terminalInput.value.trim();
        if (cmd) {
            addTerminalLine(`$ ${cmd}`);
            socket.emit('bot-command', cmd);
            terminalInput.value = '';
        }
    }
});

socket.on('bot-log', addTerminalLine);
socket.on('bot-chat', data => {
    const div = document.createElement('div');
    div.innerHTML = `<b>${data.username}</b>: ${data.message}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
});
socket.on('bot-status', setUIState);

document.getElementById('viewerBtn').addEventListener('click', () => {
    window.open('http://localhost:3002', '_blank');
});

// 光环按钮
['killauraOnBtn','killauraOffBtn','crystalOnBtn','crystalOffBtn','anchorOnBtn','anchorOffBtn','auraStopBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
        let command = '';
        if (id.startsWith('killaura')) command = 'killaura ' + (id.includes('On') ? 'on' : 'off');
        else if (id.startsWith('crystal')) command = 'crystal ' + (id.includes('On') ? 'on' : 'off');
        else if (id.startsWith('anchor')) command = 'anchor ' + (id.includes('On') ? 'on' : 'off');
        else if (id === 'auraStopBtn') command = 'aura stop';
        socket.emit('bot-command', command);
    });
});