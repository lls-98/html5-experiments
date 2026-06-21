// input.js - Harmonized Vector Polygon Plotting and Snapped Road Lines
import { camera, screenToGrid } from './camera.js';

let startGridPos = null;   
let currentGridPos = null; 
let isDrawingMode = false;
let isPanning = false;

let startMouseX = 0;
let startMouseY = 0;
let onPaintCallback = null;

// State machines for Polygon Vector Tracking
let activePolygonVertices = [];
const SNAP_RADIUS_CELLS = 1.2; 

let currentBrush = "ROAD";

export function initInputHandlers(canvas, onPaint) {
    onPaintCallback = onPaint;

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') isDrawingMode = true;
        
        if (e.key === 'Escape') {
            activePolygonVertices = [];
            startGridPos = null;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
            isDrawingMode = false;
            startGridPos = null; // Clear active road lines on Shift release
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        const gridPos = getTargetGridCell(e, canvas);

        // Map Panning Mode Logic
        if (e.button === 1 || (e.button === 0 && !isDrawingMode && currentBrush === "ROAD")) {
            isPanning = true;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            if (e.button === 1) e.preventDefault();
        } 
        // Action Mode Logic
        else if (e.button === 0) {
            if (currentBrush === "ROAD") {
                if (isDrawingMode) {
                    if (!startGridPos) {
                        startGridPos = gridPos;
                    } else {
                        // Commit line, then snap next starting point to this ending node
                        commitSnappedLine(startGridPos.x, startGridPos.y, currentGridPos.x, currentGridPos.y);
                        startGridPos = null;
                    }
                } else {
                    if (onPaintCallback) onPaintCallback(gridPos.x, gridPos.y, null);
                }
            } 
            else if (currentBrush === "POWER_PLANT") {
                if (onPaintCallback) onPaintCallback(gridPos.x, gridPos.y, null);
            }
            else if (currentBrush.startsWith("ZONE_")) {
                if (activePolygonVertices.length >= 3 && checkClosureSnap(gridPos, activePolygonVertices[0])) {
                    if (onPaintCallback) onPaintCallback(null, null, [...activePolygonVertices]);
                    activePolygonVertices = []; 
                } else {
                    if (activePolygonVertices.length === 0 || 
                        activePolygonVertices[activePolygonVertices.length - 1].x !== gridPos.x ||
                        activePolygonVertices[activePolygonVertices.length - 1].y !== gridPos.y) {
                        activePolygonVertices.push({ x: gridPos.x, y: gridPos.y });
                    }
                }
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rawGridPos = getTargetGridCell(e, canvas);
        currentGridPos = rawGridPos;

        if (isPanning) {
            camera.x -= (e.clientX - startMouseX) / camera.zoom;
            camera.y -= (e.clientY - startMouseY) / camera.zoom;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
        } 

        // If holding shift and placing roads, calculate the straight line path
        if (currentBrush === "ROAD" && isDrawingMode && startGridPos) {
            currentGridPos = calculateSnapPoint(startGridPos.x, startGridPos.y, rawGridPos.x, rawGridPos.y);
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 1 || e.button === 0) isPanning = false;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1 * camera.zoom;
        let nextZoom = camera.zoom + (e.deltaY < 0 ? zoomIntensity : -zoomIntensity);
        camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, nextZoom));
    }, { passive: false });

    canvas.addEventListener('contextmenu', e => e.preventDefault());
}

export function setSystemBrush(brushString) {
    currentBrush = brushString;
    activePolygonVertices = []; 
    startGridPos = null;
}

function getTargetGridCell(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const coords = screenToGrid(e.clientX - rect.left, e.clientY - rect.top, canvas);
    return { x: Math.floor(coords.x / 20), y: Math.floor(coords.y / 20) };
}

function checkClosureSnap(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy) <= SNAP_RADIUS_CELLS;
}

function calculateSnapPoint(x0, y0, x1, y1) {
    let dx = x1 - x0; let dy = y1 - y0;
    let absDx = Math.abs(dx); let absDy = Math.abs(dy);
    if (dx === 0 && dy === 0) return { x: x1, y: y1 };
    if (absDx > absDy * 1.5) return { x: x1, y: y0 };
    if (absDy > absDx * 1.5) return { x: x0, y: y1 };
    const step = Math.min(absDx, absDy);
    return { x: x0 + (dx > 0 ? step : -step), y: y0 + (dy > 0 ? step : -step) };
}

function commitSnappedLine(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0); let dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1; let sy = (y0 < y1) ? 1 : -1;
    let err = (dx > dy ? dx : -dy) / 2;
    while (true) {
        if (onPaintCallback) onPaintCallback(x0, y0, null);
        if (x0 === x1 && y0 === y1) break;
        let e2 = err;
        if (e2 > -dx) { err -= dy; x0 += sx; }
        if (e2 <  dy) { err += dx; y0 += sy; }
    }
}

export function getActivePlotVertices() {
    return activePolygonVertices;
}

export function getGhostLine() {
    if (currentBrush === "ROAD" && isDrawingMode && startGridPos && currentGridPos) {
        return { x0: startGridPos.x, y0: startGridPos.y, x1: currentGridPos.x, y1: currentGridPos.y };
    }
    return null;
}

export function getPlacementGhost() {
    if (currentGridPos && (currentBrush === "POWER_PLANT" || (currentBrush === "ROAD" && !isDrawingMode))) {
        return currentGridPos;
    }
    return null;
}