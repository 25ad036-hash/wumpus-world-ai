/**
 * TypeScript Data Models & Interfaces for Wumpus World
 */

export type Direction = "NORTH" | "SOUTH" | "EAST" | "WEST";

export type Position = [number, number]; // [row, col] where row in [1..4], col in [1..4]

export interface Percepts {
  stench: boolean;
  breeze: boolean;
  glitter: boolean;
  bump: boolean;
  scream: boolean;
}

export type ActionType = 
  | "MOVE_FORWARD"
  | "TURN_LEFT"
  | "TURN_RIGHT"
  | "GRAB"
  | "SHOOT"
  | "CLIMB";

export type GameStatus = "READY" | "RUNNING" | "PAUSED" | "WON" | "LOST";

export interface LogEntry {
  id: number;
  step: number;
  type: string;
  text: string;
  timestamp?: string;
}

export interface RoomState {
  pos: Position;
  visited: boolean;
  safe: boolean;
  suspectedPit: boolean;
  suspectedWumpus: boolean;
  percepts?: Percepts;
  hasAgent?: boolean;
}
