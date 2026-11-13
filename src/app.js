import { createApp, ref, computed, onMounted, onUnmounted } from '../vendor/vue.esm-browser.prod.js';
import { levels } from '../assets/game-data.js';
import { Game } from './engine.js';
import { render } from './render.js';
const STORAGE='flappy-pmd85-progress-v1';
function loadProgress(){try{const p=JSON.parse(localStorage.getItem(STORAGE));return {unlocked:Math.max(1,Math.min(200,Math.floor(Number(p?.unlocked)||1))),scene:Math.max(1,Math.min(200,Math.floor(Number(p?.scene)||1)))}}catch{return{unlocked:1,scene:1}}}
createApp({setup(){
  const progress=loadProgress();const canvas=ref(null),scene=ref(Math.min(progress.scene,progress.unlocked)),selectedScene=ref(scene.value),unlocked=ref(progress.unlocked);
  const mode=ref('ready'),lives=ref(5),ammo=ref(0),remaining=ref(360),sound=ref(false),online=ref(navigator.onLine),installPrompt=ref(null),message=ref(''),notice=ref('');
  const version=globalThis.FLAPPY_VERSION;const timeText=computed(()=>`${Math.floor(remaining.value/60)}:${String(remaining.value%60).padStart(2,'0')}`);
  let game,ctx,timer,held=null,holdTimer,audio,elapsed=0,last=0;
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify({scene:scene.value,unlocked:unlocked.value}))}catch{notice.value='Prohlížeč nepovolil uložit postup. Hra dál funguje v této relaci.'}}
  function reset(){game=new Game(levels[scene.value-1]);remaining.value=360;elapsed=0;ammo.value=0;held=null;release();paint()}
  function paint(){if(ctx&&game)render(ctx,game)}
  function focus(){canvas.value?.focus({preventScroll:true})}
  function start(){reset();mode.value='playing';last=performance.now();focus();save()}
  function resume(){mode.value='playing';held=null;last=performance.now();focus()}
  function togglePause(){if(mode.value==='playing'){mode.value='paused';held=null;release()}else if(mode.value==='paused')resume()}
  function restart(){if(mode.value==='ready')return start();reset();mode.value='playing';last=performance.now();focus()}
  function retry(){if(!lives.value)lives.value=5;start()}
  function next(){if(scene.value===200){scene.value=1;lives.value=5}else scene.value++;selectedScene.value=scene.value;start()}
  function chooseScene(){scene.value=Math.min(unlocked.value,selectedScene.value);lives.value=5;start()}
  function beep(event){if(!sound.value||!event)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='square';osc.frequency.value=({push:140,collect:660,fire:420,sleep:220,break:90,win:880,dead:70})[event]||180;gain.gain.setValueAtTime(.025,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.11);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.12)}catch{}}
  function sync(){
    ammo.value=game.ammo;
    if(game.event){beep(game.event);game.event=null}
    if(game.state==='won'&&mode.value==='playing'){mode.value='won';unlocked.value=Math.max(unlocked.value,Math.min(200,scene.value+1));save();held=null;release()}
    if(game.state==='dead'&&mode.value==='playing'){lives.value=Math.max(0,lives.value-1);message.value=game.reason;mode.value='dead';held=null;release();beep('dead')}
    paint();
  }
  function move(dx,dy){if(mode.value!=='playing')return;game.move(dx,dy);sync()}
  function fire(){if(mode.value!=='playing')return;if(!game.ammo){notice.value='Nejdřív seber houbu v místnosti.';return}game.fire();sync()}
  function hold(dx,dy){release();move(dx,dy);if(mode.value==='playing')holdTimer=setInterval(()=>move(dx,dy),120)}
  function release(){clearInterval(holdTimer);holdTimer=null}
  const directions={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],KeyW:[0,-1],KeyS:[0,1],KeyA:[-1,0],KeyD:[1,0]};
  function keydown(e){
    if(['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName))return;
    if(mode.value==='ready'&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();if(!e.repeat)start();return}
    if(e.target.tagName==='BUTTON')return;
    if(directions[e.code]){e.preventDefault();if(!e.repeat){held={code:e.code,dir:directions[e.code],at:performance.now()+160};move(...held.dir)}return}
    if(e.code==='Space'){e.preventDefault();if(!e.repeat)fire()}
    if(e.repeat)return;
    if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();togglePause()}
    if(e.code==='KeyR'){e.preventDefault();restart()}
    if(e.code==='Enter'){e.preventDefault();if(mode.value==='paused')resume();else if(mode.value==='won')next();else if(mode.value==='dead')retry();else if(mode.value==='ready')start()}
  }
  function keyup(e){if(held?.code===e.code)held=null}
  function blur(){held=null;release();if(mode.value==='playing')mode.value='paused'}
  function visibility(){if(document.hidden)blur()}
  function connectivity(){online.value=navigator.onLine}
  function beforeInstall(e){e.preventDefault();installPrompt.value=e}
  function installed(){installPrompt.value=null;notice.value='Flappy je nainstalovaný. Můžeš hrát i offline.'}
  async function install(){const prompt=installPrompt.value;if(!prompt)return;await prompt.prompt();await prompt.userChoice;installPrompt.value=null}
  function frame(){const now=performance.now();if(mode.value==='playing'){
    const delta=Math.min(now-last,250);elapsed+=delta;
    if(held&&now>=held.at){const active=held;move(...active.dir);if(held===active)held.at=now+120}
    while(elapsed>=120&&mode.value==='playing'){elapsed-=120;game.tick();sync()}
    remaining.value=Math.max(0,360-Math.floor(game.ticks*.12));
    if(!remaining.value&&mode.value==='playing'){game.die('Čas vypršel. Zkus najít kratší cestu.');sync()}
  }last=now;timer=requestAnimationFrame(frame)}
  onMounted(()=>{
    ctx=canvas.value.getContext('2d');reset();timer=requestAnimationFrame(frame);
    window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
    window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);window.addEventListener('beforeinstallprompt',beforeInstall);window.addEventListener('appinstalled',installed);
    if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
      if(reg.waiting)notice.value='Je připravena nová verze. Zavři všechna okna hry a znovu ji otevři.';
      reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)notice.value='Je připravena nová verze. Zavři všechna okna hry a znovu ji otevři.'})});
    }).catch(()=>{notice.value='Offline režim se nepodařilo připravit. Online hra funguje dál.'});
  });
  onUnmounted(()=>{cancelAnimationFrame(timer);release();audio?.close();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',connectivity);window.removeEventListener('offline',connectivity);window.removeEventListener('beforeinstallprompt',beforeInstall);window.removeEventListener('appinstalled',installed)});
  return{canvas,scene,selectedScene,unlocked,mode,lives,ammo,sound,online,installPrompt,message,notice,version,timeText,start,resume,togglePause,restart,retry,next,chooseScene,fire,hold,release,install};
}}).mount('#app');
