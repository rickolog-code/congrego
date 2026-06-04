import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Piece unicode
const PIECES = {
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟',
};

function initBoard() {
  const b = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRow = ['R','N','B','Q','K','B','N','R'];
  backRow.forEach((p,i) => { b[0][i] = 'b'+p; b[7][i] = 'w'+p; });
  for (let i=0;i<8;i++) { b[1][i]='bP'; b[6][i]='wP'; }
  return b;
}

function initBoardFlipped() {
  // Player is black: board flipped, player controls black pieces at bottom
  const b = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRow = ['R','N','B','K','Q','B','N','R'];
  backRow.forEach((p,i) => { b[0][i] = 'w'+p; b[7][i] = 'b'+p; });
  for (let i=0;i<8;i++) { b[1][i]='wP'; b[6][i]='bP'; }
  return b;
}

function inBounds(r,c) { return r>=0&&r<8&&c>=0&&c<8; }
function color(p) { return p?p[0]:null; }

function getMoves(board, r, c) {
  const p = board[r][c];
  if (!p) return [];
  const col = p[0], type = p[1];
  const moves = [];
  const add = (nr, nc) => {
    if (!inBounds(nr,nc)) return false;
    if (color(board[nr][nc]) === col) return false;
    moves.push([nr,nc]);
    return !board[nr][nc];
  };
  const slide = (dr, dc) => { let nr=r+dr, nc=c+dc; while(inBounds(nr,nc)&&color(board[nr][nc])!==col){moves.push([nr,nc]);if(board[nr][nc])break;nr+=dr;nc+=dc;} };
  if (type==='P') {
    const dir = col==='w'?-1:1;
    if (inBounds(r+dir,c)&&!board[r+dir][c]) { moves.push([r+dir,c]); const start=col==='w'?6:1; if(r===start&&!board[r+2*dir][c]) moves.push([r+2*dir,c]); }
    [-1,1].forEach(dc => { if(inBounds(r+dir,c+dc)&&board[r+dir][c+dc]&&color(board[r+dir][c+dc])!==col) moves.push([r+dir,c+dc]); });
  } else if (type==='N') {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
  } else if (type==='B') { [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc)); }
  else if (type==='R') { [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc)); }
  else if (type==='Q') { [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc)); }
  else if (type==='K') { [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>add(r+dr,c+dc)); }
  return moves;
}

function aiMove(board, aiColor) {
  const moves = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    if (color(board[r][c])===aiColor) getMoves(board,r,c).forEach(([nr,nc]) => moves.push({r,c,nr,nc}));
  }
  if (!moves.length) return null;
  const captures = moves.filter(m => board[m.nr][m.nc]);
  return captures.length ? captures[Math.floor(Math.random()*captures.length)] : moves[Math.floor(Math.random()*moves.length)];
}

