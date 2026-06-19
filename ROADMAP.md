## 📅 Project Milestones & Development Roadmap

### 🏁 Milestone 1: The Matrix Infrastructure (Weeks 1–2)

**Objective:** Establish the multi-threaded foundation, data structures, and basic viewport controls.

- **Task 1.1: Web Worker & Shared Memory Setup**
- Create `main.js` and `sim-worker.js`.
- Implement the `SharedArrayBuffer` initialization logic to share a small $100 \times 100$ grid map across threads.
- Verify that data written by the background worker can be read instantly by the main thread with zero-copy overhead.

- **Task 1.2: The Core Viewport Renderer**
- Build the HTML5 Canvas context wrapper in `renderer.js`.
- Implement basic keyboard/mouse panning and zooming mechanics.
- Configure the canvas styles for a authentic 1970s look: black background, crisp green/amber anti-aliased strokes, and a subtle CSS bloom filter to simulate a CRT monitor.

- **Task 1.3: 8-Way Array Math Verification**
- Write the flat index lookup functions for the 8 surrounding neighbors (Moore Neighborhood).
- Run tests ensuring boundary wrapping or clipping behaves correctly at the edges of the flat 1D array.

> 📦 **Phase 1 Deliverable:** A glowing, retro grid on screen that you can smoothly pan and zoom around, running a background tick loop that doesn't block the UI thread.

---

### 🏗️ Milestone 2: The Infrastructure Core (Weeks 3–5)

**Objective:** Implement roads, 45-degree diagonal networks, basic zoning types, and utility distribution graphs.

- **Task 2.1: Multi-Directional Transit Input**
- Implement an input state that lets you "draw" networks (roads/power lines) on the canvas grid in horizontal, vertical, and 45-degree paths.
- Write the vector drawing logic to cleanly join 45-degree intersection junctions on the canvas.

- **Task 2.2: Graph-Network Flow Algorithms**
- Implement a high-speed Breadth-First Search (BFS) or matrix network solver inside the Web Worker.
- Simulate basic electricity and water: connect a "Power Plant" node to the network and calculate which cells are successfully powered or unpowered based on network distance.

- **Task 2.3: Basic Microscopic Growth (RCI)**
- Implement basic Low/Medium/High density cell values for Residential, Commercial, and Industrial zones.
- Create a simple cellular automata loop where cells increment their density value over time _if_ they are connected to a utility network.

> 📦 **Phase 2 Deliverable:** A playable sandbox where you can lay down roads, power grids, and basic zones, watching the vector paths light up with energy and simple wireframe buildings grow into place.

---

### 🧠 Milestone 3: The Social Equilibrium (Weeks 6–9)

**Objective:** Code the complex macro-system feedback loops, mixed-use zoning, wealth-based taxation, and social indicators.

- **Task 3.1: Fluid Dynamics Traffic Model**
- Replace standard pathfinding with a macroscopic network flow engine.
- Calculate traffic stress along roads based on regional zone densities, scaling travel friction by $1.414$ across diagonal cells.

- **Task 3.2: Advanced Zoning & Progressive Taxes**
- Integrate Public/Social Housing variables and Mixed-Use zoning rules.
- Write the local optimization loop for mixed-use cells (internal commerce solving local commute stress).
- Implement the wealth tax calculation tick, adding loops for capital flight or social safety net distributions based on local wealth inequality indices.

- **Task 3.3: Environmental Vector Diffusion**
- Write the cellular diffusion loop for Air/Ground pollution.
- Incorporate the global wind vector to drift pollution grids diagonally.
- Connect pollution levels to a lagging cell health calculation matrix.

> 📦 **Phase 3 Deliverable:** A highly responsive systemic simulation where tax rates, zoning choice, traffic congestion, and industrial placement organically trigger regional growth, decline, or economic redistribution.

---

### 🎨 Milestone 4: The Living Painting & UI Dashboard (Weeks 10–12)

**Objective:** Implement the emergent human systems (culture, deathcare), side panels, vector animations, and polish.

- **Task 4.1: The Bottom-Up Culture Engine**
- Implement the Culture Generation formulas based on local Time Wealth and Housing Security thresholds.
- Write the culture diffusion and social cohesion variables that mitigate localized crime spikes.

- **Task 4.2: Dynamic Dashboard UI**
- Build the side-panel HTML grid structure.
- Connect the real-time statistical array data to lightweight canvas-drawn vector graphs to display historical trends (population curves, wealth distribution shifts, and the GWI score).

- **Task 4.3: Animated Vector Polish**
- Add vector particle animations to roads (crawling dashes representing traffic flow/transit velocity).
- Add color-shifting vector matrices to represent cultural festivals or severe city blackouts/crises.
- Create a dedicated "Topographic Capital Layer" to visualize wealth distribution curves.

> 📦 **Phase 4 Deliverable:** The fully realized, high-performance master product. A deep, fascinating, visually stunning macro-city simulator that scales to millions of citizens and acts as an interactive piece of systemic art.
