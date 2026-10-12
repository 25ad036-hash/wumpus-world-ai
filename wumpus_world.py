"""
WUMPUS WORLD – ARTIFICIAL INTELLIGENCE USING PYTHON
====================================================
A complete implementation of the classic Wumpus World AI problem (Russell & Norvig, AIMA).
Features:
- Full 4x4 Cave Environment with true hidden state and sensory percepts (Stench, Breeze, Glitter, Bump, Scream).
- Propositional Logic & Knowledge-Based Agent maintaining an explicit Knowledge Base.
- Breadth-First Search (BFS) safe route planner.
- Dynamic Event Logger & Deduction Explainer.
- Interactive Human Playable Mode & Autonomous AI Solver Mode with ASCII Visualization.

Usage:
  python wumpus_world.py             # Runs autonomous AI solver demo
  python wumpus_world.py --manual    # Interactive manual play mode
  python wumpus_world.py --random    # Generates a randomized valid cave
  python wumpus_world.py --test      # Runs verification unit tests
"""

import sys
import time
import random
from collections import deque
from typing import List, Tuple, Set, Dict, Optional

# Ensure UTF-8 output on Windows terminal
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Grid coordinate: (row, col) with (1,1) at bottom-left and (4,4) at top-right
Position = Tuple[int, int]

# Directions
NORTH = "NORTH"
SOUTH = "SOUTH"
EAST = "EAST"
WEST = "WEST"

DIRECTIONS = [NORTH, EAST, SOUTH, WEST]

DIRECTION_DELTAS = {
    NORTH: (1, 0),
    SOUTH: (-1, 0),
    EAST: (0, 1),
    WEST: (0, -1),
}


class Percepts:
    def __init__(self, stench: bool = False, breeze: bool = False, glitter: bool = False,
                 bump: bool = False, scream: bool = False):
        self.stench = stench
        self.breeze = breeze
        self.glitter = glitter
        self.bump = bump
        self.scream = scream

    def __repr__(self):
        active = []
        if self.stench: active.append("STENCH")
        if self.breeze: active.append("BREEZE")
        if self.glitter: active.append("GLITTER")
        if self.bump: active.append("BUMP")
        if self.scream: active.append("SCREAM")
        return f"Percepts({', '.join(active) if active else 'None'})"


