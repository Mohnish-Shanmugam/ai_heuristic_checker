import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { findBestMove } from '../engine/minimax.js';
import EvalBar from './EvalBar.jsx';
import TelemetryPanel from './TelemetryPanel.jsx';
import TicTacToeBoard from './TicTacToeBoard.jsx';
import CheckersBoard from './CheckersBoard.jsx';

export default function PlayView({ game, humanSide, aiDepth, onExit, onFinished }) {
  const [board, setBoard] = useState(() => game.createInitialState());
  const [currentPlayer, setCurrentPlayer] = useState(game.sides.first);
  const [moveHistory, setMoveHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [lastAiStats, setLastAiStats] = useState(null);
  const finishedRef = useRef(false);

  const aiSide = humanSide === game.sides.first ? game.sides.second : game.sides.first;

  const commitMove = useCallback(
    (move, player, searchStats) => {
      setBoard((prevBoard) => {
        const boardBefore = prevBoard;
        const boardAfter = game.applyMove(boardBefore, move, player);
        const evalResult = game.evaluate(boardAfter, game.sides.first);
        const nextPlayer = game.nextPlayer(player);
        const newStatus = game.getStatus(boardAfter, nextPlayer);

        setMoveHistory((prevHistory) => [
          ...prevHistory,
          {
            index: prevHistory.length,
            player,
            move,
            boardBefore,
            boardAfter,
            evalScore: evalResult.score,
            breakdown: evalResult.breakdown,
            formattedMove: game.formatMove(move),
            searchNodes: searchStats?.nodes ?? null,
            searchMs: searchStats?.elapsedMs ?? null,
          },
        ]);

        if (newStatus) {
          setStatus(newStatus);
        } else {
          setCurrentPlayer(nextPlayer);
        }
        return boardAfter;
      });
    },
    [game]
  );
  // AI turn effect
  useEffect(() => {
    if (status) return;
    if (currentPlayer !== aiSide) return;
    let cancelled = false;
    setIsThinking(true);
    const timer = setTimeout(() => {
      const result = findBestMove(game.adapter, board, aiSide, aiDepth);
      if (!cancelled && result) {
        setLastAiStats({ nodes: result.nodes, prunes: result.prunes, ms: result.elapsedMs });
        commitMove(result.move, aiSide, result);
      }
      if (!cancelled) setIsThinking(false);
    }, 260);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, currentPlayer, status]);

  const liveEval = useMemo(() => game.evaluate(board, game.sides.first), [board, game]);

  const legalMovesForHuman = useMemo(() => {
    if (status || currentPlayer !== humanSide) return [];
    return game.getLegalMoves(board, humanSide);
  }, [board, currentPlayer, status, humanSide, game]);

  function handleHumanMove(move) {
    if (status || currentPlayer !== humanSide || isThinking) return;
    commitMove(move, humanSide, null);
  }

  useEffect(() => {
    if (status && !finishedRef.current) {
      finishedRef.current = true;
    }
  }, [status]);

  const winnerLabel = status
    ? status.winner === 'draw'
      ? 'Draw'
      : `${game.sideLabel[status.winner]} wins`
    : null;

  const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].move : null;

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10" style={{ background: 'var(--void)' }}>
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onExit} className="text-sm text-[var(--dim)] hover:text-[var(--ink)]">
            ← exit match
          </button>
          <div className="text-sm font-mono-data text-[var(--dim)]">
            {game.name} · depth {aiDepth} · you are{' '}
            <span style={{ color: game.sideColor[humanSide] }}>{game.sideLabel[humanSide]}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_320px] gap-8 items-start">
          <div className="flex flex-col items-center gap-5">
            <div
              className="h-8 flex items-center justify-center text-sm font-medium rounded-sm px-3"
              style={{
                background: status ? 'rgba(245,166,35,0.15)' : 'transparent',
                color: status ? 'var(--signal)' : 'var(--dim)',
              }}
            >
              {status
                ? winnerLabel
                : isThinking
                ? `${game.sideLabel[aiSide]} (bot) is thinking…`
                : `${game.sideLabel[currentPlayer]} to move${currentPlayer === humanSide ? ' — your turn' : ''}`}
            </div>

            {game.id === 'tictactoe' ? (
              <TicTacToeBoard
                board={board}
                onCellClick={handleHumanMove}
                disabled={status !== null || currentPlayer !== humanSide || isThinking}
                winLine={status?.line}
                sideColor={game.sideColor}
              />
            ) : (
              <CheckersBoard
                board={board}
                legalMoves={legalMovesForHuman}
                onMove={handleHumanMove}
                disabled={status !== null || currentPlayer !== humanSide || isThinking}
                sideColor={game.sideColor}
                lastMove={lastMove}
              />
            )}

            {status && (
              <button
                onClick={() => onFinished(moveHistory, board)}
                className="rounded-sm px-5 py-2.5 font-medium mt-2"
                style={{ background: 'var(--signal)', color: '#1a1305' }}
              >
                View post-match analysis →
              </button>
            )}

            {lastAiStats && !status && (
              <div className="text-[11px] text-[var(--dim)] font-mono-data">
                last search: {lastAiStats.nodes.toLocaleString()} nodes · {lastAiStats.prunes.toLocaleString()}{' '}
                prunes · {lastAiStats.ms.toFixed(0)}ms
              </div>
            )}
          </div>

          <div className="flex lg:flex-col items-center justify-center">
            <EvalBar score={liveEval.score} game={game} terminal={status?.winner ?? liveEval.terminal} />
          </div>

          <div className="flex flex-col gap-4 w-full">
            <TelemetryPanel game={game} breakdown={liveEval.breakdown} currentPlayer={currentPlayer} />
            <MoveLog game={game} moveHistory={moveHistory} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MoveLog({ game, moveHistory }) {
  return (
    <div className="rounded-sm border" style={{ borderColor: 'var(--hairline)', background: 'var(--panel)' }}>
      <div className="px-4 py-2.5 border-b text-sm font-medium" style={{ borderColor: 'var(--hairline)' }}>
        Move log
      </div>
      <div className="max-h-40 overflow-y-auto px-4 py-2 font-mono-data text-xs">
        {moveHistory.length === 0 && <div className="text-[var(--dim)] py-2">No moves yet.</div>}
        {moveHistory.map((entry) => (
          <div key={entry.index} className="flex justify-between py-1 border-b last:border-0" style={{ borderColor: 'rgba(38,44,58,0.5)' }}>
            <span>
              <span style={{ color: game.sideColor[entry.player] }}>{game.sideLabel[entry.player]}</span>{' '}
              {entry.formattedMove}
            </span>
            <span className="text-[var(--dim)]">{entry.evalScore > 0 ? '+' : ''}{entry.evalScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
}