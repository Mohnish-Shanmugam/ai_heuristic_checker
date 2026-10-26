import { findBestMove } from '../engine/minimax.js';
export function analyzeMatch(gameEngine, history) {
 const reports = [];
 for (let i = 0; i < history.length; i++) {
 const entry = history[i];
 const { state, movePlayed, activePlayer, isHuman } = entry;
 if (!isHuman || !movePlayed) continue;
 const engineResult = findBestMove(gameEngine, state, 3, activePlayer);
 const bestMove = engineResult.move;
 const bestEval = engineResult.score;
 const playedState = gameEngine.applyMove(state, movePlayed, activePlayer);
 const playedEval = gameEngine.evaluate(playedState, activePlayer);
 const delta = Math.abs(bestEval - playedEval);
 const isBlunder = delta > 25;
 reports.push({
 ply: i + 1,
 player: activePlayer,
 playedMove: movePlayed,
 bestMove,
 playedEval,
 bestEval,
 delta,
 isBlunder,
 explanation: isBlunder
 ? `Move dropped evaluation by ${delta.toFixed(1)} pts. Optimal line was better.`
 : 'Solid move matching engine expectations.',
 });
 }
 return reports;
}