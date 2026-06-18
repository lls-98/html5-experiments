/**
 * BudgetLedger Class
 * Handles annual balance sheets, municipal upkeep deductions, and deficit states.
 */
export class BudgetLedger {
    constructor() {
        this.ticksPerYear = 576; // Fiscal year clock length boundary
        
        // Operational overhead constraints
        this.maintenanceCosts = {
            ROAD: 1,
            POWER_LINE: 0.5,
            POWER_PLANT: 200
        };

        // Year-end balance sheet snapshot
        this.history = {
            lastTaxRevenue: 0,
            lastUpkeepCost: 0,
            netProfit: 0
        };
    }

    /**
     * Monitors the engine timeline clock and runs the fiscal evaluation process
     */
    update(worldState) {
        // TEMP DIAGNOSTIC LOG: Remove this once we verify tracking
        if (worldState.gameTickCount % 100 === 0) {
            console.log(`Ledger Heartbeat Check - Current Engine Tick: ${worldState.gameTickCount}`);
        }

        // Execute only on a full fiscal year loop milestone
        if (worldState.gameTickCount % this.ticksPerYear !== 0) return;

        console.log("--- FISCAL YEAR END BALANCE SHEET ---");
        this.processFiscalYear(worldState);
    }

    /**
     * Aggregates infrastructure counts, deducts upkeep, and checks treasury health
     */
    processFiscalYear(worldState) {
        let roadCount = 0;
        let lineCount = 0;
        let plantCount = 0;
        let activeTaxpayers = 0;

        // 1. Audit entire map array
        const totalCells = worldState.mapSize;
        for (let i = 0; i < totalCells; i++) {
            const zone = worldState.zoneLayer[i];
            const density = worldState.developmentLayer[i];

            if (zone === 4) roadCount++;
            if (zone === 5) lineCount++;
            if (zone === 6) plantCount++;
            if (zone >= 1 && zone <= 3) activeTaxpayers += density;
        }

        // 2. Calculate Gross Totals
        const roadUpkeep = roadCount * this.maintenanceCosts.ROAD;
        const lineUpkeep = lineCount * this.maintenanceCosts.POWER_LINE;
        const plantUpkeep = plantCount * this.maintenanceCosts.POWER_PLANT;
        
        const totalUpkeepBill = Math.floor(roadUpkeep + lineUpkeep + plantUpkeep);
        const annualTaxRevenue = Math.floor(activeTaxpayers * 180 * worldState.taxRate);

        // 3. Update Balance Sheet Snapshot
        this.history.lastTaxRevenue = annualTaxRevenue;
        this.history.lastUpkeepCost = totalUpkeepBill;
        this.history.netProfit = annualTaxRevenue - totalUpkeepBill;

        // 4. Mutate Treasury State Safely
        worldState.funds += annualTaxRevenue; // Deposit raw tax revenue
        worldState.funds -= totalUpkeepBill;  // Deduct operational expenses

        console.log(`Infrastructure Audit: Roads: ${roadCount}, Wires: ${lineCount}, Plants: ${plantCount}`);
        console.log(`Revenue: +$${annualTaxRevenue} | Upkeep Expenses: -$${totalUpkeepBill}`);
        console.log(`Net Fiscal Shift: $${this.history.netProfit} | Treasury Total: $${worldState.funds}`);

        const currentYear = Math.floor(worldState.gameTickCount / this.ticksPerYear);

        // Explicit arithmetic checks to prevent tracking polluted states
        const cleanFunds = isNaN(worldState.funds) || !isFinite(worldState.funds) ? 0 : Math.floor(worldState.funds);
        const cleanPop = isNaN(activeTaxpayers) || !isFinite(activeTaxpayers) ? 0 : Math.floor(activeTaxpayers);
        const cleanUpkeep = isNaN(totalUpkeepBill) || !isFinite(totalUpkeepBill) ? 0 : Math.floor(totalUpkeepBill);

        worldState.historyLog.push({
            year: currentYear,
            funds: cleanFunds,
            population: cleanPop,
            upkeep: cleanUpkeep
        });

        // Enforce rolling window constraint: Keep last 20 years of history entries max
        if (worldState.historyLog.length > 20) {
            worldState.historyLog.shift();
        }
        
        // 5. Check Deficit Emergency Boundaries
        if (worldState.funds < 0) {
            console.warn("MUNICIPAL BANKRUPTCY: City infrastructure is fracturing due to budget deficits!");
            this._triggerInfrastructuralCollapse(worldState);
        }
    }

    /**
     * Emergency Penalty: Starving infrastructure updates triggers automated decay passes
     */
    _triggerInfrastructuralCollapse(worldState) {
        const totalCells = worldState.mapSize;
        for (let i = 0; i < totalCells; i++) {
            const zone = worldState.zoneLayer[i];
            
            // 5% chance per infrastructure cell to break down during bankruptcy
            if ((zone === 4 || zone === 5) && Math.random() < 0.05) {
                worldState.zoneLayer[i] = 0; // Asset crumbles into empty land
                worldState.developmentLayer[i] = 0;
                worldState.powerLayer[i] = 0;
            }
        }
    }
}