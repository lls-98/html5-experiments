//input logic

import { CONFIG } from './config.js';

export class InputHandler {
    constructor(canvasId, cityMap, onMapUpdate, getGamePhase) {
        this.canvas = document.getElementById(canvasId);
        this.cityMap = cityMap;
        this.onMapUpdate = onMapUpdate;
        this.getGamePhase = getGamePhase; 

        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;

        this.initListeners();
    }

    initListeners() {
        // --- CLICK EVENTS ---
        this.canvas.addEventListener('click', (event) => {
            if (event.button !== 0) return; // Only process left clicks

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const worldX = (mouseX - CONFIG.CAMERA_X) / CONFIG.ZOOM;
            const worldY = (mouseY - CONFIG.CAMERA_Y) / CONFIG.ZOOM;

            const gridX = Math.floor(worldX / CONFIG.TILE_SIZE);
            const gridY = Math.floor(worldY / CONFIG.TILE_SIZE);

            // Bounds check
            if (gridX >= 0 && gridX < CONFIG.MAP_SIZE && gridY >= 0 && gridY < CONFIG.MAP_SIZE) {
                this.handleMapInteraction(gridX, gridY);
            }
        });

        // --- NEW: PANNING MOUSE DOWN ---
        this.canvas.addEventListener('mousedown', (event) => {
            // 1. Check if it's the middle mouse button (button code 1)
            if (event.button === 1) {
                event.preventDefault(); 
                this.isPanning = true; // <--- Turn it ON
                
                // Lock in the anchor point relative to current camera values
                this.startX = event.clientX - CONFIG.CAMERA_X;
                this.startY = event.clientY - CONFIG.CAMERA_Y;
            }
        });

        // --- PANNING MOUSE MOVE ---
        this.canvas.addEventListener('mousemove', (event) => {
            if (this.isPanning) {
                // This math is only safe to run if mousedown turned isPanning to true!
                CONFIG.CAMERA_X = event.clientX - this.startX;
                CONFIG.CAMERA_Y = event.clientY - this.startY;
                
                CONFIG.HOVER_X = -1;
                CONFIG.HOVER_Y = -1;
                return; 
            }
            // 2. IF NOT PANNING: Calculate grid tile hover coordinates
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const worldX = (mouseX - CONFIG.CAMERA_X) / CONFIG.ZOOM;
            const worldY = (mouseY - CONFIG.CAMERA_Y) / CONFIG.ZOOM;

            const gridX = Math.floor(worldX / CONFIG.TILE_SIZE);
            const gridY = Math.floor(worldY / CONFIG.TILE_SIZE);

            // Lock in coordinates if the cursor is within map boundary lines
            if (gridX >= 0 && gridX < CONFIG.MAP_SIZE && gridY >= 0 && gridY < CONFIG.MAP_SIZE) {
                CONFIG.HOVER_X = gridX;
                CONFIG.HOVER_Y = gridY;
            } else {
                CONFIG.HOVER_X = -1;
                CONFIG.HOVER_Y = -1;
            }
        });

        // --- PANNING MOUSE UP & LEAVE ---
        const stopPanning = () => { 
            this.isPanning = false; // <--- Turn it OFF cleanly!
        };

        this.canvas.addEventListener('mouseup', (event) => {
            if (event.button === 1) stopPanning();
        });

        // Safety check: if the user drags their mouse completely off the screen, stop panning
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

    // NEW: Branch out logic between Terrain Editing and City Construction
    handleMapInteraction(x, y) {
        const currentPhase = this.getGamePhase();

        if (currentPhase === 'terrain') {
            // Standard map brush painting rules
            this.cityMap[x][y].type = CONFIG.CURRENT_BRUSH;
        } 
        else if (currentPhase === 'simulation') {
            // Handle City Construction Tools
            this.executeBuildTool(x, y);
        }

        this.onMapUpdate();
    }
    // NEW: Processing construction tools
    executeBuildTool(clickX, clickY) {
        // --- TOOL 1: SMART BULLDOZER ---
        if (CONFIG.CURRENT_TOOL === 'bulldozer') {
            const targetTile = this.cityMap[clickX][clickY];

            // If it's a multi-tile structure like a powerplant, wipe the whole complex
            if (targetTile.type === 'powerplant' && targetTile.buildingId) {
                const idToDemolish = targetTile.buildingId;
                console.log(`Demolishing Power Plant complex: ${idToDemolish}`);

                // Scan the entire map to find and clear all matching pieces
                for (let x = 0; x < CONFIG.MAP_SIZE; x++) {
                    for (let y = 0; y < CONFIG.MAP_SIZE; y++) {
                        if (this.cityMap[x][y].buildingId === idToDemolish) {
                            this.cityMap[x][y] = { type: 'empty', powered: false };
                        }
                    }
                }
            } else {
                // Otherwise, treat it as a standard single-tile clear brush
                this.cityMap[clickX][clickY] = { type: 'empty', powered: false };
            }
            return;
        }
        
        if (CONFIG.CURRENT_TOOL === 'query') {
            console.log(`Querying metadata attributes for grid square: (${clickX}, ${clickY})`);
            // Custom retro inspecting logic goes here!
            return;
        }

        // --- TOOL 2: POWER PLANT ---
        if (CONFIG.CURRENT_TOOL === 'powerplant') {
            const size = 4;
            const startX = clickX - 2;
            const startY = clickY - 2;

            // 1. BOUNDARY VALIDATION CHECK
            if (startX < 0 || startY < 0 || startX + size > CONFIG.MAP_SIZE || startY + size > CONFIG.MAP_SIZE) {
                console.warn("Power Plant placement cuts off map boundaries!");
                return;
            }

            // 2. FIXED COLLISION CHECK: Ensure ALL 16 target tiles are completely clear grass
            for (let x = startX; x < startX + size; x++) {
                for (let y = startY; y < startY + size; y++) {
                    const tile = this.cityMap[x][y];
                    
                    if (tile.type !== 'empty') {
                        console.warn("Placement blocked: target tile is occupied."); // Silent fail
                        return; // Exit out cleanly without dropping an alert box!
                    }
                }
            }

            // 3. SEED GENERATION ID
            const plantId = `pp_${Date.now()}`;

            // 4. PLACEMENT
            for (let x = startX; x < startX + size; x++) {
                for (let y = startY; y < startY + size; y++) {
                    this.cityMap[x][y] = {
                        type: 'powerplant',
                        parentX: startX, 
                        parentY: startY,
                        buildingId: plantId,
                        offsetX: x - startX, 
                        offsetY: y - startY 
                    };
                }
            }
            console.log(`Placed 4x4 Power Plant centered around click position (${clickX}, ${clickY})`);
        }
    }
}
/*   handleTileClick(x,y) {
        console.log(`Painting tile: ${x}, ${y} with brush: ${CONFIG.CURRENT_BRUSH}`);
    
        // Grab a clean pointer variable reference
        const currentTile = this.cityMap[x][y];
    
        // Assign the active global brush asset assignment directly
        currentTile.type = CONFIG.CURRENT_BRUSH;

        //call update callback to tell main.js to redraw map
        this.onMapUpdate();
    }
} */
