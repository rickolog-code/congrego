import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const CHOICES = [
  { id: 'rock',     emoji: '🪨', label: 'Rock' },
  { id: 'paper',    emoji: '📄', label: 'Paper' },
  { id: 'scissors', emoji: '✂️',  label: 'Scissors' },
];

const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

export default function RockPaperScissorsGame() {
  const [result, setResult] = useState(null);
  const [monkeyChoice, setMonkeyChoice] = useState(null);
  const [playerChoice, setPlayerChoice] = useState(null);

  const play = (choice) => {
    const monkey = CHOICES[Math.floor(Math.random() * 3)];
    const outcome = choice.id === monkey.id ? 'draw'
      : BEATS[choice.id] === monkey.id ? 'win' : 'lose';
    setPlayerChoice(choice);
    setMonkeyChoice(monkey);
    setResult(outcome);
  };

  const reset = () => { setResult(null); setMonkeyChoice(null); setPlayerChoice(null); };

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {!result ? (
        <>
          <p className="text-sm font-semibold">Pick your move!</p>
          <div className="flex gap-3">
            {CHOICES.map(c => (
              <button
                key={c.id}
                onClick={() => play(c)}
                className="w-20 h-20 rounded-2xl bg-muted text-4xl flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
              >
                {c.emoji}
              </button>
            ))}
          </div>
        </>
      ) : (
        <AnimatePresence>
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex items-center gap-6 text-5xl">
              <div className="flex flex-col items-center">
                <span>{playerChoice.emoji}</span>
                <span className="text-xs text-muted-foreground mt-1">You</span>
              </div>
              <span className="text-2xl">vs</span>
              <div className="flex flex-col items-center">
                <span>{monkeyChoice.emoji}</span>
                <span className="text-xs text-muted-foreground mt-1">🐒 Monkey</span>
              </div>
            </div>
            <p className="text-2xl font-extrabold">
              {result === 'win' ? '🎉 You win!' : result === 'lose' ? '🐒 Monkey wins!' : "🤝 It's a draw!"}
            </p>
            <Button onClick={reset} className="rounded-2xl">Play Again</Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}