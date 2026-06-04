import { useState } from 'react';
import { Button } from '@/components/ui/button';

const RINGS = [
  { label: 'Bullseye', points: 50, color: 'bg-red-600', size: 'w-8 h-8' },
  { label: 'Bull',     points: 25, color: 'bg-green-500', size: 'w-16 h-16' },
  { label: 'Triple',   points: 15, color: 'bg-red-400', size: 'w-24 h-24' },
  { label: 'Double',   points: 10, color: 'bg-green-300', size: 'w-32 h-32' },
  { label: 'Single',   points:  5, color: 'bg-amber-100', size: 'w-40 h-40' },
  { label: 'Miss',     points:  0, color: 'bg-muted', size: 'w-48 h-48' },
];

const DARTS_PER_ROUND = 3;
const ROUNDS = 5;
const WIN_SCORE = 150;

export default function MPDarts({ gameState, players, myIndex, isMyTurn, onUpdateState }) {
  const [throwing, setThrowing] = useState(false);
  const scores = gameState.scores || players.map(() => 0);
  const dartsLeft = gameState.dartsLeft ?? DARTS_PER_ROUND;
  const round = gameState.round || 1;

  const throwDart = () => {
    if (!isMyTurn || throwing) return;
    setThrowing(true);
    setTimeout(() => {
      // Weighted random: more likely to hit middle rings
      const weights = [0.05, 0.1, 0.2, 0.25, 0.3, 0.1];
      let rnd = Math.random(), ring = 5;
      let acc = 0;
      for (let i = 0; i < weights.length; i++) { acc += weights[i]; if (rnd < acc) { ring = i; break; } }
      const pts = RINGS[ring].points;
      const newScores = [...scores];
      newScores[myIndex] = (newScores[myIndex] || 0) + pts;

      const newDartsLeft = dartsLeft - 1;
      const won = newScores[myIndex] >= WIN_SCORE;
      const next = players[myIndex === 0 ? 1 : 0];
      const switchTurn = newDartsLeft === 0;

      onUpdateState(
        { scores: newScores, dartsLeft: switchTurn ? DARTS_PER_ROUND : newDartsLeft, round: switchTurn ? round + 1 : round, lastHit: { ring, pts, player: myIndex } },
        won ? players[myIndex].email : (switchTurn ? next.email : players[myIndex].email),
        won ? players[myIndex] : null
      );
      setThrowing(false);
    }, 600);
  };

  const lastHit = gameState.lastHit;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Scoreboard */}
      <div className="flex gap-6">
        {players.map((p, i) => (
          <div key={p.email} className={`flex flex-col items-center px-4 py-2 rounded-2xl ${isMyTurn && i===myIndex ? 'bg-primary/10 border border-primary' : 'bg-muted'}`}>
            <span className="text-xs text-muted-foreground">{p.name?.split(' ')[0]}</span>
            <span className="text-2xl font-extrabold">{scores[i] || 0}</span>
            <span className="text-[10px] text-muted-foreground">/ {WIN_SCORE}</span>
          </div>
        ))}
      </div>

      {/* Dartboard */}
      <div className="relative flex items-center justify-center">
        {RINGS.slice().reverse().map((ring, i) => (
          <div key={i} className={`absolute rounded-full ${ring.color} ${ring.size} flex items-center justify-center`} />
        ))}
        <div className="relative z-10 w-48 h-48 flex items-center justify-center">
          {lastHit !== undefined && (
            <div className="text-2xl animate-bounce z-20">🎯</div>
          )}
        </div>
      </div>

      {lastHit && (
        <p className="text-sm font-bold">
          {lastHit.player === myIndex ? `You hit ${RINGS[lastHit.ring].label}! +${lastHit.pts}` 
            : `${players[lastHit.player]?.name?.split(' ')[0]} hit ${RINGS[lastHit.ring].label}! +${lastHit.pts}`}
        </p>
      )}

      <p className="text-xs text-muted-foreground">Round {round}/{ROUNDS} · {dartsLeft} dart{dartsLeft !== 1 ? 's' : ''} left</p>

      {isMyTurn ? (
        <Button onClick={throwDart} disabled={throwing} className="rounded-2xl px-8">
          {throwing ? '🎯 Throwing…' : '🎯 Throw!'}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground animate-pulse">Waiting for {players[myIndex===0?1:0]?.name?.split(' ')[0]}…</p>
      )}
    </div>
  );
}