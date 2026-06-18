# Project Architecture Documentation: Browser-Based City Simulator

This document establishes the architectural foundation, system boundaries, and data design for the HTML5/PWA city simulation game. It serves as the engineering source of truth to ensure a decoupled, performant, and maintainable codebase.

---

## 1. System Architecture Overview

To achieve smooth rendering performance, robust state management, and seamless execution across both desktop and mobile browsers, the system utilizes a strictly **Decoupled Architecture**. The core simulation logic runs independently from the visual presentation layer.

```
+-----------------------------------------------------------+
|                       STATE STORE                         |
|  (Grid Arrays, RCI Demand, Funds, Simulation Time, etc.)  |
+-----------------------------------------------------------+
       ^                                             |
       | Reads/Writes                                | Reads State
       v                                             v
+-----------------------+                 +-----------------------+
|   SIMULATION ENGINE   |                 |    GRAPHICS ENGINE    |
| (Fixed Timestep Loop) |                 | (Variable Frame Rate) |
|                       |                 |                       |
|  - Power/Road Grid    |                 |  - HTML5 Canvas       |
|  - RCI Growth/Decay   |                 |  - Input Handling     |
|  - Cellular Automata  |                 |  - Camera Pan/Zoom    |
+-----------------------+                 +-----------------------+

```

### 1.1 The Simulation Loop (Fixed Timestep)

- **Execution:** Runs on a fixed interval (e.g., 250ms per tick).
- **Responsibility:** Deterministically processes game rules, mutates state arrays, increments game time, and evaluates economic changes.
- **Isolation:** Has zero knowledge of pixels, camera coordinates, or DOM elements.

### 1.2 The Graphics Engine (Variable Timestep)

- **Execution:** Driven by the browser's native `requestAnimationFrame` loop (targeting 60fps+).
- **Responsibility:** Reads the current state store and renders it to an HTML5 Canvas. Handles fluid viewport transformations (panning, zooming) and visual feedback.
- **Isolation:** Read-only access to the core simulation state. It cannot directly modify city data; it can only dispatch user intents through a controlled interface.

---

## 2. High-Level Component Boundaries

The project is structured into four distinct sub-systems with strict boundaries to ensure modularity. This allows any individual module (such as the renderer) to be entirely swapped out with minimal configuration.

```
                  +-------------------------+
                  |    CORE GAME ENGINE     |
                  +------------+------------+
                               |
       +-----------------------+-----------------------+
       |                       |                       |
       v                       v                       v
+--------------+       +---------------+       +---------------+
|  WORLD STATE |       |  SIMULATION   |       |  PRESENTATION |
|  (Data Layer)|       |  (Logic Layer)|       |  (View Layer) |
+--------------+       +---------------+       +---------------+

```

### 2.1 Core Game Engine (`Engine`)

- **Role:** Subsystem orchestrator and master clock.
- **Responsibilities:**
- Manages the lifecycle of the game loops.
- Controls simulation speed state transitions (Pause, Normal, Fast).
- Coordinates data passing between the Simulation and the View.

### 2.2 World State Subsystem (`WorldState`)

- **Role:** Single source of truth for the active session.
- **Responsibilities:**
- Holds map structures, financial records, and global simulation variables.
- Exposes serialized data methods for game saves and PWA `localStorage` operations.

### 2.3 Simulation Subsystem (`Simulation`)

- **Role:** The rules engine of the simulation.
- **Internal Modules:**
- `EconomicSimulator`: Balances RCI (Residential/Commercial/Industrial) demand, handles tax collection, and updates treasury calculations.
- `InfrastructureSimulator`: Manages utility graph networks (e.g., power line propagation, road capacity, and basic traffic routing).
- `GrowthSimulator`: Assesses tile development metrics (evaluating if a zone grows, stagnates, or decays based on access to power, roads, and land value).

### 2.4 Presentation & Input Subsystem (`View`)

- **Role:** Interface layer between the machine and the user.
- **Internal Modules:**
- `Renderer`: Translates raw numerical matrix data into geometric structures or sprite tiles onto the 2D Canvas viewport.
- `InputHandler`: Intercepts physical screen interactions (clicks, touches, drags) and resolves them into coordinate calculations within the grid space.
- `ToolManager`: Maintains state for the active construction or demolition tools equipped by the player.

