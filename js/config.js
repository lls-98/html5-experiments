//global constants

export const CONFIG = {
    TILE_SIZE: 32,
    MAP_SIZE: 20, //default fallback value
    ZOOM: 1.0,  //1.0 = normal size
    MIN_ZOOM: 0.25, //25% original size
    MAX_ZOOM: 2.0, //200% original size
    CAMERA_X: 0, //to track the camera panning offset
    CAMERA_Y: 0,

    setMapSize(newSize) {
        this.MAP_SIZE = parseInt(newSize, 10) || 20;
    }
}