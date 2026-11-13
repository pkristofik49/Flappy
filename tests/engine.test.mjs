import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {levels} from '../assets/game-data.js';
const level=(objects=[],walls=[])=>({objects:[{type:2,x:15,y:10},{type:6,x:25,y:21},...objects],walls});
test('All 200 original scenes load with an accessible spawn',()=>{
 for(const[n,l]of levels.entries()){const g=new Game(l);assert.ok(!g.wallAt(g.player),`Scene ${n+1}`);assert.ok(!g.rockAt(g.player),`Scene ${n+1}`)}
});

test('Scene 2: the egg remains on its supporting stone at the start',()=>{
 const g=new Game(levels[1]);
 const egg=g.rocks.find(r=>r.egg);
 const start={x:egg.x,y:egg.y};
 for(let i=0;i<30;i++)g.tick();
 assert.deepEqual({x:egg.x,y:egg.y},start);
 assert.equal(egg.falling,false);
});

test('Supported eggs and stones never roll sideways, even with space on both sides',()=>{
 for(const type of [2,3]){
  const g=new Game({walls:[],objects:[{type,x:10,y:17},{type:3,x:10,y:19}]});
  const top=g.rocks[0];
  for(let i=0;i<10;i++)g.tick();
  assert.deepEqual({x:top.x,y:top.y},{x:10,y:17});
  assert.equal(top.falling,false);
 }
});

test('An egg falls straight down once its supporting stone is pushed away',()=>{
 const g=new Game({walls:[],objects:[{type:2,x:10,y:17},{type:3,x:10,y:19}]});
 const egg=g.rocks[0];
 g.player.x=8;g.player.y=19;
 assert.equal(g.move(1,0),true);g.tick();
 assert.equal(egg.y,17,'Partial support still holds the egg');
 assert.equal(g.move(1,0),true);
 // Step out from underneath the egg before advancing gravity.
 assert.equal(g.move(-1,0),true);assert.equal(g.move(-1,0),true);
 g.tick();
 assert.equal(egg.x,10);
 assert.equal(egg.y,18);
 assert.equal(egg.falling,true);
});
test('Player cannot move through a wall or push vertically',()=>{
 const g=new Game(level([{type:3,x:1,y:3}],[[3,1]]));assert.equal(g.move(1,0),false);assert.equal(g.move(0,1),false);assert.equal(g.player.x,1);assert.equal(g.player.y,1);
});
test('Horizontal push moves a stone, a blocked ordinary stone breaks',()=>{
 const g=new Game(level([{type:3,x:3,y:1}],[[6,1]]));assert.equal(g.move(1,0),true);assert.equal(g.rocks.find(r=>!r.egg).x,4);assert.equal(g.move(1,0),false);assert.equal(g.rocks.filter(r=>!r.egg).length,0);
});
test('The objective egg cannot be destroyed against a wall',()=>{
 const g=new Game({walls:[[5,1]],objects:[{type:2,x:3,y:1},{type:6,x:3,y:21}]});assert.equal(g.move(1,0),false);assert.equal(g.rocks.length,1);
});

test('Holding a direction after pushing a stone off a ledge does not delete it',()=>{
 const g=new Game(level([{type:3,x:3,y:1}],[[6,2]]));
 const stone=g.rocks.find(r=>!r.egg);
 assert.equal(g.move(1,0),true);
 g.tick();
 assert.equal(stone.y,2);
 assert.equal(g.move(1,0),false);
 assert.ok(g.rocks.includes(stone));
 assert.equal(stone.x,4);
});

test('Touching the corner of a stone cannot push or break it',()=>{
 for(const walls of [[],[[5,3]]]){
  const g=new Game(level([{type:3,x:3,y:3}],walls));
  g.player.y=2;
  const stone=g.rocks.find(r=>!r.egg);
  assert.equal(g.move(1,0),false);
  assert.ok(g.rocks.includes(stone));
  assert.equal(stone.x,3);
 }
});

test('A falling stone cannot be crushed by a horizontal push',()=>{
 const g=new Game(level([{type:3,x:3,y:3}],[[5,3]]));
 g.player.y=3;
 const stone=g.rocks.find(r=>!r.egg);stone.falling=true;
 assert.equal(g.move(1,0),false);
 assert.ok(g.rocks.includes(stone));
});
test('A falling stone crushes the player',()=>{
 const g=new Game(level([{type:3,x:5,y:1}]));g.player.x=5;g.player.y=3;g.tick();assert.equal(g.state,'dead');
});
test('A falling stone removes an enemy',()=>{
 const g=new Game(level([{type:3,x:5,y:1},{type:5,x:5,y:3}]));g.tick();assert.equal(g.enemies.length,0);
});
test('Egg resting above the goal completes the scene',()=>{
 const g=new Game({walls:[],objects:[{type:2,x:15,y:19},{type:6,x:15,y:21}]});g.tick();assert.equal(g.state,'won');
});
test('A mushroom is collected once and a shot stuns an enemy',()=>{
 const g=new Game(level([{type:1,x:3,y:1},{type:5,x:5,y:1}]));g.move(1,0);assert.equal(g.ammo,1);g.move(-1,0);g.move(1,0);assert.equal(g.ammo,1);g.fire();for(let i=0;i<3;i++)g.tick();assert.equal(g.ammo,0);assert.ok(g.enemies[0].sleep>0);assert.equal(g.state,'playing');
});
test('All scenes remain inside the board during simulation',()=>{
 for(const l of levels){const g=new Game(l);for(let i=0;i<100&&g.state==='playing';i++)g.tick();for(const r of g.rocks)assert.ok(r.x>=0&&r.x+2<=40&&r.y>=0&&r.y+2<=22)}
});
