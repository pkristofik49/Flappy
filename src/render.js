import { sprites } from '../assets/game-data.js';
// The remaster distinguishes these objects by colour, but their monochrome
// bitmaps are identical. Keep the original outline and give the target egg
// a solid white interior; ordinary stones retain their stippled texture.
const targetEgg = sprites.egg.slice();
for (let row = 0; row < 16; row++) {
  const pixels = sprites.egg[row * 2] | (sprites.egg[row * 2 + 1] << 6);
  if (!pixels) continue;
  let first = 0, last = 11;
  while (!(pixels & (1 << first))) first++;
  while (!(pixels & (1 << last))) last--;
  const solid = ((1 << (last - first + 1)) - 1) << first;
  targetEgg[row * 2] = solid & 63;
  targetEgg[row * 2 + 1] = (solid >> 6) & 63;
}
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
  for(const r of game.rocks)bitmap(ctx,r.egg?targetEgg:sprites.rock,r.x*6,r.y*8);
  for(const e of game.enemies){bitmap(ctx,sprites[e.type],e.x*6,e.y*8,2,16,e.sleep?'#6f7c60':'#dfe7d5',e.dx<0);if(e.sleep){ctx.fillStyle='#b4c49e';ctx.font='6px monospace';ctx.fillText('z',e.x*6+10,e.y*8+1)}}
  const p=game.player;const sprite=p.dx<0?'left':p.dx>0?'right':p.dy<0?'back':game.ticks%4<2?'walk1':'walk2';
  bitmap(ctx,sprites[sprite],p.x*6,p.y*8);
  for(const s of game.shots)bitmap(ctx,[12,30,63,12,12,0,0,0],s.x*6,s.y*8,1,8);
}
