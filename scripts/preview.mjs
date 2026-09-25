// Isolated browser fixtures. Never loaded by the production server or app.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {Game,createState} from '../engine.js';
const root=resolve(import.meta.dirname,'..');
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/preview'){
      const s=createState(32);s.day=6;s.phase='shop';s.tier='pro';s.coins=30;s.agents=[{id:'coordinator',dept:'Galley'},{id:'escalation',dept:'Cabins'}];
      const g=new Game(s);await g.startDay();
      s.items.forEach(i=>i.stuckRisk=0);
      s.events=[{id:'preview-inspect',type:'inspection',afterTurn:2,resolved:false},{id:'preview-brief',type:'briefing',dept:'Cabins',afterTurn:4,resolved:false}];
      const galley=s.items.find(i=>i.dept==='Galley');galley.status=1;
      s.items.filter(i=>i.dept==='Galley'&&i.lane!=='primary').forEach(i=>i.status=1);
      if(url.searchParams.get('scenario')==='port'){s.items.forEach(i=>i.status=3);await g.endDay();}
      if(url.searchParams.get('scenario')==='stuck'){s.items[0].status=2;s.items[0].stuckRisk=1;}
      if(url.searchParams.get('scenario')==='lost')await g.endDay();
      const html=await readFile(resolve(root,'index.html'),'utf8');
      const init=`<script>localStorage.setItem('all-a-board-v1',${JSON.stringify(JSON.stringify(s))});localStorage.setItem('aab-speed','1');</script>`;
      res.writeHead(200,{'Content-Type':'text/html'});res.end(html.replace('<script type="module"',init+'<script type="module"'));return;
    }
    const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+sep))throw Error('Invalid path');
    const data=await readFile(path);res.writeHead(200,{'Content-Type':{'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'}[extname(path)]||'application/octet-stream'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(5181,'127.0.0.1',()=>console.log('Browser fixtures: http://localhost:5181/preview and /preview?scenario=port'));
