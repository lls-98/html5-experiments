/**
 * ToolManager Class
 * Manages the active user tool selection and deployment financial costs.
 */
export class ToolManager {
    constructor() {
        this.activeTool = 'NONE'; // Default state

        // Cost Matrix matching SimCity Classic pricing scales
        this.costs = {
            'RESIDENTIAL': 100,
            'COMMERCIAL': 100,
            'INDUSTRIAL': 100,
            'ROAD': 20,
            'POWER_LINE': 5,
            'POWER_PLANT': 3000,
            'BULLDOZER': 1
        };
    }

    /**
     * Sets the active construction tool configuration state
     */
    setTool(toolName) {
        if (this.costs[toolName] !== undefined || toolName === 'NONE') {
            this.activeTool = toolName;
            return true;
        }
        return false;
    }

    /**
     * Validates and applies the structural transaction configuration onto the map data arrays
     */
    applyTool(worldState, idx) {
        if (this.activeTool === 'NONE') return false;

        const cost = this.costs[this.activeTool];

        // Financial validation step
        if (worldState.funds < cost) {
            console.warn("Insufficient municipal funds available for transaction.");
            return false;
        }

        // Deduct transactional costs safely
        worldState.funds -= cost;

        // Apply corresponding state mutations to the layers
        switch (this.activeTool) {
            case 'RESIDENTIAL':
                worldState.zoneLayer[idx] = 1;
                worldState.developmentLayer[idx] = 0;
                break;
            case 'COMMERCIAL':
                worldState.zoneLayer[idx] = 2;
                worldState.developmentLayer[idx] = 0;
                break;
            case 'INDUSTRIAL':
                worldState.zoneLayer[idx] = 3;
                worldState.developmentLayer[idx] = 0;
                break;
            case 'ROAD':
                worldState.zoneLayer[idx] = 4;
                break;
            case 'POWER_LINE':
                worldState.zoneLayer[idx] = 5;
                break;
            case 'POWER_PLANT':
                worldState.zoneLayer[idx] = 6;
                break;
            case 'BULLDOZER':
                worldState.zoneLayer[idx] = 0;
                worldState.developmentLayer[idx] = 0;
                worldState.pollutionLayer[idx] = 0;
                break;
        }
        return true;
    }
}