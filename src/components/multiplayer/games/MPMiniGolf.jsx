import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const HOLES = 9;
const PAR = [3, 4, 3, 4, 5, 3, 4, 4, 3];

const BALL_COLORS = ['🟡','🔵','🔴','🟢'];

export default function MPMiniGolf({ gameState, players, myIndex, isMyTurn, onUpdateState }) {
  const [swinging, setSwinging] = useState(false);
  const scores = gameState.scores || players.map(() => Array(HOLES).fill(null));
  const currentHole = gameState.currentHole || 0;
  const holeStrokes = gameState.holeStrokes || players.map(() => 0);
  const ballPos = gameState.ballPos || { x: 50, y: 80 };

  if (currentHole >= HOLES) {
    const totals = scores.map(s => s.reduce((a, b) => a + (b||0), 0));
    const winnerIdx = totals.indexOf(Math.min(...totals));
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="text-5xl">⛳</div>
        <p className="text-lg font-extrabold">Game Over!</p>
        {players.map((p,i)=>(
          <p key={p.email} className="text-sm">{p.name?.split(' ')[0]}: {totals[i]} strokes</p>
        ))}
      </div>
    );
  }

  const swing = () => {
    if (!isMyTurn || swinging) return;
    setSwinging(true);
    setTimeout(() => {
      // Random strokes 1-5 with par weighting
      const par = PAR[currentHole];
      const base = Math.max(1, par - 1 + Math.floor(Math.random() * 4) - 1);
      const strokes = Math.max(1, base);

      const newHoleStrokes = [...holeStrokes];
      newHoleStrokes[myIndex] = (newHoleStrokes[myIndex] || 0) + strokes;

      // Check if this player holed it (random chance increases with strokes)
      const holed = Math.random() < 0.6;
      const newScores = scores.map(s => [...s]);

      if (holed || newHoleStrokes[myIndex] >= 8) {
        newScores[myIndex][currentHole] = newHoleStrokes[myIndex];
        // All players done this hole?
        const allDone = newScores.every((s, i) => s[currentHole] !== null);
        const nextHole = allDone ? currentHole + 1 : currentHole;
        const nextStrokes = allDone ? players.map(() => 0) : newHoleStrokes;
        const gameOver = nextHole >= HOLES;

        if (gameOver) {
          const totals = newScores.map(s => s.reduce((a,b)=>a+(b||0),0));
          const winnerIdx = totals.indexOf(Math.min(...totals));
          onUpdateState(
            { scores: newScores, currentHole: nextHole, holeStrokes: nextStrokes, ballPos: { x: 50, y: 80 } },
            players[myIndex].email,
            players[winnerIdx]
          );
        } else {
          const next = players[myIndex === 0 ? 1 : 0];
          onUpdateState(
            { scores: newScores, currentHole: nextHole, holeStrokes: nextStrokes, ballPos: { x: 50, y: 80 } },
            next.email, null
          );
        }
      } else {
        const next = players[myIndex === 0 ? 1 : 0];
        onUpdateState(
          { scores: newScores, currentHole, holeStrokes: newHoleStrokes, ballPos: { x: 30 + Math.random()*40, y: 20 + Math.random()*60 } },
          next.email, null
        );
      }
      setSwinging(false);
    }, 900);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-bold">Hole {currentHole + 1} — Par {PAR[currentHole]}</p>

      {/* Scorecard */}
      <div className="flex gap-3">
        {players.map((p,i)=>(
          <div key={p.email} className={`flex flex-col items-center px-3 py-2 rounded-xl ${isMyTurn&&i===myIndex?'bg-primary/10 border border-primary':'bg-muted'}`}>
            <span className="text-xs">{BALL_COLORS[i]}</span>
            <span className="text-xs text-muted-foreground">{p.name?.split(' ')[0]}</span>
            <span className="text-base font-extrabold">{scores[i].reduce((a,b)=>a+(b||0),0)}</span>
            {scores[i][currentHole]!==null&&<span className="text-xs text-muted-foreground">({scores[i][currentHole]})</span>}
          </div>
        ))}
      </div>

      {/* Course visual */}
      <div className="relative w-56 h-56 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl border-4 border-green-700 overflow-hidden">
        {/* Obstacles */}
        <div className="absolute" style={{left:'30%',top:'40%'}}><span className="text-2xl">🌴</span></div>
        <div className="absolute" style={{left:'60%',top:'20%'}}><span className="text-xl">🪨</span></div>
        {/* Hole */}
        <div className="absolute flex flex-col items-center" style={{left:'75%',top:'15%',transform:'translate(-50%,-50%)'}}>
          <div className="w-5 h-5 rounded-full bg-black border-2 border-white" />
          <span className="text-xs">⛳</span>
        </div>
        {/* Ball */}
        <motion.div
          animate={{ left: `${ballPos.x}%`, top: `${ballPos.y}%` }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="absolute text-xl"
          style={{ transform: 'translate(-50%,-50%)' }}
        >
          {BALL_COLORS[myIndex]}
        </motion.div>
      </div>

      <p className="text-xs text-muted-foreground">Strokes this hole: {holeStrokes[myIndex] || 0}</p>

      {isMyTurn ? (
        <Button onClick={swing} disabled={swinging} className="rounded-2xl px-8">
          {swinging ? '⛳ Swinging…' : '⛳ Swing!'}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground animate-pulse">Waiting for {players[myIndex===0?1:0]?.name?.split(' ')[0]}…</p>
      )}
    </div>
  );
}