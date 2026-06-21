// main.js - Rasterizer and Geometric Area Calculator
import { initInputHandlers, setSystemBrush } from './engine/input.js';
import { renderCity } from './engine/core-render.js';
import { camera } from './engine/camera.js'; 

let worker;
let canvas, ctx;
let sharedGrids = { zones: null, density: null, wealth: null, power: null };
const mapWidth = 250;
const mapHeight = 250;

export let activeBrush = "ROAD";
export let cityPlots = []; // Public Vector Plot Registry for Renderer Loops

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

let resCycle = 0; let comCycle = 0; let indCycle = 0;

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    const statusEl = document.getElementById('stat-engine');
    
    if (key === 'r') { 
        activeBrush = "ROAD"; setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = "BRUSH: ROAD"; statusEl.style.color = "#00ffff"; }
    }
    if (key === 'p') { 
        activeBrush = "POWER_PLANT"; setSystemBrush(activeBrush);
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
        resCycle = (resCycle + 1) % types.length; activeBrush = "ZONE_" + types[resCycle].id; setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = `PLOT: ${types[resCycle].label}`; statusEl.style.color = types[resCycle].col; }
    }
    if (key === 'w') {
        const types = [
            { id: 10, label: "LOW-DENSITY COMMERCIAL", col: "#3366ff" },
            { id: 12, label: "HIGH-DENSITY COMMERCIAL", col: "#3366ff" },
            { id: 17, label: "HIGH-DENSITY OFFICES", col: "#00ffcc" },
            { id: 22, label: "HIGH-DENSITY MIXED-USE", col: "#cc33ff" }
        ];
        comCycle = (comCycle + 1) % types.length; activeBrush = "ZONE_" + types[comCycle].id; setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = `PLOT: ${types[comCycle].label}`; statusEl.style.color = types[comCycle].col; }
    }
    if (key === 'e') {
        const types = [
            { id: 30, label: "LIGHT INDUSTRY", col: "#e6b800" },
            { id: 31, label: "HEAVY INDUSTRY", col: "#ff5500" },
            { id: 35, label: "AGRICULTURE FARMS", col: "#888833" }
        ];
        indCycle = (indCycle + 1) % types.length; activeBrush = "ZONE_" + types[indCycle].id; setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = `PLOT: ${types[indCycle].label}`; statusEl.style.color = types[indCycle].col; }
    }
});

function handleUserPaintAction(gridX, gridY, polygonVertices = null) {
    if (!sharedGrids.zones || !sharedGrids.density) return;

    // A. Handle Legacy Single-Tile Infrastructure Items (Roads/Power Plants)
    if (polygonVertices === null) {
        if (gridX >= 0 && gridX < mapWidth && gridY >= 0 && gridY < mapHeight) {
            const idx = gridY * mapWidth + gridX;
            if (activeBrush === "ROAD") { sharedGrids.zones[idx] = 50; sharedGrids.density[idx] = 1.0; } 
            else if (activeBrush === "POWER_PLANT") { worker.postMessage({ cmd: 'addPowerPlant', index: idx }); }
        }
        return;
    }

    // B. Handle Vector Polygon Rasterization Pipeline
    if (polygonVertices.length < 3) return;

    const calculatedArea = calculatePolygonArea(polygonVertices);
    if (calculatedArea < 1.0) return; // Prevent parsing zero-width slivers

    const targetCode = parseInt(activeBrush.split("_")[1]);

    // Compute bounding constraints to run a tight, efficient sub-grid scan loop
    let minX = mapWidth, maxX = 0, minY = mapHeight, maxY = 0;
    for (const v of polygonVertices) {
        if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
    }
    minX = Math.max(0, minX); maxX = Math.min(mapWidth - 1, maxX);
    minY = Math.max(0, minY); maxY = Math.min(mapHeight - 1, maxY);

    let filledCellsCount = 0;

    // Scanline Point-In-Polygon (PIP) intersection traversal loop
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            // Check pixel center-point to avoid perimeter parsing float jitter
            if (isPointInPolygon({ x: x + 0.5, y: y + 0.5 }, polygonVertices)) {
                const idx = y * mapWidth + x;
                
                sharedGrids.zones[idx] = targetCode;
                // Seed baseline growth layouts instantly across the region
                sharedGrids.density[idx] = 0.05; 
                filledCellsCount++;
            }
        }
    }

    if (filledCellsCount > 0) {
        // Log the structural master-planned polygon into our vector tracking registry
        cityPlots.push({
            vertices: polygonVertices,
            zoneType: targetCode,
            gridArea: filledCellsCount,
            geometricArea: calculatedArea
        });
        console.log(`Polygonal Estate Built! Code: ${targetCode}, Area Cells: ${filledCellsCount}, Geometric Units: ${calculatedArea.toFixed(2)}`);
    }
}

// Gauss's Shoelace Equation Solver
function calculatePolygonArea(vertices) {
    let total = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        total += vertices[i].x * vertices[j].y;
        total -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(total) / 2;
}

// Ray-Casting Point-in-Polygon (PIP) Algorithm
function isPointInPolygon(point, vs) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y;
        let xj = vs[j].x, yj = vs[j].y;
        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function handleWorkerMessage(e) {
    if (e.data.cmd === 'initialized') {
        sharedGrids.zones = new Uint8Array(e.data.zoneBuffer);
        sharedGrids.density = new Float32Array(e.data.densityBuffer);
        sharedGrids.wealth = new Float32Array(e.data.wealthBuffer);
        sharedGrids.power = new Float32Array(e.data.powerGridBuffer); 

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