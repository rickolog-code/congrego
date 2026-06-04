import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

const BANANA_COUNT = 20;
const GAME_DURATION = 30;

function randomPos() {
  return {
    x: 20 + Math.random() * 60,
    y: 20 + Math.random() * 60,
    id: Math.random().toString(36).slice(2),
    eaten: false,
  };
}

const MONKEY_COLORS = ['🐒', '🦧', '🐵', '🦍'];
const POSITIONS = [
  { bottom: '5%', left: '50%', transform: 'translateX(-50%) rotate(0deg)', labelPos: 'bottom' },
  { top: '5%', left: '50%', transform: 'translateX(-50%) rotate(180deg)', labelPos: 'top' },
  { left: '5%', top: '50%', transform: 'translateY(-50%) rotate(90deg)', labelPos: 'left' },
  { right: '5%', top: '50%', transform: 'translateY(-50%) rotate(-90deg)', labelPos: 'right' },
];

export default function MPHippos({ gameState, players, myIndex, isMyTurn, onUpdateState, user }) {
  const [localBananas, setLocalBananas] = useState(null);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef(null);

  const bananas = localBananas || gameState.bananas || null;
  const scores = gameState.scores || players.map(() => 0);
  const started = !!gameState.started;

  useEffect(() => {
    if (started && !gameOver) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); setGameOver(true); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [started]);

  const startGame = () => {
    const bans = Array(BANANA_COUNT).fill(null).map(randomPos);
    onUpdateState({ bananas: bans, scores: players.map(() => 0), started: true }, players[0].email, null);
    setLocalBananas(bans);
  };

  const chomp = (bananaId) => {
    if (!started || gameOver) return;
    const newBananas = (bananas || []).map(b => b.id === bananaId ? { ...b, eaten: true } : b);
    const newScores = [...scores];
    newScores[myIndex] = (newScores[myIndex] || 0) + 1;
    setLocalBananas(newBananas);
    // Don't wait for server — optimistic update, persist every chomp
    onUpdateState({ bananas: newBananas, scores: newScores, started: true }, gameState.current_turn || players[0].email, null);
  };

  if (!started) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-5xl">🦍🍌🦍</div>
        <p className="text-base font-bold">Hungry Hungry Monkeys!</p>
        <p className="text-xs text-muted-foreground text-center max-w-[220px]">Tap bananas as fast as you can! Most bananas eaten wins.</p>
        {myIndex === 0 ? (
          <Button onClick={startGame} className="rounded-2xl">Start Game!</Button>
        ) : (
          <p className="text-sm text-muted-foreground animate-pulse">Waiting for host to start…</p>
        )}
      </div>
    );
  }

  const availableBananas = (bananas || []).filter(b => !b.eaten);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Timer + scores */}
      <div className="flex items-center justify-between w-full px-2">
        <div className="flex gap-3">
          {players.map((p, i) => (
            <div key={p.email} className="flex flex-col items-center">
              <span className="text-lg">{MONKEY_COLORS[i]}</span>
              <span className="text-sm font-extrabold">{scores[i] || 0}</span>
            </div>
          ))}
        </div>
        <div className={`text-2xl font-extrabold ${timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
          {timeLeft}s
        </div>
      </div>

      {/* Arena */}
      <div className="relative w-64 h-64 bg-gradient-to-br from-green-200 to-emerald-300 rounded-3xl border-4 border-green-600 overflow-hidden">
        {availableBananas.map(b => (
          <button
            key={b.id}
            onClick={() => chomp(b.id)}
            className="absolute text-2xl hover:scale-110 active:scale-90 transition-transform"
            style={{ left: `${b.x}%`, top: `${b.y}%`, transform: 'translate(-50%,-50%)' }}
          >
            🍌
          </button>
        ))}
        {availableBananas.length === 0 && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🎉</div>
        )}
      </div>

      {gameOver && (
        <p className="text-sm font-bold text-center">
          Game over! {players[scores.indexOf(Math.max(...scores))]?.name} wins!
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        You are {MONKEY_COLORS[myIndex]} — tap bananas to eat them!
      </p>
    </div>
  );
}