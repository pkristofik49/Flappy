import { sprites } from '../assets/game-data.js';
import {translations} from './translations.js';
import {pixelText} from './pixel-font.js';
import {modernSprite,modernPlayerFrame,modernEnemyFrame} from './graphics.js';
export const HUD_HEIGHT=24,CANVAS_WIDTH=240,CANVAS_HEIGHT=200;
const mushroomSprite=[12,30,63,63,12,12,12,0];
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
  if(player.crushed)return {data:sprites.playerCrushed,width:2,height:8,x:0,y:8};
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
function brick(ctx,x,y){
  for(let row=0;row<8;row++){if(row===3||row===7)continue;for(let col=0;col<6;col++)if(col!==(row<3?0:3))ctx.fillRect(x+col,y+row,1,1)}
}
const palettes={
  mono:{background:'#000',wall:'#bfc5b9',player:'#eef0e5',rock:'#eef0e5',egg:'#eef0e5',frog:'#dfe7d5',ghost:'#dfe7d5',mushroom:'#eef0e5',sleep:'#6f7c60',goal:'#fafcf3',goalLine:'#5e6a51',text:'#eef0e5',credit:'#aab2a2'},
  color:{background:'#000',wall:'#ef7777',player:'#ffe85c',rock:'#dddbe6',egg:'#64dcff',frog:'#72e06a',ghost:'#eb8fff',mushroom:'#ffe85c',sleep:'#687c9a',goal:'#64dcff',goalLine:'#226c9f',text:'#fff0ae',credit:'#72e06a'},
  modern:{background:'#121c29',wall:'#a95239',text:'#f4e8bb',credit:'#9bbdba',goal:'#57dec8',goalLine:'#176c68'}
};
function wall(ctx,x,y,palette,modern){
  ctx.fillStyle=palette.wall;
  if(!modern){brick(ctx,x,y);return}
  // Two courses of long clay bricks, with half-brick staggered mortar joints.
  // Clip each native cell so adjacent cells form a continuous masonry pattern.
  ctx.save();ctx.beginPath();ctx.rect(x,y,6,8);ctx.clip();
  ctx.fillStyle='#49312c';ctx.fillRect(x,y,6,8);
  for(let row=0;row<2;row++){
    const top=y+row*4,offset=row*3;
    for(let left=x-offset;left<x+6;left+=6){
      const shade=Math.abs(Math.floor(left/3+top/4))%3;
      ctx.fillStyle=['#a95239','#b35c40','#9e4835'][shade];ctx.fillRect(left+.25,top+.3,5.5,3.4);
      ctx.fillStyle='#d18158';ctx.fillRect(left+.45,top+.45,5.1,.3);
      ctx.fillStyle='#773b2e';ctx.fillRect(left+.45,top+3.25,5.1,.3);
    }
  }
  ctx.restore();
}
function drawHud(ctx,game,{scene=1,lives=5,timeText='6:00',sectorLabel=translations.cs['game.scene'],timeLabel=translations.cs['game.time'],credit=translations.cs['game.boardCredit']}={},palette=palettes.mono,atlas=null){
  for(let x=0;x<CANVAS_WIDTH;x+=6)wall(ctx,x,0,palette,atlas);
  for(const x of [0,66,162,234])for(const y of [8,16])wall(ctx,x,y,palette,atlas);
  const reserves=Math.max(0,Math.min(5,lives-(game.state==='dead'?0:1)));
  for(let i=0;i<reserves;i++){
    const x=6+(i+(game.entry?1:0))*12;
    if(atlas)modernSprite(ctx,atlas,4,x,8,11,16);else bitmap(ctx,sprites.front,x,8,2,16,palette.player);
  }
  pixelText(ctx,sectorLabel,78,8,palette.text);pixelText(ctx,String(scene).padStart(3,'0'),138,8,palette.text);
  for(let i=0;i<game.ammo;i++){
    if(atlas)modernSprite(ctx,atlas,15,78+i*8,16,6,7);else bitmap(ctx,mushroomSprite,78+i*8,16,1,8,palette.mushroom);
  }
  pixelText(ctx,timeLabel,174,8,palette.text);pixelText(ctx,timeText,210,8,palette.text);
  pixelText(ctx,credit,174,16,palette.credit);
}
export function render(ctx,game,sleepMarker=translations.cs['game.sleepMarker'],hud,transition=null,graphics={}){
  const mode=graphics.mode==='modern'&&!graphics.atlas?'color':graphics.mode??'mono';
  const atlas=mode==='modern'?graphics.atlas:null,palette=palettes[mode]??palettes.mono,scale=atlas?4:1;
  if(ctx.canvas.width!==CANVAS_WIDTH*scale)ctx.canvas.width=CANVAS_WIDTH*scale;
  if(ctx.canvas.height!==CANVAS_HEIGHT*scale)ctx.canvas.height=CANVAS_HEIGHT*scale;
  ctx.save();ctx.scale(scale,scale);
  ctx.imageSmoothingEnabled=Boolean(atlas);ctx.imageSmoothingQuality='high';ctx.fillStyle=palette.background;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  drawHud(ctx,game,hud,palette,atlas);
  ctx.save();ctx.translate(0,HUD_HEIGHT);
  // PMD's native character cell is 6 × 8 pixels.
  for(const cell of game.walls){const [x,y]=cell.split(',').map(Number);wall(ctx,x*6,y*8,palette,atlas)}
  if(game.goal){const{x,y}=game.goal;ctx.fillStyle=palette.goal;ctx.fillRect(x*6,y*8,12,8);ctx.fillStyle=palette.goalLine;for(let i=0;i<12;i+=2)ctx.fillRect(x*6+i,y*8,1,8)}
  for(const m of game.mushrooms){if(atlas)modernSprite(ctx,atlas,15,m.x*6,m.y*8,6,8);else bitmap(ctx,mushroomSprite,m.x*6,m.y*8,1,8,palette.mushroom)}
  for(const r of game.rocks){if(atlas)modernSprite(ctx,atlas,r.egg?13:14,r.x*6,r.y*8,12,16);else bitmap(ctx,r.egg?targetEgg:sprites.rock,r.x*6,r.y*8,2,16,r.egg?palette.egg:palette.rock)}
  for(const e of [...game.enemies,...game.corpses]){
    const pose=enemySprite(e,game.ticks);
    if(atlas){
      const hopping=!e.sleep&&!e.crushed&&game.ticks-e.stepTick<2;
      modernSprite(ctx,atlas,modernEnemyFrame(e),e.x*6,e.y*8+(e.crushed?4:hopping?-1:0),12,e.crushed?4:hopping?17:16,{flip:e.type!=='frog'&&e.dx>0,opacity:e.sleep ? .5 : 1});
    }else bitmap(ctx,pose.data,e.x*6+pose.x,e.y*8+pose.y,pose.width,pose.height,e.sleep?palette.sleep:palette[e.type],pose.flip);
    if(e.sleep){ctx.fillStyle='#b4c49e';ctx.font='6px monospace';ctx.fillText(sleepMarker,e.x*6+10,e.y*8+1)}
  }
  const p=game.player;
  const pose=playerPose(p);
  if((!transition||transition.playerVisible)&&(game.state!=='dead'||graphics.showDeadPlayer!==false)){
    if(atlas)modernSprite(ctx,atlas,modernPlayerFrame(p),p.x*6,p.y*8+pose.y,12,pose.height);
    else bitmap(ctx,pose.data,p.x*6+pose.x,p.y*8+pose.y,pose.width,pose.height,palette.player);
  }
  for(const s of game.shots){if(atlas)modernSprite(ctx,atlas,15,s.x*6,s.y*8,6,7);else bitmap(ctx,[12,30,63,12,12,0,0,0],s.x*6,s.y*8,1,8,palette.mushroom)}
  if(transition)for(let i=transition.firstCoveredCell;i<transition.firstCoveredCell+transition.coveredCells;i++){
    const x=(i%40)*6,y=Math.floor(i/40)*8;
    ctx.fillStyle=palette.background;ctx.fillRect(x,y,6,8);
    wall(ctx,x,y,palette,atlas);
  }
  ctx.restore();
  ctx.restore();
}
