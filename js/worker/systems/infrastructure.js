// infrastructure.js - Upgraded Utility Grid Solver
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
            
            // CONNECTIVITY FIX: Power flows through roads (50) OR directly away from Power Stations (99)
            const targetCellType = zoneGrid[neighborIdx];
            if (targetCellType === 50 || targetCellType === 99) {
                const isDiagonal = direction.length === 2;
                const resistance = isDiagonal ? 0.015 * 1.414 : 0.015; // Slightly reduced resistance drop rate
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