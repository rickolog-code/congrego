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

function aiMove(board) {
  const moves = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    if (color(board[r][c])==='b') getMoves(board,r,c).forEach(([nr,nc]) => moves.push({r,c,nr,nc}));
  }
  if (!moves.length) return null;
  // Prefer captures
  const captures = moves.filter(m => board[m.nr][m.nc]);
  const pick = captures.length ? captures[Math.floor(Math.random()*captures.length)] : moves[Math.floor(Math.random()*moves.length)];
  return pick;
}

export default function ChessGame() {
  const [board, setBoard] = useState(initBoard());
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [turn, setTurn] = useState('w');
  const [status, setStatus] = useState('');

  const applyMove = (b, r, c, nr, nc) => {
    const nb = b.map(row => [...row]);
    nb[nr][nc] = nb[r][c];
    nb[r][c] = null;
    // Pawn promotion
    if (nb[nr][nc]==='wP'&&nr===0) nb[nr][nc]='wQ';
    if (nb[nr][nc]==='bP'&&nr===7) nb[nr][nc]='bQ';
    return nb;
  };

  const checkWin = (b, col) => {
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) if(b[r][c]===col+'K') return false;
    return true;
  };

  const handleClick = (r, c) => {
    if (turn !== 'w' || status) return;
    if (selected) {
      const move = validMoves.find(([nr,nc])=>nr===r&&nc===c);
      if (move) {
        const nb = applyMove(board, selected[0], selected[1], r, c);
        setBoard(nb);
        setSelected(null); setValidMoves([]);
        if (checkWin(nb,'b')) { setStatus('🎉 You win!'); setTurn('w'); return; }
        setTurn('b');
        // AI responds
        setTimeout(() => {
          const m = aiMove(nb);
          if (m) {
            const nb2 = applyMove(nb, m.r, m.c, m.nr, m.nc);
            setBoard(nb2);
            if (checkWin(nb2,'w')) { setStatus('🤖 Monkey wins!'); } else { setTurn('w'); }
          }
        }, 400);
        return;
      }
      setSelected(null); setValidMoves([]);
    }
    if (color(board[r][c])==='w') {
      setSelected([r,c]);
      setValidMoves(getMoves(board,r,c));
    }
  };

  const reset = () => { setBoard(initBoard()); setSelected(null); setValidMoves([]); setTurn('w'); setStatus(''); };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-muted-foreground">{status || (turn==='w'?'Your turn (white)':'Monkey thinking…')}</p>
      <div className="grid grid-cols-8 border border-border rounded-lg overflow-hidden" style={{width: 272}}>
        {board.map((row, r) => row.map((piece, c) => {
          const light = (r+c)%2===0;
          const isSel = selected&&selected[0]===r&&selected[1]===c;
          const isValid = validMoves.some(([nr,nc])=>nr===r&&nc===c);
          return (
            <div
              key={r+','+c}
              onClick={()=>handleClick(r,c)}
              className={`w-[34px] h-[34px] flex items-center justify-center cursor-pointer text-xl select-none transition-colors
                ${light?'bg-amber-100':'bg-amber-800'}
                ${isSel?'ring-2 ring-inset ring-yellow-400':''}
                ${isValid?'ring-2 ring-inset ring-primary':''}
              `}
            >
              {piece ? PIECES[piece] : ''}
            </div>
          );
        }))}
      </div>
      {status && <Button onClick={reset} className="rounded-2xl mt-1">Play Again</Button>}
    </div>
  );
}