class WumpusEnvironment:
    """True simulation environment. Represents the real cave state."""
    def __init__(self, size: int = 4, wumpus: Position = (4, 3),
                 pits: Optional[List[Position]] = None, gold: Position = (2, 3)):
        self.size = size
        self.start_pos = (1, 1)
        self.wumpus_pos = wumpus
        self.wumpus_alive = True
        self.pits = set(pits if pits is not None else [(4, 1), (4, 4)])
        self.gold_pos = gold
        self.gold_taken = False
        
        # Agent state in environment
        self.agent_pos = self.start_pos
        self.agent_dir = EAST
        self.agent_alive = True
        self.agent_has_gold = False
        self.agent_has_arrow = True
        self.agent_escaped = False
        self.score = 0
        self.steps = 0

        # Percept flags
        self.last_bump = False
        self.last_scream = False

    @staticmethod
    def create_random(size: int = 4, pit_prob: float = 0.2) -> 'WumpusEnvironment':
        """Generates a valid randomized cave world ensuring start is safe."""
        all_rooms = [(r, c) for r in range(1, size + 1) for c in range(1, size + 1)]
        all_rooms.remove((1, 1))  # Start room must be safe

        # Place Wumpus
        wumpus = random.choice(all_rooms)
        remaining = [r for r in all_rooms if r != wumpus]

        # Place Gold
        gold = random.choice(remaining)

        # Place Pits
        pits = []
        for r in remaining:
            if r != gold and random.random() < pit_prob:
                pits.append(r)

        return WumpusEnvironment(size=size, wumpus=wumpus, pits=pits, gold=gold)

    def get_neighbors(self, pos: Position) -> List[Position]:
        r, c = pos
        neighbors = []
        if r > 1: neighbors.append((r - 1, c))
        if r < self.size: neighbors.append((r + 1, c))
        if c > 1: neighbors.append((r, c - 1))
        if c < self.size: neighbors.append((r, c + 1))
        return neighbors

    def get_percepts(self) -> Percepts:
        """Returns sensory percepts for agent's current position."""
        pos = self.agent_pos
        stench = False
        breeze = False
        glitter = False

        # Stench if adjacent to alive Wumpus or in same room
        if self.wumpus_alive:
            if pos == self.wumpus_pos or pos in self.get_neighbors(self.wumpus_pos):
                stench = True

        # Breeze if adjacent to any pit
        for neighbor in self.get_neighbors(pos):
            if neighbor in self.pits:
                breeze = True
                break

        # Glitter if gold in current room and not yet taken
        if not self.gold_taken and pos == self.gold_pos:
            glitter = True

        percepts = Percepts(
            stench=stench,
            breeze=breeze,
            glitter=glitter,
            bump=self.last_bump,
            scream=self.last_scream
        )

        # Reset transient percepts
        self.last_bump = False
        self.last_scream = False
        return percepts

    def move_forward(self) -> bool:
        """Executes forward move. Returns True if move succeeded, False if wall bump."""
        if not self.agent_alive or self.agent_escaped:
            return False

        self.score -= 1
        self.steps += 1
        dr, dc = DIRECTION_DELTAS[self.agent_dir]
        nr, nc = self.agent_pos[0] + dr, self.agent_pos[1] + dc

        if 1 <= nr <= self.size and 1 <= nc <= self.size:
            self.agent_pos = (nr, nc)
            self.last_bump = False
            # Check hazards
            if self.agent_pos in self.pits:
                self.agent_alive = False
                self.score -= 1000
            elif self.wumpus_alive and self.agent_pos == self.wumpus_pos:
                self.agent_alive = False
                self.score -= 1000
            return True
        else:
            self.last_bump = True
            return False

    def turn_left(self):
        if not self.agent_alive or self.agent_escaped: return
        self.score -= 1
        self.steps += 1
        idx = DIRECTIONS.index(self.agent_dir)
        self.agent_dir = DIRECTIONS[(idx - 1) % 4]

    def turn_right(self):
        if not self.agent_alive or self.agent_escaped: return
        self.score -= 1
        self.steps += 1
        idx = DIRECTIONS.index(self.agent_dir)
        self.agent_dir = DIRECTIONS[(idx + 1) % 4]

    def grab_gold(self) -> bool:
        if not self.agent_alive or self.agent_escaped: return False
        self.score -= 1
        self.steps += 1
        if not self.gold_taken and self.agent_pos == self.gold_pos:
            self.gold_taken = True
            self.agent_has_gold = True
            self.score += 1000
            return True
        return False

    def shoot_arrow(self, shoot_dir: Optional[str] = None) -> bool:
        """Shoots arrow in specified direction (or agent's current direction)."""
        if not self.agent_alive or self.agent_escaped or not self.agent_has_arrow:
            return False

        self.score -= 10
        self.steps += 1
        self.agent_has_arrow = False
        direction = shoot_dir or self.agent_dir

        dr, dc = DIRECTION_DELTAS[direction]
        r, c = self.agent_pos

        hit = False
        while 1 <= r <= self.size and 1 <= c <= self.size:
            r += dr
            c += dc
            if (r, c) == self.wumpus_pos and self.wumpus_alive:
                self.wumpus_alive = False
                self.last_scream = True
                hit = True
                break

        return hit

    def climb(self) -> bool:
        """Climbs out of the cave if at starting room."""
        if not self.agent_alive or self.agent_escaped: return False
        if self.agent_pos == self.start_pos:
            self.agent_escaped = True
            if self.agent_has_gold:
                self.score += 1000  # Exit reward
            return True
        return False


