import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown } from 'lucide-react';

// Wraps any multiplayer game component with polling sync
export default function MultiplayerWrapper({ game: initialGame, GameComponent, onClose }) {
  const { user } = useCircle();
  const [game, setGame] = useState(initialGame);
  const myPlayer = game.players?.find(p => p.email === user?.email);
  const myIndex = myPlayer?.index ?? 0;

  const fetchGame = useCallback(async () => {
    const results = await base44.entities.MultiplayerGame.filter({ id: game.id });
    if (results[0]) setGame(results[0]);
  }, [game.id]);

  useEffect(() => {
    const interval = setInterval(fetchGame, 2500);
    return () => clearInterval(interval);
  }, [fetchGame]);

  const updateState = async (newState, nextTurnEmail, winner) => {
    const updates = { game_state: newState, current_turn: nextTurnEmail };
    if (winner) {
      updates.status = 'finished';
      updates.winner_email = winner.email;
      updates.winner_name = winner.name;
    }
    const updated = await base44.entities.MultiplayerGame.update(game.id, updates);
    setGame(updated);
  };

  const isMyTurn = game.current_turn === user?.email;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Status bar */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex gap-3">
          {game.players?.map((p, i) => (
            <div key={p.email} className={`flex items-center gap-1 ${game.current_turn === p.email ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
              <div className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold
                ${i === 0 ? 'bg-amber-200 text-amber-900' : i === 1 ? 'bg-slate-700 text-white' : i === 2 ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}`}>
                {p.name?.[0]?.toUpperCase()}
              </div>
              {p.name?.split(' ')[0]}
              {game.current_turn === p.email && <span className="text-[9px]">▶</span>}
            </div>
          ))}
        </div>
        {game.status === 'finished' && (
          <span className="font-bold text-primary flex items-center gap-1">
            <Crown className="w-3 h-3" /> {game.winner_name} wins!
          </span>
        )}
      </div>

      {game.status === 'finished' ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="text-5xl">🏆</div>
          <p className="text-xl font-extrabold">{game.winner_email === user?.email ? '🎉 You won!' : `${game.winner_name} wins!`}</p>
          <Button onClick={onClose} className="rounded-2xl">Back to Games</Button>
        </div>
      ) : (
        <GameComponent
          gameState={game.game_state}
          players={game.players}
          myIndex={myIndex}
          isMyTurn={isMyTurn}
          currentTurnEmail={game.current_turn}
          onUpdateState={updateState}
          user={user}
        />
      )}
    </div>
  );
}