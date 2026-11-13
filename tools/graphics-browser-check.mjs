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
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
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
 const atlas=await evaluate(`import('./src/graphics.js').then(async m=>{const a=await m.loadModernSprites();return{width:a.image.naturalWidth,height:a.image.naturalHeight,frames:a.frames}})`);
 assert.equal(atlas.frames.length,16);assert.ok(atlas.frames.every(f=>f.width>100&&f.height>100&&f.x>=0&&f.y>=0&&f.x+f.width<=atlas.width&&f.y+f.height<=atlas.height));
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
