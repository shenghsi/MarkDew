// Separate local-only writer. A case cannot overwrite prior gate evidence.
import {defineConfig} from 'vite';
import {writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export default defineConfig({server:{host:'127.0.0.1',port:13330,strictPort:true,watch:{ignored:['**/src/desktop/target/**','**/fallback-delivery-*.json.gz']}},
  plugins:[{name:'fallback-delivery-report',configureServer(server){server.middlewares.use('/__fallback_delivery_result__',async(req,res)=>{
    if(req.method!=='POST'||req.headers.origin!=='http://127.0.0.1:13330'||req.headers['x-markdew-browser-result']!=='fallback-delivery-v1'){res.statusCode=403;res.end('Local fixture request required');return}
    try{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>12*1024*1024)throw Error('Report exceeds limit');chunks.push(chunk)}
      const batch=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(batch.running!==false||batch.progress?.done!==true||batch.results?.length!==1)throw Error('Case is not terminal');
      const record=batch.results[0];if(record.profile!=='partial'||!['static','combined'].includes(record.delivery)||record.delivery!==batch.delivery||typeof record.reverse!=='boolean')throw Error('Invalid factor');
      const name=`fallback-delivery-${record.delivery}-${record.reverse?'reverse':'normal'}.json.gz`,bytes=gzipSync(JSON.stringify(batch));
      await writeFile(new URL('../performance/experiments/point-comparison/'+name,import.meta.url),bytes);
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}));
    }catch(error){res.statusCode=400;res.end(String(error))}
  })}}]});
