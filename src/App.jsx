import { useState } from 'react';
import { getGame } from './engine/GameRegistry.js';
import GameSelector from './components/GameSelector.jsx';
import GameSetup from './components/GameSetup.jsx';
import PlayView from './components/PlayView.jsx';
import PostMatchAnalysis from './components/PostMatchAnalysis.jsx';

export default function App() {
  const [view, setView] = useState('selector'); // selector | setup | play | analysis
  const [gameId, setGameId] = useState(null);
  const [config, setConfig] = useState(null); // { humanSide, depth }
  const [matchResult, setMatchResult] = useState(null); // { moveHistory, finalBoard }
  const [playKey, setPlayKey] = useState(0); // forces PlayView remount on rematch

  const game = gameId ? getGame(gameId) : null;

  function handleSelectGame(id) {
    setGameId(id);
    setView('setup');
  }

  function handleStart(cfg) {
    setConfig(cfg);
    setPlayKey((k) => k + 1);
    setView('play');
  }

  function handleFinished(moveHistory, finalBoard) {
    setMatchResult({ moveHistory, finalBoard });
    setView('analysis');
  }

  function handleExitToMenu() {
    setView('selector');
    setGameId(null);
    setConfig(null);
    setMatchResult(null);
  }

  function handleRematch() {
    setMatchResult(null);
    setPlayKey((k) => k + 1);
    setView('play');
  }

  if (view === 'selector' || !game) {
    return <GameSelector onSelect={handleSelectGame} />;
  }

  if (view === 'setup') {
    return <GameSetup game={game} onBack={() => setView('selector')} onStart={handleStart} />;
  }

  if (view === 'play') {
    return (
      <PlayView
        key={playKey}
        game={game}
        humanSide={config.humanSide}
        aiDepth={config.depth}
        onExit={handleExitToMenu}
        onFinished={handleFinished}
      />
    );
  }

  if (view === 'analysis' && matchResult) {
    return (
      <PostMatchAnalysis
        game={game}
        moveHistory={matchResult.moveHistory}
        humanSide={config.humanSide}
        finalBoard={matchResult.finalBoard}
        onExit={handleExitToMenu}
        onRematch={handleRematch}
      />
    );
  }

  return <GameSelector onSelect={handleSelectGame} />;
}


// import React, { useState } from 'react';
// import GameSelector from './components/GameSelector';
// import GameSetup from './components/GameSetup';
// import PlayView from './components/PlayView';
// import PostMatchAnalysis from './components/PostMatchAnalysis';
// import { GAME_REGISTRY } from './utils/registry';

// export default function App() {
//   const [screen, setScreen] = useState('selector'); // 'selector' | 'setup' | 'play' | 'analysis'
//   const [selectedGameId, setSelectedGameId] = useState('tictactoe');
//   const [gameConfig, setGameConfig] = useState({ side: 'X', depth: 4 });
//   const [matchHistory, setMatchHistory] = useState([]);

//   const currentGame = GAME_REGISTRY[selectedGameId];

//   const handleSelectGame = (id) => {
//     setSelectedGameId(id);
//     setScreen('setup');
//   };

//   const handleStartGame = (config) => {
//     setGameConfig(config);
//     setScreen('play');
//   };

//   const handleGameOver = (history) => {
//     setMatchHistory(history);
//     setScreen('analysis');
//   };

//   return (
//     <div className="min-h-screen bg-[#0a0d12] text-[#e8ebf1] flex flex-col font-sans">
//       <header className="border-b border-[#262c3a] px-6 py-4 flex items-center justify-between bg-[#141922]">
//         <h1 
//           className="text-xl font-bold tracking-tight text-[#f5a623] cursor-pointer" 
//           onClick={() => setScreen('selector')}
//         >
//           HEURISTIC<span className="text-[#38bdf8]">.LAB</span>
//         </h1>
//         <span className="text-xs font-mono bg-[#181e2a] px-3 py-1 rounded text-[#8a92a6] border border-[#262c3a]">
//           Vite + React Engine
//         </span>
//       </header>

//       <main className="flex-1 max-w-7xl w-full mx-auto p-6">
//         {screen === 'selector' && <GameSelector onSelect={handleSelectGame} />}
        
//         {screen === 'setup' && (
//           <GameSetup 
//             game={currentGame} 
//             onBack={() => setScreen('selector')} 
//             onStart={handleStartGame} 
//           />
//         )}
        
//         {screen === 'play' && (
//           <PlayView 
//             game={currentGame} 
//             config={gameConfig} 
//             onFinish={handleGameOver} 
//             onQuit={() => setScreen('selector')} 
//           />
//         )}
        
//         {screen === 'analysis' && (
//           <PostMatchAnalysis 
//             game={currentGame} 
//             history={matchHistory} 
//             onRestart={() => setScreen('setup')} 
//             onHome={() => setScreen('selector')} 
//           />
//         )}
//       </main>
//     </div>
//   );
// }
