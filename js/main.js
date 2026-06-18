import { WorldState } from './core/WorldState.js';
import { Engine } from './core/Engine.js';
import { CanvasView } from './view/CanvasView.js';
import { Input } from './view/Input.js';

// Import New Logic Simulations Modules
import { InfrastructureSimulator } from './simulation/InfrastructureSimulator.js';
import { EconomicSimulator } from './simulation/EconomicSimulator.js';
import { GrowthSimulator } from './simulation/GrowthSimulator.js';

// DOM Instrumentation Debug Nodes
const fpsCounter = document.getElementById('fps-val');
const tickCounter = document.getElementById('tick-val');
const toolCounter = document.getElementById('tool-val');

// 1. Initialize core state data structural containers
const world = new WorldState(64, 64);

// 2. Initialize graphics viewing layer and input intercept pipelines
const view = new CanvasView('gameCanvas', world);

// 3. Instantiate simulation business engines
const infrastructurePipeline = new InfrastructureSimulator();
const economyPipeline = new EconomicSimulator();
const growthPipeline = new GrowthSimulator();

// Modifying click interaction handler to function as an Construction Tool
const handleTileClick = (x, y) => {
    const idx = world.getIndex(x, y);
    
    // Cyclical Construction Tool: 
    // Cycle empty cell into Road (4), PowerLine (5), or Coal Power Plant (6)
    if (world.zoneLayer[idx] === 0) {
        world.zoneLayer[idx] = 4; // Deploy Road
    } else if (world.zoneLayer[idx] === 4) {
        world.zoneLayer[idx] = 5; // Convert to PowerLine
    } else if (world.zoneLayer[idx] === 5) {
        world.zoneLayer[idx] = 6; // Convert to Power Plant
    } else {
        world.zoneLayer[idx] = 0; // Bulldozer clear
        world.developmentLayer[idx] = 0;
    }
    
    toolCounter.textContent = `Built Tool on (${x}, ${y}) - Structural Code: ${world.zoneLayer[idx]}`;
};

const inputProcessor = new Input(view, handleTileClick);

// 4. Update the core Simulation Loop orchestrator pass
const simulationUpdate = (state) => {
    // Sequentially step simulation engines across arrays
    infrastructurePipeline.update(state);
    economyPipeline.update(state);
    growthPipeline.update(state);

    tickCounter.textContent = state.gameTickCount;
};

const renderFrame = (currentFps) => {
    fpsCounter.textContent = currentFps;
    view.render();
};

const gameEngine = new Engine(world, simulationUpdate, renderFrame);

window.addEventListener('DOMContentLoaded', () => {
    gameEngine.start();
    console.log("Simulations Engines completely unified and active.");
});