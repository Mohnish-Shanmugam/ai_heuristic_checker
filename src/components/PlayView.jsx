import { useState, useEffect, useMemo, useReducer, useRef } from 'react';
import { ArrowLeft, RotateCcw, Settings2, Bot, User, Trophy, BarChart3, Cpu, History, GitBranch } from 'lucide-react';
import { findBestMove } from '../engine/minimax.js';
import { createSearchTrace } from '../engine/searchTrace.js';
import EvalBar from './EvalBar.jsx';
import TelemetryPanel from './TelemetryPanel.jsx';
import TicTacToeBoard from './TicTacToeBoard.jsx';
import CheckersBoard from './CheckersBoard.jsx';
import SearchTreePanel from './searchTree/SearchTreePanel.jsx';
import { AppHeader, Card, SideDot, Stat, ThinkingDots } from './ui.jsx';

const MAX_STORED_TRACES = 8; // older search trees are dropped to bound memory

function initMatch(game) {
  return { board: game.createInitialState(), currentPlayer: game.sides.first, moveHistory: [], status: null };
}

// Pure reducer: StrictMode may call it twice, which is harmless here.
function matchReducer(match, action) {
  if (action.type !== 'move') return match;
  const { game, move, player, searchStats } = action;
  if (match.status) return match;
  const boardBefore = match.board;
  const boardAfter = game.applyMove(boardBefore, move, player);
  const evalResult = game.evaluate(boardAfter, game.sides.first);
  const nextPlayer = game.nextPlayer(player);
  const newStatus = game.getStatus(boardAfter, nextPlayer);
  return {
    board: boardAfter,
    currentPlayer: newStatus ? match.currentPlayer : nextPlayer,
    status: newStatus,
    moveHistory: [
      ...match.moveHistory,
      {
        index: match.moveHistory.length,
        player,
        move,
        boardBefore,
        boardAfter,
        evalScore: evalResult.score,
        breakdown: evalResult.breakdown,
        formattedMove: game.formatMove(move),
        searchNodes: searchStats?.nodes ?? null,
        searchMs: searchStats?.elapsedMs ?? null,
        searchRunId: searchStats?.runId ?? null,
      },
    ],
  };
}

