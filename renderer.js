/**
 * Renderer — dessin du plateau Quoridor sur canvas
 */

const N = 9;

export class BoardRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = options.size || 400;
    this.highlightMoves = options.highlightMoves ?? true;
    canvas.width = this.size;
    canvas.height = this.size;
    this._computeGeometry();
  }

  _computeGeometry() {
    const s = this.size;
    this.pad = s * 0.04;
    this.inner = s - this.pad * 2;
    this.cell = this.inner / N;
    this.gap = this.cell * 0.12;
    this.cs = this.cell - this.gap;
  }

  _cellX(c) { return this.pad + c * this.cell; }
  _cellY(r) { return this.pad + r * this.cell; }
  _cellCX(c) { return this._cellX(c) + this.cs / 2; }
  _cellCY(r) { return this._cellY(r) + this.cs / 2; }

  hitTest(px, py) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.size / rect.width;
    const x = (px - rect.left) * scale;
    const y = (py - rect.top) * scale;
    const c = Math.floor((x - this.pad) / this.cell);
    const r = Math.floor((y - this.pad) / this.cell);
    return { r: Math.max(0, Math.min(N-1, r)), c: Math.max(0, Math.min(N-1, c)) };
  }

  draw(state, options = {}) {
    const { highlights = [], lastMove = null, showLastMove = true } = options;
    const ctx = this.ctx;
    const isDark = window.matchMedia('(prefers-color-scheme:dark)').matches;

    const palette = isDark ? {
      bg: '#141412',
      cell: '#1f1e1b',
      cellBorder: '#2e2d29',
      goalP0: 'rgba(226,75,74,0.12)',
      goalP1: 'rgba(55,138,221,0.12)',
      fence: '#d4a843',
      fenceGlow: 'rgba(212,168,67,0.4)',
      highlight: 'rgba(55,138,221,0.22)',
      lastCell: 'rgba(99,153,34,0.18)',
      text: '#555',
    } : {
      bg: '#f0ede6',
      cell: '#faf9f5',
      cellBorder: '#dedad2',
      goalP0: 'rgba(226,75,74,0.08)',
      goalP1: 'rgba(55,138,221,0.08)',
      fence: '#9a6f1e',
      fenceGlow: 'rgba(154,111,30,0.3)',
      highlight: 'rgba(55,138,221,0.18)',
      lastCell: 'rgba(99,153,34,0.15)',
      text: '#bbb',
    };

    // Board background
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, this.size, this.size);

    // Cells
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const x = this._cellX(c), y = this._cellY(r);
        ctx.fillStyle = r === 0 ? palette.goalP1 : r === 8 ? palette.goalP0 : palette.cell;
        this._roundRect(x, y, this.cs, this.cs, 3);
        ctx.fill();
        ctx.strokeStyle = palette.cellBorder;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // Highlight last move
    if (showLastMove && lastMove?.type === 'pawn') {
      const x = this._cellX(lastMove.c), y = this._cellY(lastMove.r);
      ctx.fillStyle = palette.lastCell;
      this._roundRect(x, y, this.cs, this.cs, 3);
      ctx.fill();
    }

    // Highlight legal moves
    if (highlights.length) {
      for (const { r, c } of highlights) {
        const x = this._cellX(c), y = this._cellY(r);
        ctx.fillStyle = palette.highlight;
        this._roundRect(x, y, this.cs, this.cs, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(55,138,221,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Fences
    for (const f of state.fences) {
      ctx.strokeStyle = palette.fence;
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';

      if (f.dir === 'h') {
        const x1 = this._cellX(f.c);
        const x2 = this._cellX(f.c + 2) - this.gap;
        const y = this._cellY(f.r + 1) - this.gap / 2;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      } else {
        const x = this._cellX(f.c + 1) - this.gap / 2;
        const y1 = this._cellY(f.r);
        const y2 = this._cellY(f.r + 2) - this.gap;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
      }
    }

    // Highlight best move fence (puzzle mode)
    if (options.hintFence) {
      const f = options.hintFence;
      ctx.strokeStyle = 'rgba(99,153,34,0.8)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.setLineDash([6, 4]);
      if (f.dir === 'h') {
        const x1 = this._cellX(f.c), x2 = this._cellX(f.c + 2) - this.gap;
        const y = this._cellY(f.r + 1) - this.gap / 2;
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      } else {
        const x = this._cellX(f.c + 1) - this.gap / 2;
        const y1 = this._cellY(f.r), y2 = this._cellY(f.r + 2) - this.gap;
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Pawns
    const pawnColors = [
      { fill: '#E24B4A', ring: 'rgba(226,75,74,0.3)', text: '#fff' },
      { fill: '#378ADD', ring: 'rgba(55,138,221,0.3)', text: '#fff' },
    ];

    for (let i = 0; i < 2; i++) {
      const { r, c } = state.pawns[i];
      const cx = this._cellCX(c), cy = this._cellCY(r);
      const rad = this.cs * 0.3;
      const col = pawnColors[i];

      // Glow ring
      ctx.beginPath();
      ctx.arc(cx, cy, rad + 4, 0, Math.PI * 2);
      ctx.fillStyle = col.ring;
      ctx.fill();

      // Pawn body
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = col.fill;
      ctx.fill();

      // Shine
      ctx.beginPath();
      ctx.arc(cx - rad * 0.2, cy - rad * 0.25, rad * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    }

    // Column labels (a–i)
    ctx.font = `10px monospace`;
    ctx.fillStyle = palette.text;
    ctx.textAlign = 'center';
    const cols = 'abcdefghi';
    for (let c = 0; c < N; c++) {
      ctx.fillText(cols[c], this._cellCX(c), this.size - 2);
    }
    ctx.textAlign = 'right';
    for (let r = 0; r < N; r++) {
      ctx.fillText(String(9 - r), this.pad - 3, this._cellCY(r) + 4);
    }

    // Winner overlay
    if (state.winner !== null) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, this.size, this.size);
      ctx.fillStyle = '#fff';
      ctx.font = '600 20px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(state.winner === 0 ? '🔴 Rouge gagne !' : '🔵 Bleu gagne !', this.size / 2, this.size / 2 - 8);
      ctx.font = '13px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`En ${state.ply} coups`, this.size / 2, this.size / 2 + 16);
      ctx.textAlign = 'left';
    }
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
