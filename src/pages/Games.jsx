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

const MONKEY_IMG = "https://media.base44.com/images/public/69ff930a3528037ceadeeade/d6873467d_Monkey.png";

// --- Inline: Coin Flip ---
function CoinFlipGame() {
  const [result, setResult] = useState(null);
  const [flipping, setFlipping] = useState(false);
  const flip = () => {
    setFlipping(true);
    setResult(null);
    setTimeout(() => { setResult(Math.random() < 0.5 ? 'Heads' : 'Tails'); setFlipping(false); }, 900);
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
function NumberGuesserGame() {
  const [secret] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState('');
  const [hint, setHint] = useState('');
  const [won, setWon] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const submit = () => {
    const n = parseInt(guess);
    if (!n || n < 1 || n > 100) return;
    setAttempts(a => a + 1);
    setGuess('');
    if (n === secret) { setHint(`🎉 Correct! It was ${secret}!`); setWon(true); }
    else setHint(n < secret ? '📈 Go higher!' : '📉 Go lower!');
  };
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="text-sm text-muted-foreground">Guess a number between 1 and 100</p>
      {attempts > 0 && <p className="text-xs text-muted-foreground">Attempts: {attempts}</p>}
      {hint && <p className="text-xl font-bold">{hint}</p>}
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
const GAMES = [
  { id: 'tictactoe', name: 'Tic Tac Toe',     emoji: '🎯', desc: 'Play vs the monkey', gradient: 'from-emerald-400 to-green-600' },
  { id: 'rps',       name: 'Rock Paper\nScissors', emoji: '✊', desc: 'Beat the monkey',   gradient: 'from-blue-400 to-indigo-600' },
  { id: 'memory',    name: 'Memory Match',    emoji: '🧩', desc: 'Find the pairs',      gradient: 'from-purple-400 to-violet-600' },
  { id: 'coinflip',  name: 'Coin Flip',       emoji: '🪙', desc: 'Heads or tails?',     gradient: 'from-yellow-400 to-amber-500' },
  { id: 'dice',      name: 'Dice Roll',       emoji: '🎲', desc: 'Roll for luck',       gradient: 'from-red-400 to-rose-600' },
  { id: 'numguess',  name: 'Number Guesser',  emoji: '🔢', desc: 'Guess 1-100',         gradient: 'from-cyan-400 to-sky-600' },
  { id: 'word',      name: 'Word Scramble',   emoji: '🔤', desc: 'Coming soon…',        gradient: 'from-slate-300 to-slate-400', comingSoon: true },
  { id: 'trivia',    name: 'Trivia',          emoji: '🧠', desc: 'Coming soon…',        gradient: 'from-slate-300 to-slate-400', comingSoon: true },
  { id: 'drawing',   name: 'Drawing',         emoji: '🎨', desc: 'Coming soon…',        gradient: 'from-slate-300 to-slate-400', comingSoon: true },
];

const GAME_TITLES = {
  tictactoe: 'Tic Tac Toe', rps: 'Rock Paper Scissors',
  memory: 'Memory Match', coinflip: 'Coin Flip',
  dice: 'Dice Roll', numguess: 'Number Guesser',
};

export default function Games() {
  const navigate = useNavigate();
  const [activeGame, setActiveGame] = useState(null);

  return (
    <div className="min-h-screen bg-background pb-10">
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

      {/* 3-wide scrollable grid */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {GAMES.map((game, i) => (
          <motion.button
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => !game.comingSoon && setActiveGame(game.id)}
            className={`flex flex-col items-center justify-center aspect-square rounded-2xl bg-gradient-to-br ${game.gradient} text-white shadow-md transition-transform active:scale-95 ${game.comingSoon ? 'opacity-40 cursor-default' : 'hover:scale-105'}`}
          >
            <span className="text-3xl mb-1">{game.emoji}</span>
            <span className="text-[10px] font-bold text-center leading-tight px-1 whitespace-pre-line">{game.name}</span>
          </motion.button>
        ))}
      </div>

      {/* Game Dialog */}
      <Dialog open={!!activeGame} onOpenChange={() => setActiveGame(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center font-extrabold text-lg">
              {GAME_TITLES[activeGame]}
            </DialogTitle>
          </DialogHeader>
          {activeGame === 'tictactoe' && <TicTacToeGame />}
          {activeGame === 'rps'       && <RockPaperScissorsGame />}
          {activeGame === 'memory'    && <MemoryMatchGame />}
          {activeGame === 'coinflip'  && <CoinFlipGame />}
          {activeGame === 'dice'      && <DiceRollGame />}
          {activeGame === 'numguess'  && <NumberGuesserGame />}
        </DialogContent>
      </Dialog>
    </div>
  );
}