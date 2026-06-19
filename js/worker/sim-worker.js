// sim-worker.js - Multi-Threaded Simulation Router

// Synchronously load core utilities and system sub-modules
self.importScripts('./core/matrix.js');
// (Future system imports will go here, e.g., ./systems/demographics.js)

let MAP_W = 250; 
let MAP_H = 250;
let totalCells = MAP_W * MAP_H;

let zoneBuffer, densityBuffer, wealthBuffer;
let zoneGrid, densityGrid, wealthGrid;

self.onmessage = function(e) {
    if (e.data.cmd === 'init') {
        MAP_W = e.data.width;
        MAP_H = e.data.height;
        totalCells = MAP_W * MAP_H;

        zoneBuffer    = new SharedArrayBuffer(totalCells * 1); 
        densityBuffer = new SharedArrayBuffer(totalCells * 4); 
        wealthBuffer  = new SharedArrayBuffer(totalCells * 4); 

        zoneGrid    = new Uint8Array(zoneBuffer);
        densityGrid = new Float32Array(densityBuffer);
        wealthGrid  = new Float32Array(wealthBuffer);

        // Seed initial layout matrix using our imported ZONES enum
        for (let i = 0; i < totalCells; i++) {
            if (Math.random() > 0.90) {
                zoneGrid[i] = ZONES.MIXED_MED; // Let's seed progressive mixed zones!
                densityGrid[i] = Math.random(); 
            }
        }

        self.postMessage({
            cmd: 'initialized',
            zoneBuffer: zoneBuffer,
            densityBuffer: densityBuffer,
            wealthBuffer: wealthBuffer
        });

        setInterval(tickSimulation, 1000);
    }
};

function tickSimulation() {
    // Loop through our data layers using modular systems
    for (let i = 0; i < totalCells; i++) {
        if (zoneGrid[i] === ZONES.EMPTY) continue;
        
        // Simulating subtle growth fluctuations for now
        densityGrid[i] += (Math.random() - 0.49) * 0.01;
        if (densityGrid[i] < 0) densityGrid[i] = 0;
        if (densityGrid[i] > 1) densityGrid[i] = 1;
    }

    let popSum = 0;
    for(let i = 0; i < totalCells; i++) {
        popSum += densityGrid[i];
    }

    self.postMessage({
        cmd: 'updateStats',
        population: Math.floor(popSum * 1250),
        gwi: 62.5
    });
}