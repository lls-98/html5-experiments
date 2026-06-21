// main.js - Vector Engine with Polygon-Aware Bulldozer and Undo Management
import { initInputHandlers, setSystemBrush } from './engine/input.js';
import { renderCity } from './engine/core-render.js';
import { camera } from './engine/camera.js'; 

let worker;
let canvas, ctx;
let sharedGrids = { zones: null, density: null, wealth: null, power: null };
const mapWidth = 250;
const mapHeight = 250;

export let activeBrush = "ROAD";
export let cityPlots = []; 
export let showPollutionOverlay = true;

// 🔄 TRANSACTION UNDO STACKS
let actionHistoryStack = [];

window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('city-canvas'); //
    ctx = canvas.getContext('2d'); //
    
    resizeCanvas(); //
    window.addEventListener('resize', resizeCanvas); //

    initInputHandlers(canvas, handleUserPaintAction); //

    camera.x = (mapWidth * 20) / 2; //
    camera.y = (mapHeight * 20) / 2; //
    camera.zoom = 0.4; //

    worker = new Worker('js/worker/sim-worker.js'); //
    worker.postMessage({ cmd: 'init', width: mapWidth, height: mapHeight }); //
    worker.onmessage = handleWorkerMessage; // ✅ This safely redirects all worker events down to the handler function!
});

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

let resCycle = 0; let comCycle = 0; let indCycle = 0;

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    const statusEl = document.getElementById('stat-engine');
    
    let pubCycle = 0; let mixCycle = 0;

    if (key === 'a') {
        const types = [
            { id: 4, label: "LOW-DENSITY SOCIAL HOUSING", col: "#11aa55" },
            { id: 5, label: "MED-DENSITY SOCIAL HOUSING", col: "#11aa55" },
            { id: 6, label: "HIGH-DENSITY SOCIAL HOUSING", col: "#11aa55" }
        ];
        pubCycle = (pubCycle + 1) % types.length; activeBrush = "ZONE_" + types[pubCycle].id; setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = `PLOT: ${types[pubCycle].label}`; statusEl.style.color = types[pubCycle].col; }
    }
    if (key === 'm') {
        const types = [
            { id: 20, label: "LOW-DENSITY MIXED-USE", col: "#cc33ff" },
            { id: 21, label: "MED-DENSITY MIXED-USE", col: "#cc33ff" },
            { id: 22, label: "HIGH-DENSITY MIXED-USE", col: "#cc33ff" }
        ];
        mixCycle = (mixCycle + 1) % types.length; activeBrush = "ZONE_" + types[mixCycle].id; setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = `PLOT: ${types[mixCycle].label}`; statusEl.style.color = types[mixCycle].col; }
    }

    if (key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        executeUndoAction();
        return;
    }

    if (key === 'r') { 
        activeBrush = "ROAD"; setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = "BRUSH: ROAD"; statusEl.style.color = "#00ffff"; }
    }
    if (key === 'b') {
        activeBrush = "BULLDOZER"; setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = "BRUSH: BULLDOZER"; statusEl.style.color = "#ff3333"; }
    }
    if (key === 'p') { 
        activeBrush = "POWER_PLANT"; setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = "BRUSH: POWER"; statusEl.style.color = "#ffcc00"; }
    }
    if (key === 'q') {
        const types = [
            { id: 1, label: "LOW-DENSITY RESIDENTIAL", col: "#33ff33" },
            { id: 2, label: "MED-DENSITY RESIDENTIAL", col: "#33ff33" },
            { id: 3, label: "HIGH-DENSITY RESIDENTIAL", col: "#33ff33" }
        ];
        resCycle = (resCycle + 1) % types.length; activeBrush = "ZONE_" + types[resCycle].id; setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = `PLOT: ${types[resCycle].label}`; statusEl.style.color = types[resCycle].col; }
    }
    if (key === 'w') {
        const types = [
            { id: 10, label: "LOW-DENSITY COMMERCIAL", col: "#3366ff" },
            { id: 12, label: "HIGH-DENSITY COMMERCIAL", col: "#3366ff" },
            { id: 17, label: "HIGH-DENSITY OFFICES", col: "#00ffcc" }
        ];
        comCycle = (comCycle + 1) % types.length; activeBrush = "ZONE_" + types[comCycle].id; setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = `PLOT: ${types[comCycle].label}`; statusEl.style.color = types[comCycle].col; }
    }
    if (key === 'e') {
        const types = [
            { id: 30, label: "LIGHT INDUSTRY", col: "#e6b800" },
            { id: 31, label: "HEAVY INDUSTRY", col: "#ff5500" }
        ];
        indCycle = (indCycle + 1) % types.length; activeBrush = "ZONE_" + types[indCycle].id; setSystemBrush(activeBrush);
        if (statusEl) { statusEl.innerText = `PLOT: ${types[indCycle].label}`; statusEl.style.color = types[indCycle].col; }
    }
    if (key === 'v') {
        showPollutionOverlay = !showPollutionOverlay;
        const statusEl = document.getElementById('stat-engine');
        if (statusEl) {
            statusEl.innerText = showPollutionOverlay ? "SMOG OVERLAY: ON" : "SMOG OVERLAY: OFF";
            statusEl.style.color = showPollutionOverlay ? "#33ff33" : "#ffcc00";
            
            // Revert status message back after 1.5 seconds
            setTimeout(() => {
                statusEl.innerText = "ONLINE";
                statusEl.style.color = "#33ff33";
            }, 1500);
        }
    }
});

