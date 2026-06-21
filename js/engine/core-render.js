// core-render.js - Geometric Vector Overlay and Raster Renderer
import { camera } from './camera.js';
import { getActivePlotVertices, getPlacementGhost, getGhostLine } from './input.js';
import { cityPlots } from '../main.js'; 

const ROAD_TYPE = 50; 
const POWER_PLANT_TYPE = 99;
const CELL_SIZE = 20;

export function renderCity(ctx, canvas, sharedGrids, mapW, mapH) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    ctx.strokeStyle = '#004400';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.strokeRect(0, 0, mapW * CELL_SIZE, mapH * CELL_SIZE);

    if (!sharedGrids || !sharedGrids.zones) {
        ctx.restore();
        return;
    }

    // 1. RENDER FLAT GRID SIMULATION TILES
    for (let y = 0; y < mapH; y++) {
        for (let x = 0; x < mapW; x++) {
            const idx = y * mapW + x;
            const zone = sharedGrids.zones[idx];

            if (zone === 0) continue;

            const cx = x * CELL_SIZE + CELL_SIZE / 2;
            const cy = y * CELL_SIZE + CELL_SIZE / 2;

            if (zone === ROAD_TYPE) {
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 1.5 / camera.zoom;
                renderConnectedRoadVector(ctx, sharedGrids.zones, x, y, mapW, mapH, cx, cy);
                
                if (sharedGrids.power) {
                    const voltage = sharedGrids.power[idx];
                    if (voltage > 0) {
                        ctx.fillStyle = `rgba(255, 230, 0, ${0.4 + voltage * 0.6})`;
                        ctx.beginPath(); ctx.arc(cx, cy, 3.5 / camera.zoom, 0, 2 * Math.PI); ctx.fill();
                    }
                }
            } 
            else if (zone === POWER_PLANT_TYPE) {
                ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2 / camera.zoom;
                ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 12, cy); ctx.lineTo(cx, cy + 12); ctx.lineTo(cx - 12, cy);
                ctx.closePath(); ctx.stroke();
                ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 3, cy - 3, 6, 6);
            } 
            else {
                const density = sharedGrids.density[idx];
                if (density <= 0.02) continue;

                let color = '#33ff33';
                if (zone >= 4 && zone <= 6) color = '#11aa55';
                else if (zone >= 10 && zone <= 12) color = '#3366ff';
                else if (zone >= 15 && zone <= 17) color = '#00ffcc';
                else if (zone >= 20 && zone <= 22) color = '#cc33ff';
                else if (zone === 30) color = '#e6b800';
                else if (zone === 31) color = '#ff5500';
                else if (zone === 35) color = '#888833';

                if (density >= 0.7) {
                    ctx.fillStyle = color;
                    ctx.fillRect(x * CELL_SIZE + 4, y * CELL_SIZE + 4, CELL_SIZE - 8, CELL_SIZE - 8);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(cx - 2, cy - 2, 4, 4);
                } else {
                    ctx.fillStyle = `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, ${0.2 + density * 0.6})`;
                    ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
                }
            }
        }
    }

    // 2. RENDER MASTER PLOTTED PERIMETER VECTORS
    ctx.save();
    for (const plot of cityPlots) {
        let color = '#33ff33';
        if (plot.zoneType >= 4 && plot.zoneType <= 6) color = '#11aa55';
        else if (plot.zoneType >= 10 && plot.zoneType <= 12) color = '#3366ff';
        else if (plot.zoneType >= 15 && plot.zoneType <= 17) color = '#00ffcc';
        else if (plot.zoneType >= 20 && plot.zoneType <= 22) color = '#cc33ff';
        else if (plot.zoneType === 30) color = '#e6b800';
        else if (plot.zoneType === 31) color = '#ff5500';
        else if (plot.zoneType === 35) color = '#888833';

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5 / camera.zoom;
        ctx.beginPath();
        ctx.moveTo(plot.vertices[0].x * CELL_SIZE, plot.vertices[0].y * CELL_SIZE);
        for (let i = 1; i < plot.vertices.length; i++) {
            ctx.lineTo(plot.vertices[i].x * CELL_SIZE, plot.vertices[i].y * CELL_SIZE);
        }
        ctx.closePath();
        ctx.stroke();
        
        ctx.fillStyle = `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, 0.06)`;
        ctx.fill();
    }
    ctx.restore();

    // 3. RENDER ACTIVE BLUEPRINT PLOTTING FEEDBACK
    const activeVertices = getActivePlotVertices();
    if (activeVertices && activeVertices.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#ffff00'; 
        ctx.lineWidth = 2 / camera.zoom;
        
        ctx.beginPath();
        ctx.moveTo(activeVertices[0].x * CELL_SIZE, activeVertices[0].y * CELL_SIZE);
        for (let i = 1; i < activeVertices.length; i++) {
            ctx.lineTo(activeVertices[i].x * CELL_SIZE, activeVertices[i].y * CELL_SIZE);
        }
        
        const canvasEl = ctx.canvas;
        const rect = canvasEl.getBoundingClientRect();
        const mouseGrid = screenToTargetGridLocal(window.lastMouseX - rect.left, window.lastMouseY - rect.top, canvasEl);
        ctx.lineTo(mouseGrid.x * CELL_SIZE, mouseGrid.y * CELL_SIZE);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        for (const v of activeVertices) {
            ctx.fillRect(v.x * CELL_SIZE - 3, v.y * CELL_SIZE - 3, 6, 6);
        }
        
        if (activeVertices.length >= 3) {
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(activeVertices[0].x * CELL_SIZE, activeVertices[0].y * CELL_SIZE, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
        ctx.restore();
    }

    // 🌟 RESTORED: ROAD LINE VECTOR PREVIEW TRACKING
    const roadGhost = getGhostLine();
    if (roadGhost) {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
        ctx.lineWidth = 2.5 / camera.zoom;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(roadGhost.x0 * CELL_SIZE + CELL_SIZE / 2, roadGhost.y0 * CELL_SIZE + CELL_SIZE / 2);
        ctx.lineTo(roadGhost.x1 * CELL_SIZE + CELL_SIZE / 2, roadGhost.y1 * CELL_SIZE + CELL_SIZE / 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 4. RENDER INFRASTRUCTURE GHOST BOXES
    const itemGhost = getPlacementGhost();
    if (itemGhost) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 1.5 / camera.zoom;
        ctx.strokeRect(itemGhost.x * CELL_SIZE + 2, itemGhost.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }

    ctx.restore();
}

window.addEventListener('mousemove', (e) => {
    window.lastMouseX = e.clientX;
    window.lastMouseY = e.clientY;
});

function screenToTargetGridLocal(screenX, screenY, canvas) {
    const gridX = (screenX - canvas.width / 2) / camera.zoom + camera.x;
    const gridY = (screenY - canvas.height / 2) / camera.zoom + camera.y;
    return { x: Math.floor(gridX / 20), y: Math.floor(gridY / 20) };
}

function renderConnectedRoadVector(ctx, zones, x, y, mapW, mapH, cx, cy) {
    const idx = y * mapW + x; const hSize = CELL_SIZE / 2;
    const N  = y > 0 ? zones[idx - mapW] === ROAD_TYPE : false;
    const S  = y < mapH - 1 ? zones[idx + mapW] === ROAD_TYPE : false;
    const E  = x < mapW - 1 ? zones[idx + 1] === ROAD_TYPE : false;
    const W  = x > 0 ? zones[idx - 1] === ROAD_TYPE : false;
    const NE = (y > 0 && x < mapW - 1) ? zones[idx - mapW + 1] === ROAD_TYPE : false;
    const NW = (y > 0 && x > 0) ? zones[idx - mapW - 1] === ROAD_TYPE : false;
    const SE = (y < mapH - 1 && x < mapW - 1) ? zones[idx + mapW + 1] === ROAD_TYPE : false;
    const SW = (y < mapH - 1 && x > 0) ? zones[idx + mapW - 1] === ROAD_TYPE : false;

    ctx.beginPath(); ctx.arc(cx, cy, 2 / camera.zoom, 0, 2 * Math.PI); ctx.fillStyle = '#00ffff'; ctx.fill();
    ctx.beginPath();
    if (N) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - hSize); } if (S) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + hSize); }
    if (E) { ctx.moveTo(cx, cy); ctx.lineTo(cx + hSize, cy); } if (W) { ctx.moveTo(cx, cy); ctx.lineTo(cx - hSize, cy); }
    if (NE) { ctx.moveTo(cx, cy); ctx.lineTo(cx + hSize, cy - hSize); } if (NW) { ctx.moveTo(cx, cy); ctx.lineTo(cx - hSize, cy - hSize); }
    if (SE) { ctx.moveTo(cx, cy); ctx.lineTo(cx + hSize, cy + hSize); } if (SW) { ctx.moveTo(cx, cy); ctx.lineTo(cx - hSize, cy + hSize); }
    ctx.stroke();
}