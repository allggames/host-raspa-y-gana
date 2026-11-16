import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const db=createClient('https://ewfblytwbmzclygiwqcy.supabase.co','sb_publishable_DDDdcBd3TlGMkdrD0NSODw_0ENzS4C1');
const $=id=>document.getElementById(id);
let offset=0,records=[],working=false,totalRows=0,availableDays=[],selectedDay=todayArgentina(),searchTimer=null;
const pageSize=30;
function date(value){return value?new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(value)):'—';}
function todayArgentina(){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
}
function dayLabel(iso){if(!iso)return 'TODAS LAS FECHAS';const [y,m,d]=iso.split('-');return d+'/'+m+'/'+y;}
function chooseDay(value){selectedDay=value;$('wheel-date').value=value;offset=0;refresh();}
function renderDays(){
 const box=$('wheel-days');box.replaceChildren();
 for(const day of availableDays){
  const button=el('button','',dayLabel(day.day)+' · '+day.total);
  button.type='button';button.setAttribute('aria-pressed',String(selectedDay===day.day));
  button.addEventListener('click',()=>chooseDay(day.day));box.append(button);
 }
}
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
  const data=await invoke('host_wheel_admin_history',{p_day:selectedDay||null,p_search:$('wheel-filter').value.trim(),p_limit:pageSize,p_offset:offset});
  for(const k of ['players','total','pending','redeemed','expired'])$('wheel-'+k).textContent=Number(data[k]||0).toLocaleString('es-AR');
  records=Array.isArray(data.items)?data.items:[];totalRows=Number(data.total||0);availableDays=Array.isArray(data.days)?data.days:[];
  renderDays();render();
  feedback(totalRows?'Mostrando del '+(offset+1)+' al '+(offset+records.length)+' de '+totalRows+' registros del período seleccionado.':'No hay premios registrados para esta fecha o búsqueda.');
 }catch(error){feedback('No se pudo cargar la ruleta: '+error.message);}
 finally{working=false;$('wheel-refresh').disabled=false;}
}
function render(){
 const list=$('wheel-list');list.replaceChildren();
 for(const p of records){
  const card=el('article','pending-card');const details=el('div','pending-details');
  details.append(el('span','wheel-day-label',dayLabel(p.played_day)),el('strong','wheel-player',p.name+' · '+p.phone),el('strong','pending-prize',p.prize),el('span','pending-code','Código: '+p.claim_code),el('small','wheel-meta','Jugado: '+date(p.spun_at)));
  const expired=!p.redeemed_at&&new Date(p.expires_at).getTime()<=Date.now();
  details.append(el('small','wheel-meta',p.redeemed_at?'✅ Canjeado: '+date(p.redeemed_at):expired?'⌛ Vencido: '+date(p.expires_at):'Vence: '+date(p.expires_at)));
  card.append(details);
  if(!p.redeemed_at&&!expired){
    const button=el('button','primary pending-deliver','MARCAR COMO ENTREGADO');button.type='button';
    button.addEventListener('click',()=>redeem(p,button));card.append(button);
  }
  list.append(card);
 }
 $('wheel-prev').hidden=offset===0;$('wheel-next').hidden=offset+records.length>=totalRows;
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
$('wheel-date').value=selectedDay;
$('wheel-date').addEventListener('change',event=>chooseDay(event.target.value));
$('wheel-today').addEventListener('click',()=>chooseDay(todayArgentina()));
$('wheel-all').addEventListener('click',()=>chooseDay(''));
$('wheel-filter').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{offset=0;refresh();},250);});
$('wheel-prev').addEventListener('click',()=>{offset=Math.max(0,offset-pageSize);refresh();});
$('wheel-next').addEventListener('click',()=>{offset+=pageSize;refresh();});
$('logout').addEventListener('click',()=>selectGame('scratch'));
