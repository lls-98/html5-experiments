// js/worker/sim-worker.js - Integrated Macro Engine with Advanced Zoning & Taxation
self.importScripts('./core/matrix.js');
self.importScripts('./systems/infrastructure.js');
self.importScripts('./systems/zoning.js'); 

let MAP_W = 250; 
let MAP_H = 250;
let totalCells = MAP_W * MAP_H;

let zoneBuffer, densityBuffer, wealthBuffer, powerGridBuffer, trafficBuffer;
let zoneGrid, densityGrid, wealthGrid, powerGrid, trafficGrid;

let structuralPowerSources = [];
let globalDemand = { R: 0.03, C: 0.02, I: 0.02 }; 

const ZONE_POWER_PLANT = 99;

self.onmessage = function(e) {
    if (e.data.cmd === 'init') {
        MAP_W = e.data.width;
        MAP_H = e.data.height;
        totalCells = MAP_W * MAP_H;

        zoneBuffer      = new SharedArrayBuffer(totalCells * 1); 
        densityBuffer   = new SharedArrayBuffer(totalCells * 4); 
        wealthBuffer    = new SharedArrayBuffer(totalCells * 4); 
        powerGridBuffer = new SharedArrayBuffer(totalCells * 4); 
        trafficBuffer   = new SharedArrayBuffer(totalCells * 4); 

        zoneGrid    = new Uint8Array(zoneBuffer);
        densityGrid = new Float32Array(densityBuffer);
        wealthGrid  = new Float32Array(wealthBuffer);
        powerGrid   = new Float32Array(powerGridBuffer);
        trafficGrid = new Float32Array(trafficBuffer);

        // Bind references globally onto self context so systems files fetch them seamlessly
        self.trafficGrid = trafficGrid;
        self.wealthGrid = wealthGrid;

        self.postMessage({
            cmd: 'initialized',
            zoneBuffer: zoneBuffer,
            densityBuffer: densityBuffer,
            wealthBuffer: wealthBuffer,
            powerGridBuffer: powerGridBuffer,
            trafficGridBuffer: trafficBuffer
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
    if (!zoneGrid || !powerGrid || !trafficGrid || !wealthGrid) return;

    // 1. Solve utility infrastructures
    solveElectricityGrid(zoneGrid, powerGrid, structuralPowerSources, MAP_W, MAP_H);
    solveTrafficFlow(zoneGrid, densityGrid, trafficGrid, MAP_W, MAP_H);
    
    // 2. Simulate multi-zoning extensions and local mixed-use compromises
    simulateZoningGrowth(zoneGrid, densityGrid, powerGrid, globalDemand, MAP_W, MAP_H);

    // 3. Process progressive tax brackets, wealth optimization loops, and capital flight
    const fiscalMetrics = evaluateTaxationAndSocialSafety(zoneGrid, densityGrid, wealthGrid, MAP_W, MAP_H);

    // 4. Update macro economic demand variables
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

    // Ship data packets containing new taxation variables out to frontend UI elements
    self.postMessage({
        cmd: 'updateStats',
        gwi: 100 - (fiscalMetrics.inequality * 100), // Map inequality inversely onto GWI (Growth/Welfare Index)
        population: popSum,
        demand: globalDemand,
        revenue: fiscalMetrics.revenue // Append cash revenue field
    });
}