// js/worker/systems/zoning.js - Advanced Multi-Zoning Growth, Local Mixed-Use Solvers, and Wealth Dynamics

const ZONES = {
    VACANT: 0,
    R_LOW: 1, R_MED: 2, R_HIGH: 3,
    PUB_LOW: 4, PUB_MED: 5, PUB_HIGH: 6,      // 🏢 Public/Social Housing (High floor, low wealth caps)
    C_LOW: 10, C_MED: 11, C_HIGH: 12,
    OFF_LOW: 15, OFF_MED: 16, OFF_HIGH: 17,
    MIX_LOW: 20, MIX_MED: 21, MIX_HIGH: 22,   // 🏢 Mixed-Use Residential/Commercial Conduits
    IND_LIGHT: 30, IND_HEAVY: 31,
    AGRI: 35,
    ROAD: 50,
    POWER_PLANT: 99
};

function simulateZoningGrowth(zoneGrid, densityGrid, powerGrid, demand, mapW, mapH) {
    // Note: self.trafficGrid is globally available in the worker via sim-worker.js
    const traffic = self.trafficGrid;
    const wealth = self.wealthGrid;

    for (let i = 0; i < zoneGrid.length; i++) {
        const zone = zoneGrid[i];
        if (zone === ZONES.VACANT || zone === ZONES.ROAD || zone === ZONES.POWER_PLANT) continue;

        const neighbors = get8Neighbors(i, mapW, mapH);
        let hasPower = powerGrid[i] > 0.1;

        // Scan neighbors for power if cell isn't directly electrified
        if (!hasPower) {
            for (const dir in neighbors) {
                const nIdx = neighbors[dir];
                if (nIdx !== null && zoneGrid[nIdx] === ZONES.ROAD && powerGrid[nIdx] > 0.1) {
                    hasPower = true;
                    break;
                }
            }
        }

        let zoneDemand = 0.005;
        let requiresPower = true;
        let isPublicHousing = false;
        let isMixedUse = false;

        // A. CATEGORIZE DEMAND MATRICES
        if (zone >= ZONES.R_LOW && zone <= ZONES.R_HIGH) {
            zoneDemand = demand.R;
        } 
        else if (zone >= ZONES.PUB_LOW && zone <= ZONES.PUB_HIGH) {
            zoneDemand = demand.R * 1.3; // Social housing has an accelerated regulatory absorption rate
            requiresPower = true;
            isPublicHousing = true;
        }
        else if (zone >= ZONES.C_LOW && zone <= ZONES.OFF_HIGH) {
            zoneDemand = demand.C;
        }
        else if (zone >= ZONES.MIX_LOW && zone <= ZONES.MIX_HIGH) {
            zoneDemand = (demand.R + demand.C) / 2; // Aggregated demand index
            isMixedUse = true;
        }
        else if (zone === ZONES.IND_LIGHT || zone === ZONES.IND_HEAVY || zone === ZONES.AGRI) {
            zoneDemand = demand.I;
            if (zone === ZONES.AGRI || zone === ZONES.IND_HEAVY) requiresPower = false;
        }

        // B. EXECUTE SPATIAL CELL OPTIMIZATION
        if (hasPower || !requiresPower) {
            if (zoneDemand > 0) {
                let growthRate = zoneDemand;
                
                // High density builds compress slower
                if (zone === ZONES.R_HIGH || zone === ZONES.C_HIGH || zone === ZONES.OFF_HIGH || zone === ZONES.MIX_HIGH) {
                    growthRate *= 0.6;
                }

                // 🧠 MIXED-USE LOCAL OPTIMIZATION LOOP
                // If a mixed-use cell experiences high localized commuter traffic stress on its roads,
                // it optimizes internally (substituting out-of-cell commuting with hyper-local internal commerce).
                if (isMixedUse && traffic && traffic[i] > 0.3) {
                    growthRate *= 1.4; // Local efficiency boost
                    traffic[i] = Math.max(0, traffic[i] - 0.15); // Relieve nearby network pipe stress!
                }

                densityGrid[i] = Math.min(1.0, densityGrid[i] + growthRate);
            } else if (zoneDemand < -0.01) {
                // Decay density if regional demand hits negative thresholds
                densityGrid[i] = Math.max(0.01, densityGrid[i] + zoneDemand);
            }
        }

        // C. WEALTH & SOCIAL MOBILITY GRADIENTS
        if (densityGrid[i] > 0.1) {
            if (isPublicHousing) {
                // Public housing maintains a tight, predictable middle-low income bracket
                wealth[i] = 0.25; 
            } else {
                // Organic wealth accumulation based on local density and infrastructure availability (electricity)
                const powerBonus = hasPower ? 0.004 : -0.002;
                const trafficPenalty = (traffic && traffic[i] > 0.6) ? -0.003 : 0.002;
                
                wealth[i] = Math.max(0.0, Math.min(1.0, wealth[i] + powerBonus + trafficPenalty));
            }
        }
    }
}

