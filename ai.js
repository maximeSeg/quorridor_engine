/**
 * IA Quoridor — Minimax avec alpha-beta pruning
 * Profondeur configurable, tri des coups, élagage agressif
 */

import { evaluate, allLegalMoves, applyMove, bfsDistance } from './engine.js';

const N = 9;

/* ─── Move ordering heuristic ─── */
function scoreMoveForOrdering(state, move) {
  const p = state.turn;
  if (move.type === 'pawn') {
    const goalRow = p === 0 ? 0 : 8;
    const before = bfsDistance(state.fences, state.pawns[p].r, state.pawns[p].c, goalRow);
    const after = p === 0 ? Math.abs(move.r - 0) : Math.abs(move.r - 8);
    return before - after; // positive = getting closer
  } else {
    // Fences that lengthen opponent's path score higher
    const opp = 1 - p;
    const oppGoal = opp === 0 ? 0 : 8;
    const before = bfsDistance(state.fences, state.pawns[opp].r, state.pawns[opp].c, oppGoal);
    const testFences = [...state.fences, { r: move.r, c: move.c, dir: move.dir }];
    const after = bfsDistance(testFences, state.pawns[opp].r, state.pawns[opp].c, oppGoal);
    return after - before; // positive = opponent longer path
  }
}

function orderMoves(state, moves) {
  return moves
    .map(m => ({ m, s: scoreMoveForOrdering(state, m) }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.m);
}

/* ─── Minimax ─── */
function minimax(state, depth, alpha, beta, maximizing, nodes) {
  nodes.count++;

  if (state.winner !== null || depth === 0) {
    return { score: evaluate(state), move: null };
  }

  let moves = allLegalMoves(state);
  if (moves.length === 0) return { score: evaluate(state), move: null };

  // Limit fence moves at shallow depths for speed
  if (depth <= 1) {
    const pawnMoves = moves.filter(m => m.type === 'pawn');
    const fenceMoves = moves.filter(m => m.type === 'fence').slice(0, 8);
    moves = [...pawnMoves, ...fenceMoves];
  } else {
    moves = orderMoves(state, moves).slice(0, 20);
  }

  let best = null;

  if (maximizing) {
    let bestScore = -Infinity;
    for (const move of moves) {
      const ns = applyMove(state, move);
      const { score } = minimax(ns, depth - 1, alpha, beta, false, nodes);
      if (score > bestScore) {
        bestScore = score;
        best = { score, move };
      }
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }
    return best || { score: -Infinity, move: moves[0] };
  } else {
    let bestScore = Infinity;
    for (const move of moves) {
      const ns = applyMove(state, move);
      const { score } = minimax(ns, depth - 1, alpha, beta, true, nodes);
      if (score < bestScore) {
        bestScore = score;
        best = { score, move };
      }
      beta = Math.min(beta, bestScore);
      if (beta <= alpha) break;
    }
    return best || { score: Infinity, move: moves[0] };
  }
}

/* ─── Public API ─── */

export function getBestMove(state, depth = 3) {
  const maximizing = state.turn === 0;
  const nodes = { count: 0 };
  const t0 = performance.now();
  const result = minimax(state, depth, -Infinity, Infinity, maximizing, nodes);
  const ms = performance.now() - t0;
  return {
    move: result.move,
    score: result.score,
    nodes: nodes.count,
    ms: Math.round(ms),
  };
}

/* ─── Puzzle detection ─── */

/**
 * Un état est "intéressant" pour un puzzle si :
 * - La partie n'est pas finie
 * - Il y a des barrières posées (situation non triviale)
 * - Il existe une différence notable entre le meilleur coup et le 2e meilleur
 * - La position est tendue (écart BFS faible)
 */
export function isPuzzleWorthy(state) {
  if (state.winner !== null) return false;
  if (state.fences.length < 3) return false;

  const { fences, pawns } = state;
  const d0 = bfsDistance(fences, pawns[0].r, pawns[0].c, 0);
  const d1 = bfsDistance(fences, pawns[1].r, pawns[1].c, 8);

  if (d0 === Infinity || d1 === Infinity) return false;

  const gap = Math.abs(d0 - d1);
  if (gap > 4) return false; // trop déséquilibré

  const moves = allLegalMoves(state);
  if (moves.length < 3) return false;

  // Évalue les 2 meilleurs coups
  const maximizing = state.turn === 0;
  const scored = moves.slice(0, 15).map(move => {
    const ns = applyMove(state, move);
    return { move, score: evaluate(ns) };
  });
  scored.sort((a, b) => maximizing ? b.score - a.score : a.score - b.score);

  if (scored.length < 2) return false;

  const delta = Math.abs(scored[0].score - scored[1].score);
  return delta >= 8; // différence significative entre meilleur et 2e coup
}

export function buildPuzzle(state) {
  const result = getBestMove(state, 3);
  const { fences, pawns } = state;
  const d0 = bfsDistance(fences, pawns[0].r, pawns[0].c, 0);
  const d1 = bfsDistance(fences, pawns[1].r, pawns[1].c, 8);

  let difficulty = 'medium';
  if (state.fences.length >= 8 && Math.abs(d0 - d1) <= 1) difficulty = 'hard';
  if (state.fences.length <= 4) difficulty = 'easy';

  return {
    id: Date.now() + Math.random().toString(36).slice(2, 6),
    state: {
      pawns: state.pawns.map(p => ({ ...p })),
      fences: state.fences.map(f => ({ ...f })),
      fences_left: [...state.fences_left],
      turn: state.turn,
      winner: null,
      ply: state.ply,
    },
    bestMove: result.move,
    score: result.score,
    difficulty,
    d0,
    d1,
    ply: state.ply,
    createdAt: Date.now(),
  };
}
