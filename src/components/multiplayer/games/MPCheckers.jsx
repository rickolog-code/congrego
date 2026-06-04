function initCheckers() {
  const b = Array(8).fill(null).map(() => Array(8).fill(null));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r+c)%2===1) b[r][c]='b';
  for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r+c)%2===1) b[r][c]='w';
  return b;
}

function getJumps(board, r, c, piece) {
  const col = piece[0], king = piece.length > 1;
  const dirs = col==='w' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
  if (king) dirs.push(...(col==='w' ? [[1,-1],[1,1]] : [[-1,-1],[-1,1]]));
  const jumps = [];
  dirs.forEach(([dr,dc]) => {
    const mr=r+dr, mc=c+dc, lr=r+2*dr, lc=c+2*dc;
    if (lr>=0&&lr<8&&lc>=0&&lc<8&&!board[lr][lc]&&board[mr]?.[mc]&&board[mr][mc][0]!==col) {
      jumps.push({to:[lr,lc],over:[mr,mc]});
    }
  });
  return jumps;
}

function getMoves(board, r, c, piece) {
  const col = piece[0], king = piece.length > 1;
  const dirs = col==='w' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
  if (king) dirs.push(...(col==='w' ? [[1,-1],[1,1]] : [[-1,-1],[-1,1]]));
  const moves = [];
  dirs.forEach(([dr,dc]) => {
    const nr=r+dr, nc=c+dc;
    if (nr>=0&&nr<8&&nc>=0&&nc<8&&!board[nr][nc]) moves.push({to:[nr,nc]});
  });
  return moves;
}

export default function MPCheckers({ gameState, players, myIndex, isMyTurn, onUpdateState }) {
  const board = gameState.board || initCheckers();
  const selected = gameState.selected || null;
  const myColor = myIndex === 0 ? 'w' : 'b';

  const allMoves = selected
    ? [...getJumps(board, selected[0], selected[1], board[selected[0]][selected[1]]),
       ...getMoves(board, selected[0], selected[1], board[selected[0]][selected[1]])]
    : [];

  const handleClick = (r, c) => {
    if (!isMyTurn) return;
    if (selected) {
      const move = allMoves.find(m => m.to[0]===r && m.to[1]===c);
      if (move) {
        const nb = board.map(row => [...row]);
        nb[r][c] = nb[selected[0]][selected[1]];
        nb[selected[0]][selected[1]] = null;
        if (move.over) nb[move.over[0]][move.over[1]] = null;
        // King promotion
        if (r===0&&nb[r][c]==='w') nb[r][c]='wK';
        if (r===7&&nb[r][c]==='b') nb[r][c]='bK';
        // Check win
        const oppColor = myColor==='w'?'b':'w';
        const oppLeft = nb.flat().filter(x=>x&&x[0]===oppColor).length;
        const next = players[myIndex===0?1:0];
        onUpdateState(
          { board: nb, selected: null },
          oppLeft===0 ? players[myIndex].email : next.email,
          oppLeft===0 ? players[myIndex] : null
        );
        return;
      }
      if (board[r][c]?.[0]===myColor) {
        onUpdateState({ board, selected: [r,c] }, players[myIndex].email, null);
      } else {
        onUpdateState({ board, selected: null }, players[myIndex].email, null);
      }
      return;
    }
    if (board[r][c]?.[0]===myColor) {
      onUpdateState({ board, selected: [r,c] }, players[myIndex].email, null);
    }
  };

  const PIECE_DISPLAY = { w:'🟡', wK:'👑', b:'🟤', bK:'🎖️' };

  return (
    <div className="flex flex-col items-center gap-3">
      {isMyTurn ? <p className="text-xs font-bold text-primary">Your turn! ({myColor==='w'?'🟡':'🟤'})</p>
        : <p className="text-xs text-muted-foreground animate-pulse">Waiting for opponent…</p>}
      <div className="grid grid-cols-8 border-2 border-border rounded-xl overflow-hidden">
        {board.map((row, r) => row.map((cell, c) => {
          const dark = (r+c)%2===1;
          const isSel = selected&&selected[0]===r&&selected[1]===c;
          const isValid = allMoves.some(m=>m.to[0]===r&&m.to[1]===c);
          return (
            <div key={r+','+c} onClick={()=>handleClick(r,c)}
              style={{width:'clamp(32px,10vw,44px)',height:'clamp(32px,10vw,44px)'}}
              className={`flex items-center justify-center text-lg cursor-pointer transition-colors
                ${dark?'bg-amber-800':'bg-amber-100'}
                ${isSel?'ring-2 ring-inset ring-yellow-400':''}
                ${isValid?'ring-2 ring-inset ring-primary':''}
              `}>
              {cell ? PIECE_DISPLAY[cell] || cell : ''}
            </div>
          );
        }))}
      </div>
    </div>
  );
}