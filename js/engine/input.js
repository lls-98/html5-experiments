// input.js - Redesigned for Predictable Node-Snapping & Vector Previews
import { camera, screenToGrid } from './camera.js';

let startGridPos = null; // Stores where you clicked first
let currentGridPos = null; // Tracks current hovered cell
let isDrawingMode = false;

let onPaintCallback = null;

export function initInputHandlers(canvas, onPaint) {
    onPaintCallback = onPaint;

    // Toggle Drawing mode with Shift key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') isDrawingMode = true;
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
            isDrawingMode = false;
            startGridPos = null; // Reset if they let go
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        const gridPos = getTargetGridCell(e, canvas);
        
        if (isDrawingMode) {
            if (!startGridPos) {
                // First click: Set anchor node
                startGridPos = gridPos;
            } else {
                // Second click: Commit the perfect snapped line
                commitSnappedLine(startGridPos.x, startGridPos.y, currentGridPos.x, currentGridPos.y);
                startGridPos = null; // Reset anchor for next line
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        currentGridPos = getTargetGridCell(e, canvas);
        
        // Handle classic camera panning if not drawing
        if (!isDrawingMode && e.buttons === 1) {
            // Camera panning code stays here...
        }
        
        // If drawing, calculate the perfectly snapped endpoint preview
        if (isDrawingMode && startGridPos) {
            currentGridPos = calculateSnapPoint(startGridPos.x, startGridPos.y, currentGridPos.x, currentGridPos.y);
        }
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.05 * camera.zoom;
        let nextZoom = camera.zoom + (e.deltaY < 0 ? zoomIntensity : -zoomIntensity);
        camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, nextZoom));
    }, { passive: false });
}

function getTargetGridCell(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const coords = screenToGrid(e.clientX - rect.left, e.clientY - rect.top, canvas);
    return { x: Math.floor(coords.x / 20), y: Math.floor(coords.y / 20) };
}

/**
 * Constrains the hovered mouse coordinate to absolute 45° or 90° projections from the origin
 */
function calculateSnapPoint(x0, y0, x1, y1) {
    let dx = x1 - x0;
    let dy = y1 - y0;
    let absDx = Math.abs(dx);
    let absDy = Math.abs(dy);

    if (absDx === 0 && absDy === 0) return { x: x1, y: y1 };

    // Determine if the mouse vector is closest to diagonal, horizontal, or vertical
    if (absDx > absDy * 1.5) {
        return { x: x1, y: y0 }; // Snap to clean Horizontal
    } else if (absDy > absDx * 1.5) {
        return { x: x0, y: y1 }; // Snap to clean Vertical
    } else {
        // Snap to perfect 45-degree angle
        const step = Math.max(absDx, absDy);
        return {
            x: x0 + (dx > 0 ? step : -step),
            y: y0 + (dy > 0 ? step : -step)
            };
    }
}

function commitSnappedLine(x0, y0, x1, y1) {
    // Generate actual cells using standard line stepping
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1;
    let sy = (y0 < y1) ? 1 : -1;
    let err = (dx > dy ? dx : -dy) / 2;
    
    while (true) {
        if (onPaintCallback) onPaintCallback(x0, y0);
        if (x0 === x1 && y0 === y1) break;
        let e2 = err;
        if (e2 > -dx) { err -= dy; x0 += sx; }
        if (e2 <  dy) { err += dx; y0 += sy; }
    }
}

// Export the active ghost path details so the renderer can draw it dynamically
export function getGhostLine() {
    if (isDrawingMode && startGridPos && currentGridPos) {
        return { x0: startGridPos.x, y0: startGridPos.y, x1: currentGridPos.x, y1: currentGridPos.y };
    }
    return null;
}