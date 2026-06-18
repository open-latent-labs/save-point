import { useRef, useEffect } from "react";
function getColors(){const s=getComputedStyle(document.documentElement);return{mintRgb:s.getPropertyValue("--mint-rgb").trim()||"5,150,105",strongRgb:s.getPropertyValue("--mint-strong-rgb").trim()||"4,120,87"};}
const CHARS="0123456789ABCDEF×∆∑≠";
const GRID=28;
const DX=[1,0,-1,0],DY=[0,1,0,-1];

export default function Circuit(){
  const canvasRef=useRef(null);const colRef=useRef(getColors());
  useEffect(()=>{const s=()=>{colRef.current=getColors();};window.addEventListener("gamedocs:theme",s);return()=>window.removeEventListener("gamedocs:theme",s);},[]);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    let W=0,H=0,traces=[],rafId,lastTime=0,spawnTimer=0;
    const rand=(a,b)=>a+Math.random()*(b-a);
    const rc=()=>CHARS[Math.floor(Math.random()*CHARS.length)];
    const snap=(v)=>Math.round(v/GRID)*GRID;

    function mkTrace(){
      let x=snap(rand(0,W)),y=snap(rand(0,H));
      const segs=[];
      const local=new Set([`${x},${y}`]);
      let dir=Math.floor(rand(0,4));
      for(let i=0;i<Math.floor(rand(8,22));i++){
        const dirs=[0,1,2,3].filter(d=>{
          const nx=x+DX[d]*GRID,ny=y+DY[d]*GRID;
          return nx>=0&&nx<=W&&ny>=0&&ny<=H&&!local.has(`${nx},${ny}`);
        });
        if(!dirs.length)break;
        if(!dirs.includes(dir)||Math.random()<0.3)
          dir=dirs[Math.floor(Math.random()*dirs.length)];
        const nx=x+DX[dir]*GRID,ny=y+DY[dir]*GRID;
        segs.push({x1:x,y1:y,x2:nx,y2:ny});
        local.add(`${nx},${ny}`);x=nx;y=ny;
      }
      if(!segs.length)return null;
      const nodeSet=new Map();
      segs.forEach((sg,i)=>{
        if(i===0)nodeSet.set(`${sg.x1},${sg.y1}`,{x:sg.x1,y:sg.y1});
        const isCorner=i>0&&(segs[i-1].x2!==sg.x1||segs[i-1].y2!==sg.y1)||i===segs.length-1;
        if(isCorner||Math.random()<0.35)nodeSet.set(`${sg.x2},${sg.y2}`,{x:sg.x2,y:sg.y2});
      });
      const nodes=[...nodeSet.values()].map(n=>({...n,ch:rc(),timer:rand(1,5),rate:rand(2,5)}));
      return{segs,nodes,progress:0,speed:rand(4,9),
        life:1,decay:rand(0.13,0.22),alpha:rand(0.32,0.55)};
    }

    function resize(){
      const dpr=Math.min(devicePixelRatio||1,2),p=canvas.parentElement;
      W=p?p.clientWidth:innerWidth;H=innerHeight;
      canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
      canvas.style.width=W+"px";canvas.style.height=H+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
      traces=Array.from({length:9},()=>mkTrace()).filter(Boolean);
      spawnTimer=rand(0.2,0.8);
    }

    function frame(ts){
      const dt=Math.min((ts-(lastTime||ts))/1000,0.05);lastTime=ts;
      const{mintRgb,strongRgb}=colRef.current;
      ctx.clearRect(0,0,W,H);
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.font=`10px 'IBM Plex Mono',monospace`;

      spawnTimer-=dt;
      if(spawnTimer<=0&&traces.length<14){
        const t=mkTrace();if(t)traces.push(t);
        spawnTimer=rand(0.2,0.8);
      }

      for(let ti=traces.length-1;ti>=0;ti--){
        const tr=traces[ti];
        if(tr.progress<tr.segs.length){
          tr.progress=Math.min(tr.segs.length,tr.progress+tr.speed*dt);
        } else {
          tr.life-=tr.decay*dt;
        }
        if(tr.life<=0){traces.splice(ti,1);continue;}

        const a=tr.alpha*tr.life;
        ctx.lineWidth=0.9;
        for(let si=0;si<Math.floor(tr.progress)&&si<tr.segs.length;si++){
          const sg=tr.segs[si];
          ctx.strokeStyle=`rgba(${mintRgb},${a*0.38})`;
          ctx.beginPath();ctx.moveTo(sg.x1,sg.y1);ctx.lineTo(sg.x2,sg.y2);ctx.stroke();
        }
        const frac=tr.progress-Math.floor(tr.progress);
        const headIdx=Math.floor(tr.progress);
        if(headIdx<tr.segs.length){
          const sg=tr.segs[headIdx];
          const hx=sg.x1+(sg.x2-sg.x1)*frac,hy=sg.y1+(sg.y2-sg.y1)*frac;
          ctx.strokeStyle=`rgba(${strongRgb},${a})`;ctx.lineWidth=1.6;
          ctx.beginPath();ctx.moveTo(sg.x1,sg.y1);ctx.lineTo(hx,hy);ctx.stroke();
          ctx.fillStyle=`rgba(${strongRgb},${a})`;
          ctx.fillText(tr.nodes[0]?.ch||"·",hx,hy);
        }
        const visibleSegs=Math.floor(tr.progress);
        for(const n of tr.nodes){
          n.timer-=dt;if(n.timer<=0){n.ch=rc();n.timer=n.rate;}
          const withinRange=tr.segs.slice(0,visibleSegs).some(sg=>sg.x2===n.x&&sg.y2===n.y)||
            (tr.segs[0]?.x1===n.x&&tr.segs[0]?.y1===n.y);
          if(!withinRange)continue;
          ctx.fillStyle=`rgba(${mintRgb},${a*0.9})`;
          ctx.fillText(n.ch,n.x,n.y);
        }
      }
      rafId=requestAnimationFrame(frame);
    }

    const ro=new ResizeObserver(resize);
    if(canvas.parentElement)ro.observe(canvas.parentElement);
    window.addEventListener("resize",resize);resize();rafId=requestAnimationFrame(frame);
    return()=>{cancelAnimationFrame(rafId);window.removeEventListener("resize",resize);ro.disconnect();};
  },[]);
  return <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,pointerEvents:"none",zIndex:0}}/>;
}
