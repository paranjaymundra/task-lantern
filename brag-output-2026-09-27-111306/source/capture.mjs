import {spawn} from 'node:child_process';
import {mkdtemp, readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {pathToFileURL} from 'node:url';
const root=process.env.TASK_LANTERN_REPO || fileURLToPath(new URL('../../',import.meta.url));
const timing=JSON.parse(await readFile(new URL('../timeline.json',import.meta.url),'utf8'));
const cut=timing.scenes.map(s=>s.start);
const duration=timing.footage_duration;
const out=new URL('../work/frames/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const profile=await mkdtemp(join(tmpdir(),'lantern-capture-'));
const child=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let socket,launchError;child.on('error',error=>{launchError=error});
try{
 let port;for(let i=0;i<100;i++){if(launchError)throw launchError;try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break}catch{await sleep(100)}}
 if(!port)throw Error('Chrome failed to start');
 const target=await(await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'})).json();
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map();
 socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timeout);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timeout=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout: '+method))},15000);pending.set(n,{resolve,reject,timeout});socket.send(JSON.stringify({id:n,method,params}))});
 const evaluate=async expression=>{const v=await call('Runtime.evaluate',{expression,returnByValue:true});if(v.exceptionDetails)throw Error(JSON.stringify(v.exceptionDetails));return v.result.value};
 await call('Page.enable');await call('Runtime.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1.5,mobile:false});
 await call('Page.navigate',{url:pathToFileURL(join(root,'examples/demo-light.html')).href});
 for(let i=0;i<100;i++){await sleep(60);if(await evaluate('!!document.querySelector(".thread-item")'))break;}
 await evaluate(`localStorage.clear();sessionStorage.clear();document.body.classList.remove('dark');`);
 // Recording-only presentation changes. The shipped demo and its labels are untouched.
 await evaluate(`(()=>{
 const style=document.createElement('style');style.textContent='#demo-note,#freshness,#updated,#home{display:none!important}.workspace-label{border-left:0!important;padding-left:0!important}#revision{border-left:0!important;padding-left:0!important}main{padding-bottom:70vh!important}body{overflow-anchor:none}';document.head.append(style);
 const ring=document.createElement('div');ring.id='recording-focus';ring.style.cssText='position:fixed;pointer-events:none;z-index:99998;border:2px solid #b25630;border-radius:8px;background:#ae563009;box-shadow:0 0 0 4px #fffefa99;opacity:0;transition:opacity .18s ease';document.body.append(ring);
 window.__recordingFocus=(selector)=>{
  document.querySelector('#refresh').textContent='Refresh';
  const nodes=selector?[...document.querySelectorAll(selector)]:[];
  const rects=nodes.map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.bottom>0&&r.top<innerHeight);
  if(!rects.length){ring.style.opacity='0';return;}
  const x=Math.max(5,Math.min(...rects.map(r=>r.left))-5),y=Math.max(5,Math.min(...rects.map(r=>r.top))-5);
  const right=Math.min(innerWidth-5,Math.max(...rects.map(r=>r.right))+5),bottom=Math.min(innerHeight-5,Math.max(...rects.map(r=>r.bottom))+5);
  Object.assign(ring.style,{left:x+'px',top:y+'px',width:(right-x)+'px',height:(bottom-y)+'px',opacity:'1'});
 };
})()`);
 const highlights=[
 {start:1.7,end:3.0,target:'.current-card'},
 {start:3.2,end:3.8,target:'#blocker-preview'},
 {start:4.0,end:cut[1]-.45,target:'.attention-card'},
 {start:cut[1]+.7,end:cut[1]+3.3,target:'.thread-item[aria-current="true"]'},
 {start:cut[1]+3.5,end:cut[1]+5.1,target:'.current-card'},
 {start:cut[1]+5.6,end:cut[2]-.45,target:'#blocker-preview'},
 {start:cut[2]+.65,end:cut[2]+2.35,target:'.decision-row.required .decision-top'},
 {start:cut[2]+2.5,end:cut[2]+4.65,target:'.decision-row.required .decision-default'},
 {start:cut[2]+4.8,end:cut[3]-.45,target:'.decision-row.required .decision-action'},
 {start:cut[3]+.65,end:cut[3]+2.45,target:'#detail-stack'},
 {start:cut[3]+3.05,end:cut[4]-.45,target:'.task-row.doing'},
 {start:cut[4]+.65,end:cut[4]+3.2,target:'.run-meta'},
 {start:cut[4]+3.4,end:duration-.45,target:'.local-indicator'},
 ];

 await evaluate(`(()=>{const c=document.createElement('div');c.id='recording-pointer';c.style.cssText='position:fixed;left:1080px;top:250px;width:20px;height:27px;pointer-events:none;z-index:99999;transition:left .13s ease,top .13s ease;filter:drop-shadow(0 2px 2px #0003)';c.innerHTML='<svg viewBox="0 0 20 27"><path d="M2 2v20l5-5 4 8 4-2-4-7h7Z" fill="#fffefa" stroke="#282b26" stroke-width="1.4"/></svg>';document.body.append(c)})()`);
 const move=async selector=>{const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await evaluate(`Object.assign(document.querySelector('#recording-pointer').style,{left:'${p.x-2}px',top:'${p.y-2}px'})`);return p};
 const click=async selector=>{const p=await move(selector);await call('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',clickCount:1})};
 await evaluate(`window.scrollTo(0,0)`);
 const actions=[
 [cut[1]+.75,()=>move('.thread-item:nth-of-type(2)')],
 [cut[1]+1.1,()=>click('.thread-item:nth-of-type(2)')],
 [cut[1]+4.8,()=>move('.thread-item:nth-of-type(1)')],
 [cut[1]+5.1,()=>click('.thread-item:nth-of-type(1)')],
 [cut[2]-.35,()=>move('#review-decisions')],
 [cut[2]-.05,()=>click('#review-decisions')],
 [cut[3]-.08,async()=>{await evaluate(`document.querySelector('#decisions-details').open=false;window.scrollTo({top:window.scrollY+document.querySelector('#detail-stack').getBoundingClientRect().top-50,behavior:'instant'})`);}],
 [cut[3]+2.65,()=>click('#plan-details > summary')],
 [cut[4]-.08,async()=>{await evaluate(`document.querySelector('#plan-details').open=false;window.scrollTo(0,0)`);}],
 ];
 let action=0,n=0;const frames=[];const start=performance.now();
 while(true){const t=(performance.now()-start)/1000;if(t>=duration)break;
 while(action<actions.length&&t>=actions[action][0]){await actions[action++][1]();}
 const focus=highlights.find(h=>t>=h.start&&t<h.end);await evaluate('window.__recordingFocus('+JSON.stringify(focus?.target||'')+')');
 const shot=await call('Page.captureScreenshot',{format:'jpeg',quality:92,captureBeyondViewport:false});
 const filename=String(n++).padStart(5,'0')+'.jpg';await writeFile(join(out,filename),Buffer.from(shot.data,'base64'));frames.push({file:filename,t:(performance.now()-start)/1000});
 await sleep(35);
 }
 const first=frames[0].t;let concat='';for(let i=0;i<frames.length;i++){concat+=`file '${frames[i].file}'\nduration ${i+1<frames.length?frames[i+1].t-frames[i].t:duration-(frames[i].t-first)}\n`;}
 concat+=`file '${frames.at(-1).file}'\n`;
 await writeFile(join(out,'frames.txt'),concat);await writeFile(join(out,'capture.json'),JSON.stringify({highlights,duration,frames:frames.length,width:2160,height:1350,actions:actions.map(x=>x[0])},null,2));
 console.log('Captured '+frames.length+' frames of real Chrome interaction.');
}finally{socket?.close();child.kill();await sleep(500);await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
