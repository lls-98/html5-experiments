# Architecture & Design Specification: Project MacroCity

## 1. Executive Summary & Philosophy

Project MacroCity is an open-ended, macroscopic urban simulation engine designed to run entirely within modern web browsers using HTML5 technologies. Moving away from standard agent-based gaming models (which track individual entities), MacroCity models the city as a complex, continuous fluid dynamic system.

The project rejects traditional neo-liberal market optimization metrics (e.g., maximizing raw land value or corporate profit metrics). Instead, its underlying mathematical models are balanced to prioritize systemic stability, universal public infrastructure, spatial equity, and human wellness. The primary success metric is the **Gross Well-Being Index (GWI)**.

The final software functions as a "living painting": a highly performant, fully animated, 1970s-style retro vector simulation capable of modeling a metropolis of millions of citizens smoothly on lightweight hardware.

---

## 2. System Architecture

To achieve massive scale and zero-latency UI performance, the system is strictly decoupled into a multi-threaded pattern.

```
+-------------------------------------------------------------+
|                         Web Browser                         |
|  +------------------------+     +------------------------+  |
|  |     Simulation Thread  |     |       Main Thread      |  |
|  |      (Web Worker)      |     |                        |  |
|  |                        |     |  +------------------+  |  |
|  |  +------------------+  |     |  |   Canvas UI      |  |  |
|  |  |  Systems Engines |  |     |  |   (Draws City)   |  |  |
|  |  +--------+---------+  |     |  +--------+---------+  |  |
|  |           | Data       |     |           ^            |  |
|  |           v Transfer   |     |           | Request    |  |
|  |  +------------------+  |     |  +--------+---------+  |  |
|  |  |  Macro-Matrices  |=======>>  |   DOM UI Engine  |  |  |
|  |  +------------------+  |     |  |   (Graphs/Stats) |  |  |
|  |                        |     |  +------------------+  |  |
|  +------------------------+     +------------------------+  |
+-------------------------------------------------------------+

```

### 2.1. The Data Layer: Macro-Matrices

- **Flat Arrays:** The city map is not an array of heavy objects. It consists of multiple 1D Typed Arrays (`Uint8Array`, `Float32Array`) aligned in parallel memory blocks.
- **Performance Boundary:** The processing overhead is strictly bounded by the size of the map grid ($O(N)$ where $N$ is total cells) rather than the size of the population ($O(P)$).
- **Multi-Threading:** The mathematical loop runs inside an isolated background **Web Worker** thread.
- **Zero-Copy Memory Sharing:** Memory buffers (`SharedArrayBuffer`) are read directly by the main thread, allowing the renderer to draw the city state without triggering expensive data serialization or copy operations.

### 2.2. The Render Layer: HTML5 Canvas

- **Aesthetic:** A minimalist, high-contrast, glowing 1970s CRT vector-wireframe style. It bypasses textures, heavy sprites, and rasterized images entirely, relying on native geometric paths.
- **Viewport Optimization:** The engine only renders cells visible inside the user's viewport, adjusting geometric complexity dynamically based on zoom depth.

---

## 3. Advanced Grid Mechanics: 8-Way Connectivity

To move past rigid rectangular grid structures without sacrificing performance, the simulator implements a **Moore Neighborhood 8-Way Connectivity Model**.

- **Diagonal Networks:** Roads, transit links, and utilities can cut across cells at 45-degree angles.
- **Pythagorean Spatial Friction:** Movement along a diagonal path scales spatial weight by $\sqrt{2} \approx 1.414$. The traffic fluid dynamics engine accounts for this distance penalty, allowing traffic to organically favor straight avenues unless a diagonal boulevard saves sufficient systemic travel distance.
- **Fractional Grid Allocation:** Cells bisected by a 45-degree road are marked as fractional boundaries. They support reduced-density mixed-use developments or public green spaces, matching their remaining visual geometric boundaries perfectly.

---

## 4. Macroscopic City Core Systems

### 4.1. Zoning, Economy, and Mixed-Use

The simulation avoids traditional isolated zoning restrictions by embracing modern urban diversity.

