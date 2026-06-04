import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const HOLES = 9;
const GAME_DURATION = 30;

export default function WhackAMole() {
  const [active, setActive] = useState(Array(HOLES).fill(false));
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [running, setRunning] = useState(false);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('whack_best') || '0'));
  const timerRef = useRef(null);
  const moleRef = useRef(null);

  const stopGame = useCallback(() => {
    setRunning(false);
    clearInterval(timerRef.current);
    clearTimeout(moleRef.current);
    setActive(Array(HOLES).fill(false));
  }, []);

  const spawnMole = useCallback(() => {
    if (!running) return;
    const idx = Math.floor(Math.random() * HOLES);
    setActive(prev => { const n = [...prev]; n[idx] = true; return n; });
    // Auto-hide after random time
    const hideTime = 600 + Math.random() * 900;
    moleRef.current = setTimeout(() => {
      setActive(prev => { const n = [...prev]; if (n[idx]) { setMisses(m => m + 1); } n[idx] = false; return n; });
      // Spawn next
      const delay = 300 + Math.random() * 500;
      moleRef.current = setTimeout(spawnMole, delay);
    }, hideTime);
  }, [running]);

  useEffect(() => {
    if (running) spawnMole();
  }, [running]);

  const startGame = () => {
    setScore(0); setMisses(0); setTimeLeft(GAME_DURATION);
    setActive(Array(HOLES).fill(false));
    setRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stopGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!running && timeLeft === 0 && score > 0) {
      if (score > best) {
        setBest(score);
        localStorage.setItem('whack_best', String(score));
      }
    }
  }, [running]);

  useEffect(() => () => { clearInterval(timerRef.current); clearTimeout(moleRef.current); }, []);

  const whack = (i) => {
    if (!active[i] || !running) return;
    setActive(prev => { const n = [...prev]; n[i] = false; return n; });
    setScore(s => s + 1);
    clearTimeout(moleRef.current);
    const delay = 200 + Math.random() * 400;
    moleRef.current = setTimeout(spawnMole, delay);
  };

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* Stats */}
      <div className="flex gap-4 items-center">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Score</p>
          <p className="text-2xl font-extrabold text-primary">{score}</p>
        </div>
        <div className={`text-center px-3 py-1 rounded-full ${timeLeft <= 5 && running ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-muted'}`}>
          <p className="text-xs text-muted-foreground">Time</p>
          <p className="text-2xl font-extrabold">{timeLeft}s</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Best</p>
          <p className="text-2xl font-extrabold text-amber-500">{best}</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3">
        {Array(HOLES).fill(null).map((_, i) => (
          <div key={i} className="relative w-20 h-20">
            {/* Hole */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-8 bg-amber-900 rounded-full" />
            {/* Banana / Mole */}
            <AnimatePresence>
              {active[i] && (
                <motion.button
                  key="banana"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => whack(i)}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 text-4xl z-10 active:scale-75 transition-transform"
                >
                  🍌
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {!running && timeLeft === GAME_DURATION && (
        <Button onClick={startGame} className="rounded-2xl px-8">🍌 Start Whacking!</Button>
      )}
      {!running && timeLeft === 0 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-extrabold">
            {score > best - 1 && score > 0 ? '🏆 New best!' : `You got ${score}!`}
          </p>
          <Button onClick={startGame} className="rounded-2xl px-8">Play Again</Button>
        </div>
      )}
      {running && (
        <p className="text-xs text-muted-foreground">Tap the bananas before they disappear!</p>
      )}
    </div>
  );
}