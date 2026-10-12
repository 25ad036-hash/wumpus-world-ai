import { Direction, Position } from "./types";

export const GRID_SIZE = 4;
export const START_POS: Position = [1, 1];
export const DEFAULT_WUMPUS_POS: Position = [4, 3];
export const DEFAULT_PITS_POS: Position[] = [[4, 1], [4, 4]];
export const DEFAULT_GOLD_POS: Position = [2, 3];

export const DIRECTIONS: Direction[] = ["NORTH", "EAST", "SOUTH", "WEST"];

export const DIRECTION_DELTAS: Record<Direction, [number, number]> = {
  NORTH: [1, 0],
  SOUTH: [-1, 0],
  EAST: [0, 1],
  WEST: [0, -1]
};

export const SCORING = {
  STEP_COST: -1,
  ARROW_COST: -10,
  GOLD_REWARD: 1000,
  ESCAPE_REWARD: 1000,
  DEATH_PENALTY: -1000
};
