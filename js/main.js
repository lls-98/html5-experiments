// main.js - Application Lifecycle Orchestrator
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

    // Bootstrap input modules
    initInputHandlers(canvas);

    // Instantiate background worker
    worker = new Worker('js/worker/sim-worker.js');
    worker.postMessage({ cmd: 'init', width: mapWidth, height: mapHeight });
    worker.onmessage = handleWorkerMessage;
});

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
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