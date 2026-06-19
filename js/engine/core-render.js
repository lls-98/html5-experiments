// core-render.js - Complete Vector Render Pipeline
import { camera } from './camera.js';
import { getGhostLine, getPlacementGhost } from './input.js';

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
                        ctx.beginPath();
                        ctx.arc(cx, cy, 3.5 / camera.zoom, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            } 
            else if (zone === POWER_PLANT_TYPE) {
                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 2 / camera.zoom;
                ctx.beginPath();
                ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 12, cy); ctx.lineTo(cx, cy + 12); ctx.lineTo(cx - 12, cy);
                ctx.closePath(); ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(cx - 3, cy - 3, 6, 6);
            } 
            else {
                const density = sharedGrids.density[idx];
                if (density <= 0.02) continue;

                let color = '#33ff33'; 
                let complexDashes = [];

                if (zone >= 4 && zone <= 6) { color = '#11aa55'; complexDashes = [2, 2]; } 
                else if (zone >= 10 && zone <= 12) { color = '#3366ff'; } 
                else if (zone >= 15 && zone <= 17) { color = '#00ffcc'; } 
                else if (zone >= 20 && zone <= 22) { color = '#cc33ff'; } 
                else if (zone === 30) { color = '#e6b800'; } 
                else if (zone === 31) { color = '#ff5500'; complexDashes = [6, 2]; } 
                else if (zone === 35) { color = '#888833'; complexDashes = [1, 4]; }

                const pad = 2;
                const size = CELL_SIZE - pad * 2;
                const rx = x * CELL_SIZE + pad;
                const ry = y * CELL_SIZE + pad;

                ctx.lineWidth = 1 / camera.zoom;
                if (complexDashes.length > 0) ctx.setLineDash(complexDashes);

                if (density < 0.3) {
                    ctx.strokeStyle = `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, 0.35)`;
                    ctx.strokeRect(rx, ry, size, size);
                    ctx.fillStyle = color;
                    ctx.fillRect(cx - 1, cy - 1, 2, 2);
                }
                else if (density >= 0.3 && density < 0.7) {
                    ctx.strokeStyle = color;
                    ctx.strokeRect(rx, ry, size, size);
                }
                else if (density >= 0.7) {
                    ctx.strokeStyle = color;
                    ctx.strokeRect(rx, ry, size, size);
                    ctx.strokeStyle = '#ffffff';
                    ctx.strokeRect(rx + 4, ry + 4, size - 8, size - 8);
                }
                ctx.setLineDash([]);
            }
        }
    }

    const ghost = getGhostLine();
    if (ghost) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
        ctx.lineWidth = 2 / camera.zoom; ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(ghost.x0 * 20 + 10, ghost.y0 * 20 + 10);
        ctx.lineTo(ghost.x1 * 20 + 10, ghost.y1 * 20 + 10);
        ctx.stroke(); ctx.setLineDash([]);
    }

    const itemGhost = getPlacementGhost();
    if (itemGhost) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 1.5 / camera.zoom;
        ctx.strokeRect(itemGhost.x * CELL_SIZE + 2, itemGhost.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }

    ctx.restore();
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