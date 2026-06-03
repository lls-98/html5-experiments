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

// --- NEW: THE CONTINUOUS ENGINE HEARTBEAT LOOP ---
function gameTick() {
    // 1. Step the global animation frame counter forward
    CONFIG.ANIMATION_FRAME++;

    // 2. Automatically redraw the screen if the engine is ready
    if (renderer && cityMap.length > 0) {
        renderer.draw(cityMap);
    }

    // 3. Request the browser to execute this function again on the next redraw frame
    requestAnimationFrame(gameTick);
}

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
    // Keep callback structure intact
    }, () => gamePhase); // NEW: Clean execution pointer returning active game phase tracking strings

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
    document.getElementById('terrain-sidebar').classList.add('hidden'); // Hide Brushes
    
    document.getElementById('build-phase-controls').classList.remove('hidden');
    document.getElementById('build-sidebar').classList.remove('hidden'); // Show City Tools
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
    // NEW: Fire up the animation cycle once the game grid environment loads
    requestAnimationFrame(gameTick);
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
                document.getElementById('terrain-sidebar').classList.add('hidden');
                document.getElementById('build-phase-controls').classList.remove('hidden');
                document.getElementById('build-sidebar').classList.remove('hidden');
            } else {
                document.getElementById('terrain-phase-controls').classList.remove('hidden');
                document.getElementById('terrain-sidebar').classList.remove('hidden');
                document.getElementById('build-phase-controls').classList.add('hidden');
                document.getElementById('build-sidebar').classList.add('hidden');
            }

            // NEW: Kickstart the cycle here too in case someone resumes from a saved file directly!
            requestAnimationFrame(gameTick);

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

    // 1. Listen for Brush Panel button clicks to switch active terrain tools
    const brushButtons = document.querySelectorAll('.brush-btn');
    brushButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // Remove active styling highlight frame from all other buttons
            brushButtons.forEach(btn => btn.classList.remove('active'));
        
            // Add active style frame directly to clicked element
            event.target.classList.add('active');
        
            // Extract data attribute and assign straight to configuration parameters
            CONFIG.CURRENT_BRUSH = event.target.getAttribute('data-type');
            console.log(`Active brush switched to: ${CONFIG.CURRENT_BRUSH}`);
        });
    });

    // 2. Hide the brush sidebar panel completely when transitioning to Build Mode
    document.getElementById('switchToBuildBtn').addEventListener('click', () => {
        document.getElementById('terrain-sidebar').classList.add('hidden');
    });

    const buildButtons = document.querySelectorAll('.build-btn');
        buildButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                // Remove active styling highlight frame from all build items
                buildButtons.forEach(btn => btn.classList.remove('active'));
                
                // SAFELY find the button container element even if the user clicked the emoji text
                const targetBtn = event.target.closest('.build-btn');
                
                if (targetBtn) {
                    targetBtn.classList.add('active');
                    
                    // CRUCIAL: Read from targetBtn, NOT event.target!
                    CONFIG.CURRENT_TOOL = targetBtn.getAttribute('data-tool');
                    console.log(`Active City Tool set to: ${CONFIG.CURRENT_TOOL}`);
                }
            });
        });
    // --- NEW: CATEGORY SUBMENU SELECTORS CONTROL MATRIX ---
    const categoryWrappers = document.querySelectorAll('.category-wrapper');

    document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
        trigger.addEventListener('click', (event) => {
            const parentWrapper = event.target.closest('.category-wrapper');
            const isOpen = parentWrapper.classList.contains('open');
            
            // Close all currently open category submenus
            categoryWrappers.forEach(wrapper => wrapper.classList.remove('open'));
            
            // If the clicked menu wasn't already open, open it
            if (!isOpen) {
                parentWrapper.classList.add('open');
            }
        });
    });

    // Close floating menus immediately if clicking direct tools like Bulldozer or Query
    document.querySelectorAll('.menu-category-btn:not(.dropdown-trigger)').forEach(directBtn => {
        directBtn.addEventListener('click', (event) => {
            categoryWrappers.forEach(wrapper => wrapper.classList.remove('open'));
            
            // Strip out active highlights from standard zone items
            document.querySelectorAll('.build-btn, .menu-category-btn').forEach(btn => btn.classList.remove('active'));
            
            const target = event.target.closest('.menu-category-btn');
            target.classList.add('active');
            
            CONFIG.CURRENT_TOOL = target.getAttribute('data-tool');
            console.log(`Active Direct Tool selection: ${CONFIG.CURRENT_TOOL}`);
        });
    });

    // Intercept submenu building tools selection
    const subBuildButtons = document.querySelectorAll('.submenu-panel .build-btn');
    subBuildButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // Clear highlights across all categories and actions
            document.querySelectorAll('.build-btn, .menu-category-btn').forEach(btn => btn.classList.remove('active'));
            
            const targetBtn = event.target.closest('.build-btn');
            targetBtn.classList.add('active');
            
            // Highlight the parent category menu item to indicate a nested tool is active
            const parentWrapper = targetBtn.closest('.category-wrapper');
            if (parentWrapper) {
                parentWrapper.querySelector('.dropdown-trigger').classList.add('active');
            }

            CONFIG.CURRENT_TOOL = targetBtn.getAttribute('data-tool');
            console.log(`Active Submenu Construction Tool: ${CONFIG.CURRENT_TOOL}`);
        });
    });

    // Intercept View Mode layer toggles
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            viewButtons.forEach(btn => btn.classList.remove('active'));
            
            const targetBtn = event.target.closest('.view-btn');
            targetBtn.classList.add('active');
            
            const selectedView = targetBtn.getAttribute('data-view');
            console.log(`Switching map data view overlay to: ${selectedView}`);
            // This variable is ready to hook directly into our data filter engine later!
        });
    });
});
