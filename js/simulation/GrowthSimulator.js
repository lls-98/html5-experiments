/**
 * GrowthSimulator Class
 * Resolves micro-scale cellular transformations across specific tiles.
 */
export class GrowthSimulator {
    constructor() {
        // Engine calculation scalar configurations
        this.growthThreshold = 15;
        this.decayThreshold = -25;
    }

    /**
     * Iterates across individual cells evaluating transformation parameters
     */
    update(worldState) {
        for (let y = 0; y < worldState.height; y++) {
            for (let x = 0; x < worldState.width; x++) {
                const idx = worldState.getIndex(x, y);
                const zone = worldState.zoneLayer[idx];

                // Process updates only if cell maps explicitly to an RCI zone designation
                if (zone >= 1 && zone <= 3) {
                    this.evaluateTileGrowth(worldState, x, y, idx, zone);
                }
            }
        }
    }

    /**
     * Resolves local growth potential parameters using localized array maps
     */
    evaluateTileGrowth(worldState, x, y, idx, zone) {
        const isPowered = worldState.powerLayer[idx];
        const hasRoadAccess = this.checkRoadAccess(worldState, x, y);
        
        // Match active macro demand variable tracking parameters
        let globalDemandFactor = 0;
        if (zone === 1) globalDemandFactor = worldState.demand.residential;
        if (zone === 2) globalDemandFactor = worldState.demand.commercial;
        if (zone === 3) globalDemandFactor = worldState.demand.industrial;

        // Calculate land value vectors and pollution drag factors
        const currentPollution = worldState.pollutionLayer[idx];
        const localizedLandValue = isPowered ? 40 : 10;

        // Compute Growth Potential Score Matrix Formula: Gp = Demand + (w * Infrastructure) - Penalty
        let growthPotential = globalDemandFactor + 
                             (isPowered * 30) + 
                             (hasRoadAccess * 25) + 
                             (localizedLandValue * 0.5) - 
                             (currentPollution * 0.2);

        const currentDensity = worldState.developmentLayer[idx];

        // Evaluate State Transitions boundaries
        if (growthPotential > this.growthThreshold && isPowered && hasRoadAccess) {
            // Increment population building milestones smoothly up to ceiling limits (Stage 4)
            if (currentDensity < 4 && Math.random() < 0.1) { // 10% execution chance per tick pass
                worldState.developmentLayer[idx]++;
            }
        } else if (growthPotential < this.decayThreshold || !isPowered) {
            // Trigger urban decay and abandon structures if core metrics collapse
            if (currentDensity > 0 && Math.random() < 0.15) {
                worldState.developmentLayer[idx]--;
            }
        }
    }

    /**
     * 5x5 Bounding Box Scanning Vector Loop
     * Verifies if a functional transit network element rests within 2 tiles proximity limits
     */
    checkRoadAccess(worldState, centerX, centerY) {
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const nx = centerX + dx;
                const ny = centerY + dy;

                if (worldState.isValidCoordinate(nx, ny)) {
                    if (worldState.zoneLayer[worldState.getIndex(nx, ny)] === 4) {
                        return 1; // Infrastructure element detected within safe bounds
                    }
                }
            }
        }
        return 0; // Zone isolated
    }
}