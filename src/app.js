import { createApp, ref, computed, watch, onMounted, onUnmounted } from '../vendor/vue.esm-browser.prod.js';
import { levels } from '../assets/game-data.js';
import { Game } from './engine.js';
import { render } from './render.js';
import {LANGUAGE_KEY,languages,loadLanguage,translate,plural as translatePlural} from './i18n.js';
import {GameAudio,SOUND_KEY,loadSound} from './audio.js';
const STORAGE='flappy-pmd85-progress-v1';
function loadProgress(){try{const p=JSON.parse(localStorage.getItem(STORAGE));return {unlocked:Math.max(1,Math.min(200,Math.floor(Number(p?.unlocked)||1))),scene:Math.max(1,Math.min(200,Math.floor(Number(p?.scene)||1)))}}catch{return{unlocked:1,scene:1}}}
createApp({setup(){
  const language=ref(loadLanguage());
  const t=(key,parameters)=>translate(language.value,key,parameters);
  const plural=(key,count)=>translatePlural(language.value,key,count);
  const progress=loadProgress();const canvas=ref(null),scene=ref(Math.min(progress.scene,progress.unlocked)),selectedScene=ref(scene.value),unlocked=ref(progress.unlocked);
  const mode=ref('ready'),lives=ref(5),ammo=ref(0),remaining=ref(360),sound=ref(loadSound()),online=ref(navigator.onLine),installPrompt=ref(null),message=ref(''),notice=ref('');
  const audioAvailable=Boolean(window.AudioContext||window.webkitAudioContext);
  const audio=new GameAudio();audio.setEnabled(sound.value);
  const version=globalThis.FLAPPY_VERSION;const timeText=computed(()=>`${Math.floor(remaining.value/60)}:${String(remaining.value%60).padStart(2,'0')}`);
  let game,ctx,timer,held=null,holdTimer,elapsed=0,last=0,deathElapsed=0,pausedFrom='playing';
  function setLanguage(code){
    if(!languages.some(option=>option.code===code))return;
    language.value=code;
    try{localStorage.setItem(LANGUAGE_KEY,code)}catch{/* Keep the in-memory choice. */}
    if(mode.value==='playing'||mode.value==='entering')focus();
  }
  watch(language,()=>{
    document.documentElement.lang=language.value;
    document.title=t('meta.title');
    document.querySelector('meta[name="description"]').content=t('meta.description');
    document.querySelector('#pwa-manifest').setAttribute('href',language.value==='en'?'./manifest.en.webmanifest':'./manifest.webmanifest');
    paint();
  },{immediate:true});
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify({scene:scene.value,unlocked:unlocked.value}))}catch{notice.value='notice.storage'}}
  function reset({entering=false}={}){game=new Game(levels[scene.value-1],{entering});remaining.value=360;elapsed=0;deathElapsed=0;ammo.value=0;held=null;release();paint()}
  function paint(){if(ctx&&game)render(ctx,game,t('game.sleepMarker'),{scene:scene.value,lives:lives.value,timeText:timeText.value,sectorLabel:t('game.scene'),timeLabel:t('game.time'),credit:t('game.boardCredit')})}
  function focus(){canvas.value?.focus({preventScroll:true})}
  function start(){notice.value='';reset({entering:true});mode.value='entering';last=performance.now();focus();save();beep('start')}
  function resume(){mode.value=pausedFrom;held=null;last=performance.now();focus()}
  function togglePause(){if(mode.value==='playing'||mode.value==='entering'){pausedFrom=mode.value;mode.value='paused';held=null;release();audio.stop()}else if(mode.value==='paused')resume()}
  function restart(){start()}
  function retry(){if(!lives.value)lives.value=5;start()}
  function next(){if(scene.value===200){scene.value=1;lives.value=5}else scene.value++;selectedScene.value=scene.value;start()}
  function chooseScene(){scene.value=Math.min(unlocked.value,selectedScene.value);lives.value=5;start()}
  function beep(event){if(sound.value&&event)void audio.play(event)}
  function toggleSound(){
    if(!audioAvailable)return;
    sound.value=!sound.value;audio.setEnabled(sound.value);
    try{localStorage.setItem(SOUND_KEY,String(sound.value))}catch{/* Keep the in-memory choice. */}
    if(sound.value)beep('collect');
    if(mode.value==='playing'||mode.value==='entering')focus();
  }
  function sync(){
    if(game.state==='playing'&&mode.value==='entering'){mode.value='playing';held=null}
    ammo.value=game.ammo;
    if(game.event){beep(game.event);game.event=null}
    if(game.state==='won'&&mode.value==='playing'){mode.value='won';unlocked.value=Math.max(unlocked.value,Math.min(200,scene.value+1));save();held=null;release()}
    if(game.state==='dead'&&mode.value==='playing'){lives.value=Math.max(0,lives.value-1);message.value=game.reason;notice.value=game.reason;mode.value='dead';deathElapsed=0;held=null;release();beep('dead')}
    paint();
  }
  function move(dx,dy){if(mode.value!=='playing')return;game.move(dx,dy);sync()}
  function fire(){if(mode.value!=='playing')return;if(!game.ammo){notice.value='notice.noAmmo';return}game.fire();sync()}
  function hold(dx,dy){release();move(dx,dy);if(mode.value==='playing')holdTimer=setInterval(()=>move(dx,dy),120)}
  function release(){clearInterval(holdTimer);holdTimer=null}
  const directions={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],KeyW:[0,-1],KeyS:[0,1],KeyA:[-1,0],KeyD:[1,0]};
  function keydown(e){
    if(['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName))return;
    if(e.target.tagName==='BUTTON'&&!e.target.classList.contains('title-screen'))return;
    if(mode.value==='ready'&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();if(!e.repeat)start();return}
    if(mode.value==='entering'&&(directions[e.code]||e.code==='Space')){e.preventDefault();return}
    if(directions[e.code]){e.preventDefault();if(!e.repeat){held={code:e.code,dir:directions[e.code],at:performance.now()+160};move(...held.dir)}return}
    if(e.code==='Space'){e.preventDefault();if(!e.repeat)fire()}
    if(e.repeat)return;
    if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();togglePause()}
    if(e.code==='KeyR'){e.preventDefault();restart()}
    if(e.code==='Enter'){e.preventDefault();if(mode.value==='paused')resume();else if(mode.value==='won')next();else if(mode.value==='dead')retry();else if(mode.value==='ready')start()}
  }
  function keyup(e){if(held?.code===e.code)held=null}
  function blur(){held=null;release();audio.stop();if(mode.value==='playing'||mode.value==='entering'||(mode.value==='dead'&&lives.value>0)){pausedFrom=mode.value;mode.value='paused'}}
  function visibility(){if(document.hidden)blur()}
  function connectivity(){online.value=navigator.onLine}
  function beforeInstall(e){e.preventDefault();installPrompt.value=e}
  function installed(){installPrompt.value=null;notice.value='notice.installed'}
  async function install(){const prompt=installPrompt.value;if(!prompt)return;await prompt.prompt();await prompt.userChoice;installPrompt.value=null}
  function frame(){
    const now=performance.now(),delta=Math.min(now-last,250);
    if(mode.value==='dead'&&lives.value>0&&!document.hidden){deathElapsed+=delta;if(deathElapsed>=720)start()}
    else if(mode.value==='playing'||mode.value==='entering'){
      elapsed+=delta;
      if(held&&now>=held.at){const active=held;move(...active.dir);if(held===active)held.at=now+120}
      while(elapsed>=120&&(mode.value==='playing'||mode.value==='entering')){
        elapsed-=120;game.tick();remaining.value=Math.max(0,360-Math.floor(game.ticks*.12));sync();
      }
      if(!remaining.value&&mode.value==='playing'){game.die('death.timeout');sync()}
    }
    last=now;timer=requestAnimationFrame(frame);
  }
  onMounted(()=>{
    ctx=canvas.value.getContext('2d');reset();timer=requestAnimationFrame(frame);
    window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
    window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);window.addEventListener('beforeinstallprompt',beforeInstall);window.addEventListener('appinstalled',installed);
    if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
      if(reg.waiting)notice.value='notice.update';
      reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)notice.value='notice.update'})});
    }).catch(()=>{notice.value='notice.offlineFailed'});
  });
  onUnmounted(()=>{cancelAnimationFrame(timer);release();audio.close();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',connectivity);window.removeEventListener('offline',connectivity);window.removeEventListener('beforeinstallprompt',beforeInstall);window.removeEventListener('appinstalled',installed)});
  return{language,languages,setLanguage,t,plural,canvas,scene,selectedScene,unlocked,mode,lives,ammo,sound,audioAvailable,toggleSound,online,installPrompt,message,notice,version,timeText,start,resume,togglePause,restart,retry,next,chooseScene,fire,hold,release,install};
}}).mount('#app');
