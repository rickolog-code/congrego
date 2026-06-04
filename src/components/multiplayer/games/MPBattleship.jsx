import { useState } from 'react';
import { Button } from '@/components/ui/button';

const GRID = 8;
const SHIPS = [4, 3, 3, 2, 2]; // sizes

function emptyGrid() { return Array(GRID).fill(null).map(() => Array(GRID).fill(null)); }

function placeShipsRandom() {
  const grid = emptyGrid();
  for (const size of SHIPS) {
    let placed = false;
    while (!placed) {
      const horiz = Math.random() < 0.5;
      const r = Math.floor(Math.random() * (horiz ? GRID : GRID - size + 1));
      const c = Math.floor(Math.random() * (horiz ? GRID - size + 1 : GRID));
      let ok = true;
      for (let i = 0; i < size; i++) {
        const pr = horiz ? r : r + i, pc = horiz ? c + i : c;
        if (grid[pr][pc]) { ok = false; break; }
      }
      if (ok) {
        for (let i = 0; i < size; i++) {
          const pr = horiz ? r : r + i, pc = horiz ? c + i : c;
          grid[pr][pc] = 'S';
        }
        placed = true;
      }
    }
  }
  return grid;
}

export default function MPBattleship({ gameState, players, myIndex, isMyTurn, onUpdateState, user }) {
  const [phase, setPhase] = useState(gameState.phase || 'setup');

  const myKey = `ships_${myIndex}`;
  const oppKey = `ships_${myIndex === 0 ? 1 : 0}`;
  const myHitsKey = `hits_${myIndex}`;
  const oppHitsKey = `hits_${myIndex === 0 ? 1 : 0}`;

  const myShips = gameState[myKey] || null;
  const oppShips = gameState[oppKey] || null;
  const myHits = gameState[myHitsKey] || emptyGrid();
  const oppHits = gameState[oppHitsKey] || emptyGrid();

  const readyKey = `ready_${myIndex}`;
  const bothReady = gameState[`ready_0`] && gameState[`ready_1`];

  const handleReady = () => {
    const ships = placeShipsRandom();
    const ns = { ...gameState, [myKey]: ships, [readyKey]: true };
    const bothNowReady = ns[`ready_0`] && ns[`ready_1`];
    onUpdateState(
      { ...ns, phase: bothNowReady ? 'battle' : 'setup' },
      bothNowReady ? players[0].email : players[myIndex].email,
      null
    );
  };

  const handleShoot = (r, c) => {
    if (!isMyTurn || !bothReady || myHits[r][c]) return;
    const newHits = myHits.map(row => [...row]);
    const hit = oppShips?.[r][c] === 'S';
    newHits[r][c] = hit ? 'H' : 'M';
    const ns = { ...gameState, [myHitsKey]: newHits };
    // Check if all opp ships sunk
    const allSunk = oppShips && oppShips.flat().filter(x=>x==='S').every((_,i) => {
      const flat = newHits.flat();
      return flat.filter(x=>x==='H').length >= oppShips.flat().filter(x=>x==='S').length;
    });
    const totalShipCells = SHIPS.reduce((a,b)=>a+b,0);
    const hitCount = newHits.flat().filter(x=>x==='H').length;
    const won = hitCount >= totalShipCells;
    const next = players[myIndex === 0 ? 1 : 0];
    onUpdateState(ns, won ? players[myIndex].email : next.email, won ? players[myIndex] : null);
  };

  if (!gameState[readyKey]) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <p className="text-sm font-bold">Your ships will be placed randomly</p>
        <div className="grid grid-cols-8 gap-0.5 border border-border rounded-xl overflow-hidden">
          {emptyGrid().map((row,r)=>row.map((_,c)=>(
            <div key={r+','+c} className="w-8 h-8 bg-sky-200 border border-sky-300" />
          )))}
        </div>
        <Button onClick={handleReady} className="rounded-2xl">Ready! 🚢</Button>
      </div>
    );
  }

  if (!bothReady) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-2xl">⚓</p>
        <p className="text-sm font-bold">Waiting for opponent to get ready…</p>
        <div className="animate-pulse text-xs text-muted-foreground">Polling…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {isMyTurn ? <p className="text-xs font-bold text-primary">🎯 Your turn — pick a target!</p>
        : <p className="text-xs text-muted-foreground animate-pulse">Opponent is aiming…</p>}
      <p className="text-xs font-semibold text-muted-foreground">Attack grid (opponent's waters)</p>
      <div className="grid grid-cols-8 gap-0.5 border-2 border-border rounded-xl overflow-hidden">
        {myHits.map((row,r)=>row.map((cell,c)=>(
          <button key={r+','+c} onClick={()=>handleShoot(r,c)}
            className={`w-9 h-9 flex items-center justify-center text-sm transition-colors
              ${cell==='H'?'bg-red-400':''}
              ${cell==='M'?'bg-sky-300':''}
              ${!cell?'bg-sky-100 hover:bg-sky-200 cursor-pointer':''}`}>
            {cell==='H'?'💥':cell==='M'?'💦':''}
          </button>
        )))}
      </div>
      <p className="text-xs font-semibold text-muted-foreground mt-1">Your ships</p>
      <div className="grid grid-cols-8 gap-0.5 border-2 border-border rounded-xl overflow-hidden">
        {(myShips||emptyGrid()).map((row,r)=>row.map((cell,c)=>{
          const wasHit = oppHits[r][c]==='H';
          return(
            <div key={r+','+c} className={`w-8 h-8 flex items-center justify-center text-xs
              ${cell==='S'?'bg-green-300':'bg-sky-100'}
              ${wasHit?'bg-red-400':''}`}>
              {wasHit?'💥':cell==='S'?'🚢':''}
            </div>
          );
        }))}
      </div>
    </div>
  );
}