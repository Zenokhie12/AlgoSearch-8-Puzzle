import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  RefreshCw, 
  Terminal, 
  FileCode, 
  ChevronRight, 
  CheckCircle2, 
  Cpu
} from 'lucide-react';

// --- Constants & Types ---
const GOAL_STATE = "123456780";

type PuzzleState = {
  board: string;
  parent: PuzzleState | null;
  move: string;
};

// --- Utils ---
function getInversionCount(board: string) {
  const arr = board.split('').filter(c => c !== '0').map(Number);
  let inversions = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) inversions++;
    }
  }
  return inversions;
}

function isSolvable(board: string) {
  return getInversionCount(board) % 2 === 0;
}

function generateRandomSolvableState() {
  while (true) {
    const chars = "123456780".split('');
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const state = chars.join('');
    if (isSolvable(state) && state !== GOAL_STATE) return state;
  }
}

export default function App() {
  const [board, setBoard] = useState(generateRandomSolvableState());
  const [isSolving, setIsSolving] = useState(false);
  const [path, setPath] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<{
    duration: number;
    nodesExpanded: number;
    searchDepth: number;
    pathCost: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const runBFS = async () => {
    setIsSolving(true);
    setMetrics(null);
    const startTime = performance.now();
    setLogs(prev => [...prev, `> Starting BFS Search...`, `> Initial State: ${board}`]);
    
    // BFS Implementation
    const queue: { s: PuzzleState; depth: number }[] = [{ s: { board, parent: null, move: "" }, depth: 0 }];
    const visited = new Set<string>([board]);
    let solvedState: PuzzleState | null = null;
    let nodesExpanded = 0;
    let maxDepth = 0;

    // Small delay to allow logging to breathe
    await new Promise(r => setTimeout(r, 100));

    while (queue.length > 0) {
      const { s: current, depth } = queue.shift()!;
      nodesExpanded++;
      maxDepth = Math.max(maxDepth, depth);

      // Log to pseudo-terminal (limited rate)
      if (nodesExpanded % 50 === 0) {
        setLogs(prev => [...prev.slice(-40), `Visiting: ${current.board} (Nodes: ${nodesExpanded})`]);
      }

      if (current.board === GOAL_STATE) {
        solvedState = current;
        break;
      }

      // Find neighbors
      const zeroIdx = current.board.indexOf('0');
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
          const boardArr = current.board.split('');
          const targetIdx = nr * 3 + nc;
          [boardArr[zeroIdx], boardArr[targetIdx]] = [boardArr[targetIdx], boardArr[zeroIdx]];
          const nextBoard = boardArr.join('');
          
          if (!visited.has(nextBoard)) {
            visited.add(nextBoard);
            queue.push({ s: { board: nextBoard, parent: current, move }, depth: depth + 1 });
          }
        }
      }
      
      // Prevent blocking the UI thread
      if (nodesExpanded % 1000 === 0) {
        await new Promise(r => setTimeout(r, 0));
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
        pathCost: finalPath.length - 1
      });

      setLogs(prev => [...prev, `> Solved! Final Path Cost: ${finalPath.length - 1} steps.`]);
      
      // Animate steps
      for (let i = 0; i < finalPath.length; i++) {
        setBoard(finalPath[i]);
        setCurrentStep(i);
        await new Promise(r => setTimeout(r, 400));
      }
    }

    setIsSolving(false);
  };

  const handleShuffle = () => {
    setBoard(generateRandomSolvableState());
    setPath([]);
    setMetrics(null);
    setCurrentStep(0);
    setLogs(prev => [...prev, `> Board shuffled.`]);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-8 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Cpu className="w-8 h-8 text-blue-600" />
            8-Puzzle BFS Solver
          </h1>
          <p className="text-slate-500 mt-1">Expert implementation of Breadth-First Search optimization.</p>
        </div>
        <div className="flex gap-2">
          {/*<button 
            onClick={downloadPythonScript}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download .py
          </button>*/}
          <button 
            onClick={handleShuffle}
            disabled={isSolving}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSolving ? 'animate-spin' : ''}`} />
            Shuffle
          </button>
          <button 
            onClick={runBFS}
            disabled={isSolving || board === GOAL_STATE}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            Solve with BFS
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Visualizer */}
        <section className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100 flex flex-col items-center justify-center">
          <div className="relative p-2 bg-slate-200 rounded-xl overflow-hidden shadow-inner">
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
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm shadow-emerald-100/50"
            >
              <h3 className="text-emerald-900 font-bold text-lg mb-4 flex items-center justify-between">
                <span>Results</span>
                <span className="text-xl">Solution exists! 😄</span>
              </h3>
              
              <div className="space-y-3 font-medium">
                <div className="flex justify-between items-center text-emerald-800">
                  <span className="text-sm">Runtime Duration:</span>
                  <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded">{(metrics.duration / 1000).toFixed(4)} seconds</span>
                </div>
                <div className="flex justify-between items-center text-emerald-800">
                  <span className="text-sm">Nodes Expanded:</span>
                  <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded">{metrics.nodesExpanded}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-800">
                  <span className="text-sm">Search Depth:</span>
                  <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded">{metrics.searchDepth}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-800">
                  <span className="text-sm">Path Cost:</span>
                  <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded">{metrics.pathCost}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-800 pt-2 border-t border-emerald-200/50">
                  <span className="text-sm font-bold">Path to Goal:</span>
                  <span className="font-mono text-emerald-600 font-bold tracking-wider">{GOAL_STATE}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Detailed Stats */}
          {!metrics && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Path Steps</div>
                <div className="text-2xl font-bold text-slate-800">{path.length > 0 ? path.length - 1 : 0}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Inversion Count</div>
                <div className="text-2xl font-bold text-slate-800">{getInversionCount(board)}</div>
              </div>
            </div>
          )}

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
                <div className="text-slate-600 italic py-2">Waiting for BFS execution...</div>
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
            <h3 className="font-bold text-blue-900">Python Implementation Details</h3>
            <p className="text-sm text-blue-700/80 mt-1 max-w-2xl">
              The provided Python script uses <code className="bg-blue-100 px-1 rounded">collections.deque</code> for an efficient O(1) popping complexity. 
              States are stored as strings for immutability, and visited nodes are tracked via a <code className="bg-blue-100 px-1 rounded">Set</code>. 
              The Pygame GUI animates the solution found by the BFS algorithm using a smooth frame-based interpolation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
