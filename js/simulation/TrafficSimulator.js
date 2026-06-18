/**
 * TrafficSimulator Class
 * Calculates localized road congestion vectors based on adjacent zone development densities.
 */
export class TrafficSimulator {
    constructor() {
        // Multipliers defining how much congestion each zone type creates on nearby roads
        this.generationWeights = {
            1: 15,  // Residential density traffic weight
            2: 25,  // Commercial density traffic weight (shopping/business congestion)
            3: 20   // Industrial density traffic weight (freight/freeway load)
        };
    }

    /**
     * Loops through the map grid and computes localized congestion values
     */
    update(worldState) {
        const width = worldState.width;
        const height = worldState.height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = worldState.getIndex(x, y);

                // If this tile isn't a road network node, it has no traffic capacity
                if (worldState.zoneLayer[idx] !== 4) {
                    worldState.trafficLayer[idx] = 0;
                    continue;
                }

                // Road found! Aggregate the density of all 8 surrounding neighbor cells
                let accumulatedTraffic = 0;

                for (let dY = -1; dY <= 1; dY++) {
                    for (let dX = -1; dX <= 1; dX++) {
                        const nX = x + dX;
                        const nY = y + dY;

                        // Verify boundary check constraints
                        if (worldState.isValidCoordinate(nX, nY)) {
                            const nIdx = worldState.getIndex(nX, nY);
                            const neighborZone = worldState.zoneLayer[nIdx];
                            const neighborDensity = worldState.developmentLayer[nIdx];

                            // If neighbor is an active zone, add its weight multiplied by its current growth stage
                            if (this.generationWeights[neighborZone]) {
                                accumulatedTraffic += neighborDensity * this.generationWeights[neighborZone];
                            }
                        }
                    }
                }

                // Clamp the calculated value safely between 0 and 255 into our byte buffer
                worldState.trafficLayer[idx] = Math.max(0, Math.min(255, accumulatedTraffic));
            }
        }
    }
}