import { WorldState } from './core/WorldState.js';
import { Engine } from './core/Engine.js';
import { CanvasView } from './view/CanvasView.js';
import { Input } from './view/Input.js';

// DOM Instrumentation Debug Nodes
const fpsCounter = document.getElementById('fps-val');
const tickCounter = document.getElementById('tick-val');
const toolCounter = document.getElementById('tool-val');

// 1. Initialize core state memory structures
const world = new WorldState(64, 64);

// 2. Initialize graphics viewing layer and input intercept pipelines
const view = new CanvasView('gameCanvas', world);

const handleTileClick = (x, y) => {
    const idx = world.getIndex(x, y);
    
    // Debug Tool Action: Clicking increments building growth status step metrics
    if (world.zoneLayer[idx] > 0) {
        world.developmentLayer[idx] = (world.developmentLayer[idx] + 1) % 5;
    }
    
    toolCounter.textContent = `Clicked (${x}, ${y}) [State Tier: ${world.developmentLayer[idx]}]`;
};

const inputProcessor = new Input(view, handleTileClick);

// 3. Hook up dual update thread loops
const simulationUpdate = (state) => {
    tickCounter.textContent = state.gameTickCount;
};

const renderFrame = (currentFps) => {
    fpsCounter.textContent = currentFps;
    
    // Execute matrix projection redraw command pass
    view.render();
};

const gameEngine = new Engine(world, simulationUpdate, renderFrame);

// Safe auto-start hook when DOM is completely built
window.addEventListener('DOMContentLoaded', () => {
    gameEngine.start();
    console.log("Walking Skeleton completely operational with interactive projection maps.");
});