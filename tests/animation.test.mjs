import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {playerSprite} from '../src/render.js';
import {sprites} from '../assets/game-data.js';

const empty=()=>new Game({walls:[],objects:[]});
const directions=[['left',-1,0],['right',1,0],['up',0,-1],['down',0,1]];

test('Successful walking cycles through four distinct native-size poses in every direction',()=>{
 for(const [name,dx,dy]of directions){
  const game=empty();game.player.x=12;game.player.y=10;
  const poses=[];
  for(let step=0;step<4;step++){
   assert.equal(game.move(dx,dy),true,name);
   const pose=playerSprite(game.player);
   assert.equal(pose.length,32,name);
   assert.ok(pose.every(byte=>Number.isInteger(byte)&&byte>=0&&byte<64),name);
   poses.push(JSON.stringify(pose));
   game.tick();
  }
  assert.equal(new Set(poses).size,4,name);
 }
});

test('Standing still returns to the original pose and stays still as the world advances',()=>{
 for(const [name,dx,dy]of directions){
  const game=empty();game.player.x=12;game.player.y=10;game.move(dx,dy);
  game.tick();game.tick();
  assert.equal(game.player.walking,false,name);
  const idle=playerSprite(game.player);
  assert.deepEqual(idle,sprites[name==='up'?'back':name==='down'?'front':name]);
  for(let i=0;i<8;i++){game.tick();assert.deepEqual(playerSprite(game.player),idle)}
 }
});

test('A blocked move stops the gait without consuming a step',()=>{
 const game=empty();game.move(1,0);
 const step=game.player.walkFrame;
 assert.equal(game.move(0,-1),false);
 assert.equal(game.player.walkFrame,step);
 assert.equal(game.player.walking,false);
 assert.deepEqual(playerSprite(game.player),sprites.back);
});

test('Changing direction starts a new gait facing the new direction',()=>{
 const game=empty();game.player.x=12;game.player.y=10;
 for(const [,dx,dy]of directions){
  game.move(dx,dy);
  assert.equal(game.player.walkFrame,1);
  assert.equal(game.player.dx,dx);assert.equal(game.player.dy,dy);
 }
});
