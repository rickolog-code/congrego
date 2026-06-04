const ROWS = 6, COLS = 7;
const TOKENS = ['🍌', '🥥'];
const COLORS = ['bg-yellow-400', 'bg-stone-600'];

function checkWin(board, token) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 3 < COLS && [0,1,2,3].every(i => board[r][c+i] === token)) return true;
      if (r + 3 < ROWS && [0,1,2,3].every(i => board[r+i][c] === token)) return true;
      if (r + 3 < ROWS && c + 3 < COLS && [0,1,2,3].every(i => board[r+i][c+i] === token)) return true;
      if (r + 3 < ROWS && c - 3 >= 0 && [0,1,2,3].every(i => board[r+i][c-i] === token)) return true;
    }
  }
  return false;
}

function emptyBoard() { return Array(ROWS).fill(null).map(() => Array(COLS).fill(null)); }

export default function MPConnect4({ gameState, players, myIndex, isMyTurn, onUpdateState }) {
  const board = gameState.board || emptyBoard();
  const token = TOKENS[myIndex];

  const drop = (col) => {
    if (!isMyTurn) return;
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) { if (!board[r][col]) { row = r; break; } }
    if (row === -1) return;
    const nb = board.map(r => [...r]);
    nb[row][col] = token;
    const won = checkWin(nb, token);
    const isDraw = !won && nb[0].every(Boolean);
    const next = players[myIndex === 0 ? 1 : 0];
    onUpdateState(
      { board: nb },
      won ? players[myIndex].email : next.email,
      won ? players[myIndex] : (isDraw ? { email: 'draw', name: 'Draw' } : null)
    );
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-3 text-sm mb-1">
        {players.map((p,i) => (
          <span key={p.email} className={`flex items-center gap-1 ${isMyTurn && i===myIndex ? 'font-extrabold text-primary' : 'text-muted-foreground'}`}>
            {TOKENS[i]} {p.name?.split(' ')[0]}
          </span>
        ))}
      </div>
      {isMyTurn && <p className="text-xs font-bold text-primary">Drop a {token}!</p>}
      {!isMyTurn && <p className="text-xs text-muted-foreground animate-pulse">Waiting…</p>}
      <div className="bg-green-800 rounded-2xl p-2 shadow-xl">
        {/* Column drop buttons */}
        <div className="flex gap-1 mb-1">
          {Array(COLS).fill(null).map((_,c) => (
            <button key={c} onClick={() => drop(c)}
              className={`w-9 h-5 rounded-t text-xs flex items-center justify-center transition-colors
                ${isMyTurn ? 'hover:bg-green-600 cursor-pointer' : 'cursor-default'}`}>
              {isMyTurn ? '▼' : ''}
            </button>
          ))}
        </div>
        {board.map((row, r) => (
          <div key={r} className="flex gap-1 mb-1">
            {row.map((cell, c) => (
              <div key={c} className={`w-9 h-9 rounded-full flex items-center justify-center text-lg
                ${cell ? (cell === TOKENS[0] ? 'bg-yellow-300' : 'bg-stone-700') : 'bg-green-900/80'}`}>
                {cell || ''}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}