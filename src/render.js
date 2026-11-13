import { sprites } from '../assets/game-data.js';
import {translations} from './translations.js';
// Preserve the native head and body. Two opposing steps use a raised body
// and alternate the planted foot; the in-between poses bring the feet together.
function stride(base,phase){
  const frame=new Array(32).fill(0);
  const lift=phase%2;
  for(let row=0;row<14;row++){
    const source=row+lift;
    if(source<15){frame[row*2]=base[source*2];frame[row*2+1]=base[source*2+1]}
  }
  const feet=phase===1?[14,28,7,0]:phase===3?[14,28,0,56]:[24,6,48,3];
  for(let i=0;i<4;i++)frame[28+i]=feet[i];
  return frame;
}
const walkingSprites={
  down:[sprites.front,sprites.walk1,stride(sprites.front,2),sprites.walk2],
  up:[sprites.back,stride(sprites.back,1),stride(sprites.back,2),stride(sprites.back,3)],
  left:[sprites.left,sprites.leftStep,sprites.left,sprites.leftStep],
  right:[sprites.right,sprites.rightStep,sprites.right,sprites.rightStep]
};
export function playerSprite(player){
  const direction=player.dx<0?'left':player.dx>0?'right':player.dy<0?'up':'down';
  return walkingSprites[direction][player.walking?player.walkFrame:0];
}
export function playerPose(player){
  const data=playerSprite(player);
  const width=data.length/16;
  // Native side-step frames span three PMD cells, including the previous position.
  return {data,width,height:16,x:width===3&&player.dx>0?-6:0,y:0};
}
const frogPoses={
  down:{idle:sprites.frog,step:sprites.frogDownStep,width:2,height:24,x:0,y:-8},
  up:{idle:sprites.frogUp,step:sprites.frogUpStep,width:2,height:24,x:0,y:0},
  left:{idle:sprites.frogLeft,step:sprites.frogLeftStep,width:3,height:16,x:0,y:0},
  right:{idle:sprites.frogRight,step:sprites.frogRightStep,width:3,height:16,x:-6,y:0}
};
export function enemySprite(enemy,ticks){
  if(enemy.crushed)return {data:sprites[enemy.type+'Crushed'],width:2,height:8,x:0,y:0,flip:false};
  if(enemy.type!=='frog')return {data:sprites.ghost,width:2,height:16,x:0,y:0,flip:enemy.dx>0};
  const direction=enemy.dx<0?'left':enemy.dx>0?'right':enemy.dy<0?'up':'down';
  const pose=frogPoses[direction];
  const hopping=!enemy.sleep&&Number.isInteger(enemy.stepTick)&&ticks>=enemy.stepTick&&ticks-enemy.stepTick<2;
  return hopping?{data:pose.step,width:pose.width,height:pose.height,x:pose.x,y:pose.y,flip:false}
    :{data:pose.idle,width:2,height:16,x:0,y:0,flip:false};
}
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
export function render(ctx,game,sleepMarker=translations.cs['game.sleepMarker']){
  ctx.imageSmoothingEnabled=false;ctx.fillStyle='#000';ctx.fillRect(0,0,240,176);
  // PMD's native character cell is 6 × 8 pixels.
  ctx.fillStyle='#bfc5b9';
  for(const cell of game.walls){const [x,y]=cell.split(',').map(Number);for(let row=0;row<8;row++){if(row===3||row===7)continue;for(let col=0;col<6;col++){if(col===(row<3?0:3))continue;ctx.fillRect(x*6+col,y*8+row,1,1)}}}
  if(game.goal){const{x,y}=game.goal;ctx.fillStyle='#fafcf3';ctx.fillRect(x*6,y*8,12,8);ctx.fillStyle='#5e6a51';for(let i=0;i<12;i+=2)ctx.fillRect(x*6+i,y*8,1,8)}
  for(const m of game.mushrooms)bitmap(ctx,[12,30,63,63,12,12,12,0],m.x*6,m.y*8,1,8);
  for(const r of game.rocks)bitmap(ctx,r.egg?targetEgg:sprites.rock,r.x*6,r.y*8);
  for(const e of [...game.enemies,...game.corpses]){
    const pose=enemySprite(e,game.ticks);
    bitmap(ctx,pose.data,e.x*6+pose.x,e.y*8+pose.y,pose.width,pose.height,e.sleep?'#6f7c60':'#dfe7d5',pose.flip);
    if(e.sleep){ctx.fillStyle='#b4c49e';ctx.font='6px monospace';ctx.fillText(sleepMarker,e.x*6+10,e.y*8+1)}
  }
  const p=game.player;
  const pose=playerPose(p);
  bitmap(ctx,pose.data,p.x*6+pose.x,p.y*8+pose.y,pose.width,pose.height);
  for(const s of game.shots)bitmap(ctx,[12,30,63,12,12,0,0,0],s.x*6,s.y*8,1,8);
}
