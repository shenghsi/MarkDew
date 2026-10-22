// Explicit local test writer; never installed by production.
import {defineConfig} from 'vite';
import {writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export default defineConfig({server:{host:'127.0.0.1',port:13329,strictPort:true,watch:{ignored:['**/src/desktop/target/**','**/local-coverage-browser*.json.gz']}},
  plugins:[{name:'local-coverage-report',configureServer(server){server.middlewares.use('/__local_coverage_result__',async(req,res)=>{
    if(req.method!=='POST'||req.headers.origin!=='http://127.0.0.1:13329'||req.headers['x-markdew-browser-result']!=='local-coverage-v1'){res.statusCode=403;res.end('Local fixture request required');return}
    try{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>12*1024*1024)throw Error('Report exceeds limit');chunks.push(chunk)}
      const batch=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(batch.running!==false||batch.progress?.done!==true||![1,6].includes(batch.results?.length))throw Error('Batch is not terminal');
      let name='local-coverage-browser.json.gz';
      if(batch.results.length===1){const record=batch.results[0];if(!['control','mounted','partial'].includes(record.profile)||typeof record.reverse!=='boolean')throw Error('Invalid case');name=`local-coverage-browser-${record.profile}-${record.reverse?'reverse':'normal'}.json.gz`;}
      const bytes=gzipSync(JSON.stringify(batch));await writeFile(new URL('../performance/experiments/point-comparison/'+name,import.meta.url),bytes);
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}))
    }catch(error){res.statusCode=400;res.end(String(error))}
  })}}]});