export default function PlayView({ game, humanSide, aiDepth, onExit, onRestart, onChangeSettings, onFinished }) {
  const [match, dispatch] = useReducer(matchReducer, game, initMatch);
  const { board, currentPlayer, moveHistory, status } = match;
  const [lastAiStats, setLastAiStats] = useState(null);

  // Search-tree visualization state. It is only ever written from the
  // results of real searches and is never read by the engine.
  const [traces, setTraces] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [recording, setRecording] = useState(true);
  const recordingRef = useRef(recording);
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);
  const runCounterRef = useRef(0);

  const aiSide = humanSide === game.sides.first ? game.sides.second : game.sides.first;
  const isThinking = !status && currentPlayer === aiSide;

  // AI turn effect
  useEffect(() => {
    if (status) return;
    if (currentPlayer !== aiSide) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const tracer = recordingRef.current ? createSearchTrace() : undefined;
      const result = findBestMove(game.adapter, board, aiSide, aiDepth, tracer);
      if (cancelled || !result) return;
      let runId = null;
      if (tracer) {
        runId = ++runCounterRef.current;
        const record = {
          runId,
          ply: moveHistory.length,
          player: aiSide,
          depth: aiDepth,
          moveFormatted: game.formatMove(result.move),
          value: result.value,
          nodes: result.nodes,
          prunes: result.prunes,
          elapsedMs: result.elapsedMs,
          trace: tracer.result(),
        };
        setTraces((prev) => [...prev, record].slice(-MAX_STORED_TRACES));
        setSelectedRunId(runId);
      }
      setLastAiStats({ nodes: result.nodes, prunes: result.prunes, ms: result.elapsedMs });
      dispatch({ type: 'move', game, move: result.move, player: aiSide, searchStats: { ...result, runId } });
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
    dispatch({ type: 'move', game, move, player: humanSide, searchStats: null });
  }

  const winnerLabel = status ? (status.winner === 'draw' ? 'Draw' : `${game.sideLabel[status.winner]} wins`) : null;
  const humanWon = status && status.winner === humanSide;
  const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].move : null;
  const boardDisabled = status !== null || currentPlayer !== humanSide || isThinking;
  const storedRunIds = new Set(traces.map((t) => t.runId));

  return (
    <div className="min-h-screen">
      <AppHeader
        onHome={onExit}
        crumbs={[game.name, 'Match']}
        right={
          <>
            <button className="btn btn-ghost btn-sm" onClick={onChangeSettings} title="Change side or difficulty">
              <Settings2 size={14} /> <span className="hidden sm:inline">Settings</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onRestart} title="Start a fresh game with the same settings">
              <RotateCcw size={14} /> <span className="hidden sm:inline">Restart</span>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onExit}>
              <ArrowLeft size={14} /> <span className="hidden sm:inline">Exit</span>
            </button>
          </>
        }
      />

      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        {/* Left: game */}
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip"><User size={12} /> You <SideDot color={game.sideColor[humanSide]} size={8} /> {game.sideLabel[humanSide]}</span>
            <span className="chip"><Bot size={12} /> Bot <SideDot color={game.sideColor[aiSide]} size={8} /> {game.sideLabel[aiSide]}</span>
            <span className="chip font-mono-data"><Cpu size={12} /> depth {aiDepth}</span>
          </div>

          {/* Status banner */}
          <div
            className="flex min-h-12 items-center gap-3 rounded-xl border px-4 py-2.5"
            role="status"
            aria-live="polite"
            style={{
              borderColor: status ? 'rgba(245,166,35,0.45)' : 'var(--hairline)',
              background: status ? 'var(--signal-soft)' : 'var(--panel)',
            }}
          >
            {status ? (
              <>
                <Trophy size={18} style={{ color: 'var(--signal)' }} />
                <div className="flex-1">
                  <div className="font-bold" style={{ color: 'var(--signal)' }}>{winnerLabel}</div>
                  <div className="text-xs" style={{ color: 'var(--dim)' }}>
                    {status.winner === 'draw' ? 'Nobody wins this one.' : humanWon ? 'You beat the bot!' : 'The bot wins this game.'}{' '}
                    {status.reason && status.reason !== 'draw' && `(${status.reason.replace(/-/g, ' ')})`}
                  </div>
                </div>
              </>
            ) : isThinking ? (
              <>
                <span style={{ color: game.sideColor[aiSide] === '#1f2937' ? 'var(--dim)' : game.sideColor[aiSide] }}><ThinkingDots /></span>
                <span className="text-sm">
                  <b>{game.sideLabel[aiSide]}</b> <span style={{ color: 'var(--dim)' }}>(bot) is searching to depth {aiDepth}…</span>
                </span>
              </>
            ) : (
              <>
                <SideDot color={game.sideColor[currentPlayer]} size={12} />
                <span className="text-sm">
                  <b>Your turn</b>{' '}
                  <span style={{ color: 'var(--dim)' }}>
                    · {game.id === 'checkers' ? 'select a highlighted piece, then a destination' : 'pick an empty cell'}
                  </span>
                </span>
              </>
            )}
          </div>

          {/* Board + eval */}
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            {game.id === 'tictactoe' ? (
              <TicTacToeBoard
                board={board}
                onCellClick={handleHumanMove}
                disabled={boardDisabled}
                winLine={status?.line}
                sideColor={game.sideColor}
                lastMove={lastMove}
                ghostMark={humanSide}
              />
            ) : (
              <CheckersBoard
                board={board}
                legalMoves={legalMovesForHuman}
                onMove={handleHumanMove}
                disabled={boardDisabled}
                sideColor={game.sideColor}
                lastMove={lastMove}
              />
            )}
            <EvalBar score={liveEval.score} game={game} terminal={status?.winner ?? liveEval.terminal} height={game.id === 'checkers' ? 340 : 300} />
          </div>

          {status && (
            <div className="animate-fade-up flex flex-wrap justify-center gap-2">
              <button onClick={() => onFinished(moveHistory, board)} className="btn btn-primary">
                <BarChart3 size={16} /> Post-match analysis
              </button>
              <button onClick={onRestart} className="btn btn-secondary">
                <RotateCcw size={15} /> Play again
              </button>
            </div>
          )}

          {lastAiStats && (
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Last search nodes" value={lastAiStats.nodes.toLocaleString()} />
              <Stat label="Cutoffs" value={lastAiStats.prunes.toLocaleString()} />
              <Stat label="Time" value={`${lastAiStats.ms.toFixed(0)} ms`} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <TelemetryPanel game={game} breakdown={liveEval.breakdown} currentPlayer={status ? null : currentPlayer} />
            <MoveLog
              game={game}
              moveHistory={moveHistory}
              storedRunIds={storedRunIds}
              selectedRunId={selectedRunId}
              onShowTree={setSelectedRunId}
            />
          </div>
        </div>

        {/* Right: search tree */}
        {/* xl:z-40 keeps this sticky stacking context above the z-30 header, so full screen covers it. */}
        <div className="min-w-0 xl:sticky xl:top-[4.75rem] xl:z-40 xl:self-start">
          <SearchTreePanel
            game={game}
            traces={traces}
            selectedRunId={selectedRunId}
            onSelectRun={setSelectedRunId}
            isSearching={isThinking}
            searchingInfo={{ player: aiSide, depth: aiDepth }}
            recording={recording}
            onToggleRecording={() => setRecording((r) => !r)}
            onClear={() => {
              setTraces([]);
              setSelectedRunId(null);
            }}
          />
        </div>
      </main>
    </div>
  );
}