- **Zoning Profiles:** Supports Low, Medium, and High densities for Private Residential, Public/Social Housing, and Commercial uses.
- **Industrial Subtypes:** Features Light Industry, Heavy Industry, Agriculture, and Office/Service sectors.
- **The Mixed-Use Paradigm:** Low, Medium, and High-density mixed zoning integrates residential housing and commercial retail directly inside the same cell index. If a cell satisfies its own resource constraints internally, the local commute friction drops to zero, reducing macro-traffic pressure and maximizing citizen leisure time.
- **Economic Flows:** Tracks the velocity of capital across sectors. Stagnated or localized poverty is mitigated via automated public safety net distributions (e.g., universal welfare buffers) to maintain labor capacity in adjacent commercial zones.

### 4.2. Progressive Wealth-Based Taxation

- **Asset Assessment:** Taxation targets total accumulated `StoredWealth` per cell index rather than transactional income.
- **Bracketeer Mechanics:** High wealth concentrations face progressive tax brackets to fund city systems.
- **Systemic Feedback Loops:** Balanced wealth extraction fuels universal public infrastructure, which boosts the global well-being score. Unchecked tax avoidance creates vast wealth inequality, resulting in severe local crime spikes and public health decay. Conversely, over-taxation without public reinvestment triggers capital flight across the boundary vector.

### 4.3. Transportation & Mass Transit Graph

Transit acts as a high-velocity spatial equalizer rather than a transactional revenue center.

- **Conduit Graphing:** Mass transit (Subways, Trams, Trains) forms a topological graph layout layered above the cellular grid matrix.
- **The Gravity Split:** Transit artificially shortens the "Effective Distance" metric between residential and employment zones. The macro-engine applies a modal split curve to instantly divert heavy traffic volume off surface streets and onto the high-speed transit graph.
- **Visual Vectoring:** Visualized in transit toggles via neon dashed lines crawling smoothly across the grid. The speed and brightness of the dash pulse correspond directly to line frequency and processing throughput.

### 4.4. Energy Metabolisms

Energy options bridge the physical environment, public health fields, and the city budget.

- **Fossil Fuels (Coal/Gas):** High base output and low capital costs, balanced against severe, continuous **Air/Ground Pollution Fields** that diffuse downwind based on a global wind vector.
- **Renewables (Solar/Wind):** Clean, zero-pollution nodes. Solar demands a large spatial cell footprint; Wind output scales dynamically based on a global topographical wind-velocity matrix.
- **Nuclear Power:** High energy density and zero carbon footprint, countered by extreme up-front municipal budget investments and a localized safety risk that penalizes adjacent land values if maintenance funding drops below baseline thresholds.

### 4.5. Public Utilities & Services

- **Network Pipelines (Electricity, Gas, Water, Sewer):** Distributed via graph flow structures layered underneath the primary road network. Shortages trigger cascading pressure drops, stripping the furthest nodes on the network first.
- **Solid Waste Management:** Trash generation scales with density. Collection efficiency degrades alongside local road network congestion metrics. Accumulated waste triggers localized ground contamination and drops public health scores.
- **Deathcare Matrix:** A slow-moving mortality index requires steady municipal management. Inadequate capacity damages civic cohesion and poses biological public health risks. Cemeteries double as public urban carbon sinks, lowering the heat-island effect and generating local cultural value.

### 4.6. Human Systems: Culture & Well-Being

Culture is modeled as an emergent, bottom-up asset generated by systemic stability.

- **Culture Generation Rate:** Formed organically in zones where **Housing Security** is high and **Time Wealth** is maximized (short commutes, stable rents).
- **Social Cohesion Buffer:** Cultural vibrancy spreads outwards across neighboring fields. High local cohesion builds community resilience, dampening crime spikes during economic recessions and protecting neighborhoods against displacement or corporatization.

---

## 5. The Core Dashboard: Gross Well-Being Index (GWI)

The primary indicator of a successful city is calculated using the geometric mean of its core social infrastructure networks, ensuring that maximizing wealth at the expense of human systems results in a net-failing score.

$$\text{GWI} = \sqrt[4]{\text{Health Security} \times \text{Education Access} \times \text{Environmental Quality} \times \text{Leisure (Time Wealth)}}$$

- **Visual Mapping:** A city optimizing this index displays an intricate, balanced, distributed vector glow with vibrant park canopies and steady geometric line weights. A city failing this index presents sharp, stark visual inequalities—blinding corporate clusters bordered by dark, decaying residential fringes.
