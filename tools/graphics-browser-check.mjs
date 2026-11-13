// Real browser rendering, storage and offline checks using only Node and Chrome CDP.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0,saved;const pending=new Map(),errors=[];
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)});
function call(method,params={}){return new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))})}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(80)}throw Error('Timed out: '+expression)}
async function key(code,key=code){await call('Input.dispatchKeyEvent',{type:'keyDown',code,key});await call('Input.dispatchKeyEvent',{type:'keyUp',code,key})}
async function choose(mode){
 if(!await evaluate(`document.querySelector('.graphics-menu-toggle').getAttribute('aria-expanded')==='true'`))await key('KeyG','g');
 await until(`document.querySelector('.graphics-menu-toggle').getAttribute('aria-expanded')==='true'`);
 await until(`!document.querySelector('button[data-graphics="${mode}"]').disabled`);
 await evaluate(`document.querySelector('button[data-graphics="${mode}"]').click()`);
 await until(`document.querySelector('canvas').dataset.graphics==='${mode}' && document.querySelector('.graphics-menu-toggle').getAttribute('aria-expanded')==='false'`);
}
const width=()=>evaluate(`document.querySelector('canvas').width`);
const board=()=>evaluate(`document.querySelector('canvas').toDataURL()`);
function saveImage(name,data){fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/'+name,Buffer.from(data.split(',')[1],'base64'))}
try{
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');await call('Network.setBypassServiceWorker',{bypass:false});
 const url=process.argv[2]||'http://127.0.0.1:4173/Flappy/';
 await call('Storage.clearDataForOrigin',{origin:new URL(url).origin,storageTypes:'service_workers,cache_storage'});
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await call('Emulation.setTouchEmulationEnabled',{enabled:false});
 await call('Page.navigate',{url});await until(`!!document.querySelector('.graphics-menu-toggle') && !document.querySelector('#app').hasAttribute('v-cloak')`);
 saved=await evaluate(`JSON.stringify({...localStorage})`);
 await evaluate(`localStorage.setItem('flappy.graphics','mono');localStorage.setItem('flappy.language','cs');localStorage.setItem('flappy-pmd85-progress-v1',JSON.stringify({scene:1,unlocked:1}))`);
 await call('Page.reload');await until(`document.querySelector('canvas')?.dataset.graphics==='mono'`);
 const title=await evaluate(`document.querySelector('.title-screen img').getAttribute('src')`);
 await key('KeyG','g');await until(`document.activeElement?.dataset.graphics==='mono'`);
 await key('ArrowDown');await key('Enter');await until(`document.querySelector('canvas').dataset.graphics==='color'`);
 assert.equal(await width(),240);assert.equal(await evaluate(`document.querySelector('canvas').dataset.state`),'ready');
 assert.equal(await evaluate(`document.querySelector('.title-screen img').getAttribute('src')`),title);
 await choose('mono');await evaluate(`document.querySelector('.title-screen').focus()`);await key('Space',' ');
 await until(`document.querySelector('canvas').dataset.state==='playing'`);await key('KeyP','p');
 await until(`document.querySelector('canvas').dataset.state==='paused'`);
 const before=await board(),time=await evaluate(`document.querySelector('.game-hud span:last-child b').textContent`);
 await choose('color');assert.notEqual(await board(),before);saveImage('original-colour.png',await board());
 await choose('modern');assert.equal(await width(),960);assert.equal(await evaluate(`document.querySelector('canvas').height`),800);
 saveImage('modern-board.png',await board());
 const atlas=await evaluate(`import('./src/graphics.js').then(async m=>{const a=await m.loadModernSprites(),c=document.createElement('canvas');c.width=a.image.naturalWidth;c.height=a.image.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(a.image,0,0);const alphas=[];for(let y=0;y<4;y++)for(let x=0;x<4;x++)alphas.push(ctx.getImageData(Math.floor(x*c.width/4),Math.floor(y*c.height/4),1,1).data[3]);return{width:c.width,height:c.height,frames:a.frames,alphas}})`);
 assert.equal(atlas.frames.length,16);assert.ok(atlas.frames.every(f=>f.width>100&&f.height>100&&f.x>=0&&f.y>=0&&f.x+f.width<=atlas.width&&f.y+f.height<=atlas.height));
 assert.ok(atlas.alphas.every(alpha=>alpha===0),'Sprite gutters must be transparent without pale rectangles');
 const deaths=await evaluate(`(async()=>{
  const {Game}=await import('./src/engine.js'),{render,HUD_HEIGHT}=await import('./src/render.js'),{loadModernSprites}=await import('./src/graphics.js');
  const atlas=await loadModernSprites(),results=[],strip=document.createElement('canvas');strip.width=288;strip.height=320;
  const preview=strip.getContext('2d');preview.imageSmoothingEnabled=false;
  for(const [column,mode]of ['mono','color','modern'].entries())for(const [row,cause]of ['enemy','falling'].entries()){
   const game=new Game({walls:[],objects:cause==='enemy'?[{type:5,x:3,y:1}]:[{type:3,x:5,y:1}]});
   if(cause==='enemy')game.move(1,0);else{game.player.x=5;game.player.y=3;game.tick()}
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),scale=mode==='modern'?4:1;
   render(ctx,game,undefined,undefined,null,{mode,atlas});
   const x=game.player.x*6,y=HUD_HEIGHT+game.player.y*8;
   const shown=ctx.getImageData(x*scale,y*scale,12*scale,16*scale).data;
   preview.drawImage(canvas,(x-6)*scale,(y-16)*scale,24*scale,40*scale,column*96,row*160,96,160);
   render(ctx,game,undefined,undefined,null,{mode,atlas,showDeadPlayer:false});
   const hidden=ctx.getImageData(x*scale,y*scale,12*scale,16*scale).data;
   let upper=0,lower=0;for(let i=0;i<shown.length;i++)if(shown[i]!==hidden[i]){if(i<12*scale*8*scale*4)upper++;else lower++}
   results.push({mode,cause,reason:game.reason,upper,lower});
  }
  return{results,image:strip.toDataURL()};
 })()`);
 assert.ok(deaths.results.every(r=>r.reason==='death.'+r.cause&&r.upper===0&&r.lower>0),'Both death causes must show only the flattened bottom half in every style');
 saveImage('player-deaths-all-styles.png',deaths.image);
 const animation=await evaluate(`(async()=>{
  const {Game}=await import('./src/engine.js'),{Motion}=await import('./src/motion.js'),{render}=await import('./src/render.js'),{loadModernSprites}=await import('./src/graphics.js');
  const atlas=await loadModernSprites(),game=new Game({walls:[],objects:[{type:2,x:12,y:1},{type:3,x:9,y:1},{type:4,x:15,y:5},{type:5,x:20,y:5}]});
  game.ammo=1;game.fire();game.ticks=4;game.random=()=>1;
  const motion=new Motion();motion.reset(game);game.move(1,0);game.tick();motion.capture(game);
  const before=JSON.stringify(game),objects=[game.player,...game.rocks,...game.enemies,...game.shots];
  const board=document.createElement('canvas'),ctx=board.getContext('2d'),strip=document.createElement('canvas');strip.width=960;strip.height=267;
  const images=[];let mid=[];
  for(const [i,delta]of [0,60,120].entries()){
   motion.advance(delta);render(ctx,game,undefined,undefined,null,{mode:'modern',atlas,motion});images.push(board.toDataURL());
   strip.getContext('2d').drawImage(board,i*320,0,320,267);
   if(i===1)mid=objects.map(o=>motion.position(o));
  }
  return{image:strip.toDataURL(),unique:new Set(images).size,mid,unchanged:JSON.stringify(game)===before};
 })()`);
 assert.equal(animation.unique,3);assert.equal(animation.unchanged,true);
 assert.ok(animation.mid.every(p=>p.moving&&(!Number.isInteger(p.x)||!Number.isInteger(p.y))),'Player, crystal, stone, frog, ghost and shot must all render between grid cells');
 saveImage('smooth-motion.png',animation.image);
 assert.equal(await evaluate(`document.querySelector('canvas').dataset.state`),'paused');
 assert.equal(await evaluate(`document.querySelector('.game-hud span:last-child b').textContent`),time);
 await choose('mono');assert.equal(await width(),240);assert.equal(await board(),before,'Changing all three styles must preserve the paused world exactly');
 await key('KeyG','g');await until(`document.querySelector('.graphics-menu-toggle').getAttribute('aria-expanded')==='true'`);
 await key('KeyL','l');await until(`document.activeElement?.dataset.language==='cs'`);
 assert.equal(await evaluate(`document.querySelector('.graphics-menu-toggle').getAttribute('aria-expanded')`),'false');
 await key('KeyG','g');await until(`document.activeElement?.dataset.graphics==='mono'`);await key('Escape');
 await key('KeyP','p');await until(`document.querySelector('canvas').dataset.state==='playing'`);
 await key('KeyG','g');await until(`document.querySelector('canvas').dataset.state==='paused'`);
 const frozen=await board();await delay(250);assert.equal(await board(),frozen);
 await key('Escape');await until(`document.querySelector('canvas').dataset.state==='playing'`);
 await choose('modern');await evaluate(`navigator.serviceWorker.ready`);await until(`!!navigator.serviceWorker.controller`);
 await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await call('Page.reload');
 await until(`!!document.querySelector('.title-screen') && document.querySelector('canvas')?.dataset.graphics==='modern' && document.querySelector('canvas').width===960`);
 for(const mode of ['color','mono','modern']){await choose(mode);assert.equal(await width(),mode==='modern'?960:240)}
 await evaluate(`document.querySelector('.title-screen').focus()`);await key('Space',' ');await until(`document.querySelector('canvas').dataset.state==='playing'`);await delay(150);
 await key('ArrowRight');
 const liveFrames=await evaluate(`new Promise(resolve=>{const frames=[],crop=document.createElement('canvas');crop.width=96;crop.height=64;const ctx=crop.getContext('2d');function sample(){ctx.drawImage(document.querySelector('canvas'),24,128,96,64,0,0,96,64);frames.push(crop.toDataURL());if(frames.length===8)resolve(new Set(frames).size);else requestAnimationFrame(sample)}requestAnimationFrame(sample)})`);
 assert.ok(liveFrames>=4,'A single live player step must paint multiple requestAnimationFrame frames');
 await key('KeyP','p');await until(`document.querySelector('canvas').dataset.state==='paused'`);
 const pausedAnimation=await board();await delay(220);assert.equal(await board(),pausedAnimation,'Modern motion and hovering must stop during pause');
 await call('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true});
 assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,'Four toolbar icons must fit on a 320px screen');
 await key('KeyF','f');await key('KeyG','g');await until(`document.querySelector('.graphics-menu-toggle').getAttribute('aria-expanded')==='true'`);
 assert.equal(await evaluate(`(()=>{const r=document.querySelector('#graphics-options').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()`),true);
 await delay(200);const mobile=await call('Page.captureScreenshot',{format:'png'});saveImage('graphics-menu-mobile.png',`data:image/png;base64,${mobile.data}`);
 assert.deepEqual(errors,[]);console.log('Graphics browser OK: 16 high-resolution sprites, all three modes, keyboard menu, exact game-state preservation, 960×800 rendering, stored preference, offline switching and 320px toolbar.');
}finally{
 await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(()=>{});
 if(saved)await evaluate(`localStorage.clear();Object.entries(JSON.parse(${JSON.stringify(saved)})).forEach(([k,v])=>localStorage.setItem(k,v))`).catch(()=>{});
 ws.close();
}