class KnowledgeBase:
    """Explicit propositional logic knowledge base maintained by the AI agent."""
    def __init__(self, size: int = 4):
        self.size = size
        self.visited: Set[Position] = set()
        self.safe_rooms: Set[Position] = {(1, 1)}
        self.suspected_pits: Set[Position] = set()
        self.confirmed_pits: Set[Position] = set()
        self.safe_from_pits: Set[Position] = {(1, 1)}
        self.suspected_wumpus: Set[Position] = set()
        self.confirmed_wumpus: Optional[Position] = None
        self.safe_from_wumpus: Set[Position] = {(1, 1)}
        self.wumpus_slain: bool = False
        self.percept_history: Dict[Position, Percepts] = {}
        self.logical_deductions: List[str] = []

    def get_neighbors(self, pos: Position) -> List[Position]:
        r, c = pos
        neighbors = []
        if r > 1: neighbors.append((r - 1, c))
        if r < self.size: neighbors.append((r + 1, c))
        if c > 1: neighbors.append((r, c - 1))
        if c < self.size: neighbors.append((r + 1, c)) if r < self.size else None
        if c < self.size: neighbors.append((r, c + 1))
        # Ensure only strictly adjacent within grid
        result = []
        for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nr, nc = r + dr, c + dc
            if 1 <= nr <= self.size and 1 <= nc <= self.size:
                result.append((nr, nc))
        return result

    def update(self, pos: Position, percepts: Percepts) -> List[str]:
        """Applies logical deduction rules based on new percepts."""
        new_deductions = []
        self.visited.add(pos)
        self.safe_rooms.add(pos)
        self.safe_from_pits.add(pos)
        self.safe_from_wumpus.add(pos)
        self.percept_history[pos] = percepts

        neighbors = self.get_neighbors(pos)
        unvisited_neighbors = [n for n in neighbors if n not in self.visited]

        # Rule 1: No Breeze => All adjacent rooms are safe from pits
        if not percepts.breeze:
            for n in neighbors:
                if n not in self.safe_from_pits:
                    self.safe_from_pits.add(n)
                    self.suspected_pits.discard(n)
                    new_deductions.append(f"No Breeze at {pos} ⟹ {n} is Safe from Pits.")
        else:
            # Breeze present => Pits possible in adjacent unvisited rooms that are not already known safe
            possible = [n for n in unvisited_neighbors if n not in self.safe_from_pits]
            for p in possible:
                self.suspected_pits.add(p)
            new_deductions.append(f"Breeze detected at {pos} ⟹ Suspected pit candidates: {possible or 'already resolved'}.")

        # Rule 2: No Stench or Wumpus slain => All adjacent rooms are safe from Wumpus
        if not percepts.stench or self.wumpus_slain:
            for n in neighbors:
                if n not in self.safe_from_wumpus:
                    self.safe_from_wumpus.add(n)
                    self.suspected_wumpus.discard(n)
                    new_deductions.append(f"No Stench at {pos} ⟹ {n} is Safe from Wumpus.")
        else:
            if not self.wumpus_slain and self.confirmed_wumpus is None:
                possible_w = [n for n in unvisited_neighbors if n not in self.safe_from_wumpus]
                for pw in possible_w:
                    self.suspected_wumpus.add(pw)
                new_deductions.append(f"Stench detected at {pos} ⟹ Suspected Wumpus candidates: {possible_w}.")

        # Rule 3: Single Wumpus constraint triangulation
        if not self.wumpus_slain and self.confirmed_wumpus is None:
            # Candidate rooms must be adjacent to ALL visited rooms that perceived stench
            stench_visited = [v for v, perc in self.percept_history.items() if perc.stench]
            if stench_visited:
                candidate_intersection = None
                for sv in stench_visited:
                    sv_adj = set(self.get_neighbors(sv)) - self.safe_from_wumpus
                    if candidate_intersection is None:
                        candidate_intersection = sv_adj
                    else:
                        candidate_intersection &= sv_adj
                if candidate_intersection and len(candidate_intersection) == 1:
                    w_pos = list(candidate_intersection)[0]
                    self.confirmed_wumpus = w_pos
                    self.suspected_wumpus = {w_pos}
                    # All other rooms in grid are safe from Wumpus!
                    all_grid = {(r, c) for r in range(1, self.size + 1) for c in range(1, self.size + 1)}
                    for r in all_grid:
                        if r != w_pos:
                            self.safe_from_wumpus.add(r)
                    new_deductions.append(f"Triangulated Stench: Wumpus definitely located at {w_pos}!")

        # Rule 4: Update overall Safe rooms
        for r in range(1, self.size + 1):
            for c in range(1, self.size + 1):
                cell = (r, c)
                wumpus_safe = (cell in self.safe_from_wumpus) or self.wumpus_slain
                pit_safe = (cell in self.safe_from_pits)
                if wumpus_safe and pit_safe:
                    if cell not in self.safe_rooms:
                        self.safe_rooms.add(cell)
                        new_deductions.append(f"Cell {cell} proven SAFE (Free of both Pits and Wumpus).")

        self.logical_deductions.extend(new_deductions)
        return new_deductions

    def register_scream(self):
        """Wumpus has been killed: all rooms become safe from Wumpus."""
        self.wumpus_slain = True
        self.confirmed_wumpus = None
        self.suspected_wumpus.clear()
        all_grid = {(r, c) for r in range(1, self.size + 1) for c in range(1, self.size + 1)}
        self.safe_from_wumpus.update(all_grid)
        # Update safe rooms
        for cell in all_grid:
            if cell in self.safe_from_pits:
                self.safe_rooms.add(cell)
        self.logical_deductions.append("Scream heard across cave! Wumpus is dead. All rooms safe from Wumpus.")


