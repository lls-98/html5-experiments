// js/worker/systems/environment.js - High-Velocity Cellular Advection-Diffusion

/**
 * 🌪️ RUN ENVIRONMENTAL POLLUTION DIFFUSION & WIND ADVECTION (Task 3.3 - RE-ENGINEERED)
 * High-performance advection grid loop with true directional offset shifting.
 */
function solvePollutionDiffusion(zoneGrid, densityGrid, trafficGrid, pollutionGrid, mapW, mapH) {
    const totalCells = mapW * mapH;

    if (!self.pollutionScratch || self.pollutionScratch.length !== totalCells) {
        self.pollutionScratch = new Float32Array(totalCells);
    }
    const nextPollution = self.pollutionScratch;
    nextPollution.fill(0.0);

    const ZONE_ROAD = 50;
    const ZONE_IND_LIGHT = 30;
    const ZONE_IND_HEAVY = 31;
    const ZONE_POWER_PLANT = 99;

    // 1. PASS ONE: EMISSION INJECTION
    for (let i = 0; i < totalCells; i++) {
        const zone = zoneGrid[i];
        const density = densityGrid[i];
        if (zone === 0) continue;

        let emission = 0.0;
        if (zone === ZONE_IND_HEAVY)   emission = density * 1.6;  
        if (zone === ZONE_IND_LIGHT)   emission = density * 0.4;  
        if (zone === ZONE_POWER_PLANT) emission = 2.2;            
        
        if (zone === ZONE_ROAD && trafficGrid) {
            emission = trafficGrid[i] * 0.6;
        }

        if (emission > 0) {
            pollutionGrid[i] = Math.min(3.0, pollutionGrid[i] + emission);
        }
    }

    // 2. PASS TWO: DIRECTIONAL ADVECTION-DIFFUSION STAGE
    // Global Wind Vector: Driving diagonally North-East (dX = +1, dY = -1)
    const dX = 1;
    const dY = -1;
    
    const windSpeed = 0.45;       // Strength of the structural drift push (0.0 to 1.0)
    const diffusionRate = 0.15;   // Uniform ambient dissipation bleed

    for (let y = 0; y < mapH; y++) {
        for (let x = 0; x < mapW; x++) {
            const idx = y * mapW + x;
            const currentGas = pollutionGrid[idx];

            if (currentGas < 0.01) continue;

            // Calculate target coordinate cell directly downwind based on vector
            const targetX = x + dX;
            const targetY = y + dY;

            // Verify the wind coordinate lands cleanly within the grid borders
            if (targetX >= 0 && targetX < mapW && targetY >= 0 && targetY < mapH) {
                const targetIdx = targetY * mapW + targetX;
                
                // Shift a clear structural block of gas downwind
                const advectedAmount = currentGas * windSpeed;
                nextPollution[targetIdx] += advectedAmount;
                
                // Diffuse a small remnant fraction locally to the standard neighbor array
                const neighbors = get8Neighbors(idx, mapW, mapH);
                let distributedDiffusion = 0.0;
                
                for (const dir in neighbors) {
                    const nIdx = neighbors[dir];
                    if (nIdx !== null) {
                        const diffAmt = currentGas * diffusionRate * 0.1;
                        nextPollution[nIdx] += diffAmt;
                        distributedDiffusion += diffAmt;
                    }
                }

                // Retain leftovers in the original cell structure
                nextPollution[idx] += Math.max(0, currentGas - advectedAmount - distributedDiffusion);
            } else {
                // If on the map edge, allow pollution to simply blow out into the abyss
                nextPollution[idx] += currentGas * (1.0 - windSpeed);
            }
        }
    }

    // 3. PASS THREE: GLOBAL EVAPORATION BLEND
    for (let i = 0; i < totalCells; i++) {
        pollutionGrid[i] = nextPollution[i] * 0.95; // Steady clean-air clearing factor
    }
}

/**
 * 🏥 LAGGING BIOLOGICAL HEALTH ACCUMULATOR CELL MATRIX
 */
function updateCellularHealthMatrix(zoneGrid, pollutionGrid, healthGrid, mapW, mapH) {
    const totalCells = zoneGrid.length;
    let aggregateHealthSum = 0.0;
    let urbanCellCount = 0;

    for (let i = 0; i < totalCells; i++) {
        const zone = zoneGrid[i];
        if (zone === 0 || zone === 50 || zone === 99) continue;

        urbanCellCount++;
        const localPollution = pollutionGrid[i];

        if (localPollution > 0.3) {
            const damageVelocity = (localPollution - 0.3) * 0.025;
            healthGrid[i] = Math.max(0.05, healthGrid[i] - damageVelocity);
        } else {
            healthGrid[i] = Math.min(1.0, healthGrid[i] + 0.02);
        }

        aggregateHealthSum += healthGrid[i];
    }

    return urbanCellCount > 0 ? (aggregateHealthSum / urbanCellCount) : 1.0;
}