function handleUserPaintAction(gridX, gridY, polygonVertices = null) {
    if (!sharedGrids.zones || !sharedGrids.density) return;

    // A. Handle Single-Tile Tools & Bulldozer Clicks
    if (polygonVertices === null) {
        if (gridX >= 0 && gridX < mapWidth && gridY >= 0 && gridY < mapHeight) {
            const idx = gridY * mapWidth + gridX;

            // 🚜 SPECIAL CASE: BULLDOZER INTERSECTING A VECTOR POLYGON
            if (activeBrush === "BULLDOZER") {
                // Check if the click point falls inside any registered polygon perimeter
                const targetPoint = { x: gridX + 0.5, y: gridY + 0.5 };
                const clickedPlot = cityPlots.find(plot => isPointInPolygon(targetPoint, plot.vertices));

                if (clickedPlot) {
                    executePolygonDemolition(clickedPlot);
                    return; // Short-circuit to avoid individual tile logic conflict
                }
            }
            
            const previousZone = sharedGrids.zones[idx];
            const previousDensity = sharedGrids.density[idx];

            if (activeBrush === "ROAD") { 
                if (sharedGrids.zones[idx] === 50) return;
                sharedGrids.zones[idx] = 50; sharedGrids.density[idx] = 1.0; 
                actionHistoryStack.push({ type: 'single-tile', index: idx, prevZone: previousZone, prevDensity: previousDensity });
            } 
            else if (activeBrush === "POWER_PLANT") { 
                worker.postMessage({ cmd: 'addPowerPlant', index: idx });
                actionHistoryStack.push({ type: 'power-plant', index: idx });
            }
            else if (activeBrush === "BULLDOZER") {
                if (sharedGrids.zones[idx] === 0) return; 
                
                sharedGrids.zones[idx] = 0;
                sharedGrids.density[idx] = 0.0;
                if (sharedGrids.power) sharedGrids.power[idx] = 0.0;

                worker.postMessage({ cmd: 'removePowerPlant', index: idx });
                actionHistoryStack.push({ type: 'single-tile', index: idx, prevZone: previousZone, prevDensity: previousDensity });
            }
        }
        return;
    }

    // B. Handle Vector Polygon Plots Configuration
    if (polygonVertices.length < 3) return;
    const calculatedArea = calculatePolygonArea(polygonVertices);
    if (calculatedArea < 1.0) return;

    const targetCode = parseInt(activeBrush.split("_")[1]);

    let minX = mapWidth, maxX = 0, minY = mapHeight, maxY = 0;
    for (const v of polygonVertices) {
        if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
    }
    minX = Math.max(0, minX); maxX = Math.min(mapWidth - 1, maxX);
    minY = Math.max(0, minY); maxY = Math.min(mapHeight - 1, maxY);

    let changedCellsLog = [];

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (isPointInPolygon({ x: x + 0.5, y: y + 0.5 }, polygonVertices)) {
                const idx = y * mapWidth + x;
                changedCellsLog.push({ index: idx, prevZone: sharedGrids.zones[idx], prevDensity: sharedGrids.density[idx] });

                sharedGrids.zones[idx] = targetCode;
                sharedGrids.density[idx] = 0.05; 
            }
        }
    }

    if (changedCellsLog.length > 0) {
        const structuralPlotNode = {
            vertices: polygonVertices,
            zoneType: targetCode,
            gridArea: changedCellsLog.length,
            geometricArea: calculatedArea
        };
        cityPlots.push(structuralPlotNode);
        actionHistoryStack.push({ type: 'polygon', plotData: structuralPlotNode, cellsBackup: changedCellsLog });
    }
}