class IntelligentAgent:
    """Knowledge-Based Agent implementing rational decision making and BFS search."""
    def __init__(self, size: int = 4):
        self.size = size
        self.kb = KnowledgeBase(size=size)
        self.plan: List[str] = []
        self.has_gold = False
        self.returning_home = False
        self.status = "READY"
        self.last_action_desc = "Initialized at (1,1)"

    def bfs_path(self, start: Position, goal: Position, allowed_rooms: Set[Position]) -> Optional[List[Position]]:
        """Finds shortest route from start to goal traversing only allowed rooms."""
        if start == goal:
            return [start]
        queue = deque([(start, [start])])
        visited = {start}
        while queue:
            current, path = queue.popleft()
            for neighbor in self.kb.get_neighbors(current):
                if neighbor == goal or (neighbor in allowed_rooms and neighbor not in visited):
                    new_path = path + [neighbor]
                    if neighbor == goal:
                        return new_path
                    visited.add(neighbor)
                    queue.append((neighbor, new_path))
        return None

    def plan_moves_to(self, current_pos: Position, current_dir: str, target_pos: Position) -> List[str]:
        """Translates a step from current_pos to adjacent target_pos into TURN/MOVE actions."""
        cr, cc = current_pos
        tr, tc = target_pos
        dr, dc = tr - cr, tc - cc

        desired_dir = NORTH
        if dr == 1: desired_dir = NORTH
        elif dr == -1: desired_dir = SOUTH
        elif dc == 1: desired_dir = EAST
        elif dc == -1: desired_dir = WEST

        actions = []
        if current_dir != desired_dir:
            cur_idx = DIRECTIONS.index(current_dir)
            des_idx = DIRECTIONS.index(desired_dir)
            diff = (des_idx - cur_idx) % 4
            if diff == 1:
                actions.append("TURN_RIGHT")
            elif diff == 2:
                actions.append("TURN_RIGHT")
                actions.append("TURN_RIGHT")
            elif diff == 3:
                actions.append("TURN_LEFT")

        actions.append("MOVE_FORWARD")
        return actions

    def decide_next_action(self, env: WumpusEnvironment) -> Tuple[str, str]:
        """Core AI decision cycle returning (Action, Explanation)."""
        percepts = env.get_percepts()
        pos = env.agent_pos

        # Update KB with percepts
        deductions = self.kb.update(pos, percepts)
        if percepts.scream:
            self.kb.register_scream()

        # Goal 1: If Glitter is perceived, grab gold!
        if percepts.glitter and not env.agent_has_gold:
            self.has_gold = True
            self.returning_home = True
            return "GRAB", f"Glitter detected at {pos}! Grabbing gold treasure (+1000 points)."

        # Goal 2: If we have gold and are at (1,1), Climb out and win!
        if env.agent_has_gold and pos == (1, 1):
            return "CLIMB", "At starting room (1,1) with gold! Climbing out to victory (+1000 points)."

        # Goal 3: If carrying gold, navigate safely back to (1,1)
        if env.agent_has_gold or self.returning_home:
            path = self.bfs_path(pos, (1, 1), self.kb.safe_rooms)
            if path and len(path) > 1:
                next_step = path[1]
                moves = self.plan_moves_to(pos, env.agent_dir, next_step)
                act = moves[0]
                return act, f"Returning to start (1,1) with gold. Routing through safe room {next_step}."
            elif pos == (1, 1):
                return "CLIMB", "Safely returned to (1,1). Climbing out of cave."

        # Goal 4: Explore unvisited safe rooms
        unvisited_safe = sorted(list(self.kb.safe_rooms - self.kb.visited))
        if unvisited_safe:
            # Find closest unvisited safe room via BFS
            best_path = None
            for candidate in unvisited_safe:
                # Target room itself is allowed even if unvisited since it is proven safe
                allowed = self.kb.visited | {candidate}
                p = self.bfs_path(pos, candidate, allowed)
                if p:
                    if best_path is None or len(p) < len(best_path):
                        best_path = p
            if best_path and len(best_path) > 1:
                next_step = best_path[1]
                target_room = best_path[-1]
                moves = self.plan_moves_to(pos, env.agent_dir, next_step)
                act = moves[0]
                return act, f"Exploring proven safe room {target_room}. Next step: {next_step}."

        # Goal 5: Strategic Arrow Shot if Wumpus is confirmed and blocks path
        if env.agent_has_arrow and self.kb.confirmed_wumpus and not self.kb.wumpus_slain:
            wr, wc = self.kb.confirmed_wumpus
            cr, cc = pos
            if wr == cr or wc == cc:
                shoot_dir = None
                if wr == cr:
                    shoot_dir = EAST if wc > cc else WEST
                else:
                    shoot_dir = NORTH if wr > cr else SOUTH
                if env.agent_dir == shoot_dir:
                    return "SHOOT", f"Wumpus confirmed at {self.kb.confirmed_wumpus}! Shooting arrow {shoot_dir}."
                else:
                    moves = self.plan_moves_to(pos, env.agent_dir, (cr + DIRECTION_DELTAS[shoot_dir][0],
                                                                    cc + DIRECTION_DELTAS[shoot_dir][1]))
                    return moves[0], f"Turning towards confirmed Wumpus at {self.kb.confirmed_wumpus} to take shot."

        # Goal 6: If no safe unvisited rooms exist and gold not found: Return safely to (1,1)
        if pos != (1, 1):
            path = self.bfs_path(pos, (1, 1), self.kb.safe_rooms)
            if path and len(path) > 1:
                next_step = path[1]
                moves = self.plan_moves_to(pos, env.agent_dir, next_step)
                return moves[0], f"No further provably safe rooms available without risking death. Backtracking safely to (1,1)."

        # Goal 7: Exit at (1,1) safely
        return "CLIMB", "At (1,1) with all reachable safe rooms explored. Exiting cave."


