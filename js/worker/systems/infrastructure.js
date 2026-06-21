// js/worker/systems/infrastructure.js - Macro Electrical Grids and Fluid Traffic Engines

/**
 * UTILITY 1: Solves macro electricity distribution networks using a Breadth-First-Search flood fill.
 */
function solveElectricityGrid(zoneGrid, utilityGrid, powerSources, mapW, mapH) {
    const totalCells = mapW * mapH;
    utilityGrid.fill(0.0);
    
    if (powerSources.length === 0) return;
    
    const queue = [];
    const visited = new Uint8Array(totalCells);
    
    for (let i = 0; i < powerSources.length; i++) {
        const sourceIdx = powerSources[i];
        queue.push(sourceIdx);
        visited[sourceIdx] = 1;
        utilityGrid[sourceIdx] = 1.0; 
    }
    
    let head = 0;
    while (head < queue.length) {
        const currentIdx = queue[head++];
        const currentVoltage = utilityGrid[currentIdx];
        
        if (currentVoltage < 0.02) continue;
        
        const neighbors = get8Neighbors(currentIdx, mapW, mapH);
        
        for (const direction in neighbors) {
            const neighborIdx = neighbors[direction];
            if (neighborIdx === null || visited[neighborIdx] === 1) continue;
            
            const targetCellType = zoneGrid[neighborIdx];
            if (targetCellType === 50 || targetCellType === 99) {
                const isDiagonal = direction.length === 2;
                const resistance = isDiagonal ? 0.015 * 1.414 : 0.015;
                const nextVoltage = currentVoltage - resistance;
                
                if (nextVoltage > utilityGrid[neighborIdx]) {
                    utilityGrid[neighborIdx] = Math.max(0, nextVoltage);
                    visited[neighborIdx] = 1;
                    queue.push(neighborIdx);
                }
            }
        }
    }
}

/**
 * 🚜 UTILITY 2: MACROSCOPIC FLUID DYNAMICS TRAFFIC SOLVER (Task 3.1)
 * Uses a relaxed potential diffusion system to calculate continuous vehicular network flow.
 */
function solveTrafficFlow(zoneGrid, densityGrid, trafficGrid, mapW, mapH) {
    const totalCells = mapW * mapH;
    
    // Allocate scratchpads for numerical calculation pressures
    // (Using temporary arrays to prevent allocation garbage collection pauses)
    if (!self.pressureField || self.pressureField.length !== totalCells) {
        self.pressureField = new Float32Array(totalCells);
        self.scratchField = new Float32Array(totalCells);
    }
    
    const pressure = self.pressureField;
    const nextPressure = self.scratchField;
    pressure.fill(0.0);
    nextPressure.fill(0.0);

    const ROAD_TYPE = 50;

    // 1. STAGE ONE: INJECT MANOMETER PRESSURE GRADIENTS BASED ON REGIONAL DENSITIES
    // Residential areas generate positive supply pressure (+), Commercial/Industrial suck flow in (-)
    for (let i = 0; i < totalCells; i++) {
        const zone = zoneGrid[i];
        if (zone === 0 || zone === ROAD_TYPE || zone === 99) continue;

        const density = densityGrid[i];
        if (density <= 0.01) continue;

        // Residential Sources
        if (zone >= 1 && zone <= 6) {
            pressure[i] = density * 10.0; 
        } 
        // Commercial & Industrial Sinks
        else if ((zone >= 10 && zone <= 22) || zone === 30 || zone === 31) {
            pressure[i] = -density * 12.0; 
        }
    }

    // 2. STAGE TWO: ITERATIVE GAUSS-SEIDEL NETWORK RELAXATION (DIFFUSION PIPE SOLVER)
    // Diffuse pressure along connected road grids through 8 iterations
    const iterations = 8;
    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < totalCells; i++) {
            const zone = zoneGrid[i];
            
            // Fixed zone parameters act as static boundary nodes; roads are fluid conduits
            if (zone !== ROAD_TYPE) {
                nextPressure[i] = pressure[i];
                continue;
            }

            const neighbors = get8Neighbors(i, mapW, mapH);
            let totalWeight = 0.0;
            let combinedPressureSum = 0.0;

            for (const dir in neighbors) {
                const nIdx = neighbors[dir];
                if (nIdx === null) continue;

                const nZone = zoneGrid[nIdx];
                // Fluid can exchange if the neighbor is a road OR a dense building land lot
                if (nZone !== 0) {
                    const isDiagonal = dir.length === 2;
                    // 📐 DIAGONAL FRICTION CONSTRAINT: Scale travel resistance explicitly by 1.414 across vertices
                    const frictionWeight = isDiagonal ? (1.0 / 1.414) : 1.0;

                    combinedPressureSum += pressure[nIdx] * frictionWeight;
                    totalWeight += frictionWeight;
                }
            }

            if (totalWeight > 0.0) {
                // Succinct laplacian averaging vector step
                nextPressure[i] = combinedPressureSum / totalWeight;
            } else {
                nextPressure[i] = 0.0;
            }
        }
        // Copy next generation array forward into pressure buffer slice
        pressure.set(nextPressure);
    }

    // 3. STAGE THREE: CALCULATE STRESS VELOCITY GRADIENTS ON CONDUITS
    // Traffic volume is directly proportional to the change in potential between adjacent tiles
    trafficGrid.fill(0.0);
    for (let i = 0; i < totalCells; i++) {
        if (zoneGrid[i] !== ROAD_TYPE) continue;

        const neighbors = get8Neighbors(i, mapW, mapH);
        let accumulatedFlowStress = 0.0;

        for (const dir in neighbors) {
            const nIdx = neighbors[dir];
            if (nIdx === null || zoneGrid[nIdx] === 0) continue;

            // Absolute difference in velocity potential between current pipe node and target node
            const potentialDelta = Math.abs(pressure[i] - pressure[nIdx]);
            
            const isDiagonal = dir.length === 2;
            const geometricFriction = isDiagonal ? 1.414 : 1.0;

            // Stress is localized relative to the spatial travel friction scale
            accumulatedFlowStress += potentialDelta / geometricFriction;
        }

        // Map and clamp the accumulated fluid stress into a normalized [0.0, 1.0] bandwidth
        trafficGrid[i] = Math.min(1.0, accumulatedFlowStress * 0.12);
    }
}