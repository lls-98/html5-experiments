/**
 * InfrastructureSimulator Class
 * Processes power lines propagation and localized road connectivity logic.
 */
export class InfrastructureSimulator {
    constructor() {
        // Queue container allocated once to prevent recurring garbage collection overhead
        this.bfsQueue = new Int32Array(4096); 
    }

    /**
     * Executes a complete sweep of all utility grids across the city
     */
    update(worldState) {
        this.simulatePowerGrid(worldState);
        this.simulateRoadNetwork(worldState);
    }

    /**
     * Power Grid Propagation Engine (Breadth-First Search)
     * Maps energy continuity out from Power Plants through conductive tiles.
     */
    simulatePowerGrid(worldState) {
        // 1. Initialize temporary tracking structures
        const totalCells = worldState.mapSize;
        const visited = new Uint8Array(totalCells);
        
        let queueHead = 0;
        let queueTail = 0;

        // 2. Source Discovery Pass: Locate all active Power Plants (ID: 6)
        for (let i = 0; i < totalCells; i++) {
            if (worldState.zoneLayer[i] === 6) { 
                this.bfsQueue[queueTail++] = i;
                visited[i] = 1;
            }
        }

        // Target Orthogonal Neighbor Vector Offsets (North, South, East, West)
        const dx = [0, 0, -1, 1];
        const dy = [-1, 1, 0, 0];

        // 3. Graph Traversal Execution Engine Loop
        while (queueHead < queueTail) {
            const currentIdx = this.bfsQueue[queueHead++];
            
            // Extract coordinates back out of linear pointer index configuration
            const cx = currentIdx % worldState.width;
            const cy = Math.floor(currentIdx / worldState.width);

            // Scan 4 adjacent directions
            for (let i = 0; i < 4; i++) {
                const nx = cx + dx[i];
                const ny = cy + dy[i];

                if (worldState.isValidCoordinate(nx, ny)) {
                    const neighborIdx = worldState.getIndex(nx, ny);
                    
                    if (visited[neighborIdx] === 0) {
                        const neighborZone = worldState.zoneLayer[neighborIdx];
                        
                        // Conductive structures check: Road (4), PowerLine (5), PowerPlant (6), or Developed Zone (>0)
                        if (neighborZone >= 1 && neighborZone <= 6) {
                            // Every architectural asset (Zones 1-3, Roads 4, Lines 5, Plants 6) conducts electricity!
                            visited[neighborIdx] = 1;
                            this.bfsQueue[queueTail++] = neighborIdx;
                        }
                    }
                }
            }
        }

        // 4. State Commit: Update live power network bitmask cleanly
        worldState.powerLayer.set(visited);
    }

    /**
     * Localized Road Scanning Logic
     * Computes structural layout parameters to evaluate zone accessibility metrics.
     */
    simulateRoadNetwork(worldState) {
        // For our MVP, we parse adjacent coordinates to simulate localized vehicular congestion
        // Roads generate baseline values that scale directly along with neighbor building densities.
        for (let y = 0; y < worldState.height; y++) {
            for (let x = 0; x < worldState.width; x++) {
                const idx = worldState.getIndex(x, y);
                
                if (worldState.zoneLayer[idx] === 4) { // Is a target Road Cell
                    let localTrafficDensity = 0;

                    // Evaluate 4 immediate perimeter vectors to accumulate density index metrics
                    const dx = [0, 0, -1, 1];
                    const dy = [-1, 1, 0, 0];

                    for (let i = 0; i < 4; i++) {
                        const nx = x + dx[i];
                        const ny = y + dy[i];
                        if (worldState.isValidCoordinate(nx, ny)) {
                            const neighborIdx = worldState.getIndex(nx, ny);
                            const neighborZone = worldState.zoneLayer[neighborIdx];
                            
                            // If neighboring cells contain active populations, generate tracking friction
                            if (neighborZone >= 1 && neighborZone <= 3) {
                                localTrafficDensity += worldState.developmentLayer[neighborIdx] * 32;
                            }
                        }
                    }

                    // Constrain maximum output boundaries to 8-bit allocation ceilings (0-255)
                    worldState.pollutionLayer[idx] = Math.min(255, localTrafficDensity);
                } else {
                    // Naturally disperse pollution signatures downward if tile isn't a highway source
                    if (worldState.pollutionLayer[idx] > 0) {
                        worldState.pollutionLayer[idx] = Math.max(0, worldState.pollutionLayer[idx] - 2);
                    }
                }
            }
        }
    }
}