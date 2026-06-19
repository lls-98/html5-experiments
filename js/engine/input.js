// input.js - Rock-Solid CAD Controls & Absolute 8-Way Constraints
import { camera, screenToGrid } from './camera.js';

let startGridPos = null;   // Active drawing anchor node
let currentGridPos = null; // Current preview endpoint
let isDrawingMode = false;
let isPanning = false;

let startMouseX = 0;
let startMouseY = 0;
let onPaintCallback = null;

export function initInputHandlers(canvas, onPaint) {
    onPaintCallback = onPaint;

    // Track active drawing mode state via Shift Key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') isDrawingMode = true;
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
            isDrawingMode = false;
            startGridPos = null; // Flush active drawing anchors
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        const gridPos = getTargetGridCell(e, canvas);

        // Engage Camera Pan: Middle Click (button 1) OR Left Click (button 0) WITHOUT Shift
        if (e.button === 1 || (e.button === 0 && !isDrawingMode)) {
            isPanning = true;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            if (e.button === 1) e.preventDefault(); // Kill the browser's autoscroll bubble
        } 
        // Engage Placement: Left Click WITH Shift active
        else if (e.button === 0 && isDrawingMode) {
            if (!startGridPos) {
                startGridPos = gridPos; // Lock first node
            } else {
                // Commit perfectly aligned path to memory array
                commitSnappedLine(startGridPos.x, startGridPos.y, currentGridPos.x, currentGridPos.y);
                startGridPos = null; // Clear anchor node for subsequent placement
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rawGridPos = getTargetGridCell(e, canvas);

        if (isPanning) {
            // Apply translation changes instantly across camera matrix
            camera.x -= (e.clientX - startMouseX) / camera.zoom;
            camera.y -= (e.clientY - startMouseY) / camera.zoom;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
        } 

        // Manage drawing preview structures
        if (isDrawingMode) {
            if (startGridPos) {
                // Lock mouse strictly to our 8-way geometric axis projection
                currentGridPos = calculateSnapPoint(startGridPos.x, startGridPos.y, rawGridPos.x, rawGridPos.y);
            } else {
                currentGridPos = rawGridPos;
            }
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 1 || e.button === 0) {
            isPanning = false;
        }
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1 * camera.zoom;
        let nextZoom = camera.zoom + (e.deltaY < 0 ? zoomIntensity : -zoomIntensity);
        camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, nextZoom));
    }, { passive: false });

    // Block accidental context menus popping up on structural clicks
    canvas.addEventListener('contextmenu', e => e.preventDefault());
}

function getTargetGridCell(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const coords = screenToGrid(e.clientX - rect.left, e.clientY - rect.top, canvas);
    return { x: Math.floor(coords.x / 20), y: Math.floor(coords.y / 20) };
}

/**
 * Strict 8-Way Grid Snapping (90° Cardinal, 45° Symmetrical Diagonal)
 */
function calculateSnapPoint(x0, y0, x1, y1) {
    let dx = x1 - x0;
    let dy = y1 - y0;
    let absDx = Math.abs(dx);
    let absDy = Math.abs(dy);

    if (dx === 0 && dy === 0) return { x: x1, y: y1 };

    // Threshold matrix evaluation: forces cursor onto explicit axis lines
    if (absDx > absDy * 1.5) {
        return { x: x1, y: y0 }; // Symmetrical Horizontal
    } else if (absDy > absDx * 1.5) {
        return { x: x0, y: y1 }; // Symmetrical Vertical
    } else {
        // Enforce perfect 1:1 diagonal aspect constraints
        const step = Math.min(absDx, absDy); 
        return {
            x: x0 + (dx > 0 ? step : -step),
            y: y0 + (dy > 0 ? step : -step)
        };
    }
}

function commitSnappedLine(x0, y0, x1, y1) {
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

export function getGhostLine() {
    if (isDrawingMode && startGridPos && currentGridPos) {
        return { x0: startGridPos.x, y0: startGridPos.y, x1: currentGridPos.x, y1: currentGridPos.y };
    }
    return null;
}