// 🚜 WIPE CLEAN AN ENTIRE VECTOR ESTATE & LOG IT TO UNDO QUEUE
function executePolygonDemolition(plot) {
    let minX = mapWidth, maxX = 0, minY = mapHeight, maxY = 0;
    for (const v of plot.vertices) {
        if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
    }
    minX = Math.max(0, minX); maxX = Math.min(mapWidth - 1, maxX);
    minY = Math.max(0, minY); maxY = Math.min(mapHeight - 1, maxY);

    let demolishedCellsBackup = [];

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (isPointInPolygon({ x: x + 0.5, y: y + 0.5 }, plot.vertices)) {
                const idx = y * mapWidth + x;
                
                // Backup state so Ctrl+Z handles recovery flawlessly
                demolishedCellsBackup.push({ index: idx, prevZone: sharedGrids.zones[idx], prevDensity: sharedGrids.density[idx] });

                // Zero out cells completely
                sharedGrids.zones[idx] = 0;
                sharedGrids.density[idx] = 0.0;
                if (sharedGrids.power) sharedGrids.power[idx] = 0.0;
                
                worker.postMessage({ cmd: 'removePowerPlant', index: idx });
            }
        }
    }

    // Drop the plot entry out of the master tracking collection
    cityPlots = cityPlots.filter(p => p !== plot);

    // Push clear instruction token to transaction ledger history
    actionHistoryStack.push({
        type: 'polygon-demolition',
        plotData: plot,
        cellsBackup: demolishedCellsBackup
    });

    console.log(`Vector plot flattened. Area: ${plot.geometricArea} units.`);
}

function executeUndoAction() {
    if (actionHistoryStack.length === 0) return;
    const item = actionHistoryStack.pop();

    if (item.type === 'single-tile') {
        sharedGrids.zones[item.index] = item.prevZone;
        sharedGrids.density[item.index] = item.prevDensity;
    } 
    else if (item.type === 'power-plant') {
        sharedGrids.zones[item.index] = 0;
        sharedGrids.density[item.index] = 0.0;
        worker.postMessage({ cmd: 'removePowerPlant', index: item.index });
    }
    else if (item.type === 'polygon') {
        for (const backup of item.cellsBackup) {
            sharedGrids.zones[backup.index] = backup.prevZone;
            sharedGrids.density[backup.index] = backup.prevDensity;
        }
        cityPlots = cityPlots.filter(p => p !== item.plotData);
    }
    // ↩️ RECOVER WHOLE FLATTENED DISTRICTS INSTANTLY WITH CTRL+Z
    else if (item.type === 'polygon-demolition') {
        for (const backup of item.cellsBackup) {
            sharedGrids.zones[backup.index] = backup.prevZone;
            sharedGrids.density[backup.index] = backup.prevDensity;
            // If it was a power plant, re-register it in the background thread loop
            if (backup.prevZone === 99) {
                worker.postMessage({ cmd: 'addPowerPlant', index: backup.index });
            }
        }
        // Restore polygon back to the renderer registry loop
        cityPlots.push(item.plotData);
    }
    console.log(`Undo executed successfully. Remaining Stack: ${actionHistoryStack.length}`);
}

function calculatePolygonArea(vertices) {
    let total = 0; const n = vertices.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        total += vertices[i].x * vertices[j].y; total -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(total) / 2;
}

