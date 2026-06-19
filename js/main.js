// main.js - Incorporating Input Actions
import { initInputHandlers } from './engine/input.js';
import { renderCity } from './engine/core-render.js';

let worker;
let canvas, ctx;
let sharedGrids = {};
const mapWidth = 250;
const mapHeight = 250;

window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('city-canvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Bootstrap input modules with painting callback logic
    initInputHandlers(canvas, handleUserPaintAction);

    worker = new Worker('js/worker/sim-worker.js');
    worker.postMessage({ cmd: 'init', width: mapWidth, height: mapHeight });
    worker.onmessage = handleWorkerMessage;
});

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

// Fired instantly when user Shift-drags across the canvas viewport
function handleUserPaintAction(gridX, gridY) {
    if (gridX >= 0 && gridX < mapWidth && gridY >= 0 && gridY < mapHeight) {
        const idx = gridY * mapWidth + gridX;
        
        // Directly overwrite memory array pointer. 
        // 17 = ZONES.ROAD. Main thread writes, background worker reads it next tick!
        sharedGrids.zones[idx] = 17; 
        sharedGrids.density[idx] = 1.0; // Max out vector brightness
    }
}

function handleWorkerMessage(e) {
    if (e.data.cmd === 'initialized') {
        sharedGrids.zones = new Uint8Array(e.data.zoneBuffer);
        sharedGrids.density = new Float32Array(e.data.densityBuffer);
        sharedGrids.wealth = new Float32Array(e.data.wealthBuffer);
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