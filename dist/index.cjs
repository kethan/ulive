var ulive=function(e){let t,r=function(e,r,n){return void 0===n&&(n=new Set),(r=r=>{if(void 0===r)return t&&n.add(t),e;if(r.call)return n.add(r),()=>n.delete(r);for(r of(e=r,n))r&&r(e)})._o=1,r};return e.effect=e=>{let n=r(),f=()=>{if(f===t)throw"1/0";let r=t;t=f,n(e()),t=r};return f(),n},e.o=r,e}({});
