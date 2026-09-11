// ============================================================================
// Checkers : NOVEL Heuristic Evaluation Function
// ============================================================================
// This intentionally avoids naive material counting (men=1, kings=2, sum up)
// as the primary signal. Instead it models two independent, non-traditional
// dimensions and combines them:
//
// -------------------------------------------------------------------------
// TERM 1 — Voronoi Control / Space Dominance (VC)
// -------------------------------------------------------------------------
//   Every dark square on the board is treated as contested territory. For
//   each square s, and for each piece p, we compute an "effective reach
//   distance":
//
//     d_eff(p, s) = chebyshev(p, s) * penalty(p, s)
//
//   where chebyshev(p,s) = max(|Δrow|, |Δcol|) is the diagonal step-distance,
//   and penalty(p,s) = 1.0 if p is a King, or if p is a Man and s lies in
//   p's forward half-plane; otherwise penalty = 2.5 (a Man is much "further"
//   in effective reach from squares behind it, since it cannot legally move
//   backward until it kings).
//
//   Each square is assigned to whichever side has the lower minimum
//   d_eff across all of its pieces (a discrete Voronoi diagram over the
//   board using an asymmetric, direction-aware distance metric — this is
//   the "novel" part: standard Voronoi board-control heuristics use plain
//   Chebyshev/Manhattan distance and ignore move-direction asymmetry).
//   Ties split 0.5 / 0.5.
//
//   VC(side) = Σ_{squares assigned to side} 1   (territory count)
//
// -------------------------------------------------------------------------
// TERM 2 — Structural Rigidity & Vulnerability (SR)
// -------------------------------------------------------------------------
//   Four sub-components, computed per side:
//     a) Phalanx Support: count of pieces with >= 1 friendly piece on an
//        immediately adjacent diagonal square (defensive clustering).
//     b) Backline Cohesion: fraction of the home row still occupied by the
//        owner (an intact backline resists enemy kinging).
//     c) Vulnerability: count of pieces currently hanging — an enemy piece
//        is diagonally adjacent in a legal capture direction AND the landing
//        square beyond is empty (capturable next ply).
//     d) Double-Jump Exposure: count of this side's pieces that sit inside
//        an opponent multi-capture chain of length >= 2 that is available
//        right now (a much harsher penalty than a single hanging piece).
//
//   SR(side) = wPhalanx*Phalanx + wBackline*4*BacklineFraction
//              - wVuln*Vulnerability - wDoubleJump*DoubleJumpExposure
//
// -------------------------------------------------------------------------
// FINAL SCORE
// -------------------------------------------------------------------------
//   raw(B vs W) = W_VC * (VC(B) - VC(W)) + W_SR * (SR(B) - SR(W))
//   (positive favors Black, negative favors White)
//
//   Note: material is NOT counted directly. Kings naturally score higher
//   because they dominate far more Voronoi territory (penalty=1 in every
//   direction) and are much harder to render "vulnerable" — the incentive
//   to king pieces emerges from the model rather than being hard-coded.
// ============================================================================

import { SIZE, isDark, inBounds, pieceOwner, isKing, opponentOf, getLegalMoves } from './board.js';

const W_VC = 1.0;
const W_SR = 1.4;

const W_PHALANX = 1.0;
const W_BACKLINE = 1.5;
const W_VULN = 2.0;
const W_DOUBLE_JUMP = 3.5;

const BACK_PENALTY = 2.5; // effective-distance multiplier for squares "behind" a man

function forwardSign(player) {
  return player === 'B' ? 1 : -1; // Black moves +row, White moves -row
}

function allDarkSquares() {
  const squares = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (isDark(row, col)) squares.push({ row, col });
    }
  }
  return squares;
}

function allPieces(board) {
  const pieces = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const piece = board[row][col];
      if (piece) pieces.push({ row, col, piece, owner: pieceOwner(piece), king: isKing(piece) });
    }
  }
  return pieces;
}

function effectiveDistance(p, square) {
  const dRow = square.row - p.row;
  const dCol = square.col - p.col;
  const cheb = Math.max(Math.abs(dRow), Math.abs(dCol)) || 0.0001;
  if (p.king) return cheb;
  const sign = forwardSign(p.owner);
  const isForward = dRow * sign >= 0;
  return cheb * (isForward ? 1 : BACK_PENALTY);
}

function voronoiControl(board) {
  const pieces = allPieces(board);
  const bPieces = pieces.filter((p) => p.owner === 'B');
  const wPieces = pieces.filter((p) => p.owner === 'W');
  const squares = allDarkSquares();

  let bTerritory = 0;
  let wTerritory = 0;
  const map = {}; // for telemetry visualization if needed

  for (const sq of squares) {
    const bMin = bPieces.length ? Math.min(...bPieces.map((p) => effectiveDistance(p, sq))) : Infinity;
    const wMin = wPieces.length ? Math.min(...wPieces.map((p) => effectiveDistance(p, sq))) : Infinity;
    const key = `${sq.row},${sq.col}`;
    if (bMin < wMin) { bTerritory += 1; map[key] = 'B'; }
    else if (wMin < bMin) { wTerritory += 1; map[key] = 'W'; }
    else { bTerritory += 0.5; wTerritory += 0.5; map[key] = 'tie'; }
  }

  return { bTerritory, wTerritory, map };
}

