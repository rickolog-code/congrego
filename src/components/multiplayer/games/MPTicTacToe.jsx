import { Button } from '@/components/ui/button';

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a]===board[b] && board[b]===board[c]) return board[a];
  }
  return board.every(Boolean) ? 'draw' : null;
}

export default function MPTicTacToe({ gameState, players, myIndex, isMyTurn, onUpdateState }) {
  const board = gameState.board || Array(9).fill(null);
  const symbols = ['🌿', '🔥'];
  const winner = checkWinner(board);

  const handleClick = (i) => {
    if (!isMyTurn || board[i] || winner) return;
    const newBoard = [...board];
    newBoard[i] = symbols[myIndex];
    const w = checkWinner(newBoard);
    const next = players[myIndex === 0 ? 1 : 0];
    onUpdateState(
      { board: newBoard },
      w ? players[myIndex].email : next.email,
      w && w !== 'draw' ? players[myIndex] : (w === 'draw' ? { email: 'draw', name: 'Draw' } : null)
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {!isMyTurn && !winner && <p className="text-xs text-muted-foreground animate-pulse">Waiting for opponent…</p>}
      {isMyTurn && !winner && <p className="text-xs font-bold text-primary">Your turn! ({symbols[myIndex]})</p>}
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className={`w-20 h-20 rounded-2xl text-3xl flex items-center justify-center transition-all
              ${cell ? 'bg-primary/10' : isMyTurn && !winner ? 'bg-muted hover:bg-secondary active:scale-95 cursor-pointer' : 'bg-muted cursor-default'}`}
          >
            {cell}
          </button>
        ))}
      </div>
      {winner && <p className="text-lg font-extrabold">{winner === 'draw' ? "🤝 It's a draw!" : ''}</p>}
    </div>
  );
}