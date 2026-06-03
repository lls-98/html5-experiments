//global constants

export const CONFIG = {
    TILE_SIZE: 32,
    MAP_SIZE: 20,
    ZOOM: 1.0,
    MIN_ZOOM: 0.25,
    MAX_ZOOM: 2.0,
    CAMERA_X: 0,
    CAMERA_Y: 0,
    CURRENT_BRUSH: 'empty',
    ANIMATION_FRAME: 0,
    CURRENT_TOOL: 'bulldozer',
    HOVER_X: -1, // NEW: Tracks cursor column (-1 means off-screen)
    HOVER_Y: -1, // NEW: Tracks cursor row
    
    setMapSize(newSize) {
        this.MAP_SIZE = parseInt(newSize, 10) || 20;
    }
};