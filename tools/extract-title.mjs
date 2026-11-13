// Decode only the loading picture data from FLAPPY2k's PMD tape.
import fs from 'node:fs';
import {writePng} from './png.mjs';
const tape=fs.readFileSync(process.argv[2]);
if(tape.readUInt16LE(406)!==2028)throw Error('Unexpected FLAPPY2k tape');
const block=tape.subarray(408,2436),memory=new Uint8Array(65536);
let pos=16;
if(block[pos++]!==0x4b)throw Error('Missing picture marker');
while(pos<block.length){
  const count=block[pos++],address=block[pos++]|(block[pos++]<<8);
  if(!count)break;
  for(let col=0;col<count;col++){
    let dest=address+col;
    for(let group=0;group<2;group++){
      let fourth=0;
      for(let row=0;row<3;row++){
        if(pos>=block.length)throw Error('Truncated loading picture');
        const value=block[pos++];
        memory[dest]=value&63;dest+=64;fourth=(fourth<<2)|(value>>6);
      }
      memory[dest]=fourth;dest+=64;
    }
  }
}
const width=288,height=256,pixels=Buffer.alloc(width*height*4);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const lit=memory[0xc000+y*64+Math.floor(x/6)]&(1<<(x%6));
  pixels.set(lit?[238,240,229,255]:[0,0,0,255],(y*width+x)*4);
}
writePng(new URL('../assets/title-screen.png',import.meta.url),width,height,pixels);
console.log('Original loading picture: assets/title-screen.png');
