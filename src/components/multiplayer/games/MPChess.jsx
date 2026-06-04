// Multiplayer Chess — reuses move logic, synced via onUpdateState
const PIECES = { wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟' };

function initBoard() {
  const b=Array(8).fill(null).map(()=>Array(8).fill(null));
  const back=['R','N','B','Q','K','B','N','R'];
  back.forEach((p,i)=>{b[0][i]='b'+p;b[7][i]='w'+p;});
  for(let i=0;i<8;i++){b[1][i]='bP';b[6][i]='wP';}
  return b;
}
function color(p){return p?p[0]:null;}
function inBounds(r,c){return r>=0&&r<8&&c>=0&&c<8;}
function getMoves(board,r,c){
  const p=board[r][c];if(!p)return[];
  const col=p[0],type=p[1],moves=[];
  const slide=(dr,dc)=>{let nr=r+dr,nc=c+dc;while(inBounds(nr,nc)&&color(board[nr][nc])!==col){moves.push([nr,nc]);if(board[nr][nc])break;nr+=dr;nc+=dc;}};
  if(type==='P'){const dir=col==='w'?-1:1;if(inBounds(r+dir,c)&&!board[r+dir][c]){moves.push([r+dir,c]);const s=col==='w'?6:1;if(r===s&&!board[r+2*dir][c])moves.push([r+2*dir,c]);}[-1,1].forEach(dc=>{if(inBounds(r+dir,c+dc)&&board[r+dir][c+dc]&&color(board[r+dir][c+dc])!==col)moves.push([r+dir,c+dc]);});}
  else if(type==='N'){[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>{if(inBounds(r+dr,c+dc)&&color(board[r+dr][c+dc])!==col)moves.push([r+dr,c+dc]);});}
  else if(type==='B'){[[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc));}
  else if(type==='R'){[[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc));}
  else if(type==='Q'){[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc));}
  else if(type==='K'){[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>{if(inBounds(r+dr,c+dc)&&color(board[r+dr][c+dc])!==col)moves.push([r+dr,c+dc]);});}
  return moves;
}

export default function MPChess({ gameState, players, myIndex, isMyTurn, onUpdateState }) {
  const myColor = myIndex === 0 ? 'w' : 'b';
  const board = gameState.board || initBoard();
  const selected = gameState.selected || null;
  const validMoves = gameState.validMoves || [];

  const handleClick = (r, c) => {
    if (!isMyTurn) return;
    if (selected) {
      const move = validMoves.find(([nr,nc])=>nr===r&&nc===c);
      if (move) {
        const nb = board.map(row=>[...row]);
        nb[r][c]=nb[selected[0]][selected[1]];
        nb[selected[0]][selected[1]]=null;
        if(nb[r][c]==='wP'&&r===0)nb[r][c]='wQ';
        if(nb[r][c]==='bP'&&r===7)nb[r][c]='bQ';
        const oppKing = myColor==='w'?'bK':'wK';
        let kingFound=false;
        for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++)if(nb[rr][cc]===oppKing)kingFound=true;
        const next=players[myIndex===0?1:0];
        onUpdateState(
          {board:nb,selected:null,validMoves:[]},
          !kingFound?players[myIndex].email:next.email,
          !kingFound?players[myIndex]:null
        );
        return;
      }
      onUpdateState({board,selected:null,validMoves:[]},players[myIndex].email,null);
    }
    if(color(board[r][c])===myColor){
      const moves=getMoves(board,r,c);
      onUpdateState({board,selected:[r,c],validMoves:moves},players[myIndex].email,null);
    }
  };

  const cellSize='clamp(34px,calc((min(90vw,480px)-24px)/8),56px)';
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {isMyTurn?<p className="text-xs font-bold text-primary">Your turn ({myColor==='w'?'White':'Black'})</p>
        :<p className="text-xs text-muted-foreground animate-pulse">Waiting for opponent…</p>}
      <div className="grid grid-cols-8 border-2 border-border rounded-xl overflow-hidden w-full">
        {board.map((row,r)=>row.map((piece,c)=>{
          const light=(r+c)%2===0;
          const isSel=selected&&selected[0]===r&&selected[1]===c;
          const isValid=validMoves.some(([nr,nc])=>nr===r&&nc===c);
          return(
            <div key={r+','+c} onClick={()=>handleClick(r,c)}
              style={{width:cellSize,height:cellSize,fontSize:'clamp(16px,3vw,28px)'}}
              className={`flex items-center justify-center cursor-pointer select-none transition-colors
                ${light?'bg-amber-100':'bg-amber-800'}
                ${isSel?'ring-2 ring-inset ring-yellow-400':''}
                ${isValid?'ring-2 ring-inset ring-primary/80':''}`}>
              {piece?PIECES[piece]:(isValid?<span className="w-2 h-2 rounded-full bg-primary/50 block"/>:'')}
            </div>
          );
        }))}
      </div>
    </div>
  );
}