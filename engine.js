/**
 * Quoridor Engine — règles complètes du jeu
 * Joueur 0 = rouge, commence row 8, gagne row 0
 * Joueur 1 = bleu,  commence row 0, gagne row 8
 */

const N = 9;

export function initState() {
  return {
    pawns: [{ r: 8, c: 4 }, { r: 0, c: 4 }],
    fences: [],         // [{r, c, dir:'h'|'v'}]
    fences_left: [10, 10],
    turn: 0,
    winner: null,
    ply: 0,
  };
}

export function cloneState(s) {
  return {
    pawns: s.pawns.map(p => ({ ...p })),
    fences: s.fences.map(f => ({ ...f })),
    fences_left: [...s.fences_left],
    turn: s.turn,
    winner: s.winner,
    ply: s.ply,
  };
}

/* ─── Fence collision helpers ─── */

/**
 * Is movement from (r1,c1) → (r2,c2) blocked by a fence?
 * Only cardinal moves (1 step) are checked here.
 */
export function isBlocked(fences, r1, c1, r2, c2) {
  const dr = r2 - r1, dc = c2 - c1;
  for (const f of fences) {
    if (dr === -1 && dc === 0) {
      if (f.dir === 'h' && f.r === r1 - 1 && (f.c === c1 || f.c === c1 - 1)) return true;
    } else if (dr === 1 && dc === 0) {
      if (f.dir === 'h' && f.r === r1 && (f.c === c1 || f.c === c1 - 1)) return true;
    } else if (dr === 0 && dc === -1) {
      if (f.dir === 'v' && f.c === c1 - 1 && (f.r === r1 || f.r === r1 - 1)) return true;
    } else if (dr === 0 && dc === 1) {
      if (f.dir === 'v' && f.c === c1 && (f.r === r1 || f.r === r1 - 1)) return true;
    }
  }
  return false;
}

/* ─── BFS shortest path ─── */

export function bfsDistance(fences, startR, startC, goalRow) {
  const dist = Array.from({ length: N }, () => Array(N).fill(-1));
  const q = [[startR, startC, 0]];
  dist[startR][startC] = 0;
  while (q.length) {
    const [r, c, d] = q.shift();
    if (r === goalRow) return d;
    for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]) {
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      if (dist[nr][nc] !== -1) continue;
      if (isBlocked(fences, r, c, nr, nc)) continue;
      dist[nr][nc] = d + 1;
      q.push([nr, nc, d + 1]);
    }
  }
  return Infinity; // unreachable
}

/* ─── Fence validation ─── */

function fenceOverlaps(fences, r, c, dir) {
  for (const f of fences) {
    if (dir === 'h') {
      if (f.dir === 'h' && f.r === r && Math.abs(f.c - c) <= 1) return true;
      if (f.dir === 'v' && f.r === r && f.c === c) return true;
    } else {
      if (f.dir === 'v' && f.c === c && Math.abs(f.r - r) <= 1) return true;
      if (f.dir === 'h' && f.r === r && f.c === c) return true;
    }
  }
  return false;
}

function wouldBlock(state, r, c, dir) {
  const testFences = [...state.fences, { r, c, dir }];
  for (const [pi, goalRow] of [[0, 0], [1, 8]]) {
    const { r: pr, c: pc } = state.pawns[pi];
    if (bfsDistance(testFences, pr, pc, goalRow) === Infinity) return true;
  }
  return false;
}

export function isFenceValid(state, r, c, dir) {
  if (r < 0 || r >= N - 1 || c < 0 || c >= N - 1) return false;
  if (state.fences_left[state.turn] <= 0) return false;
  if (fenceOverlaps(state.fences, r, c, dir)) return false;
  if (wouldBlock(state, r, c, dir)) return false;
  return true;
}

/* ─── Legal pawn moves (with jumps) ─── */

export function legalPawnMoves(state, player) {
  const { r, c } = state.pawns[player];
  const opp = state.pawns[1 - player];
  const moves = [];

  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
    if (isBlocked(state.fences, r, c, nr, nc)) continue;

    if (nr === opp.r && nc === opp.c) {
      // Jump over opponent
      const jr = nr + dr, jc = nc + dc;
      if (jr >= 0 && jr < N && jc >= 0 && jc < N && !isBlocked(state.fences, nr, nc, jr, jc)) {
        moves.push({ r: jr, c: jc });
      } else {
        // Diagonal jumps
        for (const [ddr, ddc] of dirs) {
          if (ddr === -dr && ddc === -dc) continue;
          if (ddr === dr && ddc === dc) continue;
          const sr = nr + ddr, sc = nc + ddc;
          if (sr >= 0 && sr < N && sc >= 0 && sc < N && !isBlocked(state.fences, nr, nc, sr, sc)) {
            moves.push({ r: sr, c: sc });
          }
        }
      }
    } else {
      moves.push({ r: nr, c: nc });
    }
  }
  return moves;
}

/* ─── Apply move ─── */

export function applyMove(state, move) {
  const s = cloneState(state);
  const p = s.turn;

  if (move.type === 'pawn') {
    s.pawns[p] = { r: move.r, c: move.c };
    if (p === 0 && move.r === 0) s.winner = 0;
    if (p === 1 && move.r === 8) s.winner = 1;
  } else {
    s.fences.push({ r: move.r, c: move.c, dir: move.dir });
    s.fences_left[p]--;
  }

  s.turn = 1 - p;
  s.ply++;
  return s;
}

/* ─── All legal moves ─── */

export function allLegalMoves(state) {
  const p = state.turn;
  const moves = [];

  for (const { r, c } of legalPawnMoves(state, p)) {
    moves.push({ type: 'pawn', r, c });
  }

  if (state.fences_left[p] > 0) {
    for (let r = 0; r < N - 1; r++) {
      for (let c = 0; c < N - 1; c++) {
        if (isFenceValid(state, r, c, 'h')) moves.push({ type: 'fence', r, c, dir: 'h' });
        if (isFenceValid(state, r, c, 'v')) moves.push({ type: 'fence', r, c, dir: 'v' });
      }
    }
  }

  return moves;
}

/* ─── Evaluation ─── */

export function evaluate(state) {
  if (state.winner === 0) return 10000;
  if (state.winner === 1) return -10000;

  const d0 = bfsDistance(state.fences, state.pawns[0].r, state.pawns[0].c, 0);
  const d1 = bfsDistance(state.fences, state.pawns[1].r, state.pawns[1].c, 8);

  if (d0 === Infinity) return -10000;
  if (d1 === Infinity) return 10000;

  // Positive = advantage rouge (player 0)
  return (d1 - d0) * 10 + (state.fences_left[0] - state.fences_left[1]);
}

export function moveLabel(move) {
  const cols = 'abcdefghi';
  if (move.type === 'pawn') return cols[move.c] + (9 - move.r);
  return cols[move.c] + (9 - move.r) + move.dir;
}
