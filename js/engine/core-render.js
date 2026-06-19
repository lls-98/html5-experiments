// core-render.js - Micro-Engine Vector Rendering Pipe
import { camera } from './camera.js';
import { getGhostLine } from './input.js';

// Replicating enums locally on the UI thread for lightning-fast parsing checks
const ROAD_TYPE = 17;
const CELL_SIZE = 20;

export function renderCity(ctx, canvas, sharedGrids, mapW, mapH) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Center-point matrix transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Render pass
    for (let y = 0; y < mapH; y++) {
        for (let x = 0; x < mapW; x++) {
            const idx = y * mapW + x;
            const zone = sharedGrids.zones[idx];

            if (zone === 0) continue;

            const cx = x * CELL_SIZE + CELL_SIZE / 2;
            const cy = y * CELL_SIZE + CELL_SIZE / 2;

            if (zone === ROAD_TYPE) {
                // Glow cyan vector paths for public infrastructure
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 1.5 / camera.zoom;
                
                // Read surrounding topological road matrix
                renderConnectedRoadVector(ctx, sharedGrids.zones, x, y, mapW, mapH, cx, cy);
            } else {
                // Draw normal zoned densities as basic green data points for now
                const density = sharedGrids.density[idx];
                if (density > 0) {
                    ctx.strokeStyle = `rgba(51, 255, 51, ${density})`;
                    ctx.lineWidth = 1 / camera.zoom;
                    ctx.strokeRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                }
            }
        }
    }

    const ghost = getGhostLine();
    if (ghost) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)'; // Faint, glowing yellow blueprint indicator
        ctx.lineWidth = 2 / camera.zoom;
        ctx.setLineDash([4, 4]); // Clean structural dashed projection line
        
        ctx.beginPath();
        ctx.moveTo(ghost.x0 * 20 + 10, ghost.y0 * 20 + 10);
        ctx.lineTo(ghost.x1 * 20 + 10, ghost.y1 * 20 + 10);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line pattern
    }

    ctx.restore();
}

function renderConnectedRoadVector(ctx, zones, x, y, mapW, mapH, cx, cy) {
    const idx = y * mapW + x;
    const hSize = CELL_SIZE / 2;

    // 8-Way lookup mappings
    const N  = y > 0 ? zones[idx - mapW] === ROAD_TYPE : false;
    const S  = y < mapH - 1 ? zones[idx + mapW] === ROAD_TYPE : false;
    const E  = x < mapW - 1 ? zones[idx + 1] === ROAD_TYPE : false;
    const W  = x > 0 ? zones[idx - 1] === ROAD_TYPE : false;
    const NE = (y > 0 && x < mapW - 1) ? zones[idx - mapW + 1] === ROAD_TYPE : false;
    const NW = (y > 0 && x > 0) ? zones[idx - mapW - 1] === ROAD_TYPE : false;
    const SE = (y < mapH - 1 && x < mapW - 1) ? zones[idx + mapW + 1] === ROAD_TYPE : false;
    const SW = (y < mapH - 1 && x > 0) ? zones[idx + mapW - 1] === ROAD_TYPE : false;

    // Draw central vector core point
    ctx.beginPath();
    ctx.arc(cx, cy, 2 / camera.zoom, 0, 2 * Math.PI);
    ctx.fillStyle = '#00ffff';
    ctx.fill();

    // Draw cardinal connection arms
    ctx.beginPath();
    if (N) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - hSize); }
    if (S) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + hSize); }
    if (E) { ctx.moveTo(cx, cy); ctx.lineTo(cx + hSize, cy); }
    if (W) { ctx.moveTo(cx, cy); ctx.lineTo(cx - hSize, cy); }

    // Draw 45-degree diagonal connectivity paths
    if (NE) { ctx.moveTo(cx, cy); ctx.lineTo(cx + hSize, cy - hSize); }
    if (NW) { ctx.moveTo(cx, cy); ctx.lineTo(cx - hSize, cy - hSize); }
    if (SE) { ctx.moveTo(cx, cy); ctx.lineTo(cx + hSize, cy + hSize); }
    if (SW) { ctx.moveTo(cx, cy); ctx.lineTo(cx - hSize, cy + hSize); }
    
    ctx.stroke();
}