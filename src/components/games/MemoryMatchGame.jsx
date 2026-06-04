import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const EMOJIS = ['🍕','🎸','🌈','🐬','🦋','🍦'];
function makeBoard() {
  return [...EMOJIS, ...EMOJIS]
    .map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5);
}

export default function MemoryMatchGame() {
  const [cards, setCards] = useState(makeBoard());
  const [selected, setSelected] = useState([]);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (selected.length !== 2) return;
    setLocked(true);
    setMoves(m => m + 1);
    const [a, b] = selected;
    if (cards[a].emoji === cards[b].emoji) {
      setCards(prev => prev.map((c, i) => i === a || i === b ? { ...c, matched: true } : c));
      setSelected([]);
      setLocked(false);
    } else {
      setTimeout(() => {
        setCards(prev => prev.map((c, i) => i === a || i === b ? { ...c, flipped: false } : c));
        setSelected([]);
        setLocked(false);
      }, 800);
    }
  }, [selected]);

  const flip = (i) => {
    if (locked || cards[i].flipped || cards[i].matched || selected.length >= 2) return;
    setCards(prev => prev.map((c, idx) => idx === i ? { ...c, flipped: true } : c));
    setSelected(prev => [...prev, i]);
  };

  const won = cards.every(c => c.matched);
  const reset = () => { setCards(makeBoard()); setSelected([]); setLocked(false); setMoves(0); };

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <p className="text-sm text-muted-foreground">Moves: {moves}</p>
      {won && <p className="text-xl font-extrabold text-primary">🎉 You matched them all!</p>}
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, i) => (
          <motion.button
            key={card.id}
            onClick={() => flip(i)}
            whileTap={{ scale: 0.9 }}
            className={`w-14 h-14 rounded-xl text-2xl flex items-center justify-center transition-colors
              ${card.flipped || card.matched ? 'bg-primary/10' : 'bg-muted hover:bg-secondary'}`}
          >
            {card.flipped || card.matched ? card.emoji : '❓'}
          </motion.button>
        ))}
      </div>
      {won && <Button onClick={reset} className="rounded-2xl">Play Again</Button>}
    </div>
  );
}