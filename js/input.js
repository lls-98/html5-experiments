//input logic

import { CONFIG } from './config.js';

export class InputHandler {
    constructor(canvasId, cityMap, onMapUpdate) {
        this.canvas = document.getElementById(canvasId);
        this.cityMap = cityMap;
        this.onMapUpdate = onMapUpdate;

        // --- NEW: Tracking states for panning ---
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;

        this.initListeners();
    }

    initListeners() {
        // --- CLICK EVENTS ---
        this.canvas.addEventListener('click', (event) => {
            // We only want to treat left clicks (button 0) as placement actions
            if (event.button !== 0) return;

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const worldX = (mouseX - CONFIG.CAMERA_X) / CONFIG.ZOOM;
            const worldY = (mouseY - CONFIG.CAMERA_Y) / CONFIG.ZOOM;

            const gridX = Math.floor(worldX / CONFIG.TILE_SIZE);
            const gridY = Math.floor(worldY / CONFIG.TILE_SIZE);

            if (gridX >= 0 && gridX < CONFIG.MAP_SIZE && gridY >= 0 && gridY < CONFIG.MAP_SIZE) {
                this.handleTileClick(gridX, gridY);
            }
        });

        // --- NEW: PANNING MOUSE DOWN ---
        this.canvas.addEventListener('mousedown', (event) => {
            // event.button === 1 represents the middle mouse button/scroll wheel click
            if (event.button === 1) {
                event.preventDefault(); // Stop the browser from showing the autoscroll circle icon
                this.isPanning = true;
                
                // Record the exact pixel position where the drag initiated
                this.startX = event.clientX - CONFIG.CAMERA_X;
                this.startY = event.clientY - CONFIG.CAMERA_Y;
            }
        });

        // --- NEW: PANNING MOUSE MOVE ---
        this.canvas.addEventListener('mousemove', (event) => {
            if (!this.isPanning) return;

            // Calculate the new camera position based on the delta offset of the mouse movement
            CONFIG.CAMERA_X = event.clientX - this.startX;
            CONFIG.CAMERA_Y = event.clientY - this.startY;

            // Instantly update the frame to show the map sliding across the screen
            this.onMapUpdate();
        });

        // --- NEW: PANNING MOUSE UP & LEAVE ---
        // Stop panning when the button is released, or if the mouse moves off-screen
        const stopPanning = () => { this.isPanning = false; };
        this.canvas.addEventListener('mouseup', (event) => {
            if (event.button === 1) stopPanning();
        });
        this.canvas.addEventListener('mouseleave', stopPanning);

        // --- WHEEL ZOOM EVENTS ---
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const worldX = (mouseX - CONFIG.CAMERA_X) / CONFIG.ZOOM;
            const worldY = (mouseY - CONFIG.CAMERA_Y) / CONFIG.ZOOM;

            const zoomChange = 0.1;
            
            if (event.deltaY < 0) {
                CONFIG.ZOOM += zoomChange;
            } else {
                CONFIG.ZOOM -= zoomChange;
            }
            CONFIG.ZOOM = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, CONFIG.ZOOM));

            CONFIG.CAMERA_X = mouseX - worldX * CONFIG.ZOOM;
            CONFIG.CAMERA_Y = mouseY - worldY * CONFIG.ZOOM;

            this.onMapUpdate();
        }, { passive: false });
    }

    handleTileClick(x,y) {
        console.log(`Clicked tile: ${x}, ${y}`);

        //temp hardcoding to turn a tile to a road
        if (this.cityMap[x][y].type === 'empty') {
            this.cityMap[x][y].type = 'road';
        } else {
            this.cityMap[x][y].type = 'empty';
        }

        //call update callback to tell main.js to redraw map
        this.onMapUpdate();
    }
}
