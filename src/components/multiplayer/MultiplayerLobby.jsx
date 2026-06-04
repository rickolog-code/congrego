import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Users, Plus, Clock, Play, X } from 'lucide-react';

const GAME_NAMES = {
  chess: 'Jungle Chess', tictactoe: 'Vine Climber', connect4: 'Banana Drop',
  checkers: 'Jungle Checkers', battleship: 'River Raid', darts: 'Dart Frogs',
  hippos: 'Hungry Hungry Monkeys', minigolf: 'Jungle Putt', bowling: 'Coconut Bowling'
};
const GAME_EMOJIS = {
  chess:'♟️', tictactoe:'🎯', connect4:'🍌', checkers:'🔴', battleship:'🚢',
  darts:'🎯', hippos:'🦛', minigolf:'⛳', bowling:'🎳'
};
const MAX_PLAYERS = { hippos: 4, bowling: 4, minigolf: 4, darts: 4, battleship: 2, chess: 2, tictactoe: 2, connect4: 2, checkers: 2 };

export default function MultiplayerLobby({ gameType, onStartGame, onClose }) {
  const { user, circles, activeCircleId } = useCircle();
  const [selectedCircleId, setSelectedCircleId] = useState(activeCircleId || '');
  const [openGames, setOpenGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myGame, setMyGame] = useState(null);

  const maxP = MAX_PLAYERS[gameType] || 2;

  useEffect(() => {
    if (!selectedCircleId) return;
    fetchGames();
    const interval = setInterval(fetchGames, 3000);
    return () => clearInterval(interval);
  }, [selectedCircleId, gameType]);

  const fetchGames = async () => {
    const games = await base44.entities.MultiplayerGame.filter({
      circle_id: selectedCircleId,
      game_type: gameType,
      status: 'waiting'
    });
    setOpenGames(games);
    if (myGame) {
      const updated = await base44.entities.MultiplayerGame.filter({ id: myGame.id });
      if (updated[0]) {
        setMyGame(updated[0]);
        if (updated[0].status === 'active') {
          onStartGame(updated[0]);
        }
      }
    }
  };

  const createGame = async () => {
    setLoading(true);
    const game = await base44.entities.MultiplayerGame.create({
      game_type: gameType,
      circle_id: selectedCircleId,
      status: 'waiting',
      host_email: user.email,
      host_name: user.full_name || user.email,
      players: [{ email: user.email, name: user.full_name || user.email, index: 0 }],
      max_players: maxP,
      game_state: {},
      current_turn: user.email,
    });
    setMyGame(game);
    setLoading(false);
    if (maxP === 1) onStartGame(game);
  };

  const joinGame = async (game) => {
    setLoading(true);
    const alreadyIn = game.players?.some(p => p.email === user.email);
    if (!alreadyIn) {
      const updatedPlayers = [...(game.players || []), {
        email: user.email,
        name: user.full_name || user.email,
        index: game.players?.length || 1
      }];
      const isFull = updatedPlayers.length >= game.max_players;
      const updated = await base44.entities.MultiplayerGame.update(game.id, {
        players: updatedPlayers,
        status: isFull ? 'active' : 'waiting',
      });
      if (isFull) {
        onStartGame({ ...game, players: updatedPlayers, status: 'active' });
      } else {
        setMyGame(updated);
      }
    } else {
      setMyGame(game);
    }
    setLoading(false);
  };

  const cancelGame = async () => {
    if (myGame) await base44.entities.MultiplayerGame.delete(myGame.id);
    setMyGame(null);
  };

  if (myGame && myGame.status === 'waiting') {
    return (
      <div className="flex flex-col items-center gap-5 py-6">
        <div className="text-5xl">{GAME_EMOJIS[gameType]}</div>
        <h3 className="text-lg font-extrabold">{GAME_NAMES[gameType]}</h3>
        <div className="bg-muted rounded-2xl px-6 py-4 flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-muted-foreground">Waiting for players…</p>
          <div className="flex gap-2 mt-2">
            {Array.from({ length: myGame.max_players }).map((_, i) => {
              const p = myGame.players?.[i];
              return (
                <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                  ${p ? 'bg-primary text-primary-foreground' : 'bg-border text-muted-foreground border-2 border-dashed border-border'}`}>
                  {p ? (p.name?.[0]?.toUpperCase() || '?') : '+'}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{myGame.players?.length}/{myGame.max_players} players</p>
        </div>
        <p className="text-xs text-muted-foreground text-center max-w-[220px]">
          Share this circle with friends — they can join from the same game tab!
        </p>
        <Button variant="outline" onClick={cancelGame} className="rounded-2xl gap-2 text-destructive border-destructive/30">
          <X className="w-4 h-4" /> Cancel Game
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <div className="text-4xl mb-1">{GAME_EMOJIS[gameType]}</div>
        <h3 className="text-lg font-extrabold">{GAME_NAMES[gameType]}</h3>
        <p className="text-xs text-muted-foreground">{maxP} players · Pick a circle</p>
      </div>

      {/* Circle picker */}
      <div className="flex gap-2 flex-wrap justify-center">
        {circles.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCircleId(c.id)}
            className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all border-2
              ${selectedCircleId === c.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {selectedCircleId && (
        <>
          {/* Open games */}
          {openGames.filter(g => !g.players?.some(p => p.email === user.email)).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Open games</p>
              {openGames.filter(g => !g.players?.some(p => p.email === user.email)).map(g => (
                <div key={g.id} className="flex items-center justify-between bg-muted rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{g.host_name}'s game</span>
                    <span className="text-xs text-muted-foreground">{g.players?.length}/{g.max_players}</span>
                  </div>
                  <Button size="sm" onClick={() => joinGame(g)} disabled={loading} className="rounded-xl h-8 text-xs gap-1">
                    <Play className="w-3 h-3" /> Join
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button onClick={createGame} disabled={loading} className="rounded-2xl gap-2 w-full">
            <Plus className="w-4 h-4" /> Create New Game
          </Button>
        </>
      )}
    </div>
  );
}