function isPointInPolygon(point, vs) {
    let x = point.x, y = point.y, inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y; let xj = vs[j].x, yj = vs[j].y;
        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function handleWorkerMessage(e) {
    // 🌪️ FIXED HANDSHAKE: Catch the initialization signal inside the actual worker event frame!
    if (e.data.cmd === 'initialized') {
        sharedGrids.zones = new Uint8Array(e.data.zoneBuffer);
        sharedGrids.density = new Float32Array(e.data.densityBuffer);
        sharedGrids.wealth = new Float32Array(e.data.wealthBuffer);
        sharedGrids.power = new Float32Array(e.data.powerGridBuffer); 
        sharedGrids.traffic = new Float32Array(e.data.trafficGridBuffer);
        sharedGrids.pollution = new Float32Array(e.data.pollutionGridBuffer); // 🌫️ Safely links shared memory!
        sharedGrids.health = new Float32Array(e.data.healthGridBuffer);       // 🏥 Safely links shared memory!

        document.getElementById('stat-engine').innerText = "ONLINE";
        document.getElementById('stat-engine').style.color = "#33ff33";
        requestAnimationFrame(renderLoop);
        return; // Exit early since this is a setup packet
    }

    if (e.data.cmd === 'updateStats') {
        document.getElementById('gwi-value').innerText = e.data.gwi.toFixed(1) + '%'; //
        document.getElementById('stat-pop').innerText = e.data.population.toLocaleString(); //
        
        // 🏥 UPDATE SIDEBAR HEALTH HUD MATRIX INDICATOR
        const healthEl = document.getElementById('stat-health'); //
        if (healthEl && typeof e.data.healthSecurity !== 'undefined') { //
            const healthPercentage = e.data.healthSecurity * 100; //
            healthEl.innerText = `${healthPercentage.toFixed(1)}%`; //

            if (healthPercentage > 80.0)      healthEl.style.color = "#33ff33"; //
            else if (healthPercentage > 50.0) healthEl.style.color = "#ffcc00"; //
            else                              healthEl.style.color = "#ff3333"; //
        }
        
        // 1. Refresh global macro bar arrays
        if (e.data.demand) { //
            const rPct = Math.max(0, Math.min(100, ((e.data.demand.R - 0.01) / 0.04) * 100)); //
            const cPct = Math.max(0, Math.min(100, ((e.data.demand.C - 0.01) / 0.03) * 100)); //
            const iPct = Math.max(0, Math.min(100, ((e.data.demand.I - 0.01) / 0.03) * 100)); //

            document.getElementById('bar-r').style.width = `${rPct}%`; //
            document.getElementById('bar-c').style.width = `${cPct}%`; //
            document.getElementById('bar-i').style.width = `${iPct}%`; //
        }

        // 💰 2. CONTEXTUAL METRIC RENDERING: REVENUE CHANNELS
        const revEl = document.getElementById('stat-revenue'); //
        if (revEl && typeof e.data.revenue !== 'undefined') { //
            const roundedRevenue = Math.round(e.data.revenue); //
            
            if (roundedRevenue > 0) { //
                revEl.className = "hud-value positive"; //
                revEl.innerText = `+$${roundedRevenue.toLocaleString()}/s`; //
            } else if (roundedRevenue === 0) { //
                revEl.className = "hud-value warning"; //
                revEl.innerText = "$0/s"; //
            } else { //
                revEl.className = "hud-value negative"; //
                revEl.innerText = `-$${Math.abs(roundedRevenue).toLocaleString()}/s`; //
            }
        }

        // 📊 3. CONTEXTUAL METRIC RENDERING: INEQ GINI INDEX
        const ineqEl = document.getElementById('stat-inequality'); //
        if (ineqEl && typeof e.data.gwi !== 'undefined') { //
            const computedIneqPct = 100 - e.data.gwi; //
            ineqEl.innerText = `${computedIneqPct.toFixed(1)}%`; //

            if (computedIneqPct > 45.0) { //
                ineqEl.className = "hud-value negative"; //
            } else if (computedIneqPct > 25.0) { //
                ineqEl.className = "hud-value warning"; //
            } else { //
                ineqEl.className = "hud-value positive"; //
            }
        }
    }
}

function renderLoop() {
    renderCity(ctx, canvas, sharedGrids, mapWidth, mapHeight);
    requestAnimationFrame(renderLoop);
}