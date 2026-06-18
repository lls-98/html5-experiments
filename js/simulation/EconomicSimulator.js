/**
 * EconomicSimulator Class
 * Manages macro-scale metrics and system calculations.
 */

import { BudgetLedger } from './BudgetLedger.js';

export class EconomicSimulator {
    constructor() {
        this.frictionOverhead = 10; // Baseline drag component parameter (Kb)
    }

    /**
     * Adjusts market conditions based on active structural densities
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

        const economicVolatility = (Math.random() - 0.5) * 2.0;

        worldState.demand.residential += economicVolatility;
        worldState.demand.commercial += economicVolatility;
        worldState.demand.industrial += economicVolatility;
        
        // Clamping Output Bounds Constraints (-100 to +100)
        worldState.demand.residential = Math.max(-100, Math.min(100, worldState.demand.residential));
        worldState.demand.commercial = Math.max(-100, Math.min(100, worldState.demand.commercial));
        worldState.demand.industrial = Math.max(-100, Math.min(100, worldState.demand.industrial));
        
        // Note: Year-end tax distribution is now safely handled by BudgetLedger.js
    }
    
}