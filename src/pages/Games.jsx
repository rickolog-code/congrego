import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Single-player games
import TicTacToeGame from '@/components/games/TicTacToeGame';
import RockPaperScissorsGame from '@/components/games/RockPaperScissorsGame';
import MemoryMatchGame from '@/components/games/MemoryMatchGame';
import ChessGame from '@/components/games/ChessGame';
import WhackAMole from '@/components/games/WhackAMole';
import { unlockGameAchievement } from '@/pages/Achievements';

// Multiplayer
import MultiplayerLobby from '@/components/multiplayer/MultiplayerLobby';
import MultiplayerWrapper from '@/components/multiplayer/MultiplayerWrapper';
import MPChess from '@/components/multiplayer/games/MPChess';
import MPTicTacToe from '@/components/multiplayer/games/MPTicTacToe';
import MPConnect4 from '@/components/multiplayer/games/MPConnect4';
import MPCheckers from '@/components/multiplayer/games/MPCheckers';
import MPBattleship from '@/components/multiplayer/games/MPBattleship';
import MPDarts from '@/components/multiplayer/games/MPDarts';
import MPHippos from '@/components/multiplayer/games/MPHippos';
import MPBowling from '@/components/multiplayer/games/MPBowling';
import MPMiniGolf from '@/components/multiplayer/games/MPMiniGolf';

const MONKEY_IMG = "https://media.base44.com/images/public/69ff930a3528037ceadeeade/d6873467d_Monkey.png";

// --- Inline Single-Player Games ---
function CoinFlipGame({ onFiveHeads }) {
  const [result, setResult] = useState(null);
  const [flipping, setFlipping] = useState(false);
  const [streak, setStreak] = useState(0);
  const [achieved, setAchieved] = useState(false);
  const flip = () => {
    setFlipping(true); setResult(null);
    setTimeout(() => {
      const r = Math.random() < 0.5 ? 'Heads' : 'Tails';
      setResult(r); setFlipping(false);
      if (r === 'Heads') {
        const ns = streak + 1; setStreak(ns);
        if (ns >= 5 && !achieved) { setAchieved(true); onFiveHeads?.(); }
      } else { setStreak(0); }
    }, 900);
  };
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <motion.div animate={flipping ? { rotateY: [0,180,360,540,720] } : {}} transition={{ duration: 0.9 }}
        className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-5xl shadow-xl">
        {flipping ? '🪙' : result === 'Heads' ? '👑' : result === 'Tails' ? '🦅' : '🪙'}
      </motion.div>
      {result && <p className="text-2xl font-extrabold">{result}!</p>}
      {streak > 0 && <p className="text-xs text-muted-foreground">🔥 Heads streak: {streak}</p>}
      {achieved && <p className="text-sm font-bold text-amber-500">🏆 Achievement unlocked!</p>}
      <Button onClick={flip} disabled={flipping} className="rounded-2xl px-10">{flipping ? 'Flipping…' : 'Flip!'}</Button>
    </div>
  );
}

const DICE = ['⚀','⚁','⚂','⚃','⚄','⚅'];
function DiceRollGame() {
  const [idx, setIdx] = useState(null);
  const [rolling, setRolling] = useState(false);
  const roll = () => {
    setRolling(true); let count = 0;
    const id = setInterval(() => { setIdx(Math.floor(Math.random()*6)); if (++count >= 10) { clearInterval(id); setRolling(false); } }, 90);
  };
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <motion.div animate={rolling ? { rotate:[0,30,-30,0] } : {}} transition={{ repeat: Infinity, duration: 0.3 }} className="text-9xl select-none">
        {idx !== null ? DICE[idx] : '🎲'}
      </motion.div>
      {idx !== null && !rolling && <p className="text-2xl font-extrabold">Rolled a {idx+1}!</p>}
      <Button onClick={roll} disabled={rolling} className="rounded-2xl px-10">{rolling ? 'Rolling…' : 'Roll!'}</Button>
    </div>
  );
}

