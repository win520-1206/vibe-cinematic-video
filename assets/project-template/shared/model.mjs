// Original reproducible Bernoulli random walk, not measured data.
export function random(seed,i){let x=(seed+Math.imul(i+1,0x9e3779b9))|0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return ((x^(x>>>15))>>>0)/4294967296}
export function walk(seed,walker,steps){let x=0;const points=[0];for(let k=0;k<steps;k++){x+=random(seed,walker*100003+k)<.5?-1:1;points.push(x)}return points}
export function distribution(seed,count,steps){const bins=new Map();for(let i=0;i<count;i++){const a=walk(seed,i,steps);const x=a[a.length-1];bins.set(x,(bins.get(x)||0)+1)}return [...bins].sort((a,b)=>a[0]-b[0])}