---

## 3. Data Structure Design: The Layered Grid

To minimize overhead, bypass costly garbage collection pauses, and maximize cache-locality on mobile hardware, the city map avoids complex object orientation. Instead, it utilizes a **Flat Layered Grid** model composed of independent JavaScript Typed Arrays.

For an MVP map size of $64 \times 64$ tiles, each layer is initialized as a linear 1D array containing exactly $4,096$ elements.

### 3.1 Index Transformation Formula

To convert 2D Cartesian map coordinates $(x, y)$ into a flat 1D array index string, use the standard layout calculation:

$$\text{Index} = (y \times \text{Map Width}) + x$$

Conversely, coordinates can be extracted from a 1D index via:

$$x = \text{Index} \pmod{\text{Map Width}}$$

$$y = \lfloor \text{Index} / \text{Map Width} \rfloor$$

### 3.2 Layer Specification Matrix

| Layer Name             | Data Type    | Value Encoding Mapping                                                                                              | Purpose                                                                                    |
| ---------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **`zoneLayer`**        | `Uint8Array` | `0` = Empty, `1` = Residential, `2` = Commercial, `3` = Industrial, `4` = Road, `5` = Power Line, `6` = Power Plant | Defines structural identity and zoning designations.                                       |
| **`developmentLayer`** | `Uint8Array` | Range: `0` to `4`                                                                                                   | Tracks development progression stages or population density metrics for the specific tile. |
| **`powerLayer`**       | `Uint8Array` | `0` = Unpowered, `1` = Powered                                                                                      | Network verification layer flagged dynamically during infrastructure passes.               |
| **`pollutionLayer`**   | `Uint8Array` | Range: `0` to `255`                                                                                                 | Density value tracking environmental pollution levels across the map.                      |

---

## 4. Architectural Sequence Flow

The following lifecycle sequence outlines the execution flow for a single execution loop iteration:

1. **User Action:** The player selects the "Road" tool and touches the screen.
2. **Input Resolution:** `InputHandler` captures the touch point, translates screen coordinates to grid tile $(x=12, y=8)$, and verifies the transaction via `ToolManager`.
3. **State Mutation:** `WorldState.zoneLayer` updates index $524$ to value `4` (Road).
4. **Simulation Tick:** The next scheduled execution frame of the fixed `Simulation` loop begins:

- `InfrastructureSimulator` sweeps the map to recalculate connectivity paths.
- `GrowthSimulator` checks adjacent tiles for changes in accessibility.

5. **Render Pass:** The next variable `requestAnimationFrame` fires. `Renderer` reads the altered data state in `WorldState` and redraws the updated graphical map representation on screen.

# Project Architecture Documentation: Core Cycles, Infrastructure, & Web Integration

This document serves as the technical specification for the game's execution cycles, infrastructural graph simulations, and progressive web application (PWA) deployment standards.

---

## 1. Game Loop & State Flow Specification

To maintain a responsive UI while running a mathematical simulation, the engine uses an explicit separation of cycles. The state flows unidirectionally to prevent race conditions or erratic state mutations.

### 1.1 The Dual-Loop Mechanism

```
   [ Browser Tab Active ]
             │
             ├──> (Loop 1) requestAnimationFrame ~60fps ──> View/Render Pass
             │
             └──> (Loop 2) setInterval/setTimeout 4Hz  ──> Simulation Tick Pass

```

#### The Rendering Loop (Variable Timestep)

Driven entirely by the browser's native `requestAnimationFrame` (rAF). It interpolates visual effects, processes UI animations, and redraws the canvas view only when the browser is ready to paint a new frame.

#### The Simulation Loop (Fixed Timestep)

Driven by a deterministic timer set to a specific frequency (e.g., $4\text{ Hz}$ or 4 ticks per second). If the player changes the game speed, only the frequency of this loop changes; the rendering loop continues to run smoothly at the device's native refresh rate.

### 1.2 Data Flow & Command Pattern

To ensure the rendering engine never modifies the simulation state directly, user inputs are packaged into a **Command Pattern**.

