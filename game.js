/* HOST — Demo de interfaz, no entrega premios reales. */
(()=>{
"use strict";
const $=id=>document.getElementById(id),canvas=$("scratchCanvas"),board=$("scratchBoard"),ctx=canvas.getContext("2d",{willReadFrequently:true}),status=$("statusText"),reveal=$("revealButton"),reset=$("resetButton");
let prize,done=false,drag=false,prev=null,strokes=0,W=0,H=0;
function choose(){
const items=window.HOST_RASPA_CONFIG.premiosDemo,total=items.reduce((n,p)=>n+p.peso,0);
const n=new Uint32Array(1);crypto.getRandomValues(n);let roll=n[0]/4294967296*total;
return items.find(p=>(roll-=p.peso)<0)||items.at(-1);
}
function fill(){
$("prizeIcon").textContent=prize.icono;$("prizePretitle").textContent=prize.ganador?"¡TE TOCÓ!":"NO TE DESANIMES";
$("prizeName").textContent=prize.titulo;$("prizeDetail").textContent=prize.detalle;
}
function paint(){
ctx.globalCompositeOperation="source-over";ctx.clearRect(0,0,W,H);
let g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,"#8d9297");g.addColorStop(.45,"#3d4149");g.addColorStop(1,"#a9adb0");
ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.strokeStyle="#ffffff14";
for(let x=-H;x<W+H;x+=12){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+H,H);ctx.stroke();}
ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="white";
ctx.font="900 "+Math.min(15,W/23)+"px Barlow,Arial";ctx.fillText("✦ TU SORPRESA ESTÁ ACÁ ✦",W/2,H/2-34);
ctx.font="400 "+Math.min(43,W/8)+"px Anton,Impact";ctx.fillText("RASPÁ ACÁ",W/2,H/2+9);
ctx.fillStyle="#ffcf62";ctx.font="900 "+Math.min(12,W/30)+"px Barlow,Arial";ctx.fillText("DESLIZÁ TU DEDO O MOUSE",W/2,H/2+47);
}
function setup(){
if(done)return;const r=board.getBoundingClientRect();W=Math.round(r.width);H=Math.round(r.height);if(!W||!H)return;
const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0);paint();
}
function loc(e){const b=canvas.getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top};}
function scratch(p){
ctx.globalCompositeOperation="destination-out";ctx.lineWidth=Math.max(34,Math.min(W*.13,55));ctx.lineJoin="round";ctx.lineCap="round";
ctx.beginPath();if(prev){ctx.moveTo(prev.x,prev.y);ctx.lineTo(p.x,p.y);ctx.stroke();}else{ctx.arc(p.x,p.y,ctx.lineWidth*.48,0,2*Math.PI);ctx.fill();}
prev=p;if(++strokes%7===0)check();
}
function check(){
if(done)return;let image=ctx.getImageData(0,0,canvas.width,canvas.height),data=image.data,stepX=Math.max(1,Math.round(canvas.width/90)),stepY=Math.max(1,Math.round(canvas.height/60)),erased=0,total=0;
for(let y=0;y<canvas.height;y+=stepY)for(let x=0;x<canvas.width;x+=stepX){total++;if(data[(y*canvas.width+x)*4+3]<120)erased++;}
const percent=Math.round(erased/total*100);status.textContent="RASPADO "+percent+"% · ¡SEGUÍ!";if(percent>=43)show();
}
function confetti(){
if(!prize.ganador||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
const layer=$("confettiLayer");layer.replaceChildren();const colors=["#ffc329","#ff7b00","#ed171f","#fff"];
for(let i=0;i<48;i++){let e=document.createElement("i");e.className="confetti";e.style.left=Math.random()*100+"%";e.style.background=colors[i%4];e.style.setProperty("--drift",(Math.random()-.5)*250+"px");e.style.setProperty("--time",(2+Math.random()*3)+"s");e.style.animationDelay=Math.random()*.6+"s";layer.append(e);}
}
function show(){
if(done)return;done=true;drag=false;prev=null;canvas.classList.add("revealed");status.textContent=prize.ganador?"🔥 ¡QUÉ SUERTE! MIRÁ TU PREMIO":"✨ ¡GRACIAS POR PARTICIPAR!";
reveal.disabled=true;reveal.textContent="RESULTADO REVELADO ✓";confetti();
}
function round(){
prize=choose();done=false;drag=false;prev=null;strokes=0;fill();canvas.classList.remove("revealed");
status.textContent="DESLIZÁ PARA RASPAR";reveal.disabled=false;reveal.innerHTML="REVELAR RESULTADO <span>↗</span>";
$("confettiLayer").replaceChildren();const n=new Uint32Array(1);crypto.getRandomValues(n);$("ticketNumber").textContent=String(n[0]%1000000).padStart(6,"0");setup();
}
canvas.addEventListener("pointerdown",e=>{if(done)return;e.preventDefault();drag=true;prev=null;canvas.setPointerCapture(e.pointerId);scratch(loc(e));});
canvas.addEventListener("pointermove",e=>{if(!drag||done)return;e.preventDefault();scratch(loc(e));});
function end(e){if(!drag)return;drag=false;prev=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);check();}
canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);canvas.addEventListener("lostpointercapture",()=>{drag=false;prev=null;});
reveal.addEventListener("click",show);reset.addEventListener("click",round);
if("ResizeObserver"in window)new ResizeObserver(()=>{if(!done&&!drag)setup();}).observe(board);
const logo=$("hostLogo"),fallback=$("brandFallback");logo.addEventListener("load",()=>{logo.hidden=false;fallback.hidden=true;});logo.addEventListener("error",()=>{logo.hidden=true;fallback.hidden=false;});if(logo.complete&&logo.naturalWidth){logo.hidden=false;fallback.hidden=true;}
try{round();}catch(e){console.error(e);status.textContent="NO SE PUDO INICIAR LA DEMO";}
})();