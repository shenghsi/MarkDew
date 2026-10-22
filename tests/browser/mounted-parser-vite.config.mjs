// Explicit local fixture server. Production never installs this report writer.
import { defineConfig } from 'vite';
import { writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const limit=12*1024*1024;
const directory=new URL('../performance/experiments/point-comparison/',import.meta.url);
export default defineConfig({
  server:{host:'127.0.0.1',port:13327,strictPort:true,watch:{ignored:['**/src/desktop/target/**','**/*browser-*.json.gz']}},
  plugins:[{name:'mounted-parser-report',configureServer(server){server.middlewares.use('/__mounted_parser_result__',async(req,res)=>{
    if(req.method!=='POST'||req.headers.origin!=='http://127.0.0.1:13327'||req.headers['x-markdew-browser-result']!=='mounted-layout-v1'){
      res.statusCode=403;res.end('Local fixture request required');return;
    }
    try{
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>limit)throw Error('Report exceeds limit');chunks.push(chunk)}
      const request=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      let bytes,report,name;
      if(typeof request.archive==='string'){
        if(!/^[A-Za-z0-9+/]+={0,2}$/.test(request.archive))throw Error('Invalid archive');
        bytes=Buffer.from(request.archive,'base64');report=JSON.parse(gunzipSync(bytes,{maxOutputLength:limit}).toString('utf8'));
        name='mounted-browser-rejected.json.gz';
      }else{report=request.batch;bytes=gzipSync(JSON.stringify(report));name='mounted-browser-controls.json.gz'}
      if(report?.running!==false||report?.progress?.done!==true||report?.results?.length!==16)throw Error('Batch is not terminal');
      await writeFile(new URL(name,directory),bytes);
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}));
    }catch(error){res.statusCode=400;res.end(String(error))}
  })}}],
});
