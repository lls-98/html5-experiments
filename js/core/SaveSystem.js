/**
 * SaveSystem Class
 * Handles map state binary serialization conversion passes and localStorage persistence operations.
 */
export class SaveSystem {
    constructor(saveKey = 'simcity_pwa_save_slot_0') {
        this.saveKey = saveKey;
    }

    /**
     * Captures and encodes active world state properties cleanly into an external JSON text module string package
     */
    saveGame(worldState) {
        try {
            const savePackage = {
                $schema: "https://simcity-classic-pwa.engine/schemas/v1/save.json",
                metadata: {
                    cityName: "New Metropolis",
                    saveTime: Date.now(),
                    engineVersion: "1.0.0"
                },
                simulationState: {
                    gameTick: worldState.gameTickCount,
                    funds: worldState.funds,
                    taxRate: worldState.taxRate,
                    globalDemand: { ...worldState.demand }
                },
                mapSize: {
                    width: worldState.width,
                    height: worldState.height
                },
                gridLayers: {
                    zoneLayer: this._uint8ToBase64(worldState.zoneLayer),
                    developmentLayer: this._uint8ToBase64(worldState.developmentLayer),
                    powerLayer: this._uint8ToBase64(worldState.powerLayer),
                    pollutionLayer: this._uint8ToBase64(worldState.pollutionLayer)
                }
            };

            localStorage.setItem(this.saveKey, JSON.stringify(savePackage));
            console.log(`Game state stored successfully at ticker frame: ${worldState.gameTickCount}`);
            return true;
        } catch (error) {
            console.error("Save state serialization process encountered critical error:", error);
            return false;
        }
    }

    /**
     * Resolves local disk files strings back down into structural map state matrix configurations
     */
    loadGame(worldState) {
        try {
            const rawData = localStorage.getItem(this.saveKey);
            if (!rawData) {
                console.log("No existing save file initialization block detected on disk storage arrays.");
                return false; // Safely drop back out to default execution paths
            }

            const payload = JSON.parse(rawData);

            // Restore global parameters mapping configurations
            worldState.gameTickCount = payload.simulationState.gameTick;
            worldState.funds = payload.simulationState.funds;
            worldState.taxRate = payload.simulationState.taxRate;
            worldState.demand = { ...payload.simulationState.globalDemand };

            // Parse text arrays directly back into explicit standard memory structures configuration maps
            this._base64ToUint8(payload.gridLayers.zoneLayer, worldState.zoneLayer);
            this._base64ToUint8(payload.gridLayers.developmentLayer, worldState.developmentLayer);
            this._base64ToUint8(payload.gridLayers.powerLayer, worldState.powerLayer);
            this._base64ToUint8(payload.gridLayers.pollutionLayer, worldState.pollutionLayer);

            console.log("City save file matrix restored successfully.");
            return true;
        } catch (error) {
            console.error("Critical corrupted file exception caught during serialization load array transformations:", error);
            return false;
        }
    }

    /**
     * High performance bitwise converter translating native ArrayBuffers straight into clean Base64 Strings
     */
    _uint8ToBase64(uint8Array) {
        let binaryString = "";
        const len = uint8Array.length;
        for (let i = 0; i < len; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binaryString);
    }

    /**
     * Reverse processing engine transforming incoming Base64 text streams back into local TypedArrays buffers
     */
    _base64ToUint8(base64String, targetUint8Array) {
        const binaryString = atob(base64String);
        const len = binaryString.length;
        for (let i = 0; i < len; i++) {
            targetUint8Array[i] = binaryString.charCodeAt(i);
        }
    }
}