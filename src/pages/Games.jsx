import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TicTacToeGame from '@/components/games/TicTacToeGame';
import RockPaperScissorsGame from '@/components/games/RockPaperScissorsGame';
import MemoryMatchGame from '@/components/games/MemoryMatchGame';
import ChessGame from '@/components/games/ChessGame';
import { unlockGameAchievement } from '@/pages/Achievements';

const MONKEY_IMG = "https://media.base44.com/images/public/69ff930a3528037ceadeeade/d6873467d_Monkey.png";

// --- Inline: Coin Flip ---
function CoinFlipGame({ onFiveHeads }) {
  const [result, setResult] = useState(null);
  const [flipping, setFlipping] = useState(false);
  const [streak, setStreak] = useState(0);
  const [achieved, setAchieved] = useState(false);

  const flip = () => {
    setFlipping(true);
    setResult(null);
    setTimeout(() => {
      const r = Math.random() < 0.5 ? 'Heads' : 'Tails';
      setResult(r);
      setFlipping(false);
      if (r === 'Heads') {
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak >= 5 && !achieved) {
          setAchieved(true);
          onFiveHeads?.();
        }
      } else {
        setStreak(0);
      }
    }, 900);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <motion.div
        animate={flipping ? { rotateY: [0, 180, 360, 540, 720] } : {}}
        transition={{ duration: 0.9 }}
        className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-5xl shadow-xl"
      >
        {flipping ? '🪙' : result === 'Heads' ? '👑' : result === 'Tails' ? '🦅' : '🪙'}
      </motion.div>
      {result && <p className="text-2xl font-extrabold">{result}!</p>}
      {streak > 0 && <p className="text-xs text-muted-foreground">🔥 Heads streak: {streak}</p>}
      {achieved && <p className="text-sm font-bold text-amber-500">🏆 Achievement unlocked!</p>}
      <Button onClick={flip} disabled={flipping} className="rounded-2xl px-10">
        {flipping ? 'Flipping…' : 'Flip!'}
      </Button>
    </div>
  );
}

// --- Inline: Dice Roll ---
const DICE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
function DiceRollGame() {
  const [idx, setIdx] = useState(null);
  const [rolling, setRolling] = useState(false);
  const roll = () => {
    setRolling(true);
    let count = 0;
    const id = setInterval(() => {
      setIdx(Math.floor(Math.random() * 6));
      if (++count >= 10) { clearInterval(id); setRolling(false); }
    }, 90);
  };
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <motion.div animate={rolling ? { rotate: [0, 30, -30, 0] } : {}} transition={{ repeat: Infinity, duration: 0.3 }}
        className="text-9xl select-none">
        {idx !== null ? DICE[idx] : '🎲'}
      </motion.div>
      {idx !== null && !rolling && <p className="text-2xl font-extrabold">Rolled a {idx + 1}!</p>}
      <Button onClick={roll} disabled={rolling} className="rounded-2xl px-10">
        {rolling ? 'Rolling…' : 'Roll!'}
      </Button>
    </div>
  );
}