/**
 * 📊 PROGRESSIVE TAX TICK ENGINE & INEQUALITY REBALANCER
 * Evaluates fiscal performance, safety net distributions, and triggers high-bracket capital flight.
 */
function evaluateTaxationAndSocialSafety(zoneGrid, densityGrid, wealthGrid, mapW, mapH) {
    const totalCells = zoneGrid.length;
    
    let totalTaxRevenue = 0.0;
    let totalWealthSum = 0.0;
    let validCellCount = 0;
    
    let lowestWealthIndices = [];
    let highestWealthIndices = [];

    // 1. Gather baseline socioeconomic data arrays
    for (let i = 0; i < totalCells; i++) {
        if (zoneGrid[i] === 0 || zoneGrid[i] === 50 || zoneGrid[i] === 99) continue;
        if (densityGrid[i] <= 0.05) continue;

        const w = wealthGrid[i];
        totalWealthSum += w;
        validCellCount++;

        if (w < 0.3) lowestWealthIndices.push(i);
        if (w > 0.75) highestWealthIndices.push(i);

        // 📈 IMPLEMENTING PROGRESSIVE TAX BRACKETS
        let taxRate = 0.05; // Base low income bracket rate: 5%
        if (w >= 0.3 && w < 0.6)       taxRate = 0.09;  // Mid bracket: 9%
        else if (w >= 0.6 && w < 0.8)  taxRate = 0.15;  // High bracket: 15%
        else if (w >= 0.8)             taxRate = 0.28;  // Elite wealth bracket: 28%

        // Calculate direct cell revenue contribution
        const cellTaxYield = densityGrid[i] * w * taxRate * 150;
        totalTaxRevenue += cellTaxYield;

        // 🚜 CAPITAL FLIGHT ALGORITHM
        // If elite blocks are heavily taxed without exceptional infrastructure support,
        // they experience capital flight, liquidating investments and abandoning the city.
        if (w >= 0.85 && taxRate >= 0.25) {
            if (Math.random() < 0.08) { // 8% chance per cycle of triggering abandonment
                densityGrid[i] = 0.0; // Level the building
                wealthGrid[i] = 0.1;  // Evaporate equity
                zoneGrid[i] = 0;      // Zone defaults back to vacant
                console.log(`⚠️ CAPITAL FLIGHT: High tax burden triggered abandonment at index ${i}`);
            }
        }
    }

    if (validCellCount === 0) return { revenue: 0, inequality: 0 };

    const averageWealth = totalWealthSum / validCellCount;

    // 2. SOCIAL SAFETY NET DISTRIBUTIONS
    // Reallocate a dividend fraction of total revenue straight back to the impoverished blocks
    let safetyNetDisbursement = totalTaxRevenue * 0.20; // 20% tax revenue social buffer matching
    if (lowestWealthIndices.length > 0 && safetyNetDisbursement > 0) {
        const dividendPerCell = safetyNetDisbursement / lowestWealthIndices.length;
        for (const idx of lowestWealthIndices) {
            wealthGrid[idx] = Math.min(0.5, wealthGrid[idx] + (dividendPerCell * 0.005));
        }
    }

    // 3. CALCULATE SIMPLIFIED SPATIAL INEQUALITY INDEX (Gini Approximation)
    // Measures variance between extreme brackets to return a dashboard performance metric
    let inequalityIndex = 0.0;
    if (validCellCount > 1) {
        let absoluteDifferenceSum = 0;
        // Sample subset to keep execution time within limits on old architecture
        const sampleSize = Math.min(validCellCount, 200);
        for (let j = 0; j < sampleSize; j++) {
            const randA = wealthGrid[Math.floor(Math.random() * totalCells)];
            const randB = wealthGrid[Math.floor(Math.random() * totalCells)];
            absoluteDifferenceSum += Math.abs(randA - randB);
        }
        inequalityIndex = (absoluteDifferenceSum / (2 * sampleSize * averageWealth));
        if (isNaN(inequalityIndex)) inequalityIndex = 0.0;
    }

    return {
        revenue: totalTaxRevenue,
        inequality: Math.min(1.0, inequalityIndex)
    };
}