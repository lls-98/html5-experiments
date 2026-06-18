/**
 * WorldState Class
 * Core single source of truth for structural maps and metrics.
 */
export class WorldState {
    constructor(width = 64, height = 64) {
        this.width = width;
        this.height = height;
        this.mapSize = width * height;

        // Base Economic Metrics
        this.funds = 20000;
        this.taxRate = 0.07;
        this.gameTickCount = 0;
        this.visualTime = 0;
        
        this.demand = {
            residential: 0.0,
            commercial: 0.0,
            industrial: 0.0
        };

        // NEW: Historical Data Array for Graph Processing
        // Pre-seeded with year 0 initial baseline statistics
        this.historyLog = [
            { year: 0, funds: 20000, population: 0, upkeep: 0 }
        ];

        // Flat Layered Grid Buffers
        this.zoneLayer = new Uint8Array(this.mapSize);
        this.developmentLayer = new Uint8Array(this.mapSize);
        this.powerLayer = new Uint8Array(this.mapSize);
        this.pollutionLayer = new Uint8Array(this.mapSize);
        // NEW: Traffic Density Buffer (0 = Empty/No Traffic, 255 = Maximum Gridlock)
        this.trafficLayer = new Uint8Array(this.mapSize);
        this._generateMockMap();
    }

    /**
     * Converts a 2D Cartesian coordinate into a flat 1D array string index
     */
    getIndex(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
        return (y * this.width) + x;
    }

    /**
     * Checks boundaries to prevent indexing errors
     */
    isValidCoordinate(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    /**
     * Internal seed method generating an explicit checkerboard pattern 
     * to verify layer reads in the Walking Skeleton stage.
     */
    _generateMockMap() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = this.getIndex(x, y);
                // Create checkerboard zones: alternating types 0, 1, 2, 3
                if ((x + y) % 2 === 0) {
                    this.zoneLayer[idx] = (x % 3) + 1; // R, C, or I
                    this.developmentLayer[idx] = Math.floor(Math.random() * 5); // Mock density states 0-4
                } else {
                    this.zoneLayer[idx] = 0; // Empty
                }
            }
        }
    }

    /**
     * Resets the entire object layer footprint and rolls metrics back to starting variables
     */
    resetToDefaultState() {
        this.funds = 20000;
        this.taxRate = 0.07;
        this.gameTickCount = 0;
        
        this.demand = {
            residential: 0.0,
            commercial: 0.0,
            industrial: 0.0
        };

        // Re-seed historical logging matrix entries back to clean year 0 defaults
        this.historyLog = [
            { year: 0, funds: 20000, population: 0, upkeep: 0 }
        ];

        // Zero out binary typed array memory allocations completely
        this.zoneLayer.fill(0);
        this.developmentLayer.fill(0);
        this.powerLayer.fill(0);
        this.pollutionLayer.fill(0);

        // Regenerate original grid framework checkerboard configurations
        this._generateMockMap();
        console.log("Memory grids wiped clean and re-seeded successfully.");
    }
}