// js/worker/sim-worker.js - Integrated Architectural Master Core with Eco-Diffusion Systems
self.importScripts('./core/matrix.js');
self.importScripts('./systems/infrastructure.js');
self.importScripts('./systems/zoning.js'); 
self.importScripts('./systems/environment.js'); // 🌪️ IMPORT NEW ECO-SOLVER UTILITIES

let MAP_W = 250; 
let MAP_H = 250;
let totalCells = MAP_W * MAP_H;

let zoneBuffer, densityBuffer, wealthBuffer, powerGridBuffer, trafficBuffer, pollutionBuffer, healthBuffer;
let zoneGrid, densityGrid, wealthGrid, powerGrid, trafficGrid, pollutionGrid, healthGrid;

let structuralPowerSources = [];
let globalDemand = { R: 0.03, C: 0.02, I: 0.02 }; 

const ZONE_POWER_PLANT = 99;

self.onmessage = function(e) {
    if (e.data.cmd === 'init') {
        MAP_W = e.data.width;
        MAP_H = e.data.height;
        totalCells = MAP_W * MAP_H;

        // Allocate Shared Memory Arrays cleanly
        zoneBuffer       = new SharedArrayBuffer(totalCells * 1); 
        densityBuffer    = new SharedArrayBuffer(totalCells * 4); 
        wealthBuffer     = new SharedArrayBuffer(totalCells * 4); 
        powerGridBuffer  = new SharedArrayBuffer(totalCells * 4); 
        trafficBuffer    = new SharedArrayBuffer(totalCells * 4); 
        pollutionBuffer  = new SharedArrayBuffer(totalCells * 4); // 🌫️ POLLUTION GRID INTERFACE BUFFER (Float32)
        healthBuffer     = new SharedArrayBuffer(totalCells * 4); // 🏥 POPULATION LAGGING HEALTH BUFFER (Float32)

        zoneGrid      = new Uint8Array(zoneBuffer);
        densityGrid   = new Float32Array(densityBuffer);
        wealthGrid    = new Float32Array(wealthBuffer);
        powerGrid     = new Float32Array(powerGridBuffer);
        trafficGrid   = new Float32Array(trafficBuffer);
        pollutionGrid = new Float32Array(pollutionBuffer);
        healthGrid    = new Float32Array(healthBuffer);

        // Bind references globally to worker thread context
        self.trafficGrid = trafficGrid;
        self.wealthGrid = wealthGrid;
        self.pollutionGrid = pollutionGrid;
        self.healthGrid = healthGrid;

        // Seed initial health parameters to perfect baseline health (1.0)
        healthGrid.fill(1.0);

        self.postMessage({
            cmd: 'initialized',
            zoneBuffer: zoneBuffer,
            densityBuffer: densityBuffer,
            wealthBuffer: wealthBuffer,
            powerGridBuffer: powerGridBuffer,
            trafficGridBuffer: trafficBuffer,
            pollutionGridBuffer: pollutionBuffer, // Export array node securely to main thread
            healthGridBuffer: healthBuffer
        });

        setInterval(tickSimulation, 1000);
    }
    
    if (e.data.cmd === 'addPowerPlant') {
        if (!structuralPowerSources.includes(e.data.index)) {
            structuralPowerSources.push(e.data.index);
            zoneGrid[e.data.index] = ZONE_POWER_PLANT; 
            densityGrid[e.data.index] = 1.0;
        }
    }
    if (e.data.cmd === 'removePowerPlant') {
        structuralPowerSources = structuralPowerSources.filter(idx => idx !== e.data.index);
    }
};

function tickSimulation() {
    if (!zoneGrid || !powerGrid || !trafficGrid || !pollutionGrid || !healthGrid) return;

    // 1. Solve physical utility networks
    solveElectricityGrid(zoneGrid, powerGrid, structuralPowerSources, MAP_W, MAP_H);
    solveTrafficFlow(zoneGrid, densityGrid, trafficGrid, MAP_W, MAP_H);
    
    // 2. Run Environmental Vector Diffusion with diagonal Wind Advection (Task 3.3)
    solvePollutionDiffusion(zoneGrid, densityGrid, trafficGrid, pollutionGrid, MAP_W, MAP_H);
    const systemHealthIndex = updateCellularHealthMatrix(zoneGrid, pollutionGrid, healthGrid, MAP_W, MAP_H);

    // 3. Simulate economic multi-zoning extensions
    simulateZoningGrowth(zoneGrid, densityGrid, powerGrid, globalDemand, MAP_W, MAP_H);
    const fiscalMetrics = evaluateTaxationAndSocialSafety(zoneGrid, densityGrid, wealthGrid, MAP_W, MAP_H);

    // 4. Update economic global demand matrix variables
    globalDemand.R += (Math.random() * 0.004) - 0.002;
    globalDemand.C += (Math.random() * 0.004) - 0.002;
    globalDemand.I += (Math.random() * 0.004) - 0.002;
    globalDemand.R = Math.max(0.01, Math.min(0.05, globalDemand.R));
    globalDemand.C = Math.max(0.01, Math.min(0.04, globalDemand.C));
    globalDemand.I = Math.max(0.01, Math.min(0.04, globalDemand.I));

    let popSum = 0;
    for (let i = 0; i < totalCells; i++) {
        if (zoneGrid[i] >= 1 && zoneGrid[i] <= 6) {
            popSum += Math.floor(densityGrid[i] * 120);
        }
    }

    self.postMessage({
        cmd: 'updateStats',
        gwi: 100 - (fiscalMetrics.inequality * 100),
        population: popSum,
        demand: globalDemand,
        revenue: fiscalMetrics.revenue,
        healthSecurity: systemHealthIndex // 🏥 Pass live lagging health metric back up to UI
    });
}