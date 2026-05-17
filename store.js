/**
 * Puzzle Store — gestion et persistance des puzzles
 * Stockage dans localStorage, export JSON
 */

const STORAGE_KEY = 'quoridor_puzzles_v1';
const MAX_PUZZLES = 200;

export class PuzzleStore {
  constructor() {
    this.puzzles = this._load();
    this.listeners = [];
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.puzzles));
    } catch (e) {
      console.warn('Storage full, trimming puzzles');
      this.puzzles = this.puzzles.slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.puzzles));
    }
    this.listeners.forEach(fn => fn(this.puzzles));
  }

  onChange(fn) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  add(puzzle) {
    // Avoid near-duplicates (same pawn positions + same fence count)
    const isDupe = this.puzzles.some(p =>
      p.state.pawns[0].r === puzzle.state.pawns[0].r &&
      p.state.pawns[0].c === puzzle.state.pawns[0].c &&
      p.state.pawns[1].r === puzzle.state.pawns[1].r &&
      p.state.pawns[1].c === puzzle.state.pawns[1].c &&
      p.state.fences.length === puzzle.state.fences.length
    );
    if (isDupe) return false;

    this.puzzles.unshift(puzzle);
    if (this.puzzles.length > MAX_PUZZLES) {
      this.puzzles = this.puzzles.slice(0, MAX_PUZZLES);
    }
    this._save();
    return true;
  }

  remove(id) {
    this.puzzles = this.puzzles.filter(p => p.id !== id);
    this._save();
  }

  get(id) {
    return this.puzzles.find(p => p.id === id) || null;
  }

  getAll() { return [...this.puzzles]; }

  getByDifficulty(diff) {
    return this.puzzles.filter(p => p.difficulty === diff);
  }

  markSolved(id, solved) {
    const p = this.puzzles.find(x => x.id === id);
    if (p) {
      p.solved = solved;
      p.solvedAt = Date.now();
      this._save();
    }
  }

  exportJSON() {
    return JSON.stringify(this.puzzles, null, 2);
  }

  importJSON(json) {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) throw new Error('Expected array');
      let added = 0;
      for (const p of data) {
        if (this.add(p)) added++;
      }
      return { ok: true, added };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  stats() {
    const total = this.puzzles.length;
    const solved = this.puzzles.filter(p => p.solved).length;
    const byDiff = { easy: 0, medium: 0, hard: 0 };
    for (const p of this.puzzles) byDiff[p.difficulty] = (byDiff[p.difficulty] || 0) + 1;
    return { total, solved, byDiff };
  }
}
