/* HOST — Demo de interfaz, no entrega premios reales. */
(()=>{
"use strict";
const $=id=>document.getElementById(id),canvas=$("scratchCanvas"),board=$("scratchBoard"),ctx=canvas.getContext("2d",{willReadFrequently:true}),status=$("statusText"),reveal=$("revealButton"),reset=$("resetButton");
let prize,done=false,drag=false,prev=null,strokes=0,W=0,H=0;
const token=new URLSearchParams(location.search).get("c")||"";
const demo=!token;
const validToken=/^HST-[A-F0-9]{40}$/.test(token);
const url="https://ewfblytwbmzclygiwqcy.supabase.co/rest/v1/rpc/";
const publishableKey="sb_publishable_DDDdcBd3TlGMkdrD0NSODw_0ENzS4C1";
let ready=demo,requested=false,requesting=false,pendingPoint=null;
let claimData=null;
const whatsappInCard=$("claimWhatsappInCard");
function updateWhatsappButton(){
  if(!whatsappInCard)return;
  const isDemoResult=demo&&done&&!!prize;
  const isRealResult=!demo&&done&&!!claimData&&!claimData.redeemed;
  const available=isDemoResult||isRealResult;
  whatsappInCard.hidden=!available;
  // No dejar otro botón deshabilitado ocupando la pantalla del resultado.
  if(done)reveal.hidden=available;
  if(!available)return;
  let message;
  if(isDemoResult){

    message=[
      "¡Hola HOST! 🔥 Estoy probando el Raspa y Ganá.",
      "🎁 Premio de demostración: "+prize.titulo,
      "⚠️ Este es un ejemplo: NO es un premio válido ni se puede canjear.",
      "Quisiera consultar cómo funciona la promoción."
    ].join("\n");
  }else{

    message=[
      "¡Hola HOST! 🔥 Gané en el Raspa y Ganá y quiero reclamar mi premio.",
      "🎁 Premio: "+claimData.prize,
      "🎟️ Tarjeta Nº: "+String(claimData.serial).padStart(6,"0"),
      "🔐 Código de canje: "+claimData.claim_code,
      "¿Cómo puedo retirarlo?"
    ].join("\n");
  }
  const waUrl="https://api.whatsapp.com/send?phone=5493764167507&text="+encodeURIComponent(message);
  whatsappInCard.href=waUrl;
  whatsappInCard.textContent=isDemoResult?"📲 PROBAR WHATSAPP":"📲 RECLAMAR POR WHATSAPP";
}
async function rpc(method){
  const response=await fetch(url+method,{
    method:"POST",
    headers:{"apikey":publishableKey,"Content-Type":"application/json"},
    body:JSON.stringify({p_token:token})
  });
  if(!response.ok)throw Error("No pudimos conectar con HOST");
  return response.json();
}
function resultPrize(data){
  claimData={prize:data.prize,claim_code:data.claim_code,serial:data.serial,redeemed:data.state==="redeemed"};
  prize={icono:"🎁",titulo:data.prize,detalle:"CÓDIGO DE CANJE: "+data.claim_code,ganador:true};
  fill();
  updateWhatsappButton();
}
function showCardError(message){
  ready=false;requested=true;done=true;drag=false;prev=null;
  claimData=null;updateWhatsappButton();
  canvas.classList.add("revealed");
  $("prizeIcon").textContent="🎟️";
  $("prizePretitle").textContent="HOST · RASPÁ Y GANÁ";
  $("prizeName").textContent=message;
  $("prizeDetail").textContent="CONSULTÁ EN HOST SI NECESITÁS AYUDA";
  reveal.disabled=true;status.textContent=message;
}
async function loadCard(){
  if(demo){$("demoNotice").hidden=false;return;}
  $("demoNotice").hidden=true;
  if(!validToken){showCardError("QR INVÁLIDO");return;}
  status.textContent="VERIFICANDO TU TARJETA...";
  reveal.disabled=true;
  try{
    const data=await rpc("host_scratch_status");
    if(data.state==="ready"){
      ready=true;
      $("ticketNumber").textContent=String(data.serial).padStart(6,"0");
      status.textContent="RASPÁ PARA DESCUBRIR TU PREMIO";
      reveal.disabled=false;
    }else if(data.state==="played"||data.state==="redeemed"){
      $("ticketNumber").textContent=String(data.serial).padStart(6,"0");
      resultPrize(data);
      done=true;requested=true;
      canvas.classList.add("revealed");
      reveal.disabled=true;
      status.textContent=data.state==="redeemed"?"PREMIO YA CANJEADO":"ESTA TARJETA YA FUE UTILIZADA";
      updateWhatsappButton();
    }else showCardError("QR INVÁLIDO");
  }catch(e){console.error(e);showCardError("ERROR DE CONEXIÓN");}
}
async function startClaim(point){
  if(demo){scratch(point);return;}
  if(!ready||done||requested)return;
  pendingPoint=point;
  if(requesting)return;
  requesting=true;status.textContent="ACTIVANDO TU TARJETA...";
  try{
    const data=await rpc("host_scratch_play");
    if(data.state==="played"){
      requested=true;requesting=false;
      resultPrize(data);
      status.textContent="¡SEGUÍ RASPANDO!";
      if(pendingPoint)scratch(pendingPoint);
    }else{
      requesting=false;
      showCardError(data.state==="used"?"ESTA TARJETA YA FUE UTILIZADA":"QR INVÁLIDO");
    }
  }catch(e){requesting=false;console.error(e);showCardError("ERROR DE CONEXIÓN");}
}

function choose(){
const items=window.HOST_RASPA_CONFIG.premiosDemo,total=items.reduce((n,p)=>n+p.peso,0);
const n=new Uint32Array(1);crypto.getRandomValues(n);let roll=n[0]/4294967296*total;
return items.find(p=>(roll-=p.peso)<0)||items.at(-1);
}
function fill(){
$("prizeIcon").textContent=prize.icono;$("prizePretitle").textContent=prize.ganador?"¡TE TOCÓ!":"NO TE DESANIMES";
$("prizeName").style.fontSize=prize.titulo.length>23?"clamp(22px,6vw,34px)":"clamp(30px,8vw,46px)";
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
ctx.globalCompositeOperation="destination-out";ctx.lineWidth=Math.max(100,Math.min(W*.37,145));ctx.lineJoin="round";ctx.lineCap="round";
ctx.beginPath();if(prev){ctx.moveTo(prev.x,prev.y);ctx.lineTo(p.x,p.y);ctx.stroke();}else{ctx.arc(p.x,p.y,ctx.lineWidth*.48,0,2*Math.PI);ctx.fill();}
prev=p;if(++strokes%3===0)check();
}
function check(){
if(done)return;let image=ctx.getImageData(0,0,canvas.width,canvas.height),data=image.data,stepX=Math.max(1,Math.round(canvas.width/55)),stepY=Math.max(1,Math.round(canvas.height/38)),erased=0,total=0;
for(let y=0;y<canvas.height;y+=stepY)for(let x=0;x<canvas.width;x+=stepX){total++;if(data[(y*canvas.width+x)*4+3]<120)erased++;}
const percent=Math.round(erased/total*100);status.textContent="RASPADO "+percent+"% · ¡SEGUÍ!";if(percent>=12)show();
}
function confetti(){
if(!prize.ganador||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
const layer=$("confettiLayer");layer.replaceChildren();const colors=["#ffc329","#ff7b00","#ed171f","#fff"];
for(let i=0;i<48;i++){let e=document.createElement("i");e.className="confetti";e.style.left=Math.random()*100+"%";e.style.background=colors[i%4];e.style.setProperty("--drift",(Math.random()-.5)*250+"px");e.style.setProperty("--time",(2+Math.random()*3)+"s");e.style.animationDelay=Math.random()*.6+"s";layer.append(e);}
}
function show(){
if(done)return;done=true;drag=false;prev=null;canvas.classList.add("revealed");status.textContent=prize.ganador?"🔥 ¡QUÉ SUERTE! MIRÁ TU PREMIO":"✨ ¡GRACIAS POR PARTICIPAR!";
reveal.disabled=true;reveal.textContent="RESULTADO REVELADO ✓";confetti();updateWhatsappButton();
}
function round(){
prize=demo?choose():{icono:"🎁",titulo:"TU SORPRESA",detalle:"RASPÁ PARA DESCUBRIR",ganador:true};done=false;drag=false;prev=null;strokes=0;fill();canvas.classList.remove("revealed");
status.textContent="DESLIZÁ PARA RASPAR";reveal.hidden=false;reveal.disabled=false;reveal.innerHTML="REVELAR RESULTADO <span>↗</span>";
$("confettiLayer").replaceChildren();const n=new Uint32Array(1);crypto.getRandomValues(n);$("ticketNumber").textContent=String(n[0]%1000000).padStart(6,"0");setup();
}
// El gesto táctil se maneja por separado para que Safari/iPhone no desplace la página.
canvas.style.touchAction="none";
board.style.touchAction="none";
let activeTouchId=null;
function touchPoint(event) {
  const touches=[...event.changedTouches];
  const touch=touches.find(t=>t.identifier===activeTouchId);
  return touch?loc(touch):null;
}
canvas.addEventListener("touchstart",event=>{
  if(done||activeTouchId!==null)return;
  if(event.cancelable)event.preventDefault();
  const t=event.changedTouches[0];
  if(!t)return;
  activeTouchId=t.identifier;drag=true;prev=null;startClaim(loc(t));
},{passive:false});
canvas.addEventListener("touchmove",event=>{
  if(activeTouchId===null||!drag)return;
  if(event.cancelable)event.preventDefault();
  const p=touchPoint(event);if(p){if(requesting)pendingPoint=p;else if(ready&&(demo||requested))scratch(p);}
},{passive:false});
function endTouch(event){
  if(activeTouchId===null)return;
  const p=touchPoint(event);if(!p)return;
  if(event.cancelable)event.preventDefault();
  activeTouchId=null;drag=false;prev=null;check();
}
canvas.addEventListener("touchend",endTouch,{passive:false});
canvas.addEventListener("touchcancel",endTouch,{passive:false});
// iOS Safari puede hacer scroll aun con touch-action; bloquearlo sólo al raspar.
document.addEventListener("touchmove",event=>{
  if(activeTouchId!==null&&event.cancelable)event.preventDefault();
},{passive:false});
canvas.addEventListener("pointerdown",event=>{
  if(event.pointerType==="touch"||done)return;
  event.preventDefault();drag=true;prev=null;
  try{canvas.setPointerCapture(event.pointerId);}catch(e){}
  startClaim(loc(event));
});
canvas.addEventListener("pointermove",event=>{
  if(event.pointerType==="touch"||!drag||done)return;
  event.preventDefault();const p=loc(event);if(requesting)pendingPoint=p;else if(ready&&(demo||requested))scratch(p);
});
function end(event){
  if(event.pointerType==="touch"||!drag)return;
  drag=false;prev=null;
  if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  check();
}
canvas.addEventListener("pointerup",end);
canvas.addEventListener("pointercancel",end);
canvas.addEventListener("lostpointercapture",()=>{if(activeTouchId===null){drag=false;prev=null;}});
reveal.addEventListener("click",async()=>{
  if(demo){show();return;}
  if(done||!ready)return;
  if(!requested)await startClaim({x:W/2,y:H/2});
  if(requested&&!done)show();
});
if("ResizeObserver"in window)new ResizeObserver(()=>{if(!done&&!drag)setup();}).observe(board);
const logo=$("hostLogo"),fallback=$("brandFallback");logo.addEventListener("load",()=>{logo.hidden=false;fallback.hidden=true;});logo.addEventListener("error",()=>{logo.hidden=true;fallback.hidden=false;});if(logo.complete&&logo.naturalWidth){logo.hidden=false;fallback.hidden=true;}
try{round();loadCard();}catch(e){console.error(e);status.textContent="NO SE PUDO INICIAR EL JUEGO";}
})();