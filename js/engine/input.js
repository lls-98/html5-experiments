// input.js - Mouse and Touch Interaction Handler
import { camera } from './camera.js';

let isDragging = false;
let startX, startY;

export function initInputHandlers(canvas) {
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        // Adjust camera pan based on mouse drag delta and zoom level
        camera.x -= (e.clientX - startX) / camera.zoom;
        camera.y -= (e.clientY - startY) / camera.zoom;
        
        startX = e.clientX;
        startY = e.clientY;
    });

    window.addEventListener('mouseup', () => isDragging = false);

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        
        // Calculate next zoom step
        let nextZoom = camera.zoom + (e.deltaY < 0 ? zoomIntensity : -zoomIntensity);
        
        // Restrict to camera boundaries
        camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, nextZoom));
    }, { passive: false });
}