function MoveLog({ game, moveHistory, storedRunIds, selectedRunId, onShowTree }) {
  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [moveHistory.length]);

  return (
    <Card title="Move log" icon={History} actions={<span className="chip font-mono-data">{moveHistory.length} plies</span>}>
      <div ref={listRef} className="max-h-64 overflow-y-auto px-2 py-2">
        {moveHistory.length === 0 && (
          <div className="px-2 py-3 text-sm" style={{ color: 'var(--dim)' }}>No moves yet.</div>
        )}
        {moveHistory.map((entry) => {
          const hasTree = entry.searchRunId !== null && storedRunIds.has(entry.searchRunId);
          const active = hasTree && entry.searchRunId === selectedRunId;
          return (
            <div
              key={entry.index}
              className="font-mono-data flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
              style={{ background: active ? 'var(--panel-raised)' : undefined }}
            >
              <span className="w-6 text-right" style={{ color: 'var(--faint)' }}>{entry.index + 1}.</span>
              <SideDot color={game.sideColor[entry.player]} size={8} />
              <span className="flex-1">{entry.formattedMove}</span>
              {entry.searchNodes !== null && (
                <span className="hidden sm:inline" style={{ color: 'var(--faint)' }}>{entry.searchNodes.toLocaleString()} n</span>
              )}
              <span className="w-12 text-right" style={{ color: 'var(--dim)' }}>{entry.evalScore > 0 ? '+' : ''}{entry.evalScore}</span>
              <button
                className="icon-btn"
                style={{ width: 24, height: 24, visibility: hasTree ? 'visible' : 'hidden', color: active ? 'var(--signal)' : undefined }}
                onClick={() => onShowTree(entry.searchRunId)}
                aria-label={`Show search tree for move ${entry.index + 1}`}
                title="Show this move's search tree"
              >
                <GitBranch size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
