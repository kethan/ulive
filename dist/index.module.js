var r;function n(n){var t=n,e=new Set;return{_r:!0,get value(){return r&&e.add(r),t},set value(r){t=r,e.forEach(function(n){return n(r)})},watch:function(r){return e.add(r),r(t),function(){return e.delete(r)}}}}var t=function(t){var e=n();return function n(){if(n===r)throw"∞";var u=r;r=n,e.value=t(),r=u}(),e};export{t as effect,n as r};
