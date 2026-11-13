// Browser verification with Chrome DevTools and Node's built-in WebSocket; no packages.
// Launch a dedicated Chrome with --headless=new --remote-debugging-port=9222 first.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const page=pages.find(p=>p.type==='page');assert.ok(page,'Chrome debugging page');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+m.params.exceptionDetails.exception?.description)});
function call(method,params={}){return new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))})}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(expression){for(let i=0;i<80;i++){if(await evaluate(expression))return;await delay(100)}throw Error('Timed out: '+expression)}
async function screenshot(file){const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/'+file,Buffer.from(r.data,'base64'))}
try{
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
 const testUrl=process.argv[2]||'http://127.0.0.1:4173/Flappy/';
 await call('Storage.clearDataForOrigin',{origin:new URL(testUrl).origin,storageTypes:'service_workers,cache_storage'});
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:testUrl});
 await until(`document.querySelector('.overlay h2')?.textContent==='FLAPPY'`);
 assert.match(await evaluate(`document.querySelector('footer strong').textContent`),/FLAPPY v\d+\.\d{3}/);
 await screenshot('desktop.png');
 await evaluate(`document.querySelector('.primary').click()`);await until(`!document.querySelector('.overlay')`);
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
 await evaluate(`navigator.serviceWorker.ready.then(()=>true)`);await until('!!navigator.serviceWorker.controller');
 await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await call('Page.reload');
 await until(`document.querySelector('.overlay h2')?.textContent==='FLAPPY'`);
 assert.equal(await evaluate(`document.querySelector('.status').textContent`),'OFFLINE REŽIM');
 await evaluate(`document.querySelector('.primary').click()`);await until(`!document.querySelector('.overlay')`);
 assert.equal(await evaluate(`navigator.onLine`),false);
 const cacheNames=await evaluate(`caches.keys()`);assert.ok(cacheNames.some(n=>n.startsWith('flappy-pmd85-')));
 assert.deepEqual(errors,[]);console.log('Browser OK: Vue startup, canvas, movement, clock, pause/resume, restart, mobile touch UI, version, service worker and offline reload.');
}finally{await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(()=>{});ws.close()}