export default function ChessGame() {
  const [playerColor, setPlayerColor] = useState(null); // null = picking
  const [board, setBoard] = useState(null);
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [turn, setTurn] = useState(null);
  const [status, setStatus] = useState('');

  const aiColor = playerColor === 'w' ? 'b' : 'w';

  const startGame = (color) => {
    setPlayerColor(color);
    setBoard(color === 'w' ? initBoard() : initBoardFlipped());
    setTurn('w');
    setStatus('');
    setSelected(null);
    setValidMoves([]);
    // If player chose black, AI (white) goes first
    if (color === 'b') {
      const b = initBoardFlipped();
      setTimeout(() => {
        const m = aiMove(b, 'w');
        if (m) {
          const nb = applyMove(b, m.r, m.c, m.nr, m.nc);
          setBoard(nb);
          setTurn('b');
        }
      }, 400);
    }
  };

  const applyMove = (b, r, c, nr, nc) => {
    const nb = b.map(row => [...row]);
    nb[nr][nc] = nb[r][c];
    nb[r][c] = null;
    if (nb[nr][nc]==='wP'&&nr===0) nb[nr][nc]='wQ';
    if (nb[nr][nc]==='bP'&&nr===7) nb[nr][nc]='bQ';
    return nb;
  };

  const checkWin = (b, col) => {
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) if(b[r][c]===col+'K') return false;
    return true;
  };

  const handleClick = (r, c) => {
    if (!board || turn !== playerColor || status) return;
    if (selected) {
      const move = validMoves.find(([nr,nc])=>nr===r&&nc===c);
      if (move) {
        const nb = applyMove(board, selected[0], selected[1], r, c);
        setBoard(nb);
        setSelected(null); setValidMoves([]);
        if (checkWin(nb, aiColor)) { setStatus('🎉 You win!'); return; }
        setTurn(aiColor);
        setTimeout(() => {
          const m = aiMove(nb, aiColor);
          if (m) {
            const nb2 = applyMove(nb, m.r, m.c, m.nr, m.nc);
            setBoard(nb2);
            if (checkWin(nb2, playerColor)) { setStatus('🤖 Monkey wins!'); } else { setTurn(playerColor); }
          }
        }, 400);
        return;
      }
      setSelected(null); setValidMoves([]);
    }
    if (color(board[r][c])===playerColor) {
      setSelected([r,c]);
      setValidMoves(getMoves(board,r,c));
    }
  };

  const reset = () => { setPlayerColor(null); setBoard(null); setSelected(null); setValidMoves([]); setTurn(null); setStatus(''); };

  // Color picker screen
  if (!playerColor) {
    return (
      <div className="flex flex-col items-center gap-6 py-6">
        <p className="text-base font-bold text-foreground">Choose your pieces</p>
        <div className="flex gap-6">
          <button
            onClick={() => startGame('w')}
            className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors active:scale-95"
          >
            <span className="text-5xl">♔</span>
            <span className="text-sm font-bold text-amber-900">White</span>
            <span className="text-xs text-amber-600">You go first</span>
          </button>
          <button
            onClick={() => startGame('b')}
            className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl border-2 border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors active:scale-95"
          >
            <span className="text-5xl">♚</span>
            <span className="text-sm font-bold text-slate-100">Black</span>
            <span className="text-xs text-slate-400">Monkey goes first</span>
          </button>
        </div>
      </div>
    );
  }

  const turnLabel = turn === playerColor
    ? `Your turn (${playerColor === 'w' ? 'white' : 'black'})`
    : 'Monkey thinking…';

  // Compute cell size to nearly fill the dialog width
  // Dialog is max-w-[95vw], board = 8 cols, we want ~min(calc(95vw-32px)/8, 56px)
  const cellSize = 'clamp(36px, calc((min(95vw, 520px) - 32px) / 8), 60px)';

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-xs text-muted-foreground">{status || turnLabel}</p>
      <div
        className="grid grid-cols-8 border-2 border-border rounded-xl overflow-hidden w-full"
        style={{ maxWidth: '100%' }}
      >
        {board && board.map((row, r) => row.map((piece, c) => {
          const light = (r+c)%2===0;
          const isSel = selected&&selected[0]===r&&selected[1]===c;
          const isValid = validMoves.some(([nr,nc])=>nr===r&&nc===c);
          return (
            <div
              key={r+','+c}
              onClick={()=>handleClick(r,c)}
              style={{ width: cellSize, height: cellSize, fontSize: 'clamp(18px, 3.5vw, 32px)' }}
              className={`flex items-center justify-center cursor-pointer select-none transition-colors
                ${light?'bg-amber-100':'bg-amber-800'}
                ${isSel?'ring-2 ring-inset ring-yellow-400':''}
                ${isValid?'ring-2 ring-inset ring-primary/80':''}
              `}
            >
              {piece ? PIECES[piece] : (isValid ? <span className="w-3 h-3 rounded-full bg-primary/40 block" /> : '')}
            </div>
          );
        }))}
      </div>
      <button onClick={reset} className="text-xs text-muted-foreground underline mt-1">Change color / restart</button>
      {status && <Button onClick={reset} className="rounded-2xl mt-1">Play Again</Button>}
    </div>
  );
}