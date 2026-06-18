/**
 * Engine Class
 * Managing the high-performance detached execution cycles and time-dilation metrics.
 */
export class Engine {
    constructor(worldState, simulationCallback, renderCallback) {
        this.state = worldState;
        this.onSimulationTick = simulationCallback;
        this.onRenderFrame = renderCallback;

        this.isRunning = false;
        
        // Simulation Frequency Parameters (Default 4Hz / 250ms per tick)
        this.baseSimIntervalMs = 250; 
        this.currentSimIntervalMs = 250; 
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

        this._runSimulationLoop();
        this._runRenderLoop(currentTime);
    }

    /**
     * Dynamically alters the time dilation scale of the simulation loop
     * @param {string} speedMode - 'PAUSED', 'NORMAL', or 'HYPER'
     */
    setSpeed(speedMode) {
        if (this.simTimeoutId) clearTimeout(this.simTimeoutId);

        switch (speedMode) {
            case 'PAUSED':
                this.currentSimIntervalMs = -1; // Flag to halt progression execution
                console.log("Simulation thread PAUSED.");
                break;
            case 'NORMAL':
                this.currentSimIntervalMs = this.baseSimIntervalMs;
                console.log("Simulation frequency calibrated to standard 4Hz operation matrix.");
                if (this.isRunning) this._runSimulationLoop();
                break;
            case 'HYPER':
                this.currentSimIntervalMs = 50; // Accelerated 20Hz loop pass sequence
                console.log("Simulation frequency pushed to HYPER 20Hz warp execution pattern.");
                if (this.isRunning) this._runSimulationLoop();
                break;
        }
    }

    /**
     * Self-correcting timeout sequence maintaining strict simulation timetables
     */
    _runSimulationLoop() {
        if (!this.isRunning || this.currentSimIntervalMs === -1) return;

        const startExecTime = performance.now();
        this.state.gameTickCount++;
        
        // NEW: Advance our custom animation clock based on active engine velocity.
        // Paused state will naturally freeze this value since this loop stops running.
        if (this.currentSimIntervalMs === 50) {
            this.state.visualTime += 0.5; // High speed advance rate
        } else {
            this.state.visualTime += 0.1; // Normal speed baseline advance rate
        }

        this.onSimulationTick(this.state);
        const endExecTime = performance.now();
        const executionDuration = endExecTime - startExecTime;

        const nextDelay = Math.max(0, this.currentSimIntervalMs - executionDuration);
        this.simTimeoutId = setTimeout(() => this._runSimulationLoop(), nextDelay);
    }

    _runRenderLoop(timestamp) {
        if (!this.isRunning) return;

        this.frameCount++;
        if (timestamp - this.lastFpsUpdateTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdateTime = timestamp;
        }

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

    /**
     * Resets execution parameters to default initial state variables
     */
    reset(newWorldState) {
        this.stop();
        this.state = newWorldState;
        this.currentSimIntervalMs = this.baseSimIntervalMs;
        this.start();
    }
}