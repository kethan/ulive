let e;function t(t){let r=t,l=new Set;return{_r:!0,get value(){return e&&l.add(e),r},set value(e){r=e,l.forEach(t=>t(e))},watch:e=>(l.add(e),e(r),()=>l.delete(e))}}let r=r=>{let l=t(),a=()=>{if(a===e)throw"∞";let t=e;e=a,l.value=r(),e=t};return a(),l};export{r as effect,t as r};
