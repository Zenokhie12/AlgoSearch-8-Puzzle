import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  RefreshCw, 
  Terminal, 
  FileCode, 
  ChevronRight, 
  CheckCircle2, 
  Cpu,
  Square
} from 'lucide-react';

// --- Constants & Types ---
const GOAL_STATE = "123456780";

type PuzzleState = {
  board: string;
  parent: PuzzleState | null;
  move: string;
};

// --- Utils ---
function generateRandomState() {
  while (true) {
    const chars = "123456780".split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const state = chars.join('');
    if (state !== GOAL_STATE) return state;
  }
}

export default function App() {
  const [board, setBoard] = useState(generateRandomState());
  const [initialBoard, setInitialBoard] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [algorithm, setAlgorithm] = useState<'BFS' | 'DFS' | 'BestFS' | 'A*'>('BFS');
  const [path, setPath] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<{
    duration: number;
    nodesExpanded: number;
    searchDepth: number;
    pathCost: number;
    hasSolution: boolean;
    algorithmUsed: string;
    initialState: string;
  } | null>(null);
  const stopRequested = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Heuristics for search algorithms
  const getManhattanDistance = (state: string) => {
    let distance = 0;
    for (let i = 0; i < state.length; i++) {
      if (state[i] === '0') continue;
      const val = parseInt(state[i]) - 1;
      const targetRow = Math.floor(val / 3);
      const targetCol = val % 3;
      const currentRow = Math.floor(i / 3);
      const currentCol = i % 3;
      distance += Math.abs(targetRow - currentRow) + Math.abs(targetCol - currentCol);
    }
    return distance;
  };

  const getNeighbors = (boardStr: string) => {
    const neighbors: { board: string, move: string }[] = [];
    const zeroIdx = boardStr.indexOf('0');
    const row = Math.floor(zeroIdx / 3);
    const col = zeroIdx % 3;
    const directions = [
      { dr: -1, dc: 0, move: "Up" },
      { dr: 1, dc: 0, move: "Down" },
      { dr: 0, dc: -1, move: "Left" },
      { dr: 0, dc: 1, move: "Right" },
    ];

    for (const { dr, dc, move } of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) {
        const boardArr = boardStr.split('');
        const targetIdx = nr * 3 + nc;
        [boardArr[zeroIdx], boardArr[targetIdx]] = [boardArr[targetIdx], boardArr[zeroIdx]];
        neighbors.push({ board: boardArr.join(''), move });
      }
    }
    return neighbors;
  };

  const runSearch = async () => {
    setIsSolving(true);
    setInitialBoard(board);
    stopRequested.current = false;
    setMetrics(null);
    const startTime = performance.now();
    setLogs(prev => [...prev, `> Starting ${algorithm} Search...`, `> Initial State: ${board}`]);
    
    let nodesExpanded = 0;
    let maxDepth = 0;
    let solvedState: PuzzleState | null = null;
    const visited = new Set<string>([board]);

    // Simple priority queue helper for BestFS and A*
    // Using a sorted array for simplicity in this specific context
    // For production, a heap would be better.
    const priorityQueue: { s: PuzzleState; depth: number; score: number }[] = [];
    const queue: { s: PuzzleState; depth: number }[] = [];
    const stack: { s: PuzzleState; depth: number }[] = [];

    const initialState: PuzzleState = { board, parent: null, move: "" };

    if (algorithm === 'BFS') {
      queue.push({ s: initialState, depth: 0 });
    } else if (algorithm === 'DFS') {
      stack.push({ s: initialState, depth: 0 });
    } else {
      // BestFS or A*
      const score = algorithm === 'A*' 
        ? getManhattanDistance(board) 
        : getManhattanDistance(board);
      priorityQueue.push({ s: initialState, depth: 0, score });
    }

    // Small delay to allow logging to breathe
    await new Promise(r => setTimeout(r, 100));

    while (queue.length > 0 || stack.length > 0 || priorityQueue.length > 0) {
      if (stopRequested.current) {
        setLogs(prev => [...prev.slice(-40), `> Search stopped by user.`]);
        setIsSolving(false);
        return;
      }

      let current: PuzzleState;
      let depth: number;

      if (algorithm === 'BFS') {
        const item = queue.shift()!;
        current = item.s;
        depth = item.depth;
      } else if (algorithm === 'DFS') {
        const item = stack.pop()!;
        current = item.s;
        depth = item.depth;
      } else {
        // Simple priority dequeue
        // Sort by score ascending
        priorityQueue.sort((a, b) => a.score - b.score);
        const item = priorityQueue.shift()!;
        current = item.s;
        depth = item.depth;
      }

      nodesExpanded++;
      maxDepth = Math.max(maxDepth, depth);

      // Log progress
      if (nodesExpanded % 100 === 0) {
        setLogs(prev => [...prev.slice(-40), `Visiting: ${current.board} (Nodes: ${nodesExpanded}, Depth: ${depth})`]);
      }

      if (current.board === GOAL_STATE) {
        solvedState = current;
        break;
      }

      // Find neighbors
      const neighbors = getNeighbors(current.board);

      for (const { board: nextBoard, move } of neighbors) {
        if (!visited.has(nextBoard)) {
          visited.add(nextBoard);
          const nextState: PuzzleState = { board: nextBoard, parent: current, move };
          
          if (algorithm === 'BFS') {
            queue.push({ s: nextState, depth: depth + 1 });
          } else if (algorithm === 'DFS') {
            stack.push({ s: nextState, depth: depth + 1 });
          } else if (algorithm === 'BestFS') {
            // Greedy: heuristic only
            priorityQueue.push({ s: nextState, depth: depth + 1, score: getManhattanDistance(nextBoard) });
          } else if (algorithm === 'A*') {
            // f(n) = g(n) + h(n)
            priorityQueue.push({ s: nextState, depth: depth + 1, score: (depth + 1) + getManhattanDistance(nextBoard) });
          }
        }
      }
      
      // Control UI responsiveness
      if (nodesExpanded % 500 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }

      // Safety limit for DFS and unguided searches
      if (nodesExpanded > 100000) {
        setLogs(prev => [...prev, `> Node limit reached. Stopping search.`]);
        break;
      }
    }

    const endTime = performance.now();

    if (solvedState) {
      const solutionPath: string[] = [];
      let temp: PuzzleState | null = solvedState;
      while (temp) {
        solutionPath.push(temp.board);
        temp = temp.parent;
      }
      const finalPath = solutionPath.reverse();
      setPath(finalPath);
      
      setMetrics({
        duration: endTime - startTime,
        nodesExpanded,
        searchDepth: maxDepth,
        pathCost: finalPath.length - 1,
        hasSolution: true,
        algorithmUsed: algorithm,
        initialState: board
      });

      setLogs(prev => [...prev, `> Solved using ${algorithm}! Final Path Cost: ${finalPath.length - 1} steps.`]);
      
      // Animate steps
      for (let i = 0; i < finalPath.length; i++) {
        if (stopRequested.current) {
          setLogs(prev => [...prev.slice(-40), `> Animation stopped by user.`]);
          break;
        }
        setBoard(finalPath[i]);
        setCurrentStep(i);
        await new Promise(r => setTimeout(r, 300));
      }
    } else {
      setMetrics({
        duration: endTime - startTime,
        nodesExpanded,
        searchDepth: maxDepth,
        pathCost: 0,
        hasSolution: false,
        algorithmUsed: algorithm,
        initialState: board
      });
      setLogs(prev => [...prev, `> Search Complete. No solution found within limits for this configuration.`]);
    }

    setIsSolving(false);
  };

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleShuffle = () => {
    setBoard(generateRandomState());
    setPath([]);
    setMetrics(null);
    setCurrentStep(0);
    stopRequested.current = false;
    setLogs(prev => [...prev, `> Board shuffled.`]);
  };

  const handleStop = () => {
    stopRequested.current = true;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-8 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Cpu className="w-12 h-12 text-blue-600" />
            8-Puzzle Algo Search Solver
          </h1>
          <p className="text-slate-500 mt-1">Multi-algorithm Uninformed & heuristic state-space search explorer.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex bg-slate-200/50 p-1 rounded-lg border border-slate-200">
            {(['BFS', 'DFS', 'BestFS', 'A*'] as const).map((alg) => (
              <button
                key={alg}
                onClick={() => setAlgorithm(alg)}
                disabled={isSolving}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                  algorithm === alg 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                } disabled:opacity-50`}
              >
                {alg}
              </button>
            ))}
          </div>

          <button 
            onClick={handleShuffle}
            disabled={isSolving}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSolving ? 'animate-spin' : ''}`} />
            Shuffle
          </button>
          
          <button 
            onClick={runSearch}
            disabled={isSolving || board === GOAL_STATE}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            Run {algorithm}
          </button>

          {isSolving && (
            <button 
              onClick={handleStop}
              className="flex items-center gap-2 px-6 py-2 bg-rose-600 rounded-lg text-sm font-semibold text-white hover:bg-rose-700 transition-all shadow-md active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop
            </button>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Visualizer */}
        <section className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100 flex flex-col items-center justify-center">
          <div className="relative p-6  bg-slate-200 rounded-xl overflow-hidden shadow-inner">
            <div className="tile-grid">
              {board.split('').map((char, index) => (
                <AnimatePresence mode="popLayout" key={`pos-${index}`}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={`w-full aspect-square rounded-lg flex items-center justify-center text-3xl font-bold shadow-sm ${
                      char === '0' 
                        ? 'bg-slate-300/30' 
                        : 'bg-white text-slate-800'
                    }`}
                  >
                    {char !== '0' && char}
                  </motion.div>
                </AnimatePresence>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-2">Current State</div>
            <div className="font-mono text-2xl bg-slate-100 px-4 py-1 rounded-md text-slate-600">
              {board.split('').map((c, i) => (
                <span key={i} className={c === '0' ? 'text-slate-300' : ''}>{c}</span>
              ))}
            </div>
            {board === GOAL_STATE && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 text-emerald-600 font-medium"
              >
                <CheckCircle2 className="w-5 h-5" />
                Puzzle Solved!
              </motion.div>
            )}
          </div>
        </section>

        {/* Stats & Terminal */}
        <div className="flex flex-col gap-6">
          {/* Results Summary */}
          {metrics && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`${metrics.hasSolution ? 'bg-emerald-50 border-emerald-200 shadow-emerald-100/50' : 'bg-rose-50 border-rose-200 shadow-rose-100/50'} border rounded-2xl p-6 shadow-sm`}
            >
              <h3 className={`${metrics.hasSolution ? 'text-emerald-900' : 'text-rose-900'} font-bold text-lg mb-4 flex items-center justify-between`}>
                <span>Results</span>
                <span className="text-xl">
                  {metrics.hasSolution ? 'Solution exists! ✅' : "Solution doesn't exist ⛔"}
                </span>
              </h3>
              
              <div className="space-y-3 font-medium">
                <div className={`flex justify-between items-center ${metrics.hasSolution ? 'text-emerald-800' : 'text-rose-800'}`}>
                  <span className="text-sm">Algorithm Used:</span>
                  <span className={`font-mono ${metrics.hasSolution ? 'bg-emerald-100' : 'bg-rose-100'} px-2 py-0.5 rounded font-bold`}>{metrics.algorithmUsed}</span>
                </div>
                <div className={`flex justify-between items-center ${metrics.hasSolution ? 'text-emerald-800' : 'text-rose-800'}`}>
                  <span className="text-sm">Runtime Duration:</span>
                  <span className={`font-mono ${metrics.hasSolution ? 'bg-emerald-100' : 'bg-rose-100'} px-2 py-0.5 rounded`}>{(metrics.duration / 1000).toFixed(4)} seconds</span>
                </div>
                <div className={`flex justify-between items-center ${metrics.hasSolution ? 'text-emerald-800' : 'text-rose-800'}`}>
                  <span className="text-sm">Nodes Expanded:</span>
                  <span className={`font-mono ${metrics.hasSolution ? 'bg-emerald-100' : 'bg-rose-100'} px-2 py-0.5 rounded`}>{metrics.nodesExpanded}</span>
                </div>
                <div className={`flex justify-between items-center ${metrics.hasSolution ? 'text-emerald-800' : 'text-rose-800'}`}>
                  <span className="text-sm">Search Depth:</span>
                  <span className={`font-mono ${metrics.hasSolution ? 'bg-emerald-100' : 'bg-rose-100'} px-2 py-0.5 rounded`}>{metrics.searchDepth}</span>
                </div>
                {metrics.hasSolution && (
                  <>
                    <div className="flex justify-between items-center text-emerald-800">
                      <span className="text-sm">Path Cost:</span>
                      <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded">{metrics.pathCost}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-800 pt-2 border-t border-emerald-200/50">
                      <span className="text-sm font-bold">Path to Goal:</span>
                      <span className="font-mono text-emerald-600 font-bold tracking-wider">{GOAL_STATE}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-800">
                      <span className="text-sm font-bold">Initial State:</span>
                      <span className="font-mono text-emerald-400 font-bold tracking-wider">{metrics.initialState}</span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Detailed Stats */}
          {/*!metrics && (
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Path Steps</div>
                <div className="text-2xl font-bold text-slate-800">{path.length > 0 ? path.length - 1 : 0}</div>
              </div>
            </div>
          )*/}

          {/* Pseudo-Terminal */}
          <div className="h-[400px] bg-slate-900 rounded-2xl p-4 flex flex-col font-mono text-[13px] shadow-2xl relative overflow-hidden group border border-slate-800">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2 flex-none">
              <Terminal className="w-4 h-4 text-slate-500" />
              <span className="text-slate-500 font-medium">SYSTEM LOGS</span>
              <div className="flex gap-1.5 ml-auto">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
            </div>
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto terminal-scroll text-slate-300 space-y-1 pr-2"
            >
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-700 w-6 text-right flex-none uppercase">{i + 1}</span>
                  <span className={log.startsWith('>') ? 'text-blue-400 font-bold' : ''}>{log}</span>
                </div>
              ))}
              {isSolving && (
                <div className="flex gap-2 animate-pulse">
                  <span className="text-slate-700 w-6 text-right flex-none">{logs.length + 1}</span>
                  <span className="text-slate-500 italic">Searching next level...</span>
                </div>
              )}
              {logs.length === 0 && (
                <div className="text-slate-600 italic py-2 text-center">Ready for simulation...</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Code Snippet Info */}
      <footer className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <FileCode className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900">Multi-Search Engine Documentation</h3>
            <p className="text-sm text-blue-700/90 mt-1 max-w-2xl">
              This engine supports Breadth-First Search (complete, optimal), Depth-First Search (explorative, non-optimal), 
              Best-First Search (greedy heuristic), and A* Search (optimal with consistent heuristics). 
              Manhattan distance is used as the primary heuristic for informed searches to estimate cost to reach the goal state ({GOAL_STATE}).
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
