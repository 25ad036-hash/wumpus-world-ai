/**
 * WUMPUS WORLD - AI EXPLORER
 * Main Application Coordinator & UI Controller
 */

// SVG Icon Helpers
const ICONS = {
  agent: (dir = "EAST") => {
    const rotation = { NORTH: -90, SOUTH: 90, EAST: 0, WEST: 180 }[dir] || 0;
    return `
      <svg viewBox="0 0 40 40" width="36" height="36" style="transform: rotate(${rotation}deg); transition: transform 0.2s ease;">
        <circle cx="20" cy="20" r="16" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
        <!-- Hunter visor / hat -->
        <path d="M12 20 L28 20" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>
        <polygon points="32,20 24,14 24,26" fill="#fbbf24"/>
        <circle cx="16" cy="16" r="2.5" fill="#f8fafc"/>
        <circle cx="16" cy="24" r="2.5" fill="#f8fafc"/>
      </svg>
    `;
  },
  wumpus: (alive = true) => `
    <svg viewBox="0 0 40 40" width="36" height="36">
      <path d="M8 32 C8 16 12 10 20 10 C28 10 32 16 32 32 Z" fill="${alive ? '#7e22ce' : '#475569'}" stroke="${alive ? '#c084fc' : '#64748b'}" stroke-width="2"/>
      <!-- Horns -->
      <path d="M12 12 L8 4 L16 10" fill="${alive ? '#dc2626' : '#64748b'}"/>
      <path d="M28 12 L32 4 L24 10" fill="${alive ? '#dc2626' : '#64748b'}"/>
      <!-- Eyes -->
      <circle cx="15" cy="18" r="2.5" fill="${alive ? '#ef4444' : '#0f172a'}"/>
      <circle cx="25" cy="18" r="2.5" fill="${alive ? '#ef4444' : '#0f172a'}"/>
      <!-- Fangs -->
      <polygon points="17,25 20,29 23,25" fill="#f8fafc"/>
    </svg>
  `,
  pit: () => `
    <svg viewBox="0 0 40 40" width="36" height="36">
      <ellipse cx="20" cy="20" rx="16" ry="14" fill="#020617" stroke="#334155" stroke-width="2"/>
      <ellipse cx="20" cy="20" rx="10" ry="8" fill="#000000" stroke="#1e293b" stroke-width="1.5"/>
      <path d="M8 20 C14 12 26 28 32 20" stroke="#475569" stroke-width="1.5" stroke-dasharray="2 3" fill="none"/>
    </svg>
  `,
  gold: () => `
    <svg viewBox="0 0 40 40" width="36" height="36">
      <!-- Treasure chest -->
      <rect x="8" y="16" width="24" height="18" rx="3" fill="#d97706" stroke="#fbbf24" stroke-width="2"/>
      <path d="M8 18 C8 12 14 10 20 10 C26 10 32 12 32 18 Z" fill="#f59e0b" stroke="#fbbf24" stroke-width="2"/>
      <!-- Lock / Glow -->
      <circle cx="20" cy="22" r="3" fill="#fef08a"/>
      <circle cx="20" cy="22" r="6" fill="none" stroke="#fef08a" stroke-width="1" stroke-dasharray="1 2"/>
    </svg>
  `,
  breeze: () => `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M4 12h12a3 3 0 1 0-3-3"/>
      <path d="M2 17h16a3 3 0 1 0-3-3"/>
    </svg>
  `,
  stench: () => `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
    </svg>
  `,
  glitter: () => `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z"/>
    </svg>
  `
};

class WumpusApp {
  constructor() {
    this.env = new WumpusEngine.WumpusEnvironment();
    this.agent = new WumpusEngine.IntelligentAgent();
    this.gameStatus = "READY"; // READY, RUNNING, PAUSED, WON, LOST
    this.isManual = false;
    this.debugMode = false;
    this.speed = "normal"; // slow: 1200ms, normal: 600ms, fast: 200ms
    this.timer = null;
    this.selectedRoom = null; // [r, c]
    this.log = [];
    this.stepCount = 0;
    this.currentReasoning = "Agent initialized at starting room (1,1). Ready for exploration.";
    this.currentAction = "Ready";
    this.currentPercepts = this.env.peekPercepts();

    this.initDOM();
    this.bindEvents();
    this.resetGame(false);
  }

  getSpeedMs() {
    if (this.speed === "slow") return 1200;
    if (this.speed === "fast") return 200;
    return 600;
  }

  addLog(type, text, step = null) {
    const s = step !== null ? step : this.stepCount;
    this.log.unshift({ id: Date.now() + Math.random(), type, text, step: s });
    if (this.log.length > 80) this.log.pop();
    this.renderLog();
  }

  initDOM() {
    this.boardEl = document.getElementById("grid-board");
    this.statusBadgeEl = document.getElementById("status-badge");
    this.statusTextEl = document.getElementById("status-text");
    this.reasoningTextEl = document.getElementById("reasoning-text");
    this.actionTextEl = document.getElementById("action-text");
    this.posValEl = document.getElementById("pos-val");
    this.scoreValEl = document.getElementById("score-val");
    this.movesValEl = document.getElementById("moves-val");
    this.visitedValEl = document.getElementById("visited-val");
    this.safeValEl = document.getElementById("safe-val");
    this.unknownValEl = document.getElementById("unknown-val");
    this.goldValEl = document.getElementById("gold-val");
    this.arrowValEl = document.getElementById("arrow-val");

    // Panels
    this.logBoxEl = document.getElementById("log-box");
    this.deductionsBoxEl = document.getElementById("deductions-box");
    this.visitedListEl = document.getElementById("kb-visited");
    this.safeListEl = document.getElementById("kb-safe");
    this.pitsListEl = document.getElementById("kb-pits");
    this.wumpusListEl = document.getElementById("kb-wumpus");
    this.unknownListEl = document.getElementById("kb-unknown");
    this.inspectorContentEl = document.getElementById("inspector-content");

    // Percept Badges
    this.pStenchEl = document.getElementById("p-stench");
    this.pBreezeEl = document.getElementById("p-breeze");
    this.pGlitterEl = document.getElementById("p-glitter");
    this.pBumpEl = document.getElementById("p-bump");
    this.pScreamEl = document.getElementById("p-scream");

    // Buttons
    this.btnStart = document.getElementById("btn-start");
    this.btnPause = document.getElementById("btn-pause");
    this.btnResume = document.getElementById("btn-resume");
    this.btnStep = document.getElementById("btn-step");
    this.btnReset = document.getElementById("btn-reset");
    this.btnNewWorld = document.getElementById("btn-new-world");
    this.btnDebug = document.getElementById("btn-debug");
    this.btnSound = document.getElementById("btn-sound");
    this.btnConcepts = document.getElementById("btn-concepts");
    this.btnClearLog = document.getElementById("btn-clear-log");

    // Manual controls
    this.btnForward = document.getElementById("btn-fwd");
    this.btnLeft = document.getElementById("btn-turn-left");
    this.btnRight = document.getElementById("btn-turn-right");
    this.btnGrab = document.getElementById("btn-grab");
    this.btnClimb = document.getElementById("btn-climb");
    this.btnShootN = document.getElementById("btn-shoot-n");
    this.btnShootS = document.getElementById("btn-shoot-s");
    this.btnShootE = document.getElementById("btn-shoot-e");
    this.btnShootW = document.getElementById("btn-shoot-w");
  }

  bindEvents() {
    this.btnStart.addEventListener("click", () => this.startAI());
    this.btnPause.addEventListener("click", () => this.pauseSimulation());
    this.btnResume.addEventListener("click", () => this.resumeSimulation());
    this.btnStep.addEventListener("click", () => this.stepAI());
    this.btnReset.addEventListener("click", () => this.resetGame(false));
    this.btnNewWorld.addEventListener("click", () => {
      if (confirm("Generate a new randomized cave world? Current game state will reset.")) {
        this.resetGame(true);
      }
    });

    this.btnDebug.addEventListener("click", () => {
      this.debugMode = !this.debugMode;
      this.btnDebug.classList.toggle("btn-gold", this.debugMode);
      this.btnDebug.classList.toggle("btn-secondary", !this.debugMode);
      this.btnDebug.textContent = this.debugMode ? "Debug: ON" : "Debug View";
      this.render();
    });

    this.btnSound.addEventListener("click", () => {
      window.soundManager.muted = !window.soundManager.muted;
      this.btnSound.textContent = window.soundManager.muted ? "Sound: OFF" : "Sound: ON";
    });

    this.btnClearLog.addEventListener("click", () => {
      this.log = [];
      this.renderLog();
    });

    // Speed options
    document.querySelectorAll(".speed-opt").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".speed-opt").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        this.speed = e.target.getAttribute("data-speed");
        if (this.gameStatus === "RUNNING") {
          this.pauseSimulation();
          this.resumeSimulation();
        }
      });
    });

    // Manual controls
    this.btnForward.addEventListener("click", () => this.manualAction("FORWARD"));
    this.btnLeft.addEventListener("click", () => this.manualAction("LEFT"));
    this.btnRight.addEventListener("click", () => this.manualAction("RIGHT"));
    this.btnGrab.addEventListener("click", () => this.manualAction("GRAB"));
    this.btnClimb.addEventListener("click", () => this.manualAction("CLIMB"));
    this.btnShootN.addEventListener("click", () => this.manualAction("SHOOT", "NORTH"));
    this.btnShootS.addEventListener("click", () => this.manualAction("SHOOT", "SOUTH"));
    this.btnShootE.addEventListener("click", () => this.manualAction("SHOOT", "EAST"));
    this.btnShootW.addEventListener("click", () => this.manualAction("SHOOT", "WEST"));

    // Keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (this.gameStatus === "WON" || this.gameStatus === "LOST") return;

      if (e.key === "w" || e.key === "ArrowUp") this.manualAction("FORWARD");
      else if (e.key === "a" || e.key === "ArrowLeft") this.manualAction("LEFT");
      else if (e.key === "d" || e.key === "ArrowRight") this.manualAction("RIGHT");
      else if (e.key === "g") this.manualAction("GRAB");
      else if (e.key === "c") this.manualAction("CLIMB");
      else if (e.key === "s") this.manualAction("SHOOT");
      else if (e.key === " ") {
        e.preventDefault();
        this.stepAI();
      }
    });

    // Concepts Modal
    const modalEl = document.getElementById("concepts-modal");
    this.btnConcepts.addEventListener("click", () => {
      modalEl.style.display = "flex";
    });
    document.getElementById("modal-close").addEventListener("click", () => {
      modalEl.style.display = "none";
    });
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) modalEl.style.display = "none";
    });

    // Expandable concept cards
    document.querySelectorAll(".concept-card").forEach(card => {
      card.addEventListener("click", () => {
        const body = card.querySelector(".concept-body");
        const isOpen = body.style.display === "block";
        body.style.display = isOpen ? "none" : "block";
        const icon = card.querySelector(".concept-arrow");
        if (icon) icon.textContent = isOpen ? "▼" : "▲";
      });
    });
  }

  resetGame(randomWorld = false) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.log = [];
    if (randomWorld) {
      this.env = WumpusEngine.WumpusEnvironment.createRandom(4, 0.2);
      this.addLog("info", "Generated new randomized cave world.");
    } else {
      this.env = new WumpusEngine.WumpusEnvironment(4, [4, 3], [[4, 1], [4, 4]], [2, 3]);
      this.addLog("info", "Loaded standard fixed benchmark world.");
    }

    this.agent = new WumpusEngine.IntelligentAgent(4);
    this.gameStatus = "READY";
    this.stepCount = 0;
    this.selectedRoom = [1, 1];
    this.currentReasoning = "Agent ready at cave entrance (1,1). Click 'Start AI' or use manual controls.";
    this.currentAction = "Ready";

    // Initial perception
    const p = this.env.getPercepts();
    this.currentPercepts = p;
    this.agent.kb.update([1, 1], p);

    this.updateControls();
    this.render();
  }

  startAI() {
    if (this.gameStatus === "RUNNING") return;
    this.gameStatus = "RUNNING";
    this.updateControls();
    this.addLog("info", "Started autonomous AI logic simulation.");

    this.timer = setInterval(() => {
      this.stepAI();
    }, this.getSpeedMs());
  }

  pauseSimulation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.gameStatus = "PAUSED";
    this.updateControls();
    this.addLog("info", "Simulation paused.");
  }

  resumeSimulation() {
    if (this.gameStatus === "RUNNING") return;
    this.startAI();
  }

  stepAI() {
    if (this.gameStatus === "WON" || this.gameStatus === "LOST") {
      this.pauseSimulation();
      return;
    }

    if (!this.env.agentAlive) {
      this.handleGameOver(false);
      return;
    }

    if (this.env.agentEscaped) {
      this.handleGameOver(this.env.agentHasGold);
      return;
    }

    this.stepCount++;
    const observation = this.env.getAgentObservation();
    const { action, reasoning } = this.agent.decideNextAction(observation);
    this.currentReasoning = reasoning;
    this.currentAction = action;

    this.executeAction(action);
    this.currentPercepts = this.env.peekPercepts();
    this.addLog(action.toLowerCase(), `[${action}] ${reasoning}`, this.stepCount);

    if (!this.env.agentAlive) {
      this.handleGameOver(false);
    } else if (this.env.agentEscaped) {
      this.handleGameOver(this.env.agentHasGold);
    }

    this.render();
  }

  manualAction(act, dir = null) {
    if (this.gameStatus === "WON" || this.gameStatus === "LOST") return;
    if (this.gameStatus === "RUNNING") this.pauseSimulation();

    this.stepCount++;
    this.currentAction = act;

    if (act === "FORWARD") {
      const moved = this.env.moveForward();
      if (moved) {
        window.soundManager.playStep();
        this.currentReasoning = `Manual move forward to (${this.env.agentPos[0]},${this.env.agentPos[1]}).`;
      } else {
        window.soundManager.playBump();
        this.currentReasoning = "Bumped into a solid cave wall! Staying in place.";
      }
    } else if (act === "LEFT") {
      this.env.turnLeft();
      window.soundManager.playStep();
      this.currentReasoning = `Turned left. Now facing ${this.env.agentDir}.`;
    } else if (act === "RIGHT") {
      this.env.turnRight();
      window.soundManager.playStep();
      this.currentReasoning = `Turned right. Now facing ${this.env.agentDir}.`;
    } else if (act === "GRAB") {
      const gotGold = this.env.grabGold();
      if (gotGold) {
        window.soundManager.playGold();
        this.currentReasoning = "Collected the Gold! Reward: +1000 points.";
      } else {
        this.currentReasoning = "Attempted to grab gold, but no gold is in this room!";
      }
    } else if (act === "CLIMB") {
      const escaped = this.env.climb();
      if (escaped) {
        this.currentReasoning = "Climbed out of the cave through room (1,1).";
      } else {
        this.currentReasoning = "Cannot climb out! You can only exit from starting room (1,1).";
      }
    } else if (act === "SHOOT") {
      const hit = this.env.shootArrow(dir || this.env.agentDir);
      window.soundManager.playArrow();
      if (hit) {
        window.soundManager.playScream();
        this.currentReasoning = "Arrow struck the Wumpus! Monster is slain (Scream heard).";
      } else {
        this.currentReasoning = "Arrow shot flew into cave darkness and missed.";
      }
    }

    // Update agent's KB from new percepts
    const percepts = this.env.getPercepts();
    this.currentPercepts = percepts;
    this.agent.kb.update(this.env.agentPos, percepts);
    if (percepts.scream) this.agent.kb.registerScream();

    this.addLog(act.toLowerCase(), this.currentReasoning, this.stepCount);

    if (!this.env.agentAlive) {
      this.handleGameOver(false);
    } else if (this.env.agentEscaped) {
      this.handleGameOver(this.env.agentHasGold);
    }

    this.render();
  }

  executeAction(action) {
    if (action === "MOVE_FORWARD") {
      const moved = this.env.moveForward();
      if (moved) window.soundManager.playStep();
      else window.soundManager.playBump();
    } else if (action === "TURN_LEFT") {
      this.env.turnLeft();
      window.soundManager.playStep();
    } else if (action === "TURN_RIGHT") {
      this.env.turnRight();
      window.soundManager.playStep();
    } else if (action === "GRAB") {
      this.env.grabGold();
      window.soundManager.playGold();
    } else if (action === "SHOOT") {
      const hit = this.env.shootArrow();
      window.soundManager.playArrow();
      if (hit) window.soundManager.playScream();
    } else if (action === "CLIMB") {
      this.env.climb();
    }
  }

  handleGameOver(won) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (won) {
      this.gameStatus = "WON";
      window.soundManager.playVictory();
      this.addLog("success", `🎉 VICTORY! Agent escaped cave with gold! Final Score: ${this.env.score}`);
    } else {
      this.gameStatus = "LOST";
      window.soundManager.playDeath();
      let reason;
      if (this.env.agentEscaped) {
        reason = "Escaped the cave without collecting the gold. Mission incomplete.";
      } else {
        const [r, c] = this.env.agentPos;
        const isPit = this.env.pits.has(WumpusEngine.posKey(r, c));
        reason = isPit ? "Fell into a bottomless pit!" : "Devoured by the ferocious Wumpus!";
      }
      this.addLog("danger", `💀 DEFEAT: ${reason} Final Score: ${this.env.score}`);
    }
    this.updateControls();
    this.render();
  }

  updateControls() {
    this.statusBadgeEl.className = `status-badge ${this.gameStatus.toLowerCase()}`;
    this.statusTextEl.textContent = this.gameStatus;

    const isRunning = this.gameStatus === "RUNNING";
    const isOver = this.gameStatus === "WON" || this.gameStatus === "LOST";

    this.btnStart.disabled = isRunning || isOver;
    this.btnPause.disabled = !isRunning;
    this.btnResume.disabled = this.gameStatus !== "PAUSED";
    this.btnStep.disabled = isRunning || isOver;

    const manualDisabled = isRunning || isOver;
    this.btnForward.disabled = manualDisabled;
    this.btnLeft.disabled = manualDisabled;
    this.btnRight.disabled = manualDisabled;
    this.btnGrab.disabled = manualDisabled;
    this.btnClimb.disabled = manualDisabled;
    this.btnShootN.disabled = manualDisabled || !this.env.agentHasArrow;
    this.btnShootS.disabled = manualDisabled || !this.env.agentHasArrow;
    this.btnShootE.disabled = manualDisabled || !this.env.agentHasArrow;
    this.btnShootW.disabled = manualDisabled || !this.env.agentHasArrow;
  }

  render() {
    this.renderGrid();
    this.renderStats();
    this.renderKB();
    this.renderPercepts();
  }

  renderGrid() {
    this.boardEl.innerHTML = "";
    const size = this.env.size;
    const kb = this.agent.kb;

    // Render from Row 4 down to Row 1 (top to bottom)
    for (let r = size; r >= 1; r--) {
      for (let c = 1; c <= size; c++) {
        const key = WumpusEngine.posKey(r, c);
        const tile = document.createElement("div");
        tile.className = "room-tile";

        const isAgent = (r === this.env.agentPos[0] && c === this.env.agentPos[1]);
        const isVisited = kb.visited.has(key);
        const isSafeProven = kb.safeRooms.has(key);
        const isSuspectPit = kb.suspectedPits.has(key);
        const isSuspectWumpus = kb.suspectedWumpus.has(key);
        const isSelected = (this.selectedRoom && this.selectedRoom[0] === r && this.selectedRoom[1] === c);

        // True state for debug view or revealed death
        const revealWorld = this.debugMode || !this.env.agentAlive;
        const hasTrueWumpus = revealWorld && r === this.env.wumpusPos[0] && c === this.env.wumpusPos[1];
        const hasTruePit = revealWorld && this.env.pits.has(key);
        const hasTrueGold = revealWorld && !this.env.goldTaken && r === this.env.goldPos[0] && c === this.env.goldPos[1];

        if (isVisited) tile.classList.add("visited");
        if (isSafeProven) tile.classList.add("safe-proven");
        if (isSuspectPit || isSuspectWumpus) tile.classList.add("suspected-danger");
        if (isAgent) tile.classList.add("has-agent");
        if (isSelected) tile.classList.add("selected");

        // Coordinates label
        const coordLabel = document.createElement("div");
        coordLabel.className = "tile-coord";
        coordLabel.innerHTML = `<span>(${r},${c})</span>${r === 1 && c === 1 ? '<span class="start-tag">START</span>' : ''}`;
        tile.appendChild(coordLabel);

        // Center Content
        const center = document.createElement("div");
        center.className = "tile-center";

        if (isAgent) {
          const sprite = document.createElement("div");
          sprite.className = "agent-sprite";
          sprite.innerHTML = ICONS.agent(this.env.agentDir);
          const dirInd = document.createElement("div");
          dirInd.className = "agent-dir-indicator";
          dirInd.textContent = { NORTH: "▲", SOUTH: "▼", EAST: "▶", WEST: "◀" }[this.env.agentDir];
          sprite.appendChild(dirInd);
          center.appendChild(sprite);
        } else if (this.debugMode || isVisited || !this.env.agentAlive) {
          if (hasTrueWumpus) {
            center.innerHTML = ICONS.wumpus(this.env.wumpusAlive);
          } else if (hasTruePit) {
            center.innerHTML = ICONS.pit();
          } else if (hasTrueGold) {
            center.innerHTML = ICONS.gold();
          } else if (isVisited) {
            center.innerHTML = `<span style="color:#059669; font-weight:700; font-size:1.1rem;">SAFE</span>`;
          } else {
            center.innerHTML = `<span class="unknown-symbol">?</span>`;
          }
        } else {
          // Normal Fog of War view
          if (isSuspectWumpus && isSuspectPit) {
            center.innerHTML = `<span style="color:#f87171; font-size:0.75rem; font-weight:700;">?W / ?P</span>`;
          } else if (isSuspectWumpus) {
            center.innerHTML = `<span style="color:#c084fc; font-size:0.8rem; font-weight:700;">? Wumpus</span>`;
          } else if (isSuspectPit) {
            center.innerHTML = `<span style="color:#f87171; font-size:0.8rem; font-weight:700;">? Pit</span>`;
          } else if (isSafeProven && !isVisited) {
            center.innerHTML = `<span style="color:#34d399; font-size:0.75rem; font-weight:700;">SAFE</span>`;
          } else {
            center.innerHTML = `<span class="unknown-symbol">?</span>`;
          }
        }
        tile.appendChild(center);

        // Percept indicators on tile (if visited or agent current or debug)
        const perceptsRow = document.createElement("div");
        perceptsRow.className = "tile-percepts";

        const pHistory = kb.perceptHistory.get(key);
        if (pHistory) {
          if (pHistory.breeze) {
            perceptsRow.innerHTML += `<span class="mini-badge breeze" title="Breeze">${ICONS.breeze()} B</span>`;
          }
          if (pHistory.stench) {
            perceptsRow.innerHTML += `<span class="mini-badge stench" title="Stench">${ICONS.stench()} S</span>`;
          }
          if (pHistory.glitter) {
            perceptsRow.innerHTML += `<span class="mini-badge glitter" title="Glitter">${ICONS.glitter()} G</span>`;
          }
        }
        tile.appendChild(perceptsRow);

        // Click handler to inspect room
        tile.addEventListener("click", () => {
          this.selectedRoom = [r, c];
          this.render();
        });

        this.boardEl.appendChild(tile);
      }
    }
  }

  renderStats() {
    this.posValEl.textContent = `(${this.env.agentPos[0]}, ${this.env.agentPos[1]})`;
    this.scoreValEl.textContent = this.env.score;
    this.scoreValEl.className = `stat-value ${this.env.score >= 0 ? 'score-pos' : 'score-neg'}`;
    this.movesValEl.textContent = this.env.moves;

    const visitedCount = this.agent.kb.visited.size;
    const safeCount = this.agent.kb.safeRooms.size;
    const knownRooms = new Set([
      ...this.agent.kb.visited,
      ...this.agent.kb.safeRooms,
      ...this.agent.kb.suspectedPits,
      ...this.agent.kb.suspectedWumpus
    ]);
    const unknownCount = this.env.size * this.env.size - knownRooms.size;

    this.visitedValEl.textContent = `${visitedCount} / 16`;
    this.safeValEl.textContent = safeCount;
    this.unknownValEl.textContent = unknownCount;

    this.goldValEl.textContent = this.env.agentHasGold ? "Yes (+1000)" : "No";
    this.goldValEl.className = `stat-value ${this.env.agentHasGold ? 'gold' : ''}`;

    this.arrowValEl.textContent = this.env.agentHasArrow ? "Available (1)" : "Expended (0)";

    this.actionTextEl.textContent = this.currentAction;
    this.reasoningTextEl.textContent = this.currentReasoning;
  }

  renderPercepts() {
    const p = this.currentPercepts;

    this.pStenchEl.className = `percept-card ${p.stench ? 'active stench' : ''}`;
    this.pStenchEl.querySelector(".percept-status").textContent = p.stench ? "DETECTED" : "No Stench";

    this.pBreezeEl.className = `percept-card ${p.breeze ? 'active' : ''}`;
    this.pBreezeEl.querySelector(".percept-status").textContent = p.breeze ? "DETECTED" : "No Breeze";

    this.pGlitterEl.className = `percept-card ${p.glitter ? 'active glitter' : ''}`;
    this.pGlitterEl.querySelector(".percept-status").textContent = p.glitter ? "DETECTED" : "No Glitter";

    this.pBumpEl.className = `percept-card ${p.bump ? 'active' : ''}`;
    this.pBumpEl.querySelector(".percept-status").textContent = p.bump ? "COLLISION" : "No Bump";

    this.pScreamEl.className = `percept-card ${p.scream ? 'active' : ''}`;
    this.pScreamEl.querySelector(".percept-status").textContent = p.scream ? "HEARD" : "No Scream";
  }

  renderKB() {
    const kb = this.agent.kb;

    // Render Pills
    const renderPills = (container, set, type) => {
      container.innerHTML = "";
      if (set.size === 0) {
        container.innerHTML = `<span style="font-size:0.75rem; color:#64748b;">None</span>`;
        return;
      }
      for (const k of set) {
        const [r, c] = WumpusEngine.parseKey(k);
        const pill = document.createElement("span");
        pill.className = `kb-pill ${type}`;
        pill.textContent = `(${r},${c})`;
        container.appendChild(pill);
      }
    };

    renderPills(this.visitedListEl, kb.visited, "");
    renderPills(this.safeListEl, kb.safeRooms, "safe");
    renderPills(this.pitsListEl, kb.suspectedPits, "pit");
    renderPills(this.wumpusListEl, kb.suspectedWumpus, "wumpus");

    const knownRooms = new Set([
      ...kb.visited,
      ...kb.safeRooms,
      ...kb.suspectedPits,
      ...kb.suspectedWumpus
    ]);
    const unknownRooms = new Set();
    for (let row = 1; row <= this.env.size; row++) {
      for (let col = 1; col <= this.env.size; col++) {
        const key = WumpusEngine.posKey(row, col);
        if (!knownRooms.has(key)) unknownRooms.add(key);
      }
    }
    renderPills(this.unknownListEl, unknownRooms, "unknown");

    // Deductions box
    this.deductionsBoxEl.innerHTML = "";
    if (kb.deductions.length === 0) {
      this.deductionsBoxEl.innerHTML = `<span style="color:#64748b; font-size:0.75rem;">Awaiting first inference...</span>`;
    } else {
      // Show latest 6 deductions
      const recent = kb.deductions.slice(-8).reverse();
      for (const d of recent) {
        const item = document.createElement("div");
        item.className = "deduction-item";
        item.textContent = d;
        this.deductionsBoxEl.appendChild(item);
      }
    }

    // Selected Room Inspector
    if (this.selectedRoom) {
      const [sr, sc] = this.selectedRoom;
      const sKey = WumpusEngine.posKey(sr, sc);
      const isVisited = kb.visited.has(sKey);
      const isSafe = kb.safeRooms.has(sKey);
      const isPitSuspect = kb.suspectedPits.has(sKey);
      const isWumpusSuspect = kb.suspectedWumpus.has(sKey);
      const isConfirmedW = (kb.confirmedWumpus && kb.confirmedWumpus[0] === sr && kb.confirmedWumpus[1] === sc);

      let statusStr = "Unexplored / Unknown";
      if (isVisited) statusStr = "Explored & Visited (Safe)";
      else if (isSafe) statusStr = "Proven Safe via Logic";
      else if (isConfirmedW) statusStr = "Confirmed Wumpus Location!";
      else if (isPitSuspect && isWumpusSuspect) statusStr = "Suspected Pit OR Wumpus";
      else if (isPitSuspect) statusStr = "Suspected Pit";
      else if (isWumpusSuspect) statusStr = "Suspected Wumpus";

      const percepts = kb.perceptHistory.get(sKey);
      let percStr = "None recorded";
      if (percepts) {
        const parts = [];
        if (percepts.breeze) parts.push("Breeze");
        if (percepts.stench) parts.push("Stench");
        if (percepts.glitter) parts.push("Glitter");
        percStr = parts.length > 0 ? parts.join(", ") : "Clear (No breeze / No stench)";
      }

      this.inspectorContentEl.innerHTML = `
        <div style="font-size:0.8rem; display:flex; flex-direction:column; gap:4px;">
          <div><strong style="color:#f8fafc;">Room:</strong> (${sr}, ${sc})</div>
          <div><strong style="color:#f8fafc;">Knowledge State:</strong> <span style="color:${isSafe ? '#34d399' : (isPitSuspect || isWumpusSuspect ? '#f87171' : '#cbd5e1')}">${statusStr}</span></div>
          <div><strong style="color:#f8fafc;">Percepts Sensed:</strong> ${percStr}</div>
          <div><strong style="color:#f8fafc;">Safe From Pits:</strong> ${kb.safeFromPits.has(sKey) ? '✅ Yes' : '⚠️ Unverified'}</div>
          <div><strong style="color:#f8fafc;">Safe From Wumpus:</strong> ${(kb.safeFromWumpus.has(sKey) || kb.wumpusSlain) ? '✅ Yes' : '⚠️ Unverified'}</div>
        </div>
      `;
    }
  }

  renderLog() {
    this.logBoxEl.innerHTML = "";
    for (const item of this.log) {
      const entry = document.createElement("div");
      entry.className = `log-entry ${item.type}`;
      entry.innerHTML = `
        <span class="log-step">#${item.step}</span>
        <span>${item.text}</span>
      `;
      this.logBoxEl.appendChild(entry);
    }
  }
}

// Mount application once DOM loads
window.addEventListener("DOMContentLoaded", () => {
  window.wumpusApp = new WumpusApp();
});
