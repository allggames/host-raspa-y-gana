import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const db=createClient('https://ewfblytwbmzclygiwqcy.supabase.co','sb_publishable_DDDdcBd3TlGMkdrD0NSODw_0ENzS4C1');
const $=id=>document.getElementById(id);
let offset=0,records=[],working=false;
const pageSize=30;
function date(value){return value?new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(value)):'—';}
function feedback(message){$('wheel-feedback').textContent=message;}
function el(tag,className,value){const node=document.createElement(tag);if(className)node.className=className;if(value!==undefined)node.textContent=value;return node;}

async function invoke(method,args={}){
 const {data,error}=await db.rpc(method,args);
 if(error)throw error;
 return data;
}
async function refresh(){
 if(working)return;
 working=true;$('wheel-refresh').disabled=true;feedback('Cargando participantes y premios...');
 try{
  const [stats,items]=await Promise.all([invoke('host_wheel_admin_overview'),invoke('host_wheel_admin_list',{p_limit:pageSize,p_offset:offset})]);
  for(const k of ['players','total','pending','redeemed','expired'])$('wheel-'+k).textContent=Number(stats[k]||0).toLocaleString('es-AR');
  records=Array.isArray(items)?items:[];render();feedback(records.length?'Mostrando del '+(offset+1)+' al '+(offset+records.length)+' de los registros.':'No hay registros en esta página.');
 }catch(error){feedback('No se pudo cargar la ruleta: '+error.message);}
 finally{working=false;$('wheel-refresh').disabled=false;}
}
function render(){
 const filter=$('wheel-filter').value.trim().toLocaleLowerCase('es-AR');
 const list=$('wheel-list');list.replaceChildren();
 for(const p of records){
  if(filter&&![p.name,p.phone,p.prize,p.claim_code].some(v=>String(v||'').toLocaleLowerCase('es-AR').includes(filter)))continue;
  const card=el('article','pending-card');const details=el('div','pending-details');
  details.append(el('strong','wheel-player',p.name+' · '+p.phone),el('strong','pending-prize',p.prize),el('span','pending-code','Código: '+p.claim_code),el('small','wheel-meta','Jugado: '+date(p.spun_at)));
  const expired=!p.redeemed_at&&new Date(p.expires_at).getTime()<=Date.now();
  details.append(el('small','wheel-meta',p.redeemed_at?'✅ Canjeado: '+date(p.redeemed_at):expired?'⌛ Vencido: '+date(p.expires_at):'Vence: '+date(p.expires_at)));
  card.append(details);
  if(!p.redeemed_at&&!expired){
    const button=el('button','primary pending-deliver','MARCAR COMO ENTREGADO');button.type='button';
    button.addEventListener('click',()=>redeem(p,button));card.append(button);
  }
  list.append(card);
 }
 $('wheel-prev').hidden=offset===0;$('wheel-next').hidden=records.length<pageSize;
 $('wheel-page').textContent='Página '+(Math.floor(offset/pageSize)+1);
}
async function redeem(p,button){
 if(!confirm('¿Confirmás que HOST YA ENTREGÓ «'+p.prize+'» a '+p.name+'? Código: '+p.claim_code+'. Esta acción es definitiva.'))return;
 button.disabled=true;feedback('Registrando entrega...');
 try{
  const result=await invoke('host_wheel_admin_redeem',{p_claim_code:p.claim_code});
  if(!result?.ok)throw Error(result?.message||'No se pudo canjear.');
  feedback('✅ Premio canjeado y registrado.');await refresh();
 }catch(error){feedback('Error: '+error.message);button.disabled=false;}
}
function selectGame(game){
 $('scratch-dashboard').hidden=game!=='scratch';$('wheel-dashboard').hidden=game!=='wheel';
 $('tab-scratch').className=game==='scratch'?'primary':'secondary';$('tab-wheel').className=game==='wheel'?'primary':'secondary';
 $('tab-scratch').setAttribute('aria-pressed',String(game==='scratch'));$('tab-wheel').setAttribute('aria-pressed',String(game==='wheel'));
 if(game==='wheel')refresh();
}
$('tab-scratch').addEventListener('click',()=>selectGame('scratch'));
$('tab-wheel').addEventListener('click',()=>selectGame('wheel'));
$('wheel-refresh').addEventListener('click',()=>{offset=0;refresh();});
$('wheel-filter').addEventListener('input',render);
$('wheel-prev').addEventListener('click',()=>{offset=Math.max(0,offset-pageSize);refresh();});
$('wheel-next').addEventListener('click',()=>{offset+=pageSize;refresh();});
$('logout').addEventListener('click',()=>selectGame('scratch'));
