// matrix.js - Core Matrix Indexing Utilities

/**
 * Calculates 8-Way Moore Neighborhood indices for a flat array.
 * Correctly bounds-checks edges to prevent wrapping bugs.
 */
function get8Neighbors(idx, mapW, mapH) {
    const x = idx % mapW;
    const y = Math.floor(idx / mapW);

    return {
        N:  y > 0 ? idx - mapW : null,
        S:  y < mapH - 1 ? idx + mapW : null,
        E:  x < mapW - 1 ? idx + 1 : null,
        W:  x > 0 ? idx - 1 : null,
        NE: (y > 0 && x < mapW - 1) ? idx - mapW + 1 : null,
        NW: (y > 0 && x > 0) ? idx - mapW - 1 : null,
        SE: (y < mapH - 1 && x < mapW - 1) ? idx + mapW + 1 : null,
        SW: (y < mapH - 1 && x > 0) ? idx + mapW - 1 : null
    };
}