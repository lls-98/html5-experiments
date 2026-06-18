/**
 * Input Handler Class
 * Processes pointer inputs and coordinates screen-to-grid map translations.
 */
export class Input {
    constructor(canvasView, onTileClickedCallback) {
        this.view = canvasView;
        this.onTileClicked = onTileClickedCallback;

        this.isDragging = false;
        this.lastPointerX = 0;
        this.lastPointerY = 0;

        this._initListeners();
    }

    _initListeners() {
        const target = this.view.canvas;

        // Pointer event standard binds both mobile Touch interactions and standard Mouse pointers
        target.addEventListener('pointerdown', (e) => this._onPointerDown(e));
        target.addEventListener('pointermove', (e) => this._onPointerMove(e));
        target.addEventListener('pointerup', (e) => this._onPointerUp(e));
        target.addEventListener('contextmenu', (e) => e.preventDefault()); // Block right-click menu popups
    }

    _onPointerDown(e) {
        this.isDragging = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        target.setPointerCapture(e.pointerId);
    }

    _onPointerMove(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.lastPointerX;
        const deltaY = e.clientY - this.lastPointerY;

        // Threshold check to filter out tiny vibrations vs real drag displacement intents
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
            // Update Camera offset configurations
            this.view.panX += deltaX;
            this.view.panY += deltaY;

            this.lastPointerX = e.clientX;
            this.lastPointerY = e.clientY;
        }
    }

    _onPointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        // If the pointer didn't displace significantly, process the interaction as a clean tap click
        const totalMovement = Math.abs(e.clientX - this.lastPointerX) + Math.abs(e.clientY - this.lastPointerY);
        if (totalMovement < 5) {
            this._processClick(e.clientX, e.clientY);
        }
    }

    /**
     * Inverse Projection Matrix Calculation:
     * Transforms raw viewport pixels directly back to structured matrix indices.
     */
    _processClick(screenX, screenY) {
        const currentTileSize = this.view.tileSize * this.view.scale;

        // Inverse calculation formulas established in design phase:
        // x = floor((px - Tx) / (S * k))
        // y = floor((py - Ty) / (S * k))
        const gridX = Math.floor((screenX - this.view.panX) / currentTileSize);
        const gridY = Math.floor((screenY - this.view.panY) / currentTileSize);

        // Map boundary check verification pass
        if (this.view.state.isValidCoordinate(gridX, gridY)) {
            this.onTileClicked(gridX, gridY);
        }
    }
}