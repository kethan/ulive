!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).ulive={})}(this,(function(e){let t,l;const n=e=>(e.toJSON=e.then=e.toString=e.valueOf=()=>e.value,e),f=(e,f,o=new Set)=>n({get value(){return t?.deps.push(o.add(t)),e},set value(t){if(t!==e){e=t;for(let e of o)l?l.add(e):e()}},peek:()=>e}),o=(e,l,n,f)=>(f=(n=f=>{l?.call?.(),f=t,t=n;try{l=e()}finally{t=f}}).deps=[],n(),e=>{for(l?.call?.();e=f.pop();)e.delete(n)});e.batch=e=>{let t=l;t||(l=new Set);try{e()}finally{if(!t){t=l,l=null;for(const e of t)e()}}},e.computed=(e,t=f(),l,u)=>n({get value(){return u||=o((()=>t.value=e())),t.value},peek:t.peek}),e.effect=o,e.signal=f,e.untracked=(e,l,n)=>(l=t,t=null,n=e(),t=l,n)}));