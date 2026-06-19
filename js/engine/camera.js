// camera.js - Viewport State Management
export const camera = {
    x: 0,
    y: 0,
    zoom: 1.0,
    minZoom: 0.2,
    maxZoom: 5.0
};

export function screenToGrid(screenX, screenY, canvas) {
    // Converts pixel clicks on screen to absolute grid coordinates
    const gridX = (screenX - canvas.width / 2) / camera.zoom + camera.x;
    const gridY = (screenY - canvas.height / 2) / camera.zoom + camera.y;
    return { x: gridX, y: gridY };
}