1. **Capture:** The user selects a tool (e.g., "Zone Residential") and clicks on coordinate $(10, 15)$.
2. **Validation:** The `ToolManager` checks if the player has sufficient funds to afford the action.
3. **Dispatch:** A command payload `{ type: 'PLACE_ZONE', zoneType: 1, x: 10, y: 15 }` is pushed to an input queue.
4. **Execution:** At the start of the very next simulation tick, the engine processes all pending commands in the queue, updates the `WorldState`, and flushes the queue.
5. **Observation:** The rendering loop detects a state change on the next frame and updates the visual display.

---

## 2. Infrastructure Simulation Logic

The infrastructure layer manages the distribution of vital utilities across the city grid. Rather than scanning the entire map on every tick, it uses specialized graph algorithms to evaluate connectivity.

### 2.1 Power Grid Propagation (Breadth-First Search)

Power in _SimCity Classic_ flows through contiguous lines or adjacent conductive structures. The engine treats power distribution as an unweighted graph traversal problem.

#### The Algorithm Sequence:

1. **Source Discovery:** At the start of the infrastructure pass, the engine locates all power generation tiles (e.g., Coal Power Plants).
2. **Initialization:** A `visited` bitmask array (or a `Uint8Array` matching the map size) is initialized to all zeros. A First-In, First-Out (FIFO) queue is populated with the coordinates of all active power plants.
3. **Traversal (BFS):** While the queue is not empty:

- Dequeue the current tile coordinate.
- Mark this tile index as `1` (Powered) in the temporary power grid bitmask.
- Check the 4 orthogonal neighbors (North, South, East, West).
- If a neighbor is a conductive element (Power Line, Zone with a structure, Road) and has _not_ been visited, enqueue it and mark it as visited.

4. **State Commit:** The temporary power bitmask replaces the live `powerLayer`. Any zone not marked as powered during this sweep undergoes a stagnation or decay cycle.

### 2.2 Road Connectivity & Traffic Scan

Roads serve two purposes: allowing zones to develop by connecting them to the transit network, and generating traffic values based on density.

```
+───────────────────────────────────────────────────────────────+
|                 Road Scanning State Machine                   |
+───────────────────────────────────────────────────────────────+
                                │
                        [ Scan Tile ]
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
       [ Is Tile a Road? ]               [ Is Tile a Zone? ]
               │                                 │
     ┌─────────┴─────────┐                       ▼
     ▼                   ▼              [ Scan 2 Tiles Out ]
 [ Neighbor     [ Calculate Traffic ]            │
   Checks ]              │                       │
     │                   ▼                       ▼
     ▼            [ Based on local        [ Check for Road ]
[ Find Dead       Population Density ]           │
  Ends ]                                         ▼
                                        [ Update Zone Growth
                                           Accessibility Metric ]

```

#### Accessibility Verification

For a zone to grow, it must be within 2 tiles of a functional road network. The `GrowthSimulator` uses a localized window scan:

- For each zone tile, it checks a $5 \times 5$ bounding box centered on itself.
- If no road tile value (`4`) is detected within this perimeter, the zone's accessibility metric is set to `0`, halting development.

#### Traffic Accumulation

Traffic is simulated locally via cellular automata mechanics. Road tiles calculate their load by checking the population density of adjacent zones. High local density updates the respective index in a `trafficLayer` matrix, which can then be read by the rendering engine to draw busier roads or trigger pollution generation on adjacent tiles.

---

## 3. PWA & Browser Architecture

To make the game cross-platform, responsive, and playable offline on modern mobile devices, the architecture integrates specific Web APIs into its deployment layer.

### 3.1 Service Worker Configuration

A dedicated Service Worker handles asset caching to allow instantaneous loading and offline operation.

- **Cache Storage Strategy:** Cache-First for static assets (spritesheets, UI icons, HTML/CSS/JS bundles).
- **Lifecycle:** The worker intercepts fetch requests, serving assets from the local cache when offline. Updates are checked in the background whenever a network connection is detected, prompting the user with an "Update Available" notification on the next launch if changes exist.

### 3.2 Viewport & Mobile Interaction Mapping

Playing a grid-based simulation on a smartphone screen requires strict control over browser defaults.

- **CSS Configuration:** Prevention of default double-tap to zoom behavior via touch actions, and establishing fixed full-viewport scaling layouts:

```css
html,
body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none; /* Disables native browser panning/zooming */
}
```