def print_cave(env: WumpusEnvironment, kb: Optional[KnowledgeBase] = None, debug: bool = False):
    """Renders a beautiful ASCII representation of the cave grid."""
    size = env.size
    print("\n" + "=" * 49)
    print(f" CAVE MAP (4x4) | Score: {env.score} | Moves: {env.steps} | Arrow: {env.agent_has_arrow} | Gold: {env.agent_has_gold}")
    print("=" * 49)

    for r in range(size, 0, -1):
        row_str = f"R{r} |"
        for c in range(1, size + 1):
            cell = (r, c)
            contents = []

            is_agent = (cell == env.agent_pos)
            is_visited = kb and (cell in kb.visited)

            if is_agent:
                dir_symbol = {"NORTH": "▲", "SOUTH": "▼", "EAST": "▶", "WEST": "◀"}[env.agent_dir]
                contents.append(f"A{dir_symbol}")

            if debug or is_visited or not env.agent_alive:
                if cell == env.wumpus_pos:
                    contents.append("W" if env.wumpus_alive else "w(dead)")
                if cell in env.pits:
                    contents.append("P")
                if cell == env.gold_pos and not env.gold_taken:
                    contents.append("G")
            else:
                if kb:
                    if cell in kb.suspected_wumpus: contents.append("?W")
                    if cell in kb.suspected_pits: contents.append("?P")
                    if cell in kb.safe_rooms: contents.append("OK")
                    if not contents: contents.append("?")

            cell_disp = " ".join(contents) if contents else ("." if is_visited else "?")
            row_str += f" {cell_disp:^9}|"
        print(row_str)
        print("   " + "-" * 46)
    print("     C1        C2        C3        C4\n")


