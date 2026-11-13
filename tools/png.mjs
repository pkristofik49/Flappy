import fs from 'node:fs';
import zlib from 'node:zlib';

export function writePng(file,width,height,pixels){
  if(pixels.length!==width*height*4)throw Error('Unexpected RGBA dimensions');
  const raw=Buffer.alloc((width*4+1)*height);
  for(let y=0;y<height;y++)pixels.copy(raw,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
  function chunk(name,data){
    const tag=Buffer.from(name),size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);
    let crc=0xffffffff;
    for(const byte of Buffer.concat([tag,data])){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
    sum.writeUInt32BE((crc^0xffffffff)>>>0);
    return Buffer.concat([size,tag,data,sum]);
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  fs.writeFileSync(file,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
}
