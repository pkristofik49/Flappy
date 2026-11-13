import { sprites } from '../assets/game-data.js';
export function bitmap(ctx,data,x,y,width=2,height=16,color='#eef0e5',flip=false){
  ctx.fillStyle=color;
  for(let row=0;row<height;row++)for(let col=0;col<width;col++)for(let bit=0;bit<6;bit++)if(data[row*width+col]&(1<<bit))ctx.fillRect(x+(flip?width*6-1-(col*6+bit):col*6+bit),y+row,1,1);
}
export function render(ctx,game){
  ctx.imageSmoothingEnabled=false;ctx.fillStyle='#000';ctx.fillRect(0,0,240,176);
  // PMD's native character cell is 6 × 8 pixels.
  ctx.fillStyle='#bfc5b9';
  for(const cell of game.walls){const [x,y]=cell.split(',').map(Number);for(let row=0;row<8;row++){if(row===3||row===7)continue;for(let col=0;col<6;col++){if(col===(row<3?0:3))continue;ctx.fillRect(x*6+col,y*8+row,1,1)}}}
  if(game.goal){const{x,y}=game.goal;ctx.fillStyle='#fafcf3';ctx.fillRect(x*6,y*8,12,8);ctx.fillStyle='#5e6a51';for(let i=0;i<12;i+=2)ctx.fillRect(x*6+i,y*8,1,8)}
  for(const m of game.mushrooms)bitmap(ctx,[12,30,63,63,12,12,12,0],m.x*6,m.y*8,1,8);
  for(const r of game.rocks){bitmap(ctx,sprites[r.egg?'egg':'rock'],r.x*6,r.y*8);if(r.egg){ctx.fillStyle='#fff';ctx.fillRect(r.x*6+5,r.y*8+2,2,2)}}
  for(const e of game.enemies){bitmap(ctx,sprites[e.type],e.x*6,e.y*8,2,16,e.sleep?'#6f7c60':'#dfe7d5',e.dx<0);if(e.sleep){ctx.fillStyle='#b4c49e';ctx.font='6px monospace';ctx.fillText('z',e.x*6+10,e.y*8+1)}}
  const p=game.player;const sprite=p.dx<0?'left':p.dx>0?'right':p.dy<0?'back':game.ticks%4<2?'walk1':'walk2';
  bitmap(ctx,sprites[sprite],p.x*6,p.y*8);
  for(const s of game.shots)bitmap(ctx,[12,30,63,12,12,0,0,0],s.x*6,s.y*8,1,8);
}
