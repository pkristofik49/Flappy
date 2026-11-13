export const WIDTH = 40, HEIGHT = 22;
export const CRUSH_TICKS = 5; // 600 ms of game time; paused together with the scene.
export const ENTRY_TICKS = 8;
const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export class Game {
  constructor(level,{seed=12345,entering=false}={}) {
    this.walls=new Set();this.rocks=[];this.enemies=[];this.corpses=[];this.mushrooms=[];this.shots=[];
    this.player={x:1,y:1,w:2,h:2,dx:1,dy:0,walking:false,walkFrame:0,walkTick:0};this.goal=null;this.ammo=0;this.state='playing';this.ticks=0;this.seed=seed;this.reason='';
    for(let x=0;x<WIDTH;x++){this.walls.add(`${x},0`);this.walls.add(`${x},${HEIGHT-1}`)}
    for(let y=0;y<HEIGHT;y++){this.walls.add(`0,${y}`);this.walls.add(`${WIDTH-1},${y}`)}
    for(const [x,y]of level.walls)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)this.walls.add(`${x+dx},${y+dy}`);
    for(const o of level.objects){const a={x:o.x,y:o.y,w:2,h:2};
      if(o.type===2||o.type===3)this.rocks.push({...a,egg:o.type===2,falling:false});
      if(o.type===1)this.mushrooms.push({...a,w:1,h:1});
      if(o.type===4||o.type===5)this.enemies.push({...a,type:o.type===4?'frog':'ghost',dx:1,dy:0,sleep:0});
      if(o.type===6)this.goal={...a,h:1};
    }
    this.entry=null;
    if(entering){
      this.state='entering';this.entry={tick:0};
      this.walls.delete('1,0');this.walls.delete('2,0');
      Object.assign(this.player,{y:-2,dx:0,dy:1,walking:true});
    }
  }
  advanceEntry(){
    const step=++this.entry.tick;
    this.player.y=Math.min(1,Math.max(-2,step-4));
    this.player.walking=step>=3&&step<=5;this.player.walkFrame=step%4;
    if(step>=6){this.walls.add('1,0');this.walls.add('2,0')}
    if(step>=ENTRY_TICKS){this.entry=null;this.state='playing';this.player.walking=false}
  }
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296}
  wallAt(a){if(a.x<0||a.y<0||a.x+a.w>WIDTH||a.y+a.h>HEIGHT)return true;for(let y=a.y;y<a.y+a.h;y++)for(let x=a.x;x<a.x+a.w;x++)if(this.walls.has(`${x},${y}`))return true;return false}
  rockAt(a,except){return this.rocks.find(r=>r!==except&&intersects(a,r))}
  blocked(a,except){return this.wallAt(a)||Boolean(this.rockAt(a,except))}
  die(reason){if(this.state==='playing'){this.state='dead';this.reason=reason;this.player.crushed=true;this.player.walking=false}}
  move(dx,dy){
    if(this.state!=='playing')return false;
    const p=this.player;
    const changedDirection=p.dx!==dx||p.dy!==dy;
    p.dx=dx;p.dy=dy;p.walking=false;
    const target={...p,x:p.x+dx,y:p.y+dy};
    if(this.wallAt(target))return false;
    const rock=this.rockAt(target);
    if(rock){
      // Downward pressure crushes a supported ordinary stone without moving Flappy.
      const touchingTop=dx===0&&dy>0&&p.x===rock.x&&p.y+p.h===rock.y;
      if(touchingTop){
        if(!rock.egg&&!rock.falling&&this.blocked({...rock,y:rock.y+1},rock)){
          this.rocks.splice(this.rocks.indexOf(rock),1);this.event='break';
        }
        return false;
      }
      // After a stone drops, a held direction can still touch its upper corner.
      // Only a full side contact with a resting stone is a push or crush.
      const touchingSide=dx>0?p.x+p.w===rock.x:p.x===rock.x+rock.w;
      if(!dx||p.y!==rock.y||!touchingSide||rock.falling)return false;
      const dest={...rock,x:rock.x+dx};
      if(this.blocked(dest,rock)){
        if(!rock.egg){this.rocks.splice(this.rocks.indexOf(rock),1);this.event='break'}
        return false;
      }
      rock.x+=dx;this.event='push';
      this.enemies=this.enemies.filter(e=>!intersects(e,rock));
    }
    p.x=target.x;p.y=target.y;
    if(!rock)this.event='step';
    p.walkFrame=changedDirection?1:(p.walkFrame+1)%4;
    p.walkTick=this.ticks;p.walking=true;
    this.mushrooms=this.mushrooms.filter(m=>{if(intersects(p,m)){this.ammo++;this.event='collect';return false}return true});
    this.checkEnemies();this.checkGoal();return true;
  }
  fire(){if(this.state!=='playing'||!this.ammo)return false;this.ammo--;const p=this.player;this.shots.push({x:p.x+(p.dx>0?2:p.dx<0?-1:0),y:p.y+(p.dy>0?2:p.dy<0?-1:0),w:1,h:1,dx:p.dx,dy:p.dy,life:40});this.event='fire';return true}
  checkEnemies(){if(this.enemies.some(e=>!e.sleep&&intersects(e,this.player)))this.die('death.enemy')}
  checkGoal(){if(this.state==='playing'&&this.goal&&this.rocks.some(r=>r.egg&&r.x===this.goal.x&&(r.y+r.h===this.goal.y||intersects(r,this.goal)))){this.state='won';this.event='win'}}
  tick(){
    if(this.state==='entering'){this.advanceEntry();return}
    if(this.state!=='playing')return;
    this.ticks++;
    this.corpses=this.corpses.filter(corpse=>--corpse.life>0);
    if(this.ticks-this.player.walkTick>=2)this.player.walking=false;
    for(const rock of [...this.rocks].sort((a,b)=>b.y-a.y)){
      const dest={...rock,y:rock.y+1};
      if(this.blocked(dest,rock)){
        if(rock.falling)this.event='impact';
        rock.falling=false;
        // A supporting stone holds the object in place; gravity never moves it sideways.
        continue;
      }
      // The flattened creature briefly supports the stone before disappearing.
      if(this.corpses.some(corpse=>intersects(dest,corpse)))continue;
      if(intersects(dest,this.player)){rock.y=dest.y;rock.falling=true;this.die('death.falling');return}
      const crushed=this.enemies.filter(e=>intersects(dest,e));
      if(crushed.length){
        for(const enemy of crushed)this.corpses.push({type:enemy.type,x:enemy.x,y:enemy.y+1,w:2,h:1,crushed:true,life:CRUSH_TICKS});
        this.enemies=this.enemies.filter(e=>!crushed.includes(e));
        this.event='crush';
      }
      rock.x=dest.x;rock.y=dest.y;rock.falling=true;
      this.checkGoal();if(this.state!=='playing')return;
    }
    for(const shot of this.shots){
      const hit=this.enemies.find(e=>intersects(e,shot));
      if(hit){hit.sleep=60;shot.life=0;this.event='sleep';continue}
      shot.x+=shot.dx;shot.y+=shot.dy;shot.life--;
      const after=this.enemies.find(e=>intersects(e,shot));
      if(after){after.sleep=60;shot.life=0;this.event='sleep'}
      if(this.blocked(shot))shot.life=0;
    }
    this.shots=this.shots.filter(s=>s.life>0);
    for(const e of this.enemies){
      if(e.sleep){e.sleep--;continue}
      if(this.ticks%5)continue;
      let dx=e.dx,dy=e.dy;
      if(e.type==='ghost'){
        dy=0;if(Math.abs(e.x-this.player.x)<10)dx=Math.sign(this.player.x-e.x)||dx;
        else if(this.random()<.25)dx=-dx;
      }else if(this.random()<.4){const dirs=[[0,1],[0,-1],[1,0],[-1,0]];[dx,dy]=dirs[Math.floor(this.random()*4)]}
      const dest={...e,x:e.x+dx,y:e.y+dy};
      if(!this.blocked(dest)&&!this.enemies.some(other=>other!==e&&intersects(dest,other))){e.x=dest.x;e.y=dest.y;e.dx=dx;e.dy=dy;e.stepTick=this.ticks}else{e.dx=-dx;e.dy=-dy;e.stepTick=undefined}
    }
    this.checkEnemies();this.checkGoal();
  }
}
