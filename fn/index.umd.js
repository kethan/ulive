!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).ulive={})}(this,(function(e){let t,n;const f=e=>(e.toJSON=e.then=e.toString=e.valueOf=()=>e(),e),l=(e,l=new Set,o)=>f(o=(...f)=>{if(!f.length)return t?.deps.push(l.add(t)),e;if(e!==f[0]){e=f[0];for(let t of l)n?n.add(t):t(e)}},o.peek=()=>e),o=(e,n,f,l)=>(l=(f=l=>{n?.call?.(),l=t,t=f;try{n=e()}finally{t=l}}).deps=[],f(),e=>{for(n?.call?.();e=l.pop();)e.delete(f)});e.batch=e=>{let t=n;t||(n=new Set);try{e()}finally{if(!t){t=n,n=null;for(const e of t)e()}}},e.effect=o,e.memo=(e,t=l(),n,i)=>f(n=(...n)=>{if(!n.length)return i||=o((()=>t(e()))),t()},n.peek=t.peek),e.o=l,e.untracked=(e,n,f)=>(n=t,t=null,f=e(),t=n,f)}));