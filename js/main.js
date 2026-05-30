//this is the main script file

import { CONFIG } from './config.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';

//initialize map data 2d array
let cityMap = [];

function createEmptyMap() {
    cityMap = []; //clear existing array data
    for(let x=0; x<CONFIG.MAP_SIZE; x++){
        cityMap[x] = [];
        for(let y=0; y<CONFIG.MAP_SIZE; y++){
            cityMap[x][y] = {
                type: 'empty',
                powered: false
            };
        }
    }
}

function startGame() {
    const sizeInput = document.getElementById('mapSizeInput');
    const selectedSize = parseInt(sizeInput.value, 10);

    //update global config with the player's choice
    CONFIG.setMapSize(selectedSize);

    createEmptyMap();

    // --- NEW: Calculate Camera Centering Offsets ---
    const totalMapPixelSize = CONFIG.MAP_SIZE * CONFIG.TILE_SIZE;
    
    // Find screen midpoint, subtract half the map size to pull the grid to center
    CONFIG.CAMERA_X = (window.innerWidth / 2) - (totalMapPixelSize / 2);
    CONFIG.CAMERA_Y = (window.innerHeight / 2) - (totalMapPixelSize / 2);
    
    // Now instantiate everything with those starting coordinates locked in
    const renderer = new Renderer('gameCanvas');
    renderer.draw(cityMap);

    const inputHandler = new InputHandler('gameCanvas', cityMap, () => {
        renderer.draw(cityMap);
    })

    // --- NEW: Handle browser window resizing dynamically ---
    window.addEventListener('resize', () => {
        renderer.resize();     // Tell canvas to adjust internal resolution layout
        renderer.draw(cityMap); // Re-execute frame generation to avoid flickering
    });

    // Swap UI visibility
    document.getElementById('start-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    
    console.log(`Game started in full-viewport environment!`);
}

// wait for the DOM to wire up the start button click event listener
window.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    startButton.addEventListener('click', startGame);
});
