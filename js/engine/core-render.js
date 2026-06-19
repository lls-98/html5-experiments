// core-render.js - Primary Vector Render Pipeline
import { camera } from './camera.js';

export function renderCity(ctx, canvas, sharedGrids, mapW, mapH) {
    // Clear screen to void black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Center the viewport origin
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Calculate dimensions of cell sizing
    const cellW = 20; 
    const cellH = 20;

    // Direct loop through shared macro memory matrices
    for (let y = 0; y < mapH; y++) {
        for (let x = 0; x < mapW; x++) {
            const idx = y * mapW + x;
            const zone = sharedGrids.zones[idx];
            const density = sharedGrids.density[idx];

            if (zone > 0 && density > 0) {
                // Retro 70s vector aesthetic lines
                ctx.strokeStyle = `rgba(51, 255, 51, ${density})`;
                ctx.lineWidth = 1 / camera.zoom; // Keep lines crisp regardless of zoom
                ctx.strokeRect(x * cellW, y * cellH, cellW - 2, cellH - 2);
            }
        }
    }

    ctx.restore();
}