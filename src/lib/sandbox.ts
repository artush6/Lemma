// Runs personal snippets in a disposable worker with a hard time limit.
// Worker isolation is not a security boundary for hostile code.
export type RunResult = {
  logs: { kind: "log" | "error"; text: string }[];
  ms: number;
  timedOut: boolean;
};

const workerSource = `
const block=()=>{throw new Error('Network access is disabled in Code Lab')};
self.fetch=block;self.XMLHttpRequest=block;self.WebSocket=block;self.EventSource=block;self.importScripts=block;
const fmt=v=>{if(typeof v==='string')return v;try{return JSON.stringify(v,null,2)}catch{return String(v)}};
const out=[];const push=(kind,a)=>{if(out.length<500)out.push({kind,text:a.map(fmt).join(' ').slice(0,20000)})};
const console={log:(...a)=>push('log',a),info:(...a)=>push('log',a),warn:(...a)=>push('log',a),error:(...a)=>push('error',a),table:(t)=>push('log',[table(t)])};
function parse(text){const ls=text.split(/\\r?\\n/).filter(l=>l.trim());if(!ls.length)return[];const sep=ls[0].includes('\\t')?'\\t':',';const head=ls[0].split(sep).map(s=>s.trim());return ls.slice(1).map(l=>{const c=l.split(sep);const o={};head.forEach((h,i)=>o[h]=(c[i]??'').trim());return o})}
const tokens=t=>(String(t).toLowerCase().match(/[\\p{L}\\p{M}'’-]+/gu)||[]);
const freq=a=>{const m=new Map();for(const x of a)m.set(x,(m.get(x)||0)+1);return [...m.entries()].sort((a,b)=>b[1]-a[1])};
const ngrams=(a,n=2)=>{const r=[];for(let i=0;i+n<=a.length;i++)r.push(a.slice(i,i+n).join(' '));return r};
function table(rows){if(!Array.isArray(rows)||!rows.length)return fmt(rows);const objs=rows.map(r=>Array.isArray(r)?Object.fromEntries(r.map((v,i)=>[i,v])):r);const cols=[...new Set(objs.flatMap(Object.keys))];const w=cols.map(c=>Math.min(28,Math.max(String(c).length,...objs.map(o=>String(o[c]??'').length))));const line=cs=>cs.map((v,i)=>String(v??'').slice(0,28).padEnd(w[i])).join('  ');return [line(cols),w.map(x=>'─'.repeat(x)).join('  '),...objs.slice(0,200).map(o=>line(cols.map(c=>o[c])))].join('\\n')}
self.onmessage=async e=>{const {code,datasets}=e.data;const t=performance.now();
 const data={};for(const d of datasets)data[d.name]={text:d.text,lines:d.text.split(/\\r?\\n/).filter(Boolean),rows:parse(d.text)};
 const first=datasets[0]?data[datasets[0].name]:{text:'',lines:[],rows:[]};
 try{const fn=new Function('console','data','text','lines','rows','tokens','freq','ngrams','table','"use strict";return (async()=>{'+code+'\\n})()');
  const r=await fn(console,data,first.text,first.lines,first.rows,tokens,freq,ngrams,table);if(r!==undefined)push('log',[r]);}
 catch(err){push('error',[String(err&&err.stack?err.message:err)])}
 self.postMessage({logs:out,ms:Math.round(performance.now()-t)})};`;

let url: string | null = null;
export function runSandboxed(
  code: string,
  datasets: { name: string; text: string }[],
  timeoutMs = 3000,
): Promise<RunResult> {
  url ??= URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
  const worker = new Worker(url);
  const start = performance.now();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        logs: [
          {
            kind: "error",
            text: `Stopped after ${timeoutMs / 1000}s — check for an endless loop.`,
          },
        ],
        ms: Math.round(performance.now() - start),
        timedOut: true,
      });
    }, timeoutMs);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ...e.data, timedOut: false });
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ logs: [{ kind: "error", text: e.message }], ms: 0, timedOut: false });
    };
    worker.postMessage({ code, datasets });
  });
}

// Python via Pyodide in its own worker. Network is blocked once the runtime has loaded.
const pySource = `
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
let ready=loadPyodide().then(py=>{const block=()=>{throw new Error('Network access is disabled in Code Lab')};self.fetch=block;self.XMLHttpRequest=block;self.WebSocket=block;return py});
self.onmessage=async e=>{const {code,datasets}=e.data;const out=[];const py=await ready;const t=performance.now();
 py.setStdout({batched:s=>out.push({kind:'log',text:s})});py.setStderr({batched:s=>out.push({kind:'error',text:s})});
 py.globals.set('_datasets',py.toPy(Object.fromEntries(datasets.map(d=>[d.name,d.text]))));
 try{await py.runPythonAsync("import csv, io\\ndata=dict(_datasets)\\ntext=next(iter(data.values()),'')\\nlines=[l for l in text.splitlines() if l.strip()]\\n_d='\\\\t' if lines and '\\\\t' in lines[0] else ','\\nrows=list(csv.DictReader(io.StringIO(text),delimiter=_d)) if lines else []\\n");
  const r=await py.runPythonAsync(code);if(r!==undefined&&r!==null)out.push({kind:'log',text:String(r)})}
 catch(err){out.push({kind:'error',text:String(err.message||err).split('\\n').filter(Boolean).slice(-3).join('\\n')})}
 self.postMessage({logs:out,ms:Math.round(performance.now()-t)})};`;

let pyUrl: string | null = null;

export function runPython(
  code: string,
  datasets: { name: string; text: string }[],
  timeoutMs = 20000,
): Promise<RunResult> {
  pyUrl ??= URL.createObjectURL(new Blob([pySource], { type: "text/javascript" }));
  const w = new Worker(pyUrl);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      w.terminate();

      resolve({
        logs: [{ kind: "error", text: `Stopped after ${timeoutMs / 1000}s.` }],
        ms: timeoutMs,
        timedOut: true,
      });
    }, timeoutMs);
    w.onmessage = (e) => {
      clearTimeout(timer);
      w.terminate();
      resolve({ ...e.data, timedOut: false });
    };
    w.onerror = (e) => {
      clearTimeout(timer);
      w.terminate();

      resolve({
        logs: [{ kind: "error", text: e.message || "Python failed to start" }],
        ms: 0,
        timedOut: false,
      });
    };
    w.postMessage({ code, datasets });
  });
}
