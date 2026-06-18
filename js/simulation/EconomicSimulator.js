/**
 * EconomicSimulator Class
 * Manages macro-scale metrics and system calculations.
 */
export class EconomicSimulator {
    constructor() {
        this.frictionOverhead = 10; // Baseline drag component parameter (Kb)
    }

    /**
     * Adjusts market conditions and structures treasury payouts
     */
    update(worldState) {
        let totalPop = 0;
        let totalComm = 0;
        let totalInd = 0;

        // 1. Map Statistical Aggregation Sweeps Pass
        const totalCells = worldState.mapSize;
        for (let i = 0; i < totalCells; i++) {
            const zone = worldState.zoneLayer[i];
            const density = worldState.developmentLayer[i];

            if (zone === 1) totalPop += density;
            if (zone === 2) totalComm += density;
            if (zone === 3) totalInd += density;
        }

        // 2. Execute Systemic Macro Equations Formulas
        // Residential Demand Calculation Formula
        const jobAvailabilityRatio = (totalComm + totalInd) / (totalPop + 1);
        worldState.demand.residential = (jobAvailabilityRatio * (1.0 - worldState.taxRate)) - this.frictionOverhead;

        // Commercial Demand Calculation Formula
        const marketConsumerRatio = totalPop / (totalComm + 1);
        worldState.demand.commercial = marketConsumerRatio * worldState.demand.residential;

        // Industrial Demand Calculation Formula
        const industrialTradeRatio = (totalPop + totalComm) / (totalInd + 1);
        worldState.demand.industrial = industrialTradeRatio * (1.0 - worldState.taxRate);

        // Clamping Output Bounds Constraints (-100 to +100)
        worldState.demand.residential = Math.max(-100, Math.min(100, worldState.demand.residential));
        worldState.demand.commercial = Math.max(-100, Math.min(100, worldState.demand.commercial));
        worldState.demand.industrial = Math.max(-100, Math.min(100, worldState.demand.industrial));

        // 3. Tax Yield Financial Distribution Phases (Every 48 ticks / approx 12 game weeks)
        if (worldState.gameTickCount % 48 === 0) {
            const taxYield = Math.floor((totalPop + totalComm + totalInd) * 15 * worldState.taxRate);
            worldState.funds += taxYield;
            console.log(`Treasury updated. Yield calculated: +$${taxYield}. Current Balance: $${worldState.funds}`);
        }
    }
}