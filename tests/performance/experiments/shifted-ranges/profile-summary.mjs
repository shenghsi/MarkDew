import {readFileSync} from 'node:fs';
const profile=JSON.parse(readFileSync(process.argv[2],'utf8'));
const nodes=new Map(profile.nodes.map(node=>[node.id,node])),parents=new Map();
for(const node of profile.nodes)for(const child of node.children||[])parents.set(child,node.id);
const stacks=new Map();
function stack(id){if(stacks.has(id))return stacks.get(id);const parent=parents.get(id),result=[nodes.get(id),...(parent?stack(parent):[])];stacks.set(id,result);return result;}
const totals=new Map(),self=new Map();let total=0,update=0;
for(let i=0;i<profile.samples.length;i++){
  const frames=stack(profile.samples[i]),us=profile.timeDeltas[i];total+=us;
  const root=frames.find(frame=>frame.callFrame.functionName==='update'&&frame.callFrame.url.endsWith('/src/web/preview.ts'));
  if(!root)continue;
  update+=us;
  const leaf=frames[0],label=`${leaf.callFrame.functionName||'(anonymous)'} @ ${leaf.callFrame.url}`;
  self.set(label,(self.get(label)||0)+us);
  const stage=frames.find(frame=>frame.callFrame.url.endsWith('/src/web/preview.ts')&&['collectCachedPreview','previewDecorations'].includes(frame.callFrame.functionName))?.callFrame.functionName||'other preview update';
  totals.set(stage,(totals.get(stage)||0)+us);
}
const ordered=map=>[...map].sort((a,b)=>b[1]-a[1]).map(([name,us])=>({name,ms:+(us/1000).toFixed(3),percentOfPreviewUpdate:+(us/update*100).toFixed(2)}));
console.log(JSON.stringify({profile:process.argv[2],scope:'CPU samples whose ancestry includes preview state-field update; excludes direct fresh-decoration oracle and initialization; unattached GC is not attributed',sampledMs:+(total/1000).toFixed(3),previewUpdateSampledMs:+(update/1000).toFixed(3),stages:ordered(totals),self:ordered(self).slice(0,20)},null,2));
