/**
 * CanvasView Class
 * Responsible for viewport management and forward rendering matrix math.
 */
export class CanvasView {
    constructor(canvasId, worldState) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.state = worldState;

        // Base Rendering Dimension Variables
        this.tileSize = 16; // Native scale factor per grid cell
        this.scale = 2.0;   // Zoom factor scalar (k)
        
        // Panning Position Matrix Offsets (Tx, Ty)
        // Defaults center the map slightly on screen load
        this.panX = 40;
        this.panY = 40;

        // Establish strict pixel matching ratios
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Resizes the canvas execution size to match DOM scale ratios cleanly
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Ensure pixel art elements stay crisp on scaled monitors
        this.ctx.imageSmoothingEnabled = false;
    }

    /**
     * Complete frame draw pass execution loop.
     * Maps flat grid indices to view-space coordinates (Forward Projection).
     */
    render() {
        // Clear background with uniform color
        this.ctx.fillStyle = '#222222';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const currentTileSize = this.tileSize * this.scale;

        // Render Loop: Iterate over the internal 1D map grid dimensions
        for (let y = 0; y < this.state.height; y++) {
            for (let x = 0; x < this.state.width; x++) {
                const idx = this.state.getIndex(x, y);
                const zoneType = this.state.zoneLayer[idx];
                const density = this.state.developmentLayer[idx];

                // Calculate screen render placement using Forward Projection Math:
                // px = (x * S * k) + Tx
                // py = (y * S * k) + Ty
                const px = (x * currentTileSize) + this.panX;
                const py = (y * currentTileSize) + this.panY;

                // View Frustum Culling Boundary check: 
                // Skip rendering cells outside active viewing frame to save GPU cycles
                if (px + currentTileSize < 0 || px > this.canvas.width ||
                    py + currentTileSize < 0 || py > this.canvas.height) {
                    continue;
                }

                // Pick draw color configuration depending on underlying Zone index mapping
                switch (zoneType) {
                    case 1: // Residential (Green shades based on development density)
                        this.ctx.fillStyle = `rgb(0, ${100 + (density * 35)}, 0)`;
                        break;
                    case 2: // Commercial (Blue shades)
                        this.ctx.fillStyle = `rgb(0, 0, ${100 + (density * 35)})`;
                        break;
                    case 3: // Industrial (Yellow/Orange shades)
                        this.ctx.fillStyle = `rgb(${120 + (density * 30)}, ${120 + (density * 30)}, 0)`;
                        break;
                    case 4: // Road Infrastructure (Solid Dark Grey)
                        this.ctx.fillStyle = '#444444';
                        break;
                    case 5: // Power Line (Cyan if powered, Dark Red-Brown if unpowered)
                        this.ctx.fillStyle = this.state.powerLayer[idx] === 1 ? '#00ffff' : '#552222';
                        break;
                    case 6: // Power Plant Generator Source (Bright Purple Matrix Cell)
                        this.ctx.fillStyle = '#aa00ff';
                        break;
                    default: // Empty Terrain / Agriculture
                        this.ctx.fillStyle = '#2d2d2d';
                        break;
                }

                // Draw cell footprint base outline
                this.ctx.fillRect(px, py, currentTileSize - 1, currentTileSize - 1);

                // If density states exist, draw a simple layout box to represent building growth
                if (zoneType > 0 && density > 0) {
                    this.ctx.fillStyle = '#ffffff';
                    const padding = currentTileSize * 0.25;
                    this.ctx.fillRect(
                        px + padding, 
                        py + padding, 
                        currentTileSize - (padding * 2), 
                        currentTileSize - (padding * 2)
                    );
                }
            }
        }
    }
}