// --- Inline: Number Guesser ---
function NumberGuesserGame({ onFirstTryWin }) {
  const [secret] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState('');
  const [hint, setHint] = useState('');
  const [won, setWon] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [achieved, setAchieved] = useState(false);

  const submit = () => {
    const n = parseInt(guess);
    if (!n || n < 1 || n > 100) return;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setGuess('');
    if (n === secret) {
      setHint(`🎉 Correct! It was ${secret}!`);
      setWon(true);
      if (newAttempts === 1 && !achieved) {
        setAchieved(true);
        onFirstTryWin?.();
      }
    } else {
      setHint(n < secret ? '📈 Go higher!' : '📉 Go lower!');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="text-sm text-muted-foreground">Guess a number between 1 and 100</p>
      {attempts > 0 && <p className="text-xs text-muted-foreground">Attempts: {attempts}</p>}
      {hint && <p className="text-xl font-bold">{hint}</p>}
      {achieved && <p className="text-sm font-bold text-amber-500">🏆 Achievement unlocked!</p>}
      {!won && (
        <div className="flex gap-2 w-full max-w-xs">
          <Input type="number" min={1} max={100} value={guess}
            onChange={e => setGuess(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Your guess…" className="rounded-2xl" />
          <Button onClick={submit} className="rounded-2xl">Go</Button>
        </div>
      )}
    </div>
  );
}

// --- Game list ---
const SOLO_GAMES = [
  { id: 'tictactoe', name: 'Vine\nClimber',       emoji: '🎯', desc: 'Play vs the monkey', gradient: 'from-emerald-500 to-green-700' },
  { id: 'rps',       name: 'Claw\nChallenge',      emoji: '🦎', desc: 'Beat the monkey',    gradient: 'from-lime-500 to-emerald-700' },
  { id: 'chess',     name: 'Jungle\nChess',         emoji: '♟️', desc: 'Outsmart the monkey', gradient: 'from-teal-500 to-cyan-700' },
  { id: 'memory',    name: 'Jungle\nMemory',        emoji: '🌴', desc: 'Find the pairs',     gradient: 'from-green-500 to-teal-700' },
  { id: 'coinflip',  name: 'Canopy\nCoin',          emoji: '🪙', desc: 'Heads or tails?',    gradient: 'from-yellow-500 to-amber-600' },
  { id: 'dice',      name: 'Monkey\nDice',          emoji: '🎲', desc: 'Roll for luck',      gradient: 'from-orange-500 to-amber-700' },
  { id: 'numguess',  name: 'Safari\nGuess',         emoji: '🐒', desc: 'Guess 1-100',        gradient: 'from-cyan-500 to-sky-700' },
];

const GAME_TITLES = {
  tictactoe: 'Vine Climber', rps: 'Claw Challenge',
  chess: 'Jungle Chess', memory: 'Jungle Memory',
  coinflip: 'Canopy Coin', dice: 'Monkey Dice', numguess: 'Safari Guess',
};

export default function Games() {
  const navigate = useNavigate();
  const [activeGame, setActiveGame] = useState(null);
  const [tab, setTab] = useState('solo');

  // Achievement flags (in-session toast-style)
  const [achievedFiveHeads, setAchievedFiveHeads] = useState(false);
  const [achievedPerfectMemory, setAchievedPerfectMemory] = useState(false);
  const [achievedFirstTry, setAchievedFirstTry] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img src={MONKEY_IMG} alt="" className="w-8 h-8 object-cover rounded-full" />
        <div>
          <h1 className="text-lg font-extrabold leading-tight">Monkey Around 🎮</h1>
          <p className="text-xs text-muted-foreground">Pick a game to play</p>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4">
        <AnimatePresence mode="wait">
          {tab === 'solo' ? (
            <motion.div
              key="solo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-3 gap-3"
            >
              {SOLO_GAMES.map((game, i) => (
                <motion.button
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => setActiveGame(game.id)}
                  className={`flex flex-col items-center justify-center aspect-square rounded-2xl bg-gradient-to-br ${game.gradient} text-white shadow-md transition-transform active:scale-95 hover:scale-105`}
                >
                  <span className="text-3xl mb-1">{game.emoji}</span>
                  <span className="text-[10px] font-bold text-center leading-tight px-1 whitespace-pre-line">{game.name}</span>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="multi"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center gap-4 pt-16"
            >
              <span className="text-6xl">🌴</span>
              <h2 className="text-2xl font-extrabold text-foreground">Coming Soon</h2>
              <p className="text-sm text-muted-foreground text-center max-w-[200px]">
                Multiplayer jungle games are swinging your way!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border flex z-20">
        <button
          onClick={() => setTab('solo')}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'solo' ? 'text-primary border-t-2 border-primary' : 'text-muted-foreground'}`}
        >
          🐒 Single Player
        </button>
        <button
          onClick={() => setTab('multi')}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'multi' ? 'text-primary border-t-2 border-primary' : 'text-muted-foreground'}`}
        >
          🌴 Multiplayer
        </button>
      </div>

      {/* Game Dialog */}
      <Dialog open={!!activeGame} onOpenChange={() => setActiveGame(null)}>
        <DialogContent className={`${activeGame === 'chess' ? 'max-w-[95vw] w-[520px]' : 'max-w-sm'} rounded-3xl`}>
          <DialogHeader>
            <DialogTitle className="text-center font-extrabold text-lg">
              {GAME_TITLES[activeGame]}
            </DialogTitle>
          </DialogHeader>
          {activeGame === 'tictactoe' && <TicTacToeGame />}
          {activeGame === 'rps'       && <RockPaperScissorsGame />}
          {activeGame === 'chess'     && <ChessGame />}
          {activeGame === 'memory'    && (
            <MemoryMatchGame onPerfectGame={() => { setAchievedPerfectMemory(true); unlockGameAchievement('perfect_memory'); }} />
          )}
          {activeGame === 'coinflip'  && (
            <CoinFlipGame onFiveHeads={() => { setAchievedFiveHeads(true); unlockGameAchievement('five_heads'); }} />
          )}
          {activeGame === 'dice'      && <DiceRollGame />}
          {activeGame === 'numguess'  && (
            <NumberGuesserGame onFirstTryWin={() => { setAchievedFirstTry(true); unlockGameAchievement('first_try_guess'); }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}