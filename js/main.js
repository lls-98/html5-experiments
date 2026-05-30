//this is the main script file

// js/main.js
import { CONFIG } from './config.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';

let cityMap = [];
let renderer = null;
let inputHandler = null;

// Tracking state phase management: 'terrain' or 'simulation'
let gamePhase = 'terrain'; 

// --- PROCEDURAL GENERATOR CORE ---
function generateProceduralMap(type) {
    cityMap = [];
    for (let x = 0; x < CONFIG.MAP_SIZE; x++) {
        cityMap[x] = [];
    }

    if (type === 'plain') {
        for (let x = 0; x < CONFIG.MAP_SIZE; x++) {
            for (let y = 0; y < CONFIG.MAP_SIZE; y++) {
                cityMap[x][y] = { type: 'empty', powered: false };
            }
        }
    } 
    else if (type === 'river') {
        let riverX = Math.floor(CONFIG.MAP_SIZE / 2);
        for (let y = 0; y < CONFIG.MAP_SIZE; y++) {
            riverX += Math.floor(Math.random() * 3) - 1;
            riverX = Math.max(2, Math.min(CONFIG.MAP_SIZE - 3, riverX));
            for (let x = 0; x < CONFIG.MAP_SIZE; x++) {
                if (Math.abs(x - riverX) <= 1) {
                    cityMap[x][y] = { type: 'water', powered: false };
                } else {
                    cityMap[x][y] = { type: 'empty', powered: false };
                }
            }
        }
    } 
    else if (type === 'coastal') {
        // Build an expansive body of ocean along the bottom half layout boundary
        let coastY = Math.floor(CONFIG.MAP_SIZE * 0.75);
        for (let x = 0; x < CONFIG.MAP_SIZE; x++) {
            coastY += Math.floor(Math.random() * 3) - 1;
            for (let y = 0; y < CONFIG.MAP_SIZE; y++) {
                if (y >= coastY) {
                    cityMap[x][y] = { type: 'water', powered: false };
                } else {
                    cityMap[x][y] = { type: 'empty', powered: false };
                }
            }
        }
    } 
    else if (type === 'lake') {
        const centerX = CONFIG.MAP_SIZE / 2;
        const centerY = CONFIG.MAP_SIZE / 2;
        const radius = CONFIG.MAP_SIZE * 0.25;
        for (let x = 0; x < CONFIG.MAP_SIZE; x++) {
            for (let y = 0; y < CONFIG.MAP_SIZE; y++) {
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                // Add minor structural noise to make the shore organic
                if (distance + (Math.random() * 1.5) < radius) {
                    cityMap[x][y] = { type: 'water', powered: false };
                } else {
                    cityMap[x][y] = { type: 'empty', powered: false };
                }
            }
        }
    }
}

// --- ENGINE COUPLING AND CORE INITIALIZATION ---
function initEngineCore() {
    // 1. Center the camera vector framing box over the map canvas geometry
    const totalMapPixelSize = CONFIG.MAP_SIZE * CONFIG.TILE_SIZE;
    CONFIG.CAMERA_X = (window.innerWidth / 2) - (totalMapPixelSize / 2);
    CONFIG.CAMERA_Y = (window.innerHeight / 2) - (totalMapPixelSize / 2);
    CONFIG.ZOOM = 1.0; // Reset scale to default boundary benchmark

    // 2. Fire up the layout rendering canvas systems
    renderer = new Renderer('gameCanvas');
    renderer.draw(cityMap);

    // 3. Mount interactive input listeners
    inputHandler = new InputHandler('gameCanvas', cityMap, () => {
        renderer.draw(cityMap);
    });

    // 4. Register window resize listeners
    window.removeEventListener('resize', updateViewportDimensions);
    window.addEventListener('resize', updateViewportDimensions);
}

function updateViewportDimensions() {
    if (renderer) {
        renderer.resize();
        renderer.draw(cityMap);
    }
}

// --- STATE MANAGEMENT FLOW STEPS ---
function switchToSimulationPhase() {
    gamePhase = 'simulation';
    console.log("Entering active City Construction Sandbox Mode rules!");
    
    // Toggle active interface sub-element panels inside toolbar overlay
    document.getElementById('terrain-phase-controls').classList.add('hidden');
    document.getElementById('build-phase-controls').classList.remove('hidden');
}

function launchEditorFromGenerator() {
    const sizeInput = document.getElementById('mapSizeInput');
    const terrainSelect = document.getElementById('mapTypeInput');
    
    CONFIG.setMapSize(parseInt(sizeInput.value, 10));
    generateProceduralMap(terrainSelect.value);
    
    gamePhase = 'terrain'; // Always start inside sandbox design mode
    
    // Swap screen containers
    document.getElementById('generator-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    
    initEngineCore();
}

// --- JSON DATA FILE TRANSFERS ---
function executeMapExport() {
    const savePackage = { mapSize: CONFIG.MAP_SIZE, phase: gamePhase, grid: cityMap };
    const blob = new Blob([JSON.stringify(savePackage, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = gamePhase === 'terrain' ? 'custom_map_blueprint.json' : 'saved_city_simulation.json';
    link.click();
    URL.revokeObjectURL(link.href);
}

function processIncomingJSONFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const loadedData = JSON.parse(e.target.result);
            if (!loadedData.mapSize || !loadedData.grid) return alert("Malformed file format structures.");

            CONFIG.setMapSize(loadedData.mapSize);
            cityMap = loadedData.grid;
            gamePhase = loadedData.phase || 'terrain';

            // Hide menu cards completely if parsing initiated directly from landing home screen
            document.getElementById('main-menu').classList.add('hidden');
            document.getElementById('generator-menu').classList.add('hidden');
            document.getElementById('game-container').classList.remove('hidden');

            initEngineCore();

            // Synch Toolbar panel structures matching encoded parameters
            if (gamePhase === 'simulation') {
                document.getElementById('terrain-phase-controls').classList.add('hidden');
                document.getElementById('build-phase-controls').classList.remove('hidden');
            } else {
                document.getElementById('terrain-phase-controls').classList.remove('hidden');
                document.getElementById('build-phase-controls').classList.add('hidden');
            }

        } catch (err) {
            alert("Error parsing document metrics compilation.");
        }
    };
    reader.readAsText(file);
}

// --- WIRE UP EVENT CALL TRIGGERS ---
window.addEventListener('DOMContentLoaded', () => {
    // Navigation routing steps across menu cards
    document.getElementById('newGameBtn').addEventListener('click', () => {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('generator-menu').classList.remove('hidden');
    });
    
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
        document.getElementById('generator-menu').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    });

    document.getElementById('generateMapBtn').addEventListener('click', launchEditorFromGenerator);
    document.getElementById('switchToBuildBtn').addEventListener('click', switchToSimulationPhase);
    
    // Wire file exports and inputs across elements
    document.getElementById('saveMapBtn').addEventListener('click', executeMapExport);
    document.getElementById('saveGameBtn').addEventListener('click', executeMapExport);
    
    document.getElementById('loadInputMainMenu').addEventListener('change', processIncomingJSONFile);
});