- **Input Coalescing:** The `InputHandler` normalizes standard desktop mouse events and mobile pointer/touch events into unified game interaction coordinates. Pinch-to-zoom gestures calculate the geometric distance between two contact points to smoothly adjust the transform matrix of the 2D Canvas.

### 3.3 State Persistence (Saves & System Resilience)

Because mobile web apps can be aggressively suspended or closed by the operating system's memory manager, the game implements an automated persistence loop.

- **Storage Target:** IndexedDB (via a lightweight wrapper) or standard `localStorage` for smaller map configurations ($64 \times 64$).
- **Serialization:** The flat typed arrays (`zoneLayer`, `developmentLayer`, etc.) are converted into compressed binary blobs or Base64 strings along with metadata objects (funds, simulation time).
- **Save Intervals:**
- **Triggered Save:** Automatically executes when the browser fires a `visibilitychange` event (e.g., user minimizes the app or switches tabs).
- **Periodic Auto-Save:** Automatically snapshots the current state store every 5 minutes during active simulation ticks.

# Project Architecture Documentation: Advanced Engine Mathematics, Growth Mechanics, & Serialization

This document establishes the rigorous mathematical formulas, mechanical rule sets, and data schemas required to implement the rendering, economic growth, and data persistence layers of the simulation game.

---

## 1. Rendering Engine Matrix & Camera Mathematics

To project a flat, 1D array database into a dynamic, interactive 2D visual viewport, the engine utilizes affine transformation matrices. The camera system translates abstract grid coordinate space into view space (screen coordinates) and back again to process user interaction.

```
                  +──────────────────────────+
                  |    GRID SPACE (x, y)     |
                  +─────────────┬────────────+
                                │
                                │  Camera Transform Matrix
                                │  (Scale, Pan X, Pan Y)
                                ▼
                  +──────────────────────────+
                  |   SCREEN SPACE (px, py)  |
                  +──────────────────────────+

```

### 1.1 Forward Projection (Grid Space to Screen Space)

Given a tile size $S$ (in pixels), a zoom scale factor $k$, and camera viewport panning offsets $T_x$ and $T_y$, any coordinate pair $(x, y)$ in the grid data model is projected onto the HTML5 Canvas view space $(p_x, p_y)$ via the following linear transformation:

$$p_x = (x \times S \times k) + T_x$$

$$p_y = (y \times S \times k) + T_y$$

To render the map efficiently, the `Renderer` runs this projection loop exclusively for visible assets inside the bounding box of the browser window (view frustum culling).

### 1.2 Inverse Projection (Screen Space to Grid Space)

When a user clicks, touches, or drags on the screen at viewport coordinates $(p_x, p_y)$, the engine must calculate the corresponding discrete cell indices $(x, y)$ in the state arrays. This is achieved by computing the inverse of the forward projection matrix:

$$x = \left\lfloor \frac{p_x - T_x}{S \times k} \right\rfloor$$

$$y = \left\lfloor \frac{p_y - T_y}{S \times k} \right\rfloor$$

#### Viewport Boundary Bounds Validation:

Before triggering an index check on the data array, the calculated coordinates must be validated against the map dimensions:

$$\text{Valid} = (0 \le x < \text{Map Width}) \land (0 \le y < \text{Map Height})$$

---

## 2. RCI Growth Mechanics & Simulation Math

The city's engine balances three independent structural variables: Residential ($R$), Commercial ($C$), and Industrial ($I$). The global engine metrics determine the systemic demand, while localized tile evaluations control visual development.

### 2.1 Global Demand Equations (The RCI Engine)

At the start of every global economic pass, the engine aggregates total city statistics: total population ($P_R$), total commercial employment space ($E_C$), and total industrial job capacity ($E_I$). The global market demands ($D_R, D_C, D_I$) are adjusted continuously using a differential feedback system:

#### Residential Demand ($D_R$):

Residential interest scales based on available jobs vs. active population, influenced by the municipal tax rate ($T_m$):

$$D_R = \left( \frac{E_C + E_I}{P_R + 1} \right) \times (1.0 - T_m) - K_b$$

_Where $K_b$ is a baseline friction constant representing natural city overhead._

#### Commercial Demand ($D_C$):

Commercial demand reflects production matching against the internal consumer market size:

$$D_C = \left( \frac{P_R}{E_C + 1} \right) \times D_R$$