function NumberGuesserGame({ onFirstTryWin }) {
  const [secret] = useState(() => Math.floor(Math.random()*100)+1);
  const [guess, setGuess] = useState('');
  const [hint, setHint] = useState('');
  const [won, setWon] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [achieved, setAchieved] = useState(false);
  const submit = () => {
    const n = parseInt(guess); if (!n||n<1||n>100) return;
    const na = attempts+1; setAttempts(na); setGuess('');
    if (n===secret) {
      setHint(`🎉 Correct! It was ${secret}!`); setWon(true);
      if (na===1&&!achieved) { setAchieved(true); onFirstTryWin?.(); }
    } else { setHint(n<secret?'📈 Go higher!':'📉 Go lower!'); }
  };
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="text-sm text-muted-foreground">Guess a number between 1 and 100</p>
      {attempts>0&&<p className="text-xs text-muted-foreground">Attempts: {attempts}</p>}
      {hint&&<p className="text-xl font-bold">{hint}</p>}
      {achieved&&<p className="text-sm font-bold text-amber-500">🏆 Achievement unlocked!</p>}
      {!won&&<div className="flex gap-2 w-full max-w-xs">
        <Input type="number" min={1} max={100} value={guess} onChange={e=>setGuess(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Your guess…" className="rounded-2xl"/>
        <Button onClick={submit} className="rounded-2xl">Go</Button>
      </div>}
    </div>
  );
}

// --- Game registries ---
const SOLO_GAMES = [
  { id:'tictactoe', name:'Vine\nClimber',       emoji:'🎯', desc:'Play vs the monkey', gradient:'from-emerald-500 to-green-700' },
  { id:'rps',       name:'Claw\nChallenge',      emoji:'🦎', desc:'Beat the monkey',    gradient:'from-lime-500 to-emerald-700' },
  { id:'chess',     name:'Jungle\nChess',         emoji:'♟️', desc:'Outsmart the monkey',gradient:'from-teal-500 to-cyan-700' },
  { id:'memory',    name:'Jungle\nMemory',        emoji:'🌴', desc:'Find the pairs',     gradient:'from-green-500 to-teal-700' },
  { id:'coinflip',  name:'Canopy\nCoin',          emoji:'🪙', desc:'Heads or tails?',    gradient:'from-yellow-500 to-amber-600' },
  { id:'dice',      name:'Monkey\nDice',          emoji:'🎲', desc:'Roll for luck',      gradient:'from-orange-500 to-amber-700' },
  { id:'numguess',  name:'Safari\nGuess',         emoji:'🐒', desc:'Guess 1–100',        gradient:'from-cyan-500 to-sky-700' },
  { id:'whackamole',name:'Banana\nBash',          emoji:'🍌', desc:'Whack those bananas!',gradient:'from-yellow-400 to-orange-500' },
];

const MULTI_GAMES = [
  { id:'chess',     name:'Jungle\nChess',         emoji:'♟️', desc:'2 players',          gradient:'from-teal-500 to-cyan-700' },
  { id:'tictactoe', name:'Vine\nClimber',         emoji:'🎯', desc:'2 players',          gradient:'from-emerald-500 to-green-700' },
  { id:'connect4',  name:'Banana\nDrop',          emoji:'🍌', desc:'2 players',          gradient:'from-yellow-500 to-amber-600' },
  { id:'checkers',  name:'Jungle\nCheckers',      emoji:'🟡', desc:'2 players',          gradient:'from-lime-500 to-green-700' },
  { id:'battleship',name:'River\nRaid',           emoji:'🚢', desc:'2 players',          gradient:'from-sky-500 to-blue-700' },
  { id:'darts',     name:'Dart\nFrogs',           emoji:'🎯', desc:'2–4 players',        gradient:'from-red-500 to-rose-700' },
  { id:'hippos',    name:'Hungry\nMonkeys',       emoji:'🦍', desc:'2–4 players',        gradient:'from-orange-500 to-amber-700' },
  { id:'bowling',   name:'Coconut\nBowling',      emoji:'🎳', desc:'2–4 players',        gradient:'from-amber-500 to-orange-600' },
  { id:'minigolf',  name:'Jungle\nPutt',          emoji:'⛳', desc:'2–4 players',        gradient:'from-green-500 to-emerald-700' },
];

const SOLO_TITLES = { tictactoe:'Vine Climber', rps:'Claw Challenge', chess:'Jungle Chess', memory:'Jungle Memory', coinflip:'Canopy Coin', dice:'Monkey Dice', numguess:'Safari Guess', whackamole:'Banana Bash 🍌' };
const MULTI_TITLES = { chess:'Jungle Chess', tictactoe:'Vine Climber', connect4:'Banana Drop', checkers:'Jungle Checkers', battleship:'River Raid', darts:'Dart Frogs', hippos:'Hungry Hungry Monkeys', bowling:'Coconut Bowling', minigolf:'Jungle Putt' };

const MP_COMPONENTS = { chess: MPChess, tictactoe: MPTicTacToe, connect4: MPConnect4, checkers: MPCheckers, battleship: MPBattleship, darts: MPDarts, hippos: MPHippos, bowling: MPBowling, minigolf: MPMiniGolf };
const MP_WIDE = new Set(['chess','battleship','checkers','connect4']);

export default function Games() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('solo');

  // Solo state
  const [activeSolo, setActiveSolo] = useState(null);
  const [achievedFiveHeads, setAchievedFiveHeads] = useState(false);
  const [achievedPerfectMemory, setAchievedPerfectMemory] = useState(false);
  const [achievedFirstTry, setAchievedFirstTry] = useState(false);

  // Multiplayer state
  const [lobbyGame, setLobbyGame] = useState(null);   // game type string — show lobby
  const [activeMultiGame, setActiveMultiGame] = useState(null); // live game object

  const handleMultiGameStart = (game) => {
    setLobbyGame(null);
    setActiveMultiGame(game);
  };

  const MPComp = activeMultiGame ? MP_COMPONENTS[activeMultiGame.game_type] : null;

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
            <motion.div key="solo" initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-10 }} transition={{ duration:0.2 }} className="grid grid-cols-3 gap-3">
              {SOLO_GAMES.map((game,i) => (
                <motion.button key={game.id} initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.06 }}
                  onClick={() => setActiveSolo(game.id)}
                  className={`flex flex-col items-center justify-center aspect-square rounded-2xl bg-gradient-to-br ${game.gradient} text-white shadow-md transition-transform active:scale-95 hover:scale-105`}>
                  <span className="text-3xl mb-1">{game.emoji}</span>
                  <span className="text-[10px] font-bold text-center leading-tight px-1 whitespace-pre-line">{game.name}</span>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div key="multi" initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-10 }} transition={{ duration:0.2 }} className="grid grid-cols-3 gap-3">
              {MULTI_GAMES.map((game,i) => (
                <motion.button key={game.id} initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.06 }}
                  onClick={() => setLobbyGame(game.id)}
                  className={`flex flex-col items-center justify-center aspect-square rounded-2xl bg-gradient-to-br ${game.gradient} text-white shadow-md transition-transform active:scale-95 hover:scale-105`}>
                  <span className="text-3xl mb-1">{game.emoji}</span>
                  <span className="text-[10px] font-bold text-center leading-tight px-1 whitespace-pre-line">{game.name}</span>
                  <span className="text-[9px] opacity-70 mt-0.5">{game.desc}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border flex z-20">
        <button onClick={() => setTab('solo')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab==='solo'?'text-primary border-t-2 border-primary':'text-muted-foreground'}`}>🐒 Single Player</button>
        <button onClick={() => setTab('multi')} className={`flex-1 py-3 text-sm font-bold transition-colors ${tab==='multi'?'text-primary border-t-2 border-primary':'text-muted-foreground'}`}>🌴 Multiplayer</button>
      </div>

      {/* Solo Game Dialog */}
      <Dialog open={!!activeSolo} onOpenChange={() => setActiveSolo(null)}>
        <DialogContent className={`${activeSolo === 'chess' ? 'max-w-[95vw] w-[520px]' : 'max-w-sm'} rounded-3xl`}>
          <DialogHeader>
            <DialogTitle className="text-center font-extrabold text-lg">{SOLO_TITLES[activeSolo]}</DialogTitle>
          </DialogHeader>
          {activeSolo === 'tictactoe' && <TicTacToeGame />}
          {activeSolo === 'rps'       && <RockPaperScissorsGame />}
          {activeSolo === 'chess'     && <ChessGame />}
          {activeSolo === 'memory'    && <MemoryMatchGame onPerfectGame={() => { setAchievedPerfectMemory(true); unlockGameAchievement('perfect_memory'); }} />}
          {activeSolo === 'coinflip'  && <CoinFlipGame onFiveHeads={() => { setAchievedFiveHeads(true); unlockGameAchievement('five_heads'); }} />}
          {activeSolo === 'dice'      && <DiceRollGame />}
          {activeSolo === 'numguess'  && <NumberGuesserGame onFirstTryWin={() => { setAchievedFirstTry(true); unlockGameAchievement('first_try_guess'); }} />}
          {activeSolo === 'whackamole'&& <WhackAMole />}
        </DialogContent>
      </Dialog>

      {/* Multiplayer Lobby Dialog */}
      <Dialog open={!!lobbyGame && !activeMultiGame} onOpenChange={() => setLobbyGame(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center font-extrabold text-lg">{MULTI_TITLES[lobbyGame]}</DialogTitle>
          </DialogHeader>
          {lobbyGame && <MultiplayerLobby gameType={lobbyGame} onStartGame={handleMultiGameStart} onClose={() => setLobbyGame(null)} />}
        </DialogContent>
      </Dialog>

      {/* Active Multiplayer Game Dialog */}
      <Dialog open={!!activeMultiGame} onOpenChange={() => setActiveMultiGame(null)}>
        <DialogContent className={`${MP_WIDE.has(activeMultiGame?.game_type) ? 'max-w-[95vw] w-[520px]' : 'max-w-sm'} rounded-3xl`}>
          <DialogHeader>
            <DialogTitle className="text-center font-extrabold text-lg">{MULTI_TITLES[activeMultiGame?.game_type]}</DialogTitle>
          </DialogHeader>
          {activeMultiGame && MPComp && (
            <MultiplayerWrapper game={activeMultiGame} GameComponent={MPComp} onClose={() => setActiveMultiGame(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}