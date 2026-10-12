import React, { useState, useEffect, useRef } from 'react';
import { GameStatus, LogEntry, Position, Direction } from './types';
import { START_POS, GRID_SIZE } from './constants';

export const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>("READY");
  const [score, setScore] = useState<number>(0);
  const [moves, setMoves] = useState<number>(0);
  const [pos, setPos] = useState<Position>(START_POS);
  const [dir, setDir] = useState<Direction>("EAST");
  const [hasGold, setHasGold] = useState<boolean>(false);
  const [hasArrow, setHasArrow] = useState<boolean>(true);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [speed, setSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [reasoning, setReasoning] = useState<string>("Agent initialized at (1,1). Ready for exploration.");
  const [log, setLog] = useState<LogEntry[]>([]);

  return (
    <div className="wumpus-app">
      {/* React TypeScript Entry Component */}
      <header className="app-header">
        <div className="brand-titles">
          <h1>Wumpus World – AI Explorer</h1>
          <p>An Intelligent Agent for Knowledge-Based Cave Exploration (React + TypeScript)</p>
        </div>
      </header>
      <main className="app-container">
        {/* CaveGrid, Controls, AI Panels and Knowledge Base */}
      </main>
    </div>
  );
};

export default App;
