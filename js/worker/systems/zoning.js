// js/worker/systems/zoning.js

const ZONES = {
    VACANT: 0,
    R_LOW: 1, R_MED: 2, R_HIGH: 3,
    PUB_LOW: 4, PUB_MED: 5, PUB_HIGH: 6,
    C_LOW: 10, C_MED: 11, C_HIGH: 12,
    OFF_LOW: 15, OFF_MED: 16, OFF_HIGH: 17,
    MIX_LOW: 20, MIX_MED: 21, MIX_HIGH: 22,
    IND_LIGHT: 30, IND_HEAVY: 31,
    AGRI: 35,
    ROAD: 50,
    POWER_PLANT: 99
};

function simulateZoningGrowth(zoneGrid, densityGrid, powerGrid, demand, mapW, mapH) {
    for (let i = 0; i < zoneGrid.length; i++) {
        const zone = zoneGrid[i];
        if (zone === ZONES.VACANT || zone === ZONES.ROAD || zone === ZONES.POWER_PLANT) continue;

        // Scan 8 neighbors for utility availability
        const neighbors = get8Neighbors(i, mapW, mapH);
        let hasPower = powerGrid[i] > 0.1;

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

        if (zone >= ZONES.R_LOW && zone <= ZONES.PUB_HIGH) zoneDemand = demand.R;
        else if (zone >= ZONES.C_LOW && zone <= ZONES.OFF_HIGH) zoneDemand = demand.C;
        else if (zone >= ZONES.MIX_LOW && zone <= ZONES.MIX_HIGH) zoneDemand = (demand.R + demand.C) / 2;
        else if (zone === ZONES.IND_LIGHT) zoneDemand = demand.I;
        else if (zone === ZONES.IND_HEAVY || zone === ZONES.AGRI) {
            zoneDemand = demand.I;
            requiresPower = false; // Agriculture and Heavy Industry grow without raw power grids
        }

        if (hasPower || !requiresPower) {
            if (zoneDemand > 0) {
                let growthRate = zoneDemand;
                if (zone === ZONES.R_HIGH || zone === ZONES.C_HIGH || zone === ZONES.OFF_HIGH || zone === ZONES.MIX_HIGH) {
                    growthRate *= 0.6;
                }
                densityGrid[i] = Math.min(1.0, densityGrid[i] + growthRate);
            }
        } else {
            // Decay back down if infrastructure drops offline
            densityGrid[i] = Math.max(0.0, densityGrid[i] - 0.03);
        }
    }
}