function hasFriendlyDiagonalNeighbor(board, row, col, owner) {
  const deltas = [[1, -1], [1, 1], [-1, -1], [-1, 1]];
  for (const [dr, dc] of deltas) {
    const r = row + dr, c = col + dc;
    if (!inBounds(r, c)) continue;
    const piece = board[r][c];
    if (piece && pieceOwner(piece) === owner) return true;
  }
  return false;
}

function isVulnerable(board, row, col, owner) {
  const enemy = opponentOf(owner);
  const deltas = [[1, -1], [1, 1], [-1, -1], [-1, 1]];
  for (const [dr, dc] of deltas) {
    const enemyRow = row - dr, enemyCol = col - dc; // enemy would jump FROM here OVER (row,col)
    const landRow = row + dr, landCol = col + dc;
    if (!inBounds(enemyRow, enemyCol) || !inBounds(landRow, landCol)) continue;
    const enemyPiece = board[enemyRow][enemyCol];
    if (!enemyPiece || pieceOwner(enemyPiece) !== enemy) continue;
    if (board[landRow][landCol] !== null) continue;
    // Direction check: men can only capture forward; kings any direction.
    if (!isKing(enemyPiece)) {
      const sign = forwardSign(enemy);
      const jumpDir = row - enemyRow; // sign of the row-step the enemy takes
      if (Math.sign(jumpDir) !== sign) continue;
    }
    return true;
  }
  return false;
}

function backlineFraction(board, owner) {
  const homeRow = owner === 'B' ? 0 : SIZE - 1;
  let occupied = 0;
  let total = 0;
  for (let col = 0; col < SIZE; col++) {
    if (!isDark(homeRow, col)) continue;
    total += 1;
    const piece = board[homeRow][col];
    if (piece && pieceOwner(piece) === owner) occupied += 1;
  }
  return total > 0 ? occupied / total : 0;
}

function doubleJumpExposure(board, owner) {
  const enemy = opponentOf(owner);
  const enemyMoves = getLegalMoves(board, enemy);
  let exposedSquares = new Set();
  for (const move of enemyMoves) {
    if (move.captures.length >= 2) {
      for (const cap of move.captures) exposedSquares.add(`${cap.row},${cap.col}`);
    }
  }
  return exposedSquares.size;
}

function structuralScore(board, owner) {
  const pieces = allPieces(board).filter((p) => p.owner === owner);
  let phalanx = 0;
  let vulnerable = 0;
  for (const p of pieces) {
    if (hasFriendlyDiagonalNeighbor(board, p.row, p.col, owner)) phalanx += 1;
    if (isVulnerable(board, p.row, p.col, owner)) vulnerable += 1;
  }
  const backline = backlineFraction(board, owner);
  const doubleJump = doubleJumpExposure(board, owner);

  const total =
    W_PHALANX * phalanx + W_BACKLINE * 4 * backline - W_VULN * vulnerable - W_DOUBLE_JUMP * doubleJump;

  return { total, phalanx, backline, vulnerable, doubleJump };
}

const CHECKERS_SCALE = 18; // tuned so a ~2-piece / territory swing moves the bar meaningfully
export function normalize(rawDiff) {
  return Math.round(100 * Math.tanh(rawDiff / CHECKERS_SCALE));
}

// Main entry point. `board` is the 8x8 grid. Returns:
//   { score in [-100,100] (positive favors Black), raw, breakdown }
export function evaluateCheckers(board) {
  const vc = voronoiControl(board);
  const srB = structuralScore(board, 'B');
  const srW = structuralScore(board, 'W');

  const vcDiff = vc.bTerritory - vc.wTerritory;
  const srDiff = srB.total - srW.total;
  const raw = W_VC * vcDiff + W_SR * srDiff;
  const score = normalize(raw);

  return {
    score,
    raw,
    terminal: null,
    breakdown: {
      B: {
        voronoiTerritory: vc.bTerritory,
        phalanxSupport: srB.phalanx,
        backlineCohesion: srB.backline,
        vulnerablePieces: srB.vulnerable,
        doubleJumpExposure: srB.doubleJump,
        structuralTotal: srB.total,
      },
      W: {
        voronoiTerritory: vc.wTerritory,
        phalanxSupport: srW.phalanx,
        backlineCohesion: srW.backline,
        vulnerablePieces: srW.vulnerable,
        doubleJumpExposure: srW.doubleJump,
        structuralTotal: srW.total,
      },
      weights: { W_VC, W_SR, W_PHALANX, W_BACKLINE, W_VULN, W_DOUBLE_JUMP },
    },
  };
}