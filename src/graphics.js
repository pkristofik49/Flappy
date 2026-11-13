export const GRAPHICS_KEY='flappy.graphics';
export const graphicsModes=['mono','color','modern'];
export function loadGraphics(storage){
  try{const saved=(storage??globalThis.localStorage).getItem(GRAPHICS_KEY);if(graphicsModes.includes(saved))return saved}catch{/* Keep the default when storage is unavailable. */}
  return 'mono';
}
export async function loadModernSprites(){
  const image=new Image();image.src=new URL('../assets/modern-sprites.png',import.meta.url).href;
  await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,frames=[];
  // Trim transparent cell padding without resampling or changing the source PNG.
  for(let i=0;i<16;i++){
    const col=i%4,row=Math.floor(i/4),left=Math.floor(col*canvas.width/4),top=Math.floor(row*canvas.height/4);
    const right=Math.floor((col+1)*canvas.width/4),bottom=Math.floor((row+1)*canvas.height/4);
    let x1=right,y1=bottom,x2=left,y2=top;
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(pixels[(y*canvas.width+x)*4+3]>96){x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y)}
    if(x2<x1||y2<y1)throw Error('Empty sprite cell');
    frames.push({x:x1,y:y1,width:x2-x1+1,height:y2-y1+1});
  }
  return {image,frames};
}
export function modernPlayerFrame(player){
  const base=player.dx<0?0:player.dx>0?2:player.dy<0?6:4;
  return base+(player.walking?player.walkFrame%2:0);
}
export function modernEnemyFrame(enemy){
  return enemy.type!=='frog'?12:enemy.dx<0?8:enemy.dx>0?9:enemy.dy<0?11:10;
}
export function modernSprite(ctx,atlas,index,x,y,width,height,{flip=false,opacity=1}={}){
  const frame=atlas.frames[index];
  ctx.save();ctx.globalAlpha*=opacity;
  ctx.translate(x+(flip?width:0),y);if(flip)ctx.scale(-1,1);
  ctx.drawImage(atlas.image,frame.x,frame.y,frame.width,frame.height,0,0,width,height);
  ctx.restore();
}
