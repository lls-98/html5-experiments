// matrix.js - Core Grid Topography and Indexing Utilities

/**
 * Calculates 1D array index from 2D coordinates.
 */
function getIndex(x, y, mapW) {
    return y * mapW + x;
}

/**
 * Extracted 8-way neighbor lookup (Moore Neighborhood) for macro-field interactions.
 * Handles boundary conditions gracefully by returning null for out-of-bounds nodes.
 */
function get8Neighbors(index, mapW, mapH) {
    const x = index % mapW;
    const y = Math.floor(index / mapW);
    
    return {
        N:  y > 0 ? index - mapW : null,
        S:  y < mapH - 1 ? index + mapW : null,
        E:  x < mapW - 1 ? index + 1 : null,
        W:  x > 0 ? index - 1 : null,
        NE: (y > 0 && x < mapW - 1) ? index - mapW + 1 : null,
        NW: (y > 0 && x > 0) ? index - mapW - 1 : null,
        SE: (y < mapH - 1 && x < mapW - 1) ? index + mapW + 1 : null,
        SW: (y < h - 1 && x > 0) ? index + mapW - 1 : null
    };
}

/**
 * Global Constants for Zone Classification Matrix
 */
const ZONES = {
    EMPTY: 0,
    RESIDENTIAL_LOW: 1,
    RESIDENTIAL_MED: 2,
    RESIDENTIAL_HIGH: 3,
    PUBLIC_HOUSING_LOW: 4,
    PUBLIC_HOUSING_MED: 5,
    PUBLIC_HOUSING_HIGH: 6,
    COMMERCIAL_LOW: 7,
    COMMERCIAL_MED: 8,
    COMMERCIAL_HIGH: 9,
    MIXED_LOW: 10,
    MIXED_MED: 11,
    MIXED_HIGH: 12,
    IND_LIGHT: 13,
    IND_HEAVY: 14,
    AGRICULTURE: 15,
    OFFICES: 16,
    ROAD: 17,
    TRANSIT_LINE: 18
};