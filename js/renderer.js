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
                if (tile.type === 'empty') {
                    this.ctx.fillStyle = '#388e3c';
                } else if (tile.type === 'road') {
                    this.ctx.fillStyle = '#424242';
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