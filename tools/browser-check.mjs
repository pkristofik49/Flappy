// Browser verification with Chrome DevTools and Node's built-in WebSocket; no packages.
// Launch a dedicated Chrome with --headless=new --remote-debugging-port=9222 first.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const page=pages.find(p=>p.type==='page');assert.ok(page,'Chrome debugging page');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0,instrumentId;const pending=new Map(),errors=[];
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+m.params.exceptionDetails.exception?.description)});
function call(method,params={}){return new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))})}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(expression){for(let i=0;i<80;i++){if(await evaluate(expression))return;await delay(100)}throw Error('Timed out: '+expression)}
async function screenshot(file){const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/'+file,Buffer.from(r.data,'base64'))}
const titleReady=`document.querySelector('#app') && !document.querySelector('#app').hasAttribute('v-cloak') && document.querySelector('.title-screen img')?.complete && document.querySelector('.title-screen img')?.naturalWidth===288`;
try{
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
 instrumentId=(await call('Page.addScriptToEvaluateOnNewDocument',{source:`
   window.__flappyAudioContexts=[];window.__flappyOscillators=[];
   const NativeAudio=window.AudioContext;
   if(NativeAudio)window.AudioContext=class extends NativeAudio{
     constructor(...args){super(...args);window.__flappyAudioContexts.push(this)}
     createOscillator(){const osc=super.createOscillator();window.__flappyOscillators.push(osc);return osc}
   };
 `})).identifier;
 const testUrl=process.argv[2]||'http://127.0.0.1:4173/Flappy/';
 await call('Storage.clearDataForOrigin',{origin:new URL(testUrl).origin,storageTypes:'service_workers,cache_storage'});
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:testUrl});
 await until(titleReady);
 await evaluate(`document.querySelector('[data-language="cs"]').click()`);
 await until(`document.documentElement.lang==='cs'`);
 assert.equal(await evaluate('window.__flappyAudioContexts.length'),0,'Page loading must not initialize audio');
 assert.match(await evaluate(`document.querySelector('footer strong').textContent`),/FLAPPY v\d+\.\d{3}/);
 await screenshot('desktop.png');
 await delay(1200);
 assert.equal(await evaluate(`document.querySelector('.game-hud span:last-child b').textContent`),'6:00','The loading picture must not start the clock');
 const startPoint=await evaluate(`(()=>{const r=document.querySelector('.title-screen').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await call('Input.dispatchMouseEvent',{type:'mousePressed',...startPoint,button:'left',clickCount:1});
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',...startPoint,button:'left',clickCount:1});
 await until(`!document.querySelector('.title-screen') && !document.querySelector('.overlay')`);
 const pixels=await evaluate(`Array.from(document.querySelector('canvas').getContext('2d').getImageData(0,0,240,176).data).filter((v,i)=>i%4!==3&&v>0).length`);assert.ok(pixels>1000);
 await call('Input.dispatchKeyEvent',{type:'keyDown',code:'ArrowRight',key:'ArrowRight'});await call('Input.dispatchKeyEvent',{type:'keyUp',code:'ArrowRight',key:'ArrowRight'});
 await delay(1200);assert.notEqual(await evaluate(`document.querySelector('.game-hud span:last-child b').textContent`),'6:00');
 await call('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyP',key:'p'});await until(`document.querySelector('.overlay h2')?.textContent==='PAUZA'`);
 await screenshot('playing-paused.png');
 await evaluate(`document.querySelector('.primary').click()`);await until(`!document.querySelector('.overlay')`);
 await evaluate(`document.querySelectorAll('.machine-controls button')[1].click()`);await until(`document.querySelector('.game-hud span:last-child b').textContent==='6:00'`);
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true});
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.touch-controls')).display`),'flex');
 assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
 await evaluate(`document.querySelector('.machine-controls button').click()`);await screenshot('mobile.png');
 await call('Page.reload');
 await until(titleReady);
 await screenshot('mobile-title.png');
 const touchPoint=await evaluate(`(()=>{const r=document.querySelector('.title-screen').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchPoint]});
 await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await until(`!document.querySelector('.title-screen') && !document.querySelector('.overlay')`);
 await evaluate(`navigator.serviceWorker.ready.then(()=>true)`);await until('!!navigator.serviceWorker.controller');
 await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await call('Page.reload');
 await until(titleReady);
 assert.equal(await evaluate(`document.querySelector('.status').textContent`),'OFFLINE REŽIM');
 await evaluate(`document.querySelector('.title-screen').focus()`);
 await call('Input.dispatchKeyEvent',{type:'keyDown',code:'Space',key:' '});
 await call('Input.dispatchKeyEvent',{type:'keyUp',code:'Space',key:' '});
 await until(`!document.querySelector('.title-screen') && !document.querySelector('.overlay')`);
 assert.equal(await evaluate(`document.querySelector('.screen-bottom b').textContent`),'00');
 assert.equal(await evaluate(`document.querySelector('.notice').textContent.includes('Nejdřív')`),false,'Starting with space must not also fire');
 assert.equal(await evaluate(`navigator.onLine`),false);
 const cacheNames=await evaluate(`caches.keys()`);assert.ok(cacheNames.some(n=>n.startsWith('flappy-pmd85-')));
 // A notice already on screen must translate immediately, without a new game.
 await evaluate(`document.querySelector('.fire').click()`);
 await until(`document.querySelector('.notice').textContent.includes('Nejdřív')`);
 await evaluate(`document.querySelector('[data-language="en"]').click()`);
 await until(`document.documentElement.lang==='en' && document.querySelector('.notice').textContent.includes('Collect a mushroom')`);
 assert.equal(await evaluate(`document.querySelector('.title-screen')===null`),true,'Switching language must preserve the game');
 assert.match(await evaluate(`document.querySelector('canvas').getAttribute('aria-label')`),/Game board/);
 assert.match(await evaluate(`document.querySelector('meta[name="description"]').content`),/Two hundred/);
 assert.match(await evaluate(`document.querySelector('#pwa-manifest').getAttribute('href')`),/manifest.en.webmanifest/);
 await call('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyP',key:'p'});
 await call('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyP',key:'p'});
 await until(`document.querySelector('.overlay h2')?.textContent==='PAUSED'`);
 await evaluate(`document.querySelector('[data-language="cs"]').click()`);
 await until(`document.querySelector('.overlay h2')?.textContent==='PAUZA'`);
 assert.match(await evaluate(`document.querySelector('.notice').textContent`),/Nejdřív/);
 for(const language of ['cs','en']){
  await evaluate(`document.querySelector('[data-language="${language}"]').click()`);
  await until(`document.documentElement.lang==='${language}'`);
  for(const width of [320,390,768,1440]){
   await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
   assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`${language}: overflow at ${width}px`);
  }
 }
 await screenshot('english.png');
 // Persist sound-on with a real pointer gesture, then verify its safe restoration.
 const soundEnabled=await evaluate(`document.querySelectorAll('.machine-controls button')[2].getAttribute('aria-pressed')==='true'`);
 async function clickSound(){
  const point=await evaluate(`(()=>{const button=document.querySelectorAll('.machine-controls button')[2];button.scrollIntoView({block:'center'});const r=button.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
 }
 if(soundEnabled)await clickSound();
 await clickSound();
 await until(`window.__flappyAudioContexts.length===1 && window.__flappyOscillators.length>0`);
 assert.equal(await evaluate(`localStorage.getItem('flappy.sound')`),'true');
 await call('Page.reload');
 await until(titleReady);
 assert.equal(await evaluate('document.documentElement.lang'),'en','Language must survive an offline reload');
 assert.equal(await evaluate('window.__flappyAudioContexts.length'),0,'Restored sound-on must wait for interaction');
 assert.match(await evaluate(`document.querySelector('.title-prompt').textContent`),/CLICK OR PRESS/);
 assert.match(await evaluate(`document.querySelectorAll('.machine-controls button')[2].textContent`),/Sound on/);
 assert.equal(await evaluate(`fetch(document.querySelector('#pwa-manifest').href).then(r=>r.json()).then(m=>m.lang)`),'en');
 // Space on a language button changes language without accidentally starting.
 await evaluate(`document.querySelector('[data-language="cs"]').focus()`);
 await call('Input.dispatchKeyEvent',{type:'keyDown',code:'Space',key:' '});
 await call('Input.dispatchKeyEvent',{type:'keyUp',code:'Space',key:' '});
 await until(`document.documentElement.lang==='cs'`);
 assert.equal(await evaluate(`!!document.querySelector('.title-screen')`),true);
 await evaluate(`document.querySelector('[data-language="en"]').click();document.querySelector('.title-screen').focus()`);
 await call('Input.dispatchKeyEvent',{type:'keyDown',code:'Space',key:' '});
 await call('Input.dispatchKeyEvent',{type:'keyUp',code:'Space',key:' '});
 await until(`!document.querySelector('.title-screen') && window.__flappyAudioContexts.length===1 && window.__flappyOscillators.length>0`);
 await clickSound();
 await until(`document.querySelectorAll('.machine-controls button')[2].getAttribute('aria-pressed')==='false'`);
 assert.equal(await evaluate(`localStorage.getItem('flappy.sound')`),'false');
 // Render every effect through real Web Audio and check the resulting samples.
 const audible=await evaluate(`(async()=>{
  const {GameAudio,effects}=await import('./src/audio.js');
  const results={};
  for(const name of Object.keys(effects)){
   const offline=new OfflineAudioContext(1,44100,44100);
   const adapter={state:'running',currentTime:0,destination:offline.destination,createOscillator:()=>offline.createOscillator(),createGain:()=>offline.createGain()};
   const audio=new GameAudio({createContext:()=>adapter});audio.setEnabled(true);await audio.play(name);
   const rendered=await offline.startRendering(),samples=rendered.getChannelData(0);
   let energy=0;for(const sample of samples)energy+=sample*sample;
   results[name]=Math.sqrt(energy/samples.length);
  }
  return results;
 })()`);
 assert.ok(Object.values(audible).every(rms=>rms>.0001),'Every effect must produce non-silent audio');
 assert.deepEqual(errors,[]);console.log('Browser OK: title/start controls, CS/EN switching and persistence, localized notices/ARIA/manifests, layouts 320–1440px, offline languages and 11 real Web Audio effects.');
}finally{if(instrumentId)await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:instrumentId}).catch(()=>{});await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(()=>{});ws.close()}
