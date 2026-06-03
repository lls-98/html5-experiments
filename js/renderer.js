//drawing logic
import { CONFIG } from './config.js';

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        // Dynamically adjust internal drawing buffer size to fill screen instantly
        this.resize();
    }

    // Call this whenever the window shape changes
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    draw(cityMap) {
        //clear canvas
        this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.height);

        //save drawing state
        this.ctx.save();

        //move canvas to apply camera panning position
        this.ctx.translate(CONFIG.CAMERA_X, CONFIG.CAMERA_Y);

        //apply zoom multiplier transformation
        this.ctx.scale(CONFIG.ZOOM, CONFIG.ZOOM);

        //draw the map grid
        for (let x=0; x<CONFIG.MAP_SIZE; x++){
            for(let y=0; y<CONFIG.MAP_SIZE; y++){
                const tile = cityMap[x][y];

                //pick a color based on tile type
                if (tile.type === 'empty') this.ctx.fillStyle = '#388E3C';    // Grass Green
                if (tile.type === 'forest') this.ctx.fillStyle = '#1B5E20';   // Dense Forest Dark Green
                if (tile.type === 'sand') this.ctx.fillStyle = '#F0E68C';     // Beach Sand Khaki/Yellow
                if (tile.type === 'mountain') this.ctx.fillStyle = '#78909C'; // Mountain Rocky Slate Grey
                if (tile.type === 'road') this.ctx.fillStyle = '#424242';     // Road Dark Charcoal Grey (Kept for Loaded Files)
                if (tile.type === 'water') {
                    // 1. Give each tile a unique spatial pattern offset
                    const waveOffset = (x * 0.3) + (y * 0.5);
    
                    // 2. SLOW DOWN TIME: Changed multiplier from 0.05 to 0.015
                    const shimmerFactor = Math.sin((CONFIG.ANIMATION_FRAME * 0.015) + waveOffset);
    
                    // 3. WIDEN THRESHOLDS: Make the variations much tighter and less frequent
                    if (shimmerFactor > 0.85) {
                        this.ctx.fillStyle = '#1E88E5'; // Rare gentle crest highlight
                    } else if (shimmerFactor < -0.85) {
                        this.ctx.fillStyle = '#1565C0'; // Rare deep wave trough
                    } else {
                        this.ctx.fillStyle = '#1976D2'; // Mostly remains peaceful base water blue
                    }
                }
                if (tile.type === 'powerplant') {
                    // 1. Fill base campus floor compound layout
                    this.ctx.fillStyle = '#5c6bc0'; // Industrial Slate Purple/Blue
                    this.ctx.fillRect(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

                    // 2. Draw a distinctive perimeter border wall outline around the outer perimeter edges
                    this.ctx.strokeStyle = '#283593';
                    this.ctx.lineWidth = 2;

                    if (tile.offsetX === 0) { // Left Edge Wall
                        this.ctx.beginPath();
                        this.ctx.moveTo(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE);
                        this.ctx.lineTo(x * CONFIG.TILE_SIZE, (y + 1) * CONFIG.TILE_SIZE);
                        this.ctx.stroke();
                    }
                    if (tile.offsetX === 3) { // Right Edge Wall
                        this.ctx.beginPath();
                        this.ctx.moveTo((x + 1) * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE);
                        this.ctx.lineTo((x + 1) * CONFIG.TILE_SIZE, (y + 1) * CONFIG.TILE_SIZE);
                        this.ctx.stroke();
                    }
                    if (tile.offsetY === 0) { // Top Edge Wall
                        this.ctx.beginPath();
                        this.ctx.moveTo(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE);
                        this.ctx.lineTo((x + 1) * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE);
                        this.ctx.stroke();
                    }
                    if (tile.offsetY === 3) { // Bottom Edge Wall
                        this.ctx.beginPath();
                        this.ctx.moveTo(x * CONFIG.TILE_SIZE, (y + 1) * CONFIG.TILE_SIZE);
                        this.ctx.lineTo((x + 1) * CONFIG.TILE_SIZE, (y + 1) * CONFIG.TILE_SIZE);
                        this.ctx.stroke();
                    }

                    // 3. Paint a cooling tower asset indicator emblem right in the center quadrant squares
                    if ((tile.offsetX === 1 || tile.offsetX === 2) && (tile.offsetY === 1 || tile.offsetY === 2)) {
                        this.ctx.fillStyle = '#cfd8dc'; // Light cooling tower concrete color
                        this.ctx.fillRect(
                            x * CONFIG.TILE_SIZE + 4, 
                            y * CONFIG.TILE_SIZE + 4, 
                            CONFIG.TILE_SIZE - 8, 
                            CONFIG.TILE_SIZE - 8
                        );
                        
                        // Add dark smoke vent indicator points in core centers
                        this.ctx.fillStyle = '#37474f';
                        this.ctx.fillRect(
                            x * CONFIG.TILE_SIZE + 12, 
                            y * CONFIG.TILE_SIZE + 12, 
                            8, 
                            8
                        );
                    }
                }
                //draw the tile smaller than tile-size to create grid effect
                this.ctx.fillRect(
                    x * CONFIG.TILE_SIZE,
                    y * CONFIG.TILE_SIZE,
                    CONFIG.TILE_SIZE,
                    CONFIG.TILE_SIZE
                );
            }
        }

        if (CONFIG.HOVER_X !== -1 && CONFIG.HOVER_Y !== -1 && document.getElementById('terrain-sidebar').classList.contains('hidden')) {
            if (CONFIG.CURRENT_TOOL === 'powerplant') {
                const size = 4;
                const previewX = CONFIG.HOVER_X - 2;
                const previewY = CONFIG.HOVER_Y - 2;

                this.ctx.save();
                
                // 1. Check if the blueprint runs off the edges of the map array
                let isBlocked = (previewX < 0 || previewY < 0 || previewX + size > CONFIG.MAP_SIZE || previewY + size > CONFIG.MAP_SIZE);
                
                // 2. REAL-TIME COLLISION CHECK: If inside boundaries, scan all 16 underlying tiles
                if (!isBlocked) {
                    for (let x = previewX; x < previewX + size; x++) {
                        for (let y = previewY; y < previewY + size; y++) {
                            // If any single cell is NOT clear empty grass, block the placement visually!
                            if (cityMap[x][y].type !== 'empty') {
                                isBlocked = true;
                                break; // Stop scanning immediately once a collision is found
                            }
                        }
                        if (isBlocked) break;
                    }
                }
                
                // 3. Assign color based on the finalized state
                if (isBlocked) {
                    this.ctx.fillStyle = 'rgba(211, 47, 47, 0.45)';  // Warning Red Overlay
                    this.ctx.strokeStyle = '#D32F2F';
                } else {
                    this.ctx.fillStyle = 'rgba(255, 235, 59, 0.35)'; // Safe Blueprint Yellow
                    this.ctx.strokeStyle = '#FBC02D';
                }
                
                this.ctx.lineWidth = 3;

                this.ctx.fillRect(
                    previewX * CONFIG.TILE_SIZE,
                    previewY * CONFIG.TILE_SIZE,
                    size * CONFIG.TILE_SIZE,
                    size * CONFIG.TILE_SIZE
                );
                this.ctx.strokeRect(
                    previewX * CONFIG.TILE_SIZE,
                    previewY * CONFIG.TILE_SIZE,
                    size * CONFIG.TILE_SIZE,
                    size * CONFIG.TILE_SIZE
                );

                this.ctx.restore();
            }
        }

        this.drawGridLines();
        //restore the drawing state to avoid double-scaling
        this.ctx.restore();
    }

    drawGridLines() {
        const mapPixelSize = CONFIG.MAP_SIZE * CONFIG.TILE_SIZE;

        this.ctx.beginPath();
        //set the grid line style
        this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        this.ctx.lineWidth = 1;

        //draw vert lines
        for (let x=0; x<=CONFIG.MAP_SIZE; x++) {
            const lineX = x * CONFIG.TILE_SIZE;
            this.ctx.moveTo(lineX, 0);
            this.ctx.lineTo(lineX, mapPixelSize);
        }
        
        //draw horizontal lines
        for (let y=0; y<=CONFIG.MAP_SIZE; y++) {
            const lineY = y * CONFIG.TILE_SIZE;
            this.ctx.moveTo(0, lineY);
            this.ctx.lineTo(mapPixelSize, lineY);
        }

        this.ctx.stroke();
    }
}