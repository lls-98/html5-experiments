// main.js - Synchronized Multi-Density UI Thread
import { initInputHandlers, setSystemBrush } from './engine/input.js';
import { renderCity } from './engine/core-render.js';
import { camera } from './engine/camera.js'; 

let worker;
let canvas, ctx;
let sharedGrids = { zones: null, density: null, wealth: null, power: null };
const mapWidth = 250;
const mapHeight = 250;

export let activeBrush = "ROAD";

window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('city-canvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    initInputHandlers(canvas, handleUserPaintAction);

    camera.x = (mapWidth * 20) / 2;
    camera.y = (mapHeight * 20) / 2;
    camera.zoom = 0.4; 

    worker = new Worker('js/worker/sim-worker.js');
    worker.postMessage({ cmd: 'init', width: mapWidth, height: mapHeight });
    worker.onmessage = handleWorkerMessage;
});

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

let resCycle = 0;
let comCycle = 0;
let indCycle = 0;

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    const statusEl = document.getElementById('stat-engine');
    
    if (key === 'r') { 
        activeBrush = "ROAD"; 
        setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = "BRUSH: ROAD"; statusEl.style.color = "#00ffff"; }
    }
    if (key === 'p') { 
        activeBrush = "POWER_PLANT"; 
        setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = "BRUSH: POWER"; statusEl.style.color = "#ffcc00"; }
    }
    
    if (key === 'q') {
        const types = [
            { id: 1, label: "LOW-DENSITY RESIDENTIAL", col: "#33ff33" },
            { id: 2, label: "MED-DENSITY RESIDENTIAL", col: "#33ff33" },
            { id: 3, label: "HIGH-DENSITY RESIDENTIAL", col: "#33ff33" },
            { id: 4, label: "LOW-DENSITY PUB HOUSING", col: "#11aa55" },
            { id: 6, label: "HIGH-DENSITY PUB HOUSING", col: "#11aa55" }
        ];
        resCycle = (resCycle + 1) % types.length;
        activeBrush = "ZONE_" + types[resCycle].id;
        setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = `BRUSH: ${types[resCycle].label}`; statusEl.style.color = types[resCycle].col; }
    }

    if (key === 'w') {
        const types = [
            { id: 10, label: "LOW-DENSITY COMMERCIAL", col: "#3366ff" },
            { id: 12, label: "HIGH-DENSITY COMMERCIAL", col: "#3366ff" },
            { id: 17, label: "HIGH-DENSITY OFFICES", col: "#00ffcc" },
            { id: 22, label: "HIGH-DENSITY MIXED-USE", col: "#cc33ff" }
        ];
        comCycle = (comCycle + 1) % types.length;
        activeBrush = "ZONE_" + types[comCycle].id;
        setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = `BRUSH: ${types[comCycle].label}`; statusEl.style.color = types[comCycle].col; }
    }

    if (key === 'e') {
        const types = [
            { id: 30, label: "LIGHT INDUSTRY", col: "#e6b800" },
            { id: 31, label: "HEAVY INDUSTRY", col: "#ff5500" },
            { id: 35, label: "AGRICULTURE FARMS", col: "#888833" }
        ];
        indCycle = (indCycle + 1) % types.length;
        activeBrush = "ZONE_" + types[indCycle].id;
        setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = `BRUSH: ${types[indCycle].label}`; statusEl.style.color = types[indCycle].col; }
    }
});

function handleUserPaintAction(gridX, gridY) {
    if (!sharedGrids.zones || !sharedGrids.density) return;

    if (gridX >= 0 && gridX < mapWidth && gridY >= 0 && gridY < mapHeight) {
        const idx = gridY * mapWidth + gridX;

        if (activeBrush === "ROAD") {
            sharedGrids.zones[idx] = 50; 
            sharedGrids.density[idx] = 1.0; 
        } 
        else if (activeBrush === "POWER_PLANT") {
            worker.postMessage({ cmd: 'addPowerPlant', index: idx });
        } 
        else if (activeBrush.startsWith("ZONE_")) {
            const targetCode = parseInt(activeBrush.split("_")[1]);
            sharedGrids.zones[idx] = targetCode;
            sharedGrids.density[idx] = 0.05; // Immediate blueprint layout seed!
        }
    }
}

function handleWorkerMessage(e) {
    if (e.data.cmd === 'initialized') {
        sharedGrids.zones = new Uint8Array(e.data.zoneBuffer);
        sharedGrids.density = new Float32Array(e.data.densityBuffer);
        sharedGrids.wealth = new Float32Array(e.data.wealthBuffer);
        sharedGrids.power = new Float32Array(e.data.powerGridBuffer); 

        console.log("Handshake verified! Power grid buffer size:", sharedGrids.power.length);

        document.getElementById('stat-engine').innerText = "ONLINE";
        document.getElementById('stat-engine').style.color = "#33ff33";

        requestAnimationFrame(renderLoop);
    }
    if (e.data.cmd === 'updateStats') {
        document.getElementById('gwi-value').innerText = e.data.gwi.toFixed(1) + '%';
        document.getElementById('stat-pop').innerText = e.data.population.toLocaleString();
    }
}

function renderLoop() {
    renderCity(ctx, canvas, sharedGrids, mapWidth, mapHeight);
    requestAnimationFrame(renderLoop);
}