import { useState } from 'react';
import { Button } from '@/components/ui/button';

const PINS_COUNT = 10;
const FRAMES = 10;

function initPins() { return Array(PINS_COUNT).fill(true); }

function pinsLayout(pins) {
  // Classic triangle layout
  const rows = [[0],[1,2],[3,4,5],[6,7,8,9]];
  return rows;
}

export default function MPBowling({ gameState, players, myIndex, isMyTurn, onUpdateState }) {
  const [rolling, setRolling] = useState(false);

  const scores = gameState.scores || players.map(() => []);
  const pins = gameState.pins || initPins();
  const rollInFrame = gameState.rollInFrame || 0;
  const frame = gameState.frame || 0;

  const roll = () => {
    if (!isMyTurn || rolling) return;
    setRolling(true);
    setTimeout(() => {
      const standingPins = pins.filter(Boolean).length;
      const knocked = Math.floor(Math.random() * (standingPins + 1));
      const newPins = [...pins];
      let k = 0;
      for (let i = 0; i < PINS_COUNT; i++) {
        if (newPins[i] && k < knocked) { newPins[i] = false; k++; }
      }

      const newScores = scores.map(s => [...s]);
      if (!newScores[myIndex]) newScores[myIndex] = [];
      newScores[myIndex].push(knocked);

      const isStrike = rollInFrame === 0 && knocked === standingPins && standingPins === 10;
      const isSpare = rollInFrame === 1 && !newPins.some(Boolean);
      const nextRollInFrame = isStrike || rollInFrame === 1 ? 0 : 1;
      const nextFrame = nextRollInFrame === 0 ? frame + 1 : frame;

      const totalBalls = newScores.flat().length;
      const gameOver = nextFrame >= FRAMES;
      const next = players[myIndex === 0 ? 1 : 0];
      const switchPlayer = isStrike || rollInFrame === 1;

      // Calc total
      const myTotal = newScores[myIndex].reduce((a,b)=>a+b,0);
      const oppIdx = myIndex===0?1:0;
      const oppTotal = (newScores[oppIdx]||[]).reduce((a,b)=>a+b,0);

      onUpdateState(
        { scores: newScores, pins: nextRollInFrame === 0 ? initPins() : newPins, rollInFrame: nextRollInFrame, frame: nextFrame },
        gameOver ? (myTotal >= oppTotal ? players[myIndex].email : next.email)
          : (switchPlayer ? next.email : players[myIndex].email),
        gameOver ? (myTotal >= oppTotal ? players[myIndex] : next) : null
      );
      setRolling(false);
    }, 800);
  };

  const ROWS = [[0],[1,2],[3,4,5],[6,7,8,9]];
  const myTotal = (scores[myIndex]||[]).reduce((a,b)=>a+b,0);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Scores */}
      <div className="flex gap-6">
        {players.map((p,i)=>(
          <div key={p.email} className={`flex flex-col items-center px-4 py-2 rounded-2xl ${isMyTurn&&i===myIndex?'bg-primary/10 border border-primary':'bg-muted'}`}>
            <span className="text-xs text-muted-foreground">{p.name?.split(' ')[0]}</span>
            <span className="text-2xl font-extrabold">{(scores[i]||[]).reduce((a,b)=>a+b,0)}</span>
          </div>
        ))}
      </div>

      {/* Lane */}
      <div className="bg-amber-100 rounded-2xl px-8 py-4 flex flex-col items-center gap-3 border-2 border-amber-300">
        <div className="flex flex-col items-center gap-1">
          {ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-2">
              {row.map(pi => (
                <div key={pi} className={`w-8 h-8 rounded-full flex items-center justify-center text-lg border-2
                  ${pins[pi] ? 'bg-white border-amber-400' : 'bg-amber-200 border-transparent opacity-40'}`}>
                  {pins[pi] ? '🥥' : ''}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="w-4 h-12 bg-amber-300 rounded-full mt-1" />
        <div className="text-2xl">🎳</div>
      </div>

      <p className="text-xs text-muted-foreground">Frame {Math.min(frame+1,FRAMES)}/{FRAMES} · Roll {rollInFrame+1}</p>

      {isMyTurn ? (
        <Button onClick={roll} disabled={rolling} className="rounded-2xl px-8">
          {rolling ? '🎳 Rolling…' : '🎳 Bowl!'}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground animate-pulse">Waiting for {players[myIndex===0?1:0]?.name?.split(' ')[0]}…</p>
      )}
    </div>
  );
}