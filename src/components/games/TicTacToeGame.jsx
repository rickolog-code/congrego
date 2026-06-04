import { useState } from 'react';
import { Button } from '@/components/ui/button';

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? 'draw' : null;
}

function bestMove(board) {
  const empty = board.map((v, i) => v ? null : i).filter(i => i !== null);
  for (const i of empty) {
    const b = [...board]; b[i] = 'O';
    if (checkWinner(b) === 'O') return i;
  }
  for (const i of empty) {
    const b = [...board]; b[i] = 'X';
    if (checkWinner(b) === 'X') return i;
  }
  if (board[4] === null) return 4;
  const corners = [0,2,6,8].filter(i => !board[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

export default function TicTacToeGame() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [waiting, setWaiting] = useState(false);
  const winner = checkWinner(board);

  const handleClick = (i) => {
    if (board[i] || winner || waiting) return;
    const next = [...board]; next[i] = 'X';
    setBoard(next);
    if (checkWinner(next)) return;
    setWaiting(true);
    setTimeout(() => {
      const ai = bestMove(next);
      if (ai !== undefined) {
        const after = [...next]; after[ai] = 'O';
        setBoard(after);
      }
      setWaiting(false);
    }, 400);
  };

  const reset = () => { setBoard(Array(9).fill(null)); setWaiting(false); };

  const status = winner === 'draw' ? "It's a draw! 🤝"
    : winner === 'X' ? "You win! 🎉"
    : winner === 'O' ? "Monkey wins! 🐒"
    : waiting ? "Monkey is thinking…"
    : "Your turn (X)";

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <p className="text-sm font-semibold text-center">{status}</p>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className="w-20 h-20 rounded-2xl bg-muted text-4xl font-extrabold flex items-center justify-center transition-colors hover:bg-secondary"
          >
            {cell === 'X' ? '❌' : cell === 'O' ? '🐒' : ''}
          </button>
        ))}
      </div>
      {(winner || board.every(Boolean)) && (
        <Button onClick={reset} className="rounded-2xl">Play Again</Button>
      )}
    </div>
  );
}