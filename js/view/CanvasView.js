/**
 * CanvasView Class
 * Handles viewport management, map projection grids, and retro vector chart graphing passes.
 */
export class CanvasView {
    constructor(canvasId, worldState) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.state = worldState;

        this.tileSize = 16;
        this.scale = 2.0;   
        this.panX = 40;
        this.panY = 40;

        // Visual layout modes switcher state: 'MAP' or 'GRAPH'
        this.viewMode = 'MAP'; 

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx.imageSmoothingEnabled = false;
    }

    /**
     * Central rendering router pass
     */
    render() {
        if (this.viewMode === 'MAP') {
            this._renderMapGrid();
        } else if (this.viewMode === 'GRAPH') {
            this._renderVectorGraphs();
        }
    }

    /**
     * Map Grid Layer Drawing Pass (Existing logic encapsulated)
     */
    _renderMapGrid() {
        this.ctx.fillStyle = '#111111'; // Dark screen base
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const currentTileSize = this.tileSize * this.scale;

        for (let y = 0; y < this.state.height; y++) {
            for (let x = 0; x < this.state.width; x++) {
                const idx = this.state.getIndex(x, y);
                const zoneType = this.state.zoneLayer[idx];
                const density = this.state.developmentLayer[idx];

                const px = (x * currentTileSize) + this.panX;
                const py = (y * currentTileSize) + this.panY;

                if (px + currentTileSize < 0 || px > this.canvas.width ||
                    py + currentTileSize < 0 || py > this.canvas.height) {
                    continue;
                }

                switch (zoneType) {
                    case 1: this.ctx.fillStyle = `rgb(0, ${100 + (density * 35)}, 0)`; break; // R
                    case 2: this.ctx.fillStyle = `rgb(0, 0, ${100 + (density * 35)})`; break; // C
                    case 3: this.ctx.fillStyle = `rgb(${120 + (density * 30)}, ${120 + (density * 30)}, 0)`; break; // I
                    case 4: // Road Network Node
                        const trafficVolume = this.state.trafficLayer[idx];
                        
                        if (trafficVolume > 10) {
                            // Toned-down multipliers to make the wave transition smooth and deliberate
                            const baseFrequency = 1.2;
                            const congestionFactor = (trafficVolume / 255) * 2.0;
                            
                            // FIXED: Using state.visualTime ties the wave directly to the running timeline loop
                            const waveAngle = this.state.visualTime * (baseFrequency + congestionFactor);
                            
                            // Generates a smooth, balanced glow rhythm bound between 0.25 and 0.95 opacity
                            const pulseAlpha = 0.25 + (Math.sin(waveAngle) + 1) * 0.35;
                            
                            this.ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha})`;
                        } else {
                            // Empty or low-density streets remain a steady, static terminal gray
                            this.ctx.fillStyle = '#2a2a2a';
                        }
                        break;
                    case 5: this.ctx.fillStyle = this.state.powerLayer[idx] === 1 ? '#00ffff' : '#442222'; break; // Wire
                    case 6: this.ctx.fillStyle = '#8800cc'; break; // Plant
                    default: this.ctx.fillStyle = '#171717'; break; // Empty
                }

                this.ctx.fillRect(px, py, currentTileSize - 1, currentTileSize - 1);

                if (zoneType > 0 && zoneType <= 3 && density > 0) {
                    this.ctx.fillStyle = '#00ff00';
                    this.ctx.strokeRect(px + 3, py + 3, currentTileSize - 6, currentTileSize - 6);
                }
            }
        }
    }

    /**
     * Vector Graphs Layer Drawing Pass
     * Renders rolling historical data rows as terminal-line vector graph overlays.
     */
    _renderVectorGraphs() {
        // Clear viewport with diagnostic radar deep green-black tint
        this.ctx.fillStyle = '#050a05';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const margin = 80;
        const graphWidth = this.canvas.width - (margin * 2);
        const graphHeight = this.canvas.height - (margin * 2);

        // 1. Draw Terminal Scope Frame Grids
        this.ctx.strokeStyle = '#004400';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= 4; i++) {
            const yOffset = margin + (graphHeight * (i / 4));
            this.ctx.beginPath();
            this.ctx.moveTo(margin, yOffset);
            this.ctx.lineTo(this.canvas.width - margin, yOffset);
            this.ctx.stroke();
        }

        const dataPoints = this.state.historyLog || [];
        if (dataPoints.length < 2) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("COLLECTING FISCAL YEAR LOG DATA... PLEASE WAIT", this.canvas.width / 2, this.canvas.height / 2);
            return;
        }

        // 2. HARDENED BOUNDARY AUDIT: Strip out anomalies before passing to Math.max
        const validFunds = dataPoints.map(d => Math.abs(d.funds)).filter(v => !isNaN(v) && isFinite(v));
        const validPop = dataPoints.map(d => d.population).filter(v => !isNaN(v) && isFinite(v));

        const maxFunds = validFunds.length > 0 ? Math.max(...validFunds, 10000) : 10000;
        const maxPop = validPop.length > 0 ? Math.max(...validPop, 100) : 100;

        // 3. Mathematical Vector Data Mapping Plotter
        const drawVectorLine = (valueExtractor, maxScaleBound, color) => {
            // Absolute division-by-zero sentinel protection
            const safeScale = maxScaleBound <= 0 || isNaN(maxScaleBound) ? 1 : maxScaleBound;
            
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            let hasMovedToFirstPoint = false;

            for (let i = 0; i < dataPoints.length; i++) {
                const rawVal = valueExtractor(dataPoints[i]);
                
                // Skip rendering individual segment if corrupted data row is found
                if (isNaN(rawVal) || !isFinite(rawVal)) continue;

                const xPos = margin + (i / (dataPoints.length - 1)) * graphWidth;
                const normalizedValue = rawVal / safeScale;
                const yPos = (margin + graphHeight) - (normalizedValue * graphHeight);

                if (!hasMovedToFirstPoint) {
                    this.ctx.moveTo(xPos, yPos);
                    hasMovedToFirstPoint = true;
                } else {
                    this.ctx.lineTo(xPos, yPos);
                }
            }
            this.ctx.stroke();
        };

        // Plot Line Data Sets safely
        drawVectorLine(d => d.funds, maxFunds, '#00ff00');      
        drawVectorLine(d => d.population, maxPop, '#ff00ff'); 

        // 4. Render Terminal Metrics Text Legends
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';

        this.ctx.fillText(`ANALYTICS ENGINE DATA SCOPE: ROLLING FISCAL LOG HISTORY`, margin, margin - 40);
        
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillText(`[── GREEN: TREASURY VALUE (MAX: $${maxFunds})]`, margin, margin - 15);
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.fillText(`[── MAGENTA: MUNICIPAL POPULATION (MAX: ${maxPop} POP Units)]`, margin + 300, margin - 15);

        this.ctx.fillStyle = '#004400';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Y-AXIS RANGE CEILING [100%]`, this.canvas.width - margin, margin - 8);
        this.ctx.fillText(`TIME HORIZON (YEAR ${dataPoints[dataPoints.length - 1].year}) ──>`, this.canvas.width - margin, this.canvas.height - margin + 25);
    }
}