#### Industrial Demand ($D_I$):

Industrial demand models external trade opportunities and raw production capacity independent of local consumption:

$$D_I = \left( \frac{P_R + E_C}{E_I + 1} \right) \times (1.0 - T_m)$$

### 2.2 Localized Tile Evaluation & Growth Vector Calculation

Even if global demand for a zone type is high, a single tile will not develop unless its local conditions are favorable. When the `GrowthSimulator` runs its cyclic sweep over a tile, it computes a localized Growth Potential Score ($G_p$):

$$G_p = (\text{Global Demand}) + w_1 \cdot \text{Powered} + w_2 \cdot \text{Access} + w_3 \cdot \text{LandValue} - w_4 \cdot \text{Pollution}$$

#### Variable Definition Matrix:

- **$\text{Global Demand}$:** The current value of $D_R, D_C,$ or $D_I$ matching the tile's zone layer designation.
- **$\text{Powered}$:** Binary state flag ($0$ or $1$) fetched directly from the `powerLayer`.
- **$\text{Access}$:** Binary state flag ($0$ or $1$) determined by the 2-tile road proximity matrix scan.
- **$\text{LandValue}$:** Local localized score scalar (Range: $0$ to $100$) derived from proximity to open spaces, waterfronts, or historical growth centers.
- **$\text{Pollution}$:** Local density penalty value (Range: $0$ to $255$) fetched from the `pollutionLayer`.
- **$w_1, w_2, w_3, w_4$:** Explicit balancing weights configured within the engine constants.

#### State Transitions:

- If $G_p > \text{Growth Threshold}$, increment the corresponding index in `developmentLayer` by $1$ (up to a maximum value of $4$).
- If $G_p < \text{Decay Threshold}$, decrement the index in `developmentLayer` by $1$ (down to a minimum value of $0$, resulting in an abandoned lot).

---

## 3. Game Save File Format & Serialization Specification

To support persistent browser saving via `localStorage` or `IndexedDB`, as well as cross-platform file downloads, game states are serialized into a standardized JSON package schema.

Large, flat typed arrays are stored using run-length encoding (RLE) or standard base64 string conversions to minimize file size and avoid string allocation performance limits in web browsers.

```json
{
  "$schema": "https://simcity-classic-pwa.engine/schemas/v1/save.json",
  "metadata": {
    "cityName": "New Metropolis",
    "saveTime": 1779068400000,
    "engineVersion": "1.0.0"
  },
  "simulationState": {
    "gameTick": 14240,
    "funds": 15450,
    "taxRate": 0.07,
    "globalDemand": {
      "residential": 45.2,
      "commercial": -12.5,
      "industrial": 18.9
    }
  },
  "mapSize": {
    "width": 64,
    "height": 64
  },
  "gridLayers": {
    "zoneLayer": "AQIDBAUGBwECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGE=",
    "developmentLayer": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
    "powerLayer": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA────────────────AAAAAAAAAAAAAAAA────────────────AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
    "pollutionLayer": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA────────────────────────────────AAAAAAAAAAAAAAAA────────────────────────────────AAAAAAAAAAAAAAAAAAAAAA=="
  }
}
```

### 3.1 Schema Field Definitions

#### `metadata` (Object)

- `cityName` (String): The user-defined identifier for the city.
- `saveTime` (Integer): Unix millisecond timestamp recording exactly when the save action was dispatched.
- `engineVersion` (String): Semantic version identifier ensuring retro-compatibility parsing in subsequent application updates.

#### `simulationState` (Object)

- `gameTick` (Integer): The running total of clock updates executed by the fixed timestep simulation loop.
- `funds` (Integer): The current liquid asset treasury total available to the player profile.
- `taxRate` (Float): Decimal representation of municipal taxation constraints (e.g., `0.07` representing a $7\%$ rate).
- `globalDemand` (Object): Active floating-point scores for the core macro-economic indices.

#### `gridLayers` (Object)

- Contains the raw data maps for every structural element. Each layer name maps directly to an ASCII Base64 encoded string generated by converting the internal JavaScript linear binary buffers (`ArrayBuffer`) through a bitwise transform pipeline:

$$\text{Uint8Array} \longrightarrow \text{Binary String} \longrightarrow \text{Base64 String}$$
