// sim-worker.js - Core High-Speed Math Engine
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

        // Allocate Shared Array Memory: 1 byte per cell for zones, 4 bytes for floats
        zoneBuffer    = new SharedArrayBuffer(totalCells * 1); 
        densityBuffer = new SharedArrayBuffer(totalCells * 4); 
        wealthBuffer  = new SharedArrayBuffer(totalCells * 4); 

        zoneGrid    = new Uint8Array(zoneBuffer);
        densityGrid = new Float32Array(densityBuffer);
        wealthGrid  = new Float32Array(wealthBuffer);

        // Seed some random data just to verify the memory bridge works
        for (let i = 0; i < totalCells; i++) {
            if (Math.random() > 0.85) {
                zoneGrid[i] = Math.floor(Math.random() * 5) + 1; // Random zones 1-5
                densityGrid[i] = Math.random(); // Arbitrary starting densities
            }
        }

        // Pass memory layout references back to UI thread
        self.postMessage({
            cmd: 'initialized',
            zoneBuffer: zoneBuffer,
            densityBuffer: densityBuffer,
            wealthBuffer: wealthBuffer
        });

        // Run the background simulation engine tick at 1Hz
        setInterval(tickSimulation, 1000);
    }
};

function tickSimulation() {
    // Basic test calculations to simulate a shifting environment
    for (let i = 0; i < totalCells; i++) {
        if (zoneGrid[i] > 0) {
            // Cellular automatic fluctuations
            densityGrid[i] += (Math.random() - 0.49) * 0.02;
            if (densityGrid[i] < 0) densityGrid[i] = 0;
            if (densityGrid[i] > 1) densityGrid[i] = 1;
        }
    }

    // Evaluate macro status checks
    let popSum = 0;
    for(let i = 0; i < totalCells; i++) {
        popSum += densityGrid[i];
    }

    self.postMessage({
        cmd: 'updateStats',
        population: Math.floor(popSum * 1250), // Scaling factor (1 density = 1250 people)
        gwi: 50.0 + (Math.random() * 5) // Mock shifting indicator loop
    });
}