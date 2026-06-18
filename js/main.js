import { WorldState } from './core/WorldState.js';
import { Engine } from './core/Engine.js';
import { SaveSystem } from './core/SaveSystem.js';
import { CanvasView } from './view/CanvasView.js';
import { Input } from './view/Input.js';
import { ToolManager } from './view/ToolManager.js';

import { InfrastructureSimulator } from './simulation/InfrastructureSimulator.js';
import { EconomicSimulator } from './simulation/EconomicSimulator.js';
import { GrowthSimulator } from './simulation/GrowthSimulator.js';

// DOM Instrumentation Debug Nodes
const fpsCounter = document.getElementById('fps-val');
const tickCounter = document.getElementById('tick-val');
const fundsCounter = document.getElementById('funds-val');
const toolLabel = document.getElementById('tool-val');

// 1. Initialize core system modules and infrastructure configurations
const world = new WorldState(64, 64);
const saveSystem = new SaveSystem();

// Attempt to restore progress data from local disk files before initiating loops
const saveDetected = saveSystem.loadGame(world);
if (!saveDetected) {
    console.log("No previous save file detected. Starting simulation with clean canvas defaults.");
}

const view = new CanvasView('gameCanvas', world);
const toolManager = new ToolManager();

// 2. Wire up interface toolbar click handlers
const toolButtons = document.querySelectorAll('.tool-btn');
toolButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Toggle selected state visually
        toolButtons.forEach(b => b.classList.remove('active'));
        
        const targetedTool = e.target.getAttribute('data-tool');
        if (toolManager.activeTool === targetedTool) {
            toolManager.setTool('NONE');
            toolLabel.textContent = "None";
        } else {
            toolManager.setTool(targetedTool);
            e.target.classList.add('active');
            toolLabel.textContent = targetedTool;
        }
    });
});

const viewToggleButton = document.getElementById('toggle-view-btn');
viewToggleButton.addEventListener('click', () => {
    if (view.viewMode === 'MAP') {
        view.viewMode = 'GRAPH';
        viewToggleButton.textContent = "VIEW: ANALYTICS";
        viewToggleButton.style.background = "#00ff00";
        viewToggleButton.style.color = "#000";
    } else {
        view.viewMode = 'MAP';
        viewToggleButton.textContent = "VIEW: CITY GRID";
        viewToggleButton.style.background = "#111";
        viewToggleButton.style.color = "#00ff00";
    }
});

// 3. Connect viewport interaction mappings into tool logic pipelines
const handleTileClick = (x, y) => {
    const idx = world.getIndex(x, y);
    toolManager.applyTool(world, idx);
};
const inputProcessor = new Input(view, handleTileClick);

// 4. Instantiate background simulation frameworks modules
const infrastructurePipeline = new InfrastructureSimulator();
const economyPipeline = new EconomicSimulator();
const growthPipeline = new GrowthSimulator();

// 5. Build loop processing configurations execution chains
const simulationUpdate = (state) => {
    infrastructurePipeline.update(state);
    economyPipeline.update(state);
    growthPipeline.update(state);

    // Sync numeric structural properties straight into active UI layouts elements
    tickCounter.textContent = state.gameTickCount;
    fundsCounter.textContent = state.funds;
};

const renderFrame = (currentFps) => {
    fpsCounter.textContent = currentFps;
    view.render();
};

const gameEngine = new Engine(world, simulationUpdate, renderFrame);

// 6. Connect State Resilience System Hooks to protect user data profiles safely
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        saveSystem.saveGame(world);
    }
});

window.addEventListener('DOMContentLoaded', () => {
    gameEngine.start();
    console.log("Engine fully initialized with integrated tools and automatic state serialization mechanisms.");
});