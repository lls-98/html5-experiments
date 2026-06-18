/**
 * Engine Class
 * Managing the high-performance detached execution cycles.
 */
export class Engine {
    constructor(worldState, simulationCallback, renderCallback) {
        this.state = worldState;
        this.onSimulationTick = simulationCallback;
        this.onRenderFrame = renderCallback;

        this.isRunning = false;
        
        // Simulation Frequency Parameters (4Hz)
        this.simIntervalMs = 250; 
        this.lastSimTickTime = 0;
        this.simTimeoutId = null;

        // Debug Performance Counters
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdateTime = 0;
    }

    /**
     * Initializes and kicks off both loops concurrently
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        const currentTime = performance.now();
        this.lastSimTickTime = currentTime;
        this.lastFpsUpdateTime = currentTime;

        // Boot loops
        this._runSimulationLoop();
        this._runRenderLoop(currentTime);
    }

    /**
     * Self-correcting timeout sequence maintaining strict simulation timetables
     */
    _runSimulationLoop() {
        if (!this.isRunning) return;

        const startExecTime = performance.now();
        
        // Step State Clock
        this.state.gameTickCount++;
        
        // Fire external logic passes
        this.onSimulationTick(this.state);

        const endExecTime = performance.now();
        const executionDuration = endExecTime - startExecTime;

        // Self-correcting loop mathematics accounting for calculation overhead
        const nextDelay = Math.max(0, this.simIntervalMs - executionDuration);
        
        this.simTimeoutId = setTimeout(() => this._runSimulationLoop(), nextDelay);
    }

    /**
     * Visual execution channel coupled to native hardware repaint intervals
     */
    _runRenderLoop(timestamp) {
        if (!this.isRunning) return;

        // Track FPS metrics
        this.frameCount++;
        if (timestamp - this.lastFpsUpdateTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdateTime = timestamp;
        }

        // Fire rendering layer pass
        this.onRenderFrame(this.fps);

        requestAnimationFrame((time) => this._runRenderLoop(time));
    }

    /**
     * Safe termination layout clearing execution handles cleanly
     */
    stop() {
        this.isRunning = false;
        if (this.simTimeoutId) clearTimeout(this.simTimeoutId);
    }
}