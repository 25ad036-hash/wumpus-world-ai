/**
 * WUMPUS WORLD ENGINE & KNOWLEDGE-BASED AI
 * Classical Russell & Norvig propositional logic simulation.
 */

const NORTH = "NORTH";
const SOUTH = "SOUTH";
const EAST = "EAST";
const WEST = "WEST";

const DIRECTIONS = [NORTH, EAST, SOUTH, WEST];

const DIR_DELTAS = {
  NORTH: [1, 0],
  SOUTH: [-1, 0],
  EAST: [0, 1],
  WEST: [0, -1]
};

// Key helper for Set/Map: "r,c"
function posKey(r, c) {
  return `${r},${c}`;
}

function parseKey(key) {
  const parts = key.split(",");
  return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
}

class WumpusEnvironment {
  constructor(size = 4, wumpus = [4, 3], pits = [[4, 1], [4, 4]], gold = [2, 3]) {
    this.size = size;
    this.startPos = [1, 1];
    this.wumpusPos = [...wumpus];
    this.wumpusAlive = true;
    this.pits = new Set(pits.map(([r, c]) => posKey(r, c)));
    this.goldPos = [...gold];
    this.goldTaken = false;

    // Agent state
    this.agentPos = [...this.startPos];
    this.agentDir = EAST;
    this.agentAlive = true;
    this.agentHasGold = false;
    this.agentHasArrow = true;
    this.agentEscaped = false;
    this.score = 0;
    this.moves = 0;

    // Percepts
    this.lastBump = false;
    this.lastScream = false;
  }

  static createRandom(size = 4, pitProb = 0.2) {
    const all = [];
    for (let r = 1; r <= size; r++) {
      for (let c = 1; c <= size; c++) {
        if (r !== 1 || c !== 1) {
          all.push([r, c]);
        }
      }
    }

    // Pick Wumpus
    const wIdx = Math.floor(Math.random() * all.length);
    const wumpus = all[wIdx];
    all.splice(wIdx, 1);

    // Pick Gold
    const gIdx = Math.floor(Math.random() * all.length);
    const gold = all[gIdx];
    all.splice(gIdx, 1);

    // Pick Pits
    const pits = [];
    for (const room of all) {
      if (Math.random() < pitProb) {
        pits.push(room);
      }
    }

    return new WumpusEnvironment(size, wumpus, pits, gold);
  }

  getNeighbors(r, c) {
    const res = [];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 1 && nr <= this.size && nc >= 1 && nc <= this.size) {
        res.push([nr, nc]);
      }
    }
    return res;
  }

  getPercepts() {
    const percepts = this.peekPercepts();
    this.lastBump = false;
    this.lastScream = false;
    return percepts;
  }

  peekPercepts() {
    const [r, c] = this.agentPos;
    let stench = false;
    let breeze = false;
    let glitter = false;

    // Stench: adjacent to living Wumpus or in same cell
    if (this.wumpusAlive) {
      if (r === this.wumpusPos[0] && c === this.wumpusPos[1]) {
        stench = true;
      } else {
        for (const [nr, nc] of this.getNeighbors(this.wumpusPos[0], this.wumpusPos[1])) {
          if (nr === r && nc === c) {
            stench = true;
            break;
          }
        }
      }
    }

    // Breeze: adjacent to any pit
    for (const [nr, nc] of this.getNeighbors(r, c)) {
      if (this.pits.has(posKey(nr, nc))) {
        breeze = true;
        break;
      }
    }

    // Glitter: in gold cell if gold not yet taken
    if (!this.goldTaken && r === this.goldPos[0] && c === this.goldPos[1]) {
      glitter = true;
    }

    const percepts = {
      stench,
      breeze,
      glitter,
      bump: this.lastBump,
      scream: this.lastScream
    };

    return percepts;
  }

  getAgentObservation() {
    return {
      pos: [...this.agentPos],
      direction: this.agentDir,
      hasGold: this.agentHasGold,
      hasArrow: this.agentHasArrow,
      percepts: this.getPercepts()
    };
  }

  moveForward() {
    if (!this.agentAlive || this.agentEscaped) return false;
    this.score -= 1;
    this.moves += 1;

    const [dr, dc] = DIR_DELTAS[this.agentDir];
    const nr = this.agentPos[0] + dr;
    const nc = this.agentPos[1] + dc;

    if (nr >= 1 && nr <= this.size && nc >= 1 && nc <= this.size) {
      this.agentPos = [nr, nc];
      this.lastBump = false;

      // Check hazards
      if (this.pits.has(posKey(nr, nc))) {
        this.agentAlive = false;
        this.score -= 1000;
      } else if (this.wumpusAlive && nr === this.wumpusPos[0] && nc === this.wumpusPos[1]) {
        this.agentAlive = false;
        this.score -= 1000;
      }
      return true;
    } else {
      this.lastBump = true;
      return false;
    }
  }

  turnLeft() {
    if (!this.agentAlive || this.agentEscaped) return;
    this.score -= 1;
    this.moves += 1;
    const idx = DIRECTIONS.indexOf(this.agentDir);
    this.agentDir = DIRECTIONS[(idx + 3) % 4];
  }

  turnRight() {
    if (!this.agentAlive || this.agentEscaped) return;
    this.score -= 1;
    this.moves += 1;
    const idx = DIRECTIONS.indexOf(this.agentDir);
    this.agentDir = DIRECTIONS[(idx + 1) % 4];
  }

  grabGold() {
    if (!this.agentAlive || this.agentEscaped) return false;
    this.score -= 1;
    this.moves += 1;
    const [r, c] = this.agentPos;
    if (!this.goldTaken && r === this.goldPos[0] && c === this.goldPos[1]) {
      this.goldTaken = true;
      this.agentHasGold = true;
      this.score += 1000;
      return true;
    }
    return false;
  }

  shootArrow(shootDir = null) {
    if (!this.agentAlive || this.agentEscaped || !this.agentHasArrow) return false;
    this.score -= 10;
    this.moves += 1;
    this.agentHasArrow = false;

    const dir = shootDir || this.agentDir;
    const [dr, dc] = DIR_DELTAS[dir];
    let r = this.agentPos[0];
    let c = this.agentPos[1];
    let hit = false;

    while (true) {
      r += dr;
      c += dc;
      if (r < 1 || r > this.size || c < 1 || c > this.size) break;
      if (r === this.wumpusPos[0] && c === this.wumpusPos[1] && this.wumpusAlive) {
        this.wumpusAlive = false;
        this.lastScream = true;
        hit = true;
        break;
      }
    }
    return hit;
  }

  climb() {
    if (!this.agentAlive || this.agentEscaped) return false;
    if (this.agentPos[0] === this.startPos[0] && this.agentPos[1] === this.startPos[1]) {
      this.agentEscaped = true;
      if (this.agentHasGold) {
        this.score += 1000;
      }
      return true;
    }
    return false;
  }
}

class KnowledgeBase {
  constructor(size = 4) {
    this.size = size;
    this.visited = new Set();
    this.safeRooms = new Set([posKey(1, 1)]);
    this.safeFromPits = new Set([posKey(1, 1)]);
    this.safeFromWumpus = new Set([posKey(1, 1)]);
    this.suspectedPits = new Set();
    this.suspectedWumpus = new Set();
    this.confirmedWumpus = null; // [r, c] or null
    this.wumpusSlain = false;
    this.perceptHistory = new Map(); // posKey -> percepts
    this.deductions = [];
  }

  getNeighbors(r, c) {
    const res = [];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 1 && nr <= this.size && nc >= 1 && nc <= this.size) {
        res.push([nr, nc]);
      }
    }
    return res;
  }

  update(pos, percepts) {
    const [r, c] = pos;
    const pKey = posKey(r, c);
    const newDeductions = [];

    this.visited.add(pKey);
    this.safeRooms.add(pKey);
    this.safeFromPits.add(pKey);
    this.safeFromWumpus.add(pKey);
    this.perceptHistory.set(pKey, percepts);

    const neighbors = this.getNeighbors(r, c);
    const unvisitedNeighbors = neighbors.filter(([nr, nc]) => !this.visited.has(posKey(nr, nc)));

    // Rule 1: Breeze deduction
    if (!percepts.breeze) {
      for (const [nr, nc] of neighbors) {
        const nKey = posKey(nr, nc);
        if (!this.safeFromPits.has(nKey)) {
          this.safeFromPits.add(nKey);
          this.suspectedPits.delete(nKey);
          newDeductions.push(`No Breeze at (${r},${c}) ⟹ (${nr},${nc}) is SAFE from Pits.`);
        }
      }
    } else {
      const candidates = unvisitedNeighbors
        .filter(([nr, nc]) => !this.safeFromPits.has(posKey(nr, nc)));
      for (const [nr, nc] of candidates) {
        this.suspectedPits.add(posKey(nr, nc));
      }
      if (candidates.length > 0) {
        const candStr = candidates.map(([cr, cc]) => `(${cr},${cc})`).join(", ");
        newDeductions.push(`Breeze sensed at (${r},${c}) ⟹ Possible pit in: {${candStr}}.`);
      }
    }

    // Rule 2: Stench deduction
    if (!percepts.stench || this.wumpusSlain) {
      for (const [nr, nc] of neighbors) {
        const nKey = posKey(nr, nc);
        if (!this.safeFromWumpus.has(nKey)) {
          this.safeFromWumpus.add(nKey);
          this.suspectedWumpus.delete(nKey);
          newDeductions.push(`No Stench at (${r},${c}) ⟹ (${nr},${nc}) is SAFE from Wumpus.`);
        }
      }
    } else {
      if (!this.wumpusSlain && !this.confirmedWumpus) {
        const candidates = unvisitedNeighbors
          .filter(([nr, nc]) => !this.safeFromWumpus.has(posKey(nr, nc)));
        for (const [nr, nc] of candidates) {
          this.suspectedWumpus.add(posKey(nr, nc));
        }
        if (candidates.length > 0) {
          const candStr = candidates.map(([cr, cc]) => `(${cr},${cc})`).join(", ");
          newDeductions.push(`Stench sensed at (${r},${c}) ⟹ Possible Wumpus in: {${candStr}}.`);
        }
      }
    }

    // Rule 3: Single Wumpus Triangulation
    if (!this.wumpusSlain && !this.confirmedWumpus) {
      const stenchVisited = [];
      for (const [k, perc] of this.perceptHistory.entries()) {
        if (perc.stench) {
          stenchVisited.push(parseKey(k));
        }
      }

      if (stenchVisited.length > 0) {
        let intersection = null;
        for (const [vr, vc] of stenchVisited) {
          const adj = new Set(
            this.getNeighbors(vr, vc)
              .map(([nr, nc]) => posKey(nr, nc))
              .filter(k => !this.safeFromWumpus.has(k))
          );
          if (intersection === null) {
            intersection = adj;
          } else {
            intersection = new Set([...intersection].filter(x => adj.has(x)));
          }
        }

        if (intersection && intersection.size === 1) {
          const wKey = [...intersection][0];
          this.confirmedWumpus = parseKey(wKey);
          this.suspectedWumpus = new Set([wKey]);

          // Mark all other rooms in cave as safe from Wumpus
          for (let row = 1; row <= this.size; row++) {
            for (let col = 1; col <= this.size; col++) {
              const k = posKey(row, col);
              if (k !== wKey) {
                this.safeFromWumpus.add(k);
              }
            }
          }
          newDeductions.push(`🎯 Multi-sensor Triangulation: Wumpus definitely located at (${this.confirmedWumpus[0]},${this.confirmedWumpus[1]})!`);
        }
      }
    }

    // Rule 4: Update Proven Safe Rooms (Safe from Pits AND Safe from Wumpus)
    for (let row = 1; row <= this.size; row++) {
      for (let col = 1; col <= this.size; col++) {
        const k = posKey(row, col);
        const wSafe = this.safeFromWumpus.has(k) || this.wumpusSlain;
        const pSafe = this.safeFromPits.has(k);
        if (wSafe && pSafe) {
          if (!this.safeRooms.has(k)) {
            this.safeRooms.add(k);
            newDeductions.push(`Room (${row},${col}) confirmed SAFE (Free of both Pits and Wumpus).`);
          }
        }
      }
    }

    this.deductions.push(...newDeductions);
    return newDeductions;
  }

  registerScream() {
    this.wumpusSlain = true;
    this.confirmedWumpus = null;
    this.suspectedWumpus.clear();
    for (let r = 1; r <= this.size; r++) {
      for (let c = 1; c <= this.size; c++) {
        const k = posKey(r, c);
        this.safeFromWumpus.add(k);
        if (this.safeFromPits.has(k)) {
          this.safeRooms.add(k);
        }
      }
    }
    this.deductions.push("📢 SCREAM heard! Wumpus is slain. All cave rooms are now safe from Wumpus.");
  }
}

class IntelligentAgent {
  constructor(size = 4) {
    this.size = size;
    this.kb = new KnowledgeBase(size);
    this.hasGold = false;
    this.returningHome = false;
  }

  bfsPath(start, goal, allowedKeys) {
    const startKey = posKey(start[0], start[1]);
    const goalKey = posKey(goal[0], goal[1]);
    if (startKey === goalKey) return [start];

    const queue = [[start, [start]]];
    const visited = new Set([startKey]);

    while (queue.length > 0) {
      const [current, path] = queue.shift();
      const neighbors = this.kb.getNeighbors(current[0], current[1]);

      for (const next of neighbors) {
        const nKey = posKey(next[0], next[1]);
        if (nKey === goalKey || (allowedKeys.has(nKey) && !visited.has(nKey))) {
          const newPath = [...path, next];
          if (nKey === goalKey) {
            return newPath;
          }
          visited.add(nKey);
          queue.push([next, newPath]);
        }
      }
    }
    return null;
  }

  planMovesTo(currentPos, currentDir, targetPos) {
    const [cr, cc] = currentPos;
    const [tr, tc] = targetPos;
    const dr = tr - cr;
    const dc = tc - cc;

    let desiredDir = NORTH;
    if (dr === 1) desiredDir = NORTH;
    else if (dr === -1) desiredDir = SOUTH;
    else if (dc === 1) desiredDir = EAST;
    else if (dc === -1) desiredDir = WEST;

    const actions = [];
    if (currentDir !== desiredDir) {
      const curIdx = DIRECTIONS.indexOf(currentDir);
      const desIdx = DIRECTIONS.indexOf(desiredDir);
      const diff = (desIdx - curIdx + 4) % 4;

      if (diff === 1) {
        actions.push("TURN_RIGHT");
      } else if (diff === 2) {
        actions.push("TURN_RIGHT", "TURN_RIGHT");
      } else if (diff === 3) {
        actions.push("TURN_LEFT");
      }
    }

    actions.push("MOVE_FORWARD");
    return actions;
  }

  decideNextAction(observation) {
    const { pos, direction, hasGold, hasArrow, percepts } = observation;

    // Deduce new knowledge
    this.kb.update(pos, percepts);
    if (percepts.scream) {
      this.kb.registerScream();
    }

    // 1. Glitter perceived -> Grab gold
    if (percepts.glitter && !hasGold) {
      this.hasGold = true;
      this.returningHome = true;
      return {
        action: "GRAB",
        reasoning: `Glitter detected in room (${pos[0]},${pos[1]})! Collecting gold treasure (+1000 points).`
      };
    }

    // 2. Have gold and at (1,1) -> Climb out and win!
    if (hasGold && pos[0] === 1 && pos[1] === 1) {
      return {
        action: "CLIMB",
        reasoning: `At starting room (1,1) with gold! Climbing out of cave to achieve victory (+1000 points)!`
      };
    }

    // 3. Carrying gold -> Route safely back to (1,1) via BFS
    if (hasGold || this.returningHome) {
      const path = this.bfsPath(pos, [1, 1], this.kb.safeRooms);
      if (path && path.length > 1) {
        const nextStep = path[1];
        const moves = this.planMovesTo(pos, direction, nextStep);
        return {
          action: moves[0],
          reasoning: `Returning safely to (1,1) with gold. Routing through proven safe room (${nextStep[0]},${nextStep[1]}).`
        };
      } else if (pos[0] === 1 && pos[1] === 1) {
        return {
          action: "CLIMB",
          reasoning: `Safely reached cave exit (1,1). Climbing out.`
        };
      }
    }

    // 4. Explore unvisited safe rooms
    const unvisitedSafe = [];
    for (const sKey of this.kb.safeRooms) {
      if (!this.kb.visited.has(sKey)) {
        unvisitedSafe.push(parseKey(sKey));
      }
    }

    if (unvisitedSafe.length > 0) {
      let bestPath = null;
      for (const target of unvisitedSafe) {
        const allowed = new Set([...this.kb.visited, posKey(target[0], target[1])]);
        const p = this.bfsPath(pos, target, allowed);
        if (p) {
          if (!bestPath || p.length < bestPath.length) {
            bestPath = p;
          }
        }
      }

      if (bestPath && bestPath.length > 1) {
        const nextStep = bestPath[1];
        const targetRoom = bestPath[bestPath.length - 1];
        const moves = this.planMovesTo(pos, direction, nextStep);
        return {
          action: moves[0],
          reasoning: `Navigating to unvisited safe room (${targetRoom[0]},${targetRoom[1]}). Next step: (${nextStep[0]},${nextStep[1]}).`
        };
      }
    }

    // 5. Strategic Arrow Shot if Wumpus is confirmed and in straight line
    if (hasArrow && this.kb.confirmedWumpus && !this.kb.wumpusSlain) {
      const [wr, wc] = this.kb.confirmedWumpus;
      const [cr, cc] = pos;

      if (wr === cr || wc === cc) {
        let shootDir = null;
        if (wr === cr) {
          shootDir = wc > cc ? EAST : WEST;
        } else {
          shootDir = wr > cr ? NORTH : SOUTH;
        }

        if (direction === shootDir) {
          return {
            action: "SHOOT",
            reasoning: `Wumpus confirmed at (${wr},${wc})! Firing arrow ${shootDir} to eliminate monster.`
          };
        } else {
          const delta = DIR_DELTAS[shootDir];
          const aimPos = [cr + delta[0], cc + delta[1]];
          const moves = this.planMovesTo(pos, direction, aimPos);
          return {
            action: moves[0],
            reasoning: `Turning towards confirmed Wumpus at (${wr},${wc}) before firing.`
          };
        }
      }
    }

    // 6. No safe unexplored rooms left and gold not found -> Backtrack to exit safely
    if (pos[0] !== 1 || pos[1] !== 1) {
      const path = this.bfsPath(pos, [1, 1], this.kb.safeRooms);
      if (path && path.length > 1) {
        const nextStep = path[1];
        const moves = this.planMovesTo(pos, direction, nextStep);
        return {
          action: moves[0],
          reasoning: `All reachable safe rooms explored. Remaining unknown rooms carry hazard risk. Backtracking safely to (1,1).`
        };
      }
    }

    // 7. Exit at (1,1)
    return {
      action: "CLIMB",
      reasoning: `At cave entrance (1,1) with maximum safe exploration achieved. Exiting cave.`
    };
  }
}

// Export to window for browser access
window.WumpusEngine = {
  WumpusEnvironment,
  KnowledgeBase,
  IntelligentAgent,
  posKey,
  parseKey,
  NORTH, SOUTH, EAST, WEST
};
