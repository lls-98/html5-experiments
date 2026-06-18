import { WorldState } from './core/WorldState.js';
import { Engine } from './core/Engine.js';

// DOM Instrumentation Debug Nodes
const fpsCounter = document.getElementById('fps-val');
const tickCounter = document.getElementById('tick-val');

// 1. Initialise core State
const world = new WorldState(64, 64);

// 2. Define Simulation Loop Logic Callback
const simulationUpdate = (state) => {
    // This is where EconomicSimulator, GrowthSimulator, etc., will be hooked in.
    // For now, it updates our DOM UI indicator.
    tickCounter.textContent = state.gameTickCount;
};

// 3. Define Graphics Frame Rendering Callback
const renderFrame = (currentFps) => {
    fpsCounter.textContent = currentFps;
    
    // This is where our CanvasView.render() matrix method will pass through.
    // We will drop in the canvas matrix rendering logic here in our next ticket step.
};

// 4. Instantiate and Boot Orchestration Core
const gameEngine = new Engine(world, simulationUpdate, renderFrame);

// Safe auto-start hook when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    gameEngine.start();
    console.log("Walking Skeleton Orchestration Running successfully.");
});