def run_simulation(env: Optional[WumpusEnvironment] = None, delay: float = 0.5):
    """Runs autonomous AI simulation step-by-step."""
    if env is None:
        env = WumpusEnvironment()
    agent = IntelligentAgent(size=env.size)

    print("\n" + "#" * 60)
    print("   WUMPUS WORLD - AUTONOMOUS KNOWLEDGE-BASED AI AGENT")
    print("#" * 60)
    print(f"Initial State: Agent at {env.agent_pos}, Facing {env.agent_dir}")
    print(f"Hidden Setup (Debug): Wumpus={env.wumpus_pos}, Pits={list(env.pits)}, Gold={env.gold_pos}\n")

    step_num = 0
    while env.agent_alive and not env.agent_escaped and step_num < 40:
        step_num += 1
        percepts = env.get_percepts()
        print(f"\n--- STEP {step_num} ---")
        print(f"Position: {env.agent_pos} | Direction: {env.agent_dir} | Percepts: {percepts}")

        action, reasoning = agent.decide_next_action(env)
        print(f"Reasoning: {reasoning}")
        print(f"Executing Action: [{action}]")

        # Execute action on environment
        if action == "MOVE_FORWARD":
            env.move_forward()
        elif action == "TURN_LEFT":
            env.turn_left()
        elif action == "TURN_RIGHT":
            env.turn_right()
        elif action == "GRAB":
            env.grab_gold()
        elif action == "SHOOT":
            env.shoot_arrow()
        elif action == "CLIMB":
            env.climb()

        print_cave(env, agent.kb, debug=False)
        time.sleep(delay)

    print("\n" + "=" * 60)
    if env.agent_escaped:
        if env.agent_has_gold:
            print(f"🎉 VICTORY! Agent escaped cave with the Gold! Final Score: {env.score}")
        else:
            print(f"🏁 ESCAPED SAFELY! Agent returned without gold. Final Score: {env.score}")
    elif not env.agent_alive:
        print(f"💀 GAME OVER: Agent died in the cave. Final Score: {env.score}")
    else:
        print(f"⏱️ Maximum steps reached. Final Score: {env.score}")
    print("=" * 60)


def run_manual():
    """Interactive playable mode for user."""
    env = WumpusEnvironment()
    print("\n" + "=" * 50)
    print(" WUMPUS WORLD - INTERACTIVE PLAYABLE MODE")
    print(" Commands: [w] Forward | [a] Turn Left | [d] Turn Right | [g] Grab | [s] Shoot | [c] Climb | [q] Quit")
    print("=" * 50)

    while env.agent_alive and not env.agent_escaped:
        print_cave(env, debug=False)
        percepts = env.get_percepts()
        print(f"Percepts: {percepts}")
        cmd = input("Action (w/a/d/g/s/c/q): ").strip().lower()

        if cmd == 'w': env.move_forward()
        elif cmd == 'a': env.turn_left()
        elif cmd == 'd': env.turn_right()
        elif cmd == 'g': env.grab_gold()
        elif cmd == 's': env.shoot_arrow()
        elif cmd == 'c': env.climb()
        elif cmd == 'q': break
        else: print("Invalid command!")

    print_cave(env, debug=True)
    if env.agent_escaped and env.agent_has_gold:
        print(f"🎉 YOU WON! Final Score: {env.score}")
    elif not env.agent_alive:
        print(f"💀 YOU DIED! Final Score: {env.score}")


def run_tests():
    """Unit tests verifying logic, knowledge base, and search algorithm."""
    print("Running verification unit tests...")
    env = WumpusEnvironment()
    agent = IntelligentAgent()

    # Test 1: Start room safe
    assert (1, 1) in agent.kb.safe_rooms, "Start room should be safe"

    # Test 2: (1,1) has no breeze and no stench in default setup
    p = env.get_percepts()
    assert not p.breeze and not p.stench, "(1,1) should have no breeze or stench in default config"

    agent.kb.update((1, 1), p)
    assert (1, 2) in agent.kb.safe_rooms, "(1,2) should be deduced safe"
    assert (2, 1) in agent.kb.safe_rooms, "(2,1) should be deduced safe"

    # Test 3: BFS pathfinding
    path = agent.bfs_path((1, 1), (2, 1), agent.kb.safe_rooms)
    assert path == [(1, 1), (2, 1)], "BFS path should be direct neighbor"

    print("✅ All unit tests passed successfully!")


if __name__ == "__main__":
    if "--manual" in sys.argv:
        run_manual()
    elif "--random" in sys.argv:
        env = WumpusEnvironment.create_random()
        run_simulation(env, delay=0.3)
    elif "--test" in sys.argv:
        run_tests()
    else:
        run_simulation(delay=0.3)
