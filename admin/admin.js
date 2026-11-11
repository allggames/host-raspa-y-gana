import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm";
import {requireHostAdminMfa} from "./admin-mfa.js";

const db=createClient("https://ewfblytwbmzclygiwqcy.supabase.co","sb_publishable_DDDdcBd3TlGMkdrD0NSODw_0ENzS4C1");
const $=id=>document.getElementById(id);
let current=null,busy=false;

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
  await refresh();
}
async function refresh(){
  try{
    const totals=await invoke("host_scratch_admin_overview");
    for(const key of ["total","ready","played","redeemed"])$("stat-"+key).textContent=Number(totals[key]||0).toLocaleString("es-AR");
  }catch(err){message("Error al actualizar: "+err.message,true);}
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
$("refresh").addEventListener("click",refresh);
$("lookup-form").addEventListener("submit",async event=>{
  event.preventDefault();
  await lookup($("lookup-input").value);
});
$("redeem").addEventListener("click",async()=>{
  if(busy||!current||current.state!=="played"||!current.claim_code)return;
  const code=current.claim_code;
  const serial=current.serial;
  if(!confirm("¿Confirmás que HOST entregó el premio de la tarjeta Nº "+String(serial).padStart(6,"0")+"? Esta acción registra el canje definitivo."))return;
  busy=true;$("redeem").disabled=true;message("Registrando entrega...");
  try{
    const result=await invoke("host_scratch_redeem",{p_claim_code:code});
    if(result.state!=="redeemed")throw Error(result.state==="invalid"?"Código no reconocido":"El premio ya no está pendiente.");
    await lookup(code);
    await refresh();
    message("✅ Premio marcado como entregado.");
  }catch(err){message("No se pudo confirmar: "+err.message,true);}
  finally{busy=false;$("redeem").disabled=false;}
});
(async()=>{
  const {data:{session}}=await db.auth.getSession();
  if(!session)return;
  try{await enter();}catch(err){$("login-message").textContent=err.message;dashboardVisible(false);}
})();
