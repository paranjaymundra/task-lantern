// Optional browser smoke checks + real README screenshots. Node 22+ and Chrome.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chrome = process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const profile = await mkdtemp(join(tmpdir(), 'task-lantern-chrome-'));
const child = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir='+profile, 'about:blank'], {stdio:'ignore'});
let launchError; child.on('error', error => {launchError=error;});
let socket;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let port;
  for (let attempt=0; attempt<100; attempt++) {
    if (launchError) throw launchError;
    try {port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;} catch {await sleep(100);}
  }
  assert.ok(port, 'Chrome debugging endpoint did not start');
  const target = await (await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'})).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let next=0; const pending=new Map(), errors=[];
  socket.addEventListener('message', ({data}) => {
    const message=JSON.parse(data);
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);
    const entry=pending.get(message.id);
    if(entry){pending.delete(message.id);clearTimeout(entry.timeout);message.error?entry.reject(new Error(JSON.stringify(message.error))):entry.resolve(message.result);}
  });
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},15000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await call('Runtime.enable');await call('Page.enable');
  const load=async path=>{await call('Page.navigate',{url:pathToFileURL(path).href});for(let n=0;n<100;n++){await sleep(50);if(await evaluate('document.readyState === "complete" && !!document.querySelector("#tasks .row")'))return;}throw new Error('Dashboard did not render');};
  const assets=join(root,'docs/assets');await mkdir(assets,{recursive:true});
  for(const [file,width,height,out] of [['demo.html',1440,1300,'dashboard-dark.png'],['demo-light.html',1440,1300,'dashboard-light.png'],['demo.html',390,844,'dashboard-mobile.png']]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
    await load(join(root,'examples',file));
    assert.equal(await evaluate('document.querySelectorAll(".panel").length'),4);
    assert.equal(await evaluate('document.querySelectorAll("#tasks .row").length'),6);
    assert.equal(await evaluate('document.querySelector("progress").value'),3);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true,'Horizontal overflow');
    const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    await writeFile(join(assets,out),Buffer.from(data,'base64'));
  }
  await evaluate('document.querySelector("#refresh").click()');
  assert.equal(await evaluate('document.querySelector("#refresh").textContent'),'Resume refresh');
  await call('Page.reload');await sleep(300);
  assert.equal(await evaluate('document.querySelector("#refresh").textContent'),'Resume refresh');
  const source=await readFile(join(root,'examples/demo.html'),'utf8');
  const fixture=join(profile,'refresh-test.html');
  await writeFile(fixture,source);
  await load(fixture);
  // Session storage can be shared across file URLs. Explicitly resume if needed.
  await evaluate('if(document.querySelector("#refresh").textContent==="Resume refresh")document.querySelector("#refresh").click()');
  await writeFile(fixture,source.replaceAll('A better search experience.','Refresh check passed.'));
  await sleep(11000);
  assert.equal(await evaluate('document.querySelector("h1").textContent'),'Refresh check passed.','10-second reload did not pick up disk changes');
  assert.deepEqual(errors,[],'Browser runtime errors');
  console.log('PASS: dark/light/mobile rendering, panel content, no overflow, pause persistence, real file refresh, no runtime exceptions.');
  console.log('Screenshots: docs/assets/dashboard-{dark,light,mobile}.png');
} finally {
  if(socket)socket.close();
  child.kill('SIGTERM');
  await new Promise(resolve=>{if(child.exitCode!==null || child.signalCode!==null)return resolve();const timer=setTimeout(resolve,3000);child.once('exit',()=>{clearTimeout(timer);resolve();});});
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
