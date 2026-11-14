// End-to-end password access, persistence and offline checks. Native Chrome CDP only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0,saved;const pending=new Map(),errors=[];
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)});
function call(method,params={}){return new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))})}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(80)}throw Error('Timed out: '+expression)}
async function password(code){
 await evaluate(`document.querySelector('#sector-password').focus();document.querySelector('#sector-password').value='';document.querySelector('#sector-password').dispatchEvent(new Event('input',{bubbles:true}))`);
 await call('Input.insertText',{text:code});
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});
 await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter'});
 await until(`document.querySelector('#password-feedback').textContent.length>0`);
}
async function options(){await evaluate(`document.querySelector('.sector-toggle').click()`);await until(`document.querySelectorAll('[data-sector]').length===200`);const sectors=await evaluate(`Array.from(document.querySelectorAll('[data-sector]:not(:disabled)'),b=>Number(b.dataset.sector))`);await evaluate(`document.querySelector('.sector-close').click()`);await until(`!document.querySelector('.sector-overlay')`);return sectors}
try{
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');await call('Network.setBypassServiceWorker',{bypass:false});
 const url=process.argv[2]||'http://127.0.0.1:4173/Flappy/';
 await call('Storage.clearDataForOrigin',{origin:new URL(url).origin,storageTypes:'service_workers,cache_storage'});
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});await call('Emulation.setTouchEmulationEnabled',{enabled:false});
 await call('Page.navigate',{url});await until(`!!document.querySelector('#sector-password') && !document.querySelector('#app').hasAttribute('v-cloak')`);
 saved=await evaluate(`JSON.stringify({...localStorage})`);
 await evaluate(`localStorage.setItem('flappy-pmd85-progress-v1',JSON.stringify({scene:1,unlocked:1}));localStorage.setItem('flappy.language','cs');localStorage.setItem('flappy.graphics','mono')`);
 await call('Page.reload');await delay(150);await until(`!!document.querySelector('#sector-password') && document.querySelector('canvas').dataset.state==='ready'`);
 assert.deepEqual(await options(),[1]);assert.equal(await evaluate(`document.querySelector('.status')`),null);
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.intro>p')).fontFamily`),await evaluate(`getComputedStyle(document.querySelector('.about p')).fontFamily`));
 await password('xxxxx');assert.match(await evaluate(`document.querySelector('#password-feedback').textContent`),/není platné/);assert.deepEqual(await options(),[1]);
 await password(':beda');await until(`document.querySelector('canvas').dataset.state==='playing'`);
 assert.deepEqual(await options(),[1,36,37,38,39,40]);assert.equal(await evaluate(`document.querySelector('.game-hud span:first-child b').textContent`),'036');
 assert.match(await evaluate(`document.querySelector('#password-feedback').textContent`),/036–040/);
 await evaluate(`document.querySelector('#sector-password').focus()`);await until(`document.querySelector('canvas').dataset.state==='paused'`);
 const frozen=await evaluate(`document.querySelector('canvas').toDataURL()`);await delay(220);assert.equal(await evaluate(`document.querySelector('canvas').toDataURL()`),frozen,'Password input pauses the room');
 await password('xxxxx');assert.equal(await evaluate(`document.querySelector('canvas').dataset.state`),'paused');
 assert.equal(await evaluate(`document.querySelector('.game-hud span:first-child b').textContent`),'036');
 await evaluate(`document.querySelector('.language-menu-toggle').click()`);await until(`document.querySelector('.language-menu-toggle').getAttribute('aria-expanded')==='true'`);
 await evaluate(`document.querySelector('[data-language="en"]').click()`);await until(`document.documentElement.lang==='en'`);
 assert.equal(await evaluate(`document.querySelector('#password-feedback').textContent`),'Invalid password.');
 await password('>abc<');await until(`document.querySelector('canvas').dataset.state==='playing'`);
 assert.deepEqual(await options(),[1,36,37,38,39,40,131,132,133,134,135]);
 await evaluate(`navigator.serviceWorker.ready`);await until(`!!navigator.serviceWorker.controller`);
 await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await call('Page.reload');await delay(150);
 await until(`document.querySelector('canvas')?.dataset.state==='ready' && document.querySelector('.game-hud span:first-child b')?.textContent==='131'`);
 assert.deepEqual(await options(),[1,36,37,38,39,40,131,132,133,134,135]);
 await password('ypalf');await until(`document.querySelector('canvas').dataset.state==='playing'`);
 assert.deepEqual(await options(),[1,36,37,38,39,40,131,132,133,134,135,196,197,198,199,200]);
 assert.equal(await evaluate(`document.querySelector('.game-hud span:first-child b').textContent`),'196');
 await evaluate(`document.querySelector('.sector-toggle').click()`);await until(`!!document.querySelector('[data-sector="198"]')`);await evaluate(`document.querySelector('[data-sector="198"]').click()`);
 await until(`document.querySelector('canvas').dataset.state==='playing' && document.querySelector('.game-hud span:first-child b').textContent==='198'`);
 assert.equal(await evaluate(`JSON.parse(localStorage.getItem('flappy-pmd85-progress-v1')).scene`),198);
 await call('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true});
 assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
 const clip=await evaluate(`(()=>{const r=document.querySelector('.password-panel').getBoundingClientRect();return{x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:1}})()`);
 const shot=await call('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/password-mobile.png',Buffer.from(shot.data,'base64'));
 assert.deepEqual(errors,[]);console.log('Passwords browser OK: exact five-sector groups, case and punctuation, invalid codes, keyboard input, paused room, CS/EN messages, persistence, offline access and mobile layout.');
}finally{
 await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(()=>{});
 if(saved)await evaluate(`localStorage.clear();Object.entries(JSON.parse(${JSON.stringify(saved)})).forEach(([k,v])=>localStorage.setItem(k,v))`).catch(()=>{});
 ws.close();
}
