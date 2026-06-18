import { useRef, useEffect } from "react";
function getColors(){const s=getComputedStyle(document.documentElement);return{mintRgb:s.getPropertyValue("--mint-rgb").trim()||"5,150,105",strongRgb:s.getPropertyValue("--mint-strong-rgb").trim()||"4,120,87"};}
const CHARS="0123456789×÷∆∑√∞≈∂αβγθ∫≠";
export default function Firefly(){
  const canvasRef=useRef(null);const colRef=useRef(getColors());
  useEffect(()=>{const s=()=>{colRef.current=getColors();};window.addEventListener("gamedocs:theme",s);return()=>window.removeEventListener("gamedocs:theme",s);},[]);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    let W=0,H=0,flies=[],rafId,lastTime=0;
    const rand=(a,b)=>a+Math.random()*(b-a);
    const rc=()=>CHARS[Math.floor(Math.random()*CHARS.length)];
    function mkFly(){
      return{x:rand(0,W),y:rand(0,H),vx:rand(-0.4,0.4),vy:rand(-0.4,0.4),
        pulsePhase:rand(0,Math.PI*2),pulseSpeed:rand(0.5,2.0),
        size:rand(11,18),ch:rc(),timer:rand(1,5),rate:rand(2,6),
        glowR:rand(8,20)};
    }
    function resize(){
      const dpr=Math.min(devicePixelRatio||1,2),p=canvas.parentElement;
      W=p?p.clientWidth:innerWidth;H=innerHeight;
      canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
      canvas.style.width=W+"px";canvas.style.height=H+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
      flies=Array.from({length:50},mkFly);
    }
    function frame(ts){
      const dt=Math.min((ts-(lastTime||ts))/1000,0.05);lastTime=ts;
      const t=ts/1000;const{mintRgb,strongRgb}=colRef.current;
      ctx.clearRect(0,0,W,H);ctx.textAlign="center";ctx.textBaseline="middle";
      for(const f of flies){
        f.x+=f.vx*dt*60;f.y+=f.vy*dt*60;
        if(f.x<0)f.x=W;else if(f.x>W)f.x=0;
        if(f.y<0)f.y=H;else if(f.y>H)f.y=0;
        f.timer-=dt;if(f.timer<=0){f.ch=rc();f.timer=f.rate;}
        const pulse=(Math.sin(t*f.pulseSpeed+f.pulsePhase)+1)/2;
        const alpha=0.25+pulse*0.60;
        const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.glowR*pulse+6);
        g.addColorStop(0,`rgba(${mintRgb},${pulse*0.28})`);
        g.addColorStop(1,`rgba(${mintRgb},0)`);
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(f.x,f.y,f.glowR*pulse+6,0,Math.PI*2);ctx.fill();
        ctx.font=`${f.size}px 'IBM Plex Mono',monospace`;
        ctx.fillStyle=`rgba(${pulse>0.7?strongRgb:mintRgb},${alpha})`;
        if(pulse>0.6){ctx.shadowColor=`rgba(${mintRgb},0.45)`;ctx.shadowBlur=8;}
        ctx.fillText(f.ch,f.x,f.y);ctx.shadowBlur=0;
      }
      rafId=requestAnimationFrame(frame);
    }
    const ro=new ResizeObserver(resize);
    if(canvas.parentElement)ro.observe(canvas.parentElement);
    window.addEventListener("resize",resize);resize();rafId=requestAnimationFrame(frame);
    return()=>{cancelAnimationFrame(rafId);window.removeEventListener("resize",resize);ro.disconnect();};
  },[]);
  return <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,pointerEvents:"none",zIndex:0}} />;
}
