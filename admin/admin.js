import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm";
import {requireHostAdminMfa} from "./admin-mfa.js";

const db=createClient("https://ewfblytwbmzclygiwqcy.supabase.co","sb_publishable_DDDdcBd3TlGMkdrD0NSODw_0ENzS4C1");
const $=id=>document.getElementById(id);
let current=null,busy=false,pendingOffset=0,pendingItems=[],pendingLoading=false;
const pageSize=30;

function message(value,error=false){
  $("search-status").textContent=value;
  $("search-status").classList.toggle("error",!!error);
}
function formattedDate(value){
  return value?new Intl.DateTimeFormat("es-AR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Argentina/Buenos_Aires"}).format(new Date(value)):"—";
}
async function invoke(name,args={}){
  const {data,error}=await db.rpc(name,args);
  if(error)throw error;
  return data;
}
function dashboardVisible(visible){
  $("dashboard").hidden=!visible;
  $("login").hidden=visible;
}
async function enter(){
  const {data:identity,error:identityError}=await db.auth.getUser();
  if(identityError||!identity?.user)throw Error("Tenés que iniciar sesión.");
  const {data:admin,error:adminError}=await db.from("admin_users").select("user_id").eq("user_id",identity.user.id).maybeSingle();
  if(adminError||!admin)throw Error("Esta cuenta no tiene permiso de administración HOST.");
  const verified=await requireHostAdminMfa(db);
  if(!verified)return;
  dashboardVisible(true);
  await Promise.all([refresh(),loadPending()]);
}
async function refresh(){
  try{
    const totals=await invoke("host_scratch_admin_overview");
    for(const key of ["total","ready","played","redeemed"])$("stat-"+key).textContent=Number(totals[key]||0).toLocaleString("es-AR");
  }catch(err){message("Error al actualizar: "+err.message,true);}
}

async function loadPending(){
  if(pendingLoading)return;
  pendingLoading=true;
  $("pending-refresh").disabled=true;
  $("pending-status").textContent="Cargando premios pendientes...";
  try{
    const data=await invoke("host_scratch_admin_pending",{p_limit:pageSize,p_offset:pendingOffset});
    pendingItems=Array.isArray(data?.items)?data.items:[];
    renderPending();
    $("pending-status").textContent=pendingItems.length
      ? "Mostrando "+(pendingOffset+1)+" a "+(pendingOffset+pendingItems.length)+" de los pendientes."
      : pendingOffset===0?"¡No hay premios pendientes de entrega!":"No hay más premios en esta página.";
  }catch(err){
    pendingItems=[];
    $("pending-list").replaceChildren();
    $("pending-status").textContent="No se pudo cargar la lista: "+err.message;
  }finally{
    pendingLoading=false;
    $("pending-refresh").disabled=false;
  }
}
function renderPending(){
  const list=$("pending-list");
  list.replaceChildren();
  const num=n=>String(n).padStart(6,"0");
  for(const p of pendingItems){
    const article=document.createElement("article");
    article.className="pending-card";
    const details=document.createElement("div");
    details.className="pending-details";
    const number=document.createElement("span");
    number.className="pending-number";
    number.textContent="TARJETA Nº "+num(p.serial);
    const prize=document.createElement("strong");
    prize.className="pending-prize";
    prize.textContent=p.prize;
    const code=document.createElement("span");
    code.className="pending-code";
    code.textContent="Código: "+p.claim_code;
    const date=document.createElement("small");
    date.className="pending-date";
    date.textContent="Jugado: "+formattedDate(p.scratched_at);
    details.append(number,prize,code,date);
    const action=document.createElement("button");
    action.type="button";
    action.className="primary pending-deliver";
    action.textContent="MARCAR COMO ENTREGADO";
    action.disabled=busy;
    action.addEventListener("click",()=>deliver(p.claim_code,p.serial));
    article.append(details,action);
    list.append(article);
  }
  $("pending-prev").hidden=pendingOffset===0;
  $("pending-next").hidden=pendingItems.length<pageSize;
  $("pending-page").textContent="Página "+(Math.floor(pendingOffset/pageSize)+1);
}
async function deliver(code,serial){
  if(busy||!code)return;
  if(!confirm("¿Confirmás que HOST YA ENTREGÓ el premio de la tarjeta Nº "+
    String(serial).padStart(6,"0")+"? Esta acción registra el canje definitivo."))return;
  busy=true;
  for(const button of document.querySelectorAll(".pending-deliver, #redeem"))button.disabled=true;
  $("pending-status").textContent="Confirmando entrega...";
  try{
    const result=await invoke("host_scratch_redeem",{p_claim_code:code});
    if(result.state!=="redeemed")throw Error(result.state==="invalid"?"Código no reconocido":"Esta tarjeta ya no está pendiente.");
    if(current?.claim_code===code)await lookup(code);
    await refresh();
    if(pendingOffset>0&&pendingItems.length===1)pendingOffset=Math.max(0,pendingOffset-pageSize);
    $("pending-status").textContent="✅ Premio entregado correctamente.";
  }catch(err){
    $("pending-status").textContent="No se pudo confirmar: "+err.message;
  }finally{
    busy=false;
    await loadPending();
    $("redeem").disabled=false;
  }
}

function render(item){
  current=item;
  const visible=item&&item.state!=="not_found";
  $("result").hidden=!visible;
  if(!visible)return;
  const status={ready:"DISPONIBLE",played:"JUGADA · PENDIENTE",redeemed:"YA ENTREGADA"};
  $("result-badge").textContent=status[item.state]||item.state;
  $("result-badge").dataset.status=item.state;
  $("result-number").textContent="TARJETA Nº "+String(item.serial).padStart(6,"0");
  $("result-prize").textContent=item.prize||"—";
  $("result-code").textContent=item.claim_code||"Aún no jugada";
  $("result-played").textContent=formattedDate(item.scratched_at);
  $("result-redeemed").textContent=formattedDate(item.redeemed_at);
  $("redeem").hidden=item.state!=="played"||!item.claim_code;
}
async function lookup(value){
  message("Buscando tarjeta...");
  $("result").hidden=true;
  try{
    const item=await invoke("host_scratch_admin_lookup",{p_search:value.trim()});
    if(item.state==="not_found"){current=null;message("No encontramos esa tarjeta o ese código.",true);return;}
    render(item);message("");
  }catch(err){current=null;message("No se pudo verificar: "+err.message,true);}
}
$("login-form").addEventListener("submit",async event=>{
  event.preventDefault();
  const submit=$("login-submit");submit.disabled=true;
  $("login-message").textContent="";
  const f=new FormData(event.currentTarget);
  try{
    const {error}=await db.auth.signInWithPassword({email:String(f.get("email")).trim(),password:String(f.get("password"))});
    if(error)throw error;
    await enter();
  }catch(err){
    $("login-message").textContent=err.message;
  }finally{submit.disabled=false;}
});
$("logout").addEventListener("click",async()=>{
  await db.auth.signOut();current=null;dashboardVisible(false);$("login-form").reset();render(null);
});
$("refresh").addEventListener("click",async()=>{await Promise.all([refresh(),loadPending()]);});
$("pending-refresh").addEventListener("click",()=>{pendingOffset=0;loadPending();});
$("pending-prev").addEventListener("click",()=>{pendingOffset=Math.max(0,pendingOffset-pageSize);loadPending();});
$("pending-next").addEventListener("click",()=>{pendingOffset+=pageSize;loadPending();});
$("lookup-form").addEventListener("submit",async event=>{
  event.preventDefault();
  await lookup($("lookup-input").value);
});
$("redeem").addEventListener("click",()=>{
  if(current?.state==="played"&&current.claim_code)deliver(current.claim_code,current.serial);
});

(async()=>{
  const {data:{session}}=await db.auth.getSession();
  if(!session)return;
  try{await enter();}catch(err){$("login-message").textContent=err.message;dashboardVisible(false);}
})();
