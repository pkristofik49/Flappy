export const WIDTH = 40, HEIGHT = 22;
const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export class Game {
  constructor(level,{seed=12345}={}) {
    this.walls=new Set();this.rocks=[];this.enemies=[];this.mushrooms=[];this.shots=[];
    this.player={x:1,y:1,w:2,h:2,dx:1,dy:0};this.goal=null;this.ammo=0;this.state='playing';this.ticks=0;this.seed=seed;this.reason='';
    for(let x=0;x<WIDTH;x++){this.walls.add(`${x},0`);this.walls.add(`${x},${HEIGHT-1}`)}
    for(let y=0;y<HEIGHT;y++){this.walls.add(`0,${y}`);this.walls.add(`${WIDTH-1},${y}`)}
    for(const [x,y]of level.walls)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)this.walls.add(`${x+dx},${y+dy}`);
    for(const o of level.objects){const a={x:o.x,y:o.y,w:2,h:2};
      if(o.type===2||o.type===3)this.rocks.push({...a,egg:o.type===2,falling:false});
      if(o.type===1)this.mushrooms.push({...a,w:1,h:1});
      if(o.type===4||o.type===5)this.enemies.push({...a,type:o.type===4?'frog':'ghost',dx:1,dy:0,sleep:0});
      if(o.type===6)this.goal={...a,h:1};
    }
  }
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296}
  wallAt(a){if(a.x<0||a.y<0||a.x+a.w>WIDTH||a.y+a.h>HEIGHT)return true;for(let y=a.y;y<a.y+a.h;y++)for(let x=a.x;x<a.x+a.w;x++)if(this.walls.has(`${x},${y}`))return true;return false}
  rockAt(a,except){return this.rocks.find(r=>r!==except&&intersects(a,r))}
  blocked(a,except){return this.wallAt(a)||Boolean(this.rockAt(a,except))}
  die(reason){if(this.state==='playing'){this.state='dead';this.reason=reason}}
  move(dx,dy){
    if(this.state!=='playing')return false;
    const p=this.player;p.dx=dx;p.dy=dy;
    const target={...p,x:p.x+dx,y:p.y+dy};
    if(this.wallAt(target))return false;
    const rock=this.rockAt(target);
    if(rock){
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
    this.mushrooms=this.mushrooms.filter(m=>{if(intersects(p,m)){this.ammo++;this.event='collect';return false}return true});
    this.checkEnemies();this.checkGoal();return true;
  }
  fire(){if(this.state!=='playing'||!this.ammo)return false;this.ammo--;const p=this.player;this.shots.push({x:p.x+(p.dx>0?2:p.dx<0?-1:0),y:p.y+(p.dy>0?2:p.dy<0?-1:0),w:1,h:1,dx:p.dx,dy:p.dy,life:40});this.event='fire';return true}
  checkEnemies(){if(this.enemies.some(e=>!e.sleep&&intersects(e,this.player)))this.die('Flappyho dostihla obluda. Zkus ji uspat houbou.')}
  checkGoal(){if(this.state==='playing'&&this.goal&&this.rocks.some(r=>r.egg&&r.x===this.goal.x&&(r.y+r.h===this.goal.y||intersects(r,this.goal)))){this.state='won';this.event='win'}}
  tick(){
    if(this.state!=='playing')return;
    this.ticks++;
    for(const rock of [...this.rocks].sort((a,b)=>b.y-a.y)){
      let dest={...rock,y:rock.y+1};
      if(this.blocked(dest,rock)){
        rock.falling=false;
        // Round stones can roll off another stone if both the side and lower space are empty.
        if(this.rockAt(dest,rock))for(const dx of [-1,1]){
          const side={...rock,x:rock.x+dx*2};const diagonal={...side,y:rock.y+1};
          if(!this.blocked(side,rock)&&!this.blocked(diagonal,rock)&&!intersects(side,this.player)){dest=diagonal;break}
        }
        if(this.blocked(dest,rock))continue;
      }
      if(intersects(dest,this.player)){this.die('Pozor na padající kameny a vejce.');return}
      this.enemies=this.enemies.filter(e=>!intersects(dest,e));
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
      if(!this.blocked(dest)&&!this.enemies.some(other=>other!==e&&intersects(dest,other))){e.x=dest.x;e.y=dest.y;e.dx=dx;e.dy=dy}else{e.dx=-dx;e.dy=-dy}
    }
    this.checkEnemies();this.checkGoal();
  }
}
