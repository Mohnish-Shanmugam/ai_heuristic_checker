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