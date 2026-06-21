// js/worker/sim-worker.js
self.importScripts('./core/matrix.js');
self.importScripts('./systems/infrastructure.js');
self.importScripts('./systems/zoning.js'); 

let MAP_W = 250; 
let MAP_H = 250;
let totalCells = MAP_W * MAP_H;

let zoneBuffer, densityBuffer, wealthBuffer, powerGridBuffer;
let zoneGrid, densityGrid, wealthGrid, powerGrid;

let structuralPowerSources = [];
let globalDemand = { R: 0.03, C: 0.02, I: 0.02 }; // Boosted baseline seed demand values

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

        zoneGrid    = new Uint8Array(zoneBuffer);
        densityGrid = new Float32Array(densityBuffer);
        wealthGrid  = new Float32Array(wealthBuffer);
        powerGrid   = new Float32Array(powerGridBuffer);

        self.postMessage({
            cmd: 'initialized',
            zoneBuffer: zoneBuffer,
            densityBuffer: densityBuffer,
            wealthBuffer: wealthBuffer,
            powerGridBuffer: powerGridBuffer 
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
    // 🚜 LIVE DESTRUCTION PACKET ROUTER
    if (e.data.cmd === 'removePowerPlant') {
        structuralPowerSources = structuralPowerSources.filter(idx => idx !== e.data.index);
    }
};

function tickSimulation() {
    if (!zoneGrid || !powerGrid) return;

    solveElectricityGrid(zoneGrid, powerGrid, structuralPowerSources, MAP_W, MAP_H);
    simulateZoningGrowth(zoneGrid, densityGrid, powerGrid, globalDemand, MAP_W, MAP_H);

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

    // 📈 SHIP OUT LIVE MACRO-DEMAND LEVELS TO FRONTEND DASHBOARD
    self.postMessage({
        cmd: 'updateStats',
        gwi: 78.4,
        population: popSum,
        demand: globalDemand // Append object to message frame
    });
}