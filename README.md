# Wumpus World – Artificial Intelligence Mini-Project

An interactive, modern, visually attractive web-based prototype and Python implementation for the classic **Wumpus World** Artificial Intelligence problem (Russell & Norvig, *Artificial Intelligence: A Modern Approach*).

Designed for college AI mini-project submissions and laboratory demonstrations.

---

## 🌟 Key Features

1. **Dual Execution Environment**:
   - **Interactive Web Prototype**: Zero-dependency, responsive, dark-mode cave exploration interface with real-time propositional deduction, fog-of-war, Web Audio synthesizer, and step-by-step reasoning.
   - **Autonomous Python Engine (`wumpus_world.py`)**: Terminal ASCII visualizer, Knowledge Base inference engine, and Breadth-First Search (BFS) pathfinder.
2. **Knowledge-Based Logic Agent**:
   - Propositional logic deduction rules:
     - \(\neg \text{Breeze} \implies\) Adjacent rooms are safe from Pits.
     - \(\neg \text{Stench} \implies\) Adjacent rooms are safe from the Wumpus.
     - Multi-sensor stench intersection pinpointing the exact single Wumpus room without guessing.
   - BFS pathfinding through verified safe rooms only.
   - Safe return navigation upon grabbing gold back to `(1,1)` to escape.
3. **Interactive Human & Autonomous AI Modes**:
   - **Start AI / Pause / Resume / Step**: Autonomous agent execution with configurable simulation speeds (Slow, Normal, Fast).
   - **Manual Mode**: On-screen D-Pad and keyboard shortcuts (`W`, `A`, `D`, `G`, `S`, `C`).
   - **Shoot Arrow**: Directional arrow firing that slays the Wumpus if in straight line-of-sight and emits a cave-wide scream.
4. **Developer Debug View**:
   - Omniscient spectator toggle showing the true hidden locations of the Wumpus, Pits, and Gold for educational evaluation.
5. **Interactive AI Concepts Modal**:
   - In-depth expandable explanations of Partial Observability, KB Agents, Propositional Logic, BFS Search, State Space, and PEAS.

## Default Demonstration World

The browser prototype starts with the fixed benchmark cave: agent at `(1,1)`, Wumpus at `(4,3)`, pits at `(4,1)` and `(4,4)`, and gold at `(2,3)`. The AI reasons from percepts and its knowledge base; hidden locations are displayed only in Debug View.

---

## 📐 PEAS Formal Specification

| Component | Description |
| :--- | :--- |
| **Performance Measure** | +1000 for escaping with gold, -1000 for falling into a pit or eaten by Wumpus, -1 per move, -10 for shooting arrow. |
| **Environment** | 4×4 grid of rooms. Walls on perimeter. Pits in rooms with probability 0.2. One living Wumpus. One gold bar. Start at (1,1). |
| **Actuators** | `MoveForward`, `TurnLeft`, `TurnRight`, `Grab`, `Shoot`, `Climb`. |
| **Sensors** | `[Stench, Breeze, Glitter, Bump, Scream]`. |

---

## 🚀 How to Run

### 1. Web Prototype (Browser Demo)

You can launch the web application with Python's built-in HTTP server:

```bash
cd wumpus-world
python -m http.server 8000
```

Then open your browser at:
`http://localhost:8000`

*(Or simply double-click `index.html` to open directly in any modern browser!)*

### 2. Standalone Python Mini-Project (`wumpus_world.py`)

Run the autonomous AI solver demo in your terminal:
```bash
python wumpus_world.py
```

Run in interactive manual play mode:
```bash
python wumpus_world.py --manual
```

Run with a randomized valid cave world:
```bash
python wumpus_world.py --random
```

Run automated verification tests:
```bash
python wumpus_world.py --test
```

---

## 🗂️ Project File Structure

```
wumpus-world/
├── index.html              # Main interactive web application entry
├── styles/
│   └── main.css            # Ancient cave exploration theme & responsive styles
├── js/
│   ├── audio.js            # Web Audio API retro sound synthesizer
│   ├── wumpus_engine.js    # Propositional inference KB & environment logic
│   └── app.js              # Application coordinator, DOM renderer & event listeners
├── src/                    # Modular React + TypeScript reference codebase
│   ├── types.ts            # TypeScript interfaces & types
│   ├── constants.ts        # Default board setup & scoring rules
│   └── App.tsx             # React root component
├── wumpus_world.py         # Complete Python AI assignment script (Russell & Norvig)
└── README.md               # Project documentation & PEAS guide
```

---

## 🎮 Keyboard Controls

- `W` / `Up Arrow`: Move Forward
- `A` / `Left Arrow`: Turn Left
- `D` / `Right Arrow`: Turn Right
- `G`: Grab Gold
- `S`: Shoot Arrow
- `C`: Climb out of cave (at (1,1))
- `Spacebar`: Step AI forward 1 step
