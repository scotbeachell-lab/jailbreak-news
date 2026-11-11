const PLATFORMS=[
  ['PS4',/\bPS4\b|PlayStation 4|GoldHEN/i],
  ['PS5',/\bPS5\b|PlayStation 5|Prolapse|Relapse/i],
  ['Switch 2',/Switch 2/i],
  ['iOS',/\biOS\b|iPhone|iPad|Dopamine/i],
  ['Android',/Android|Qualcomm|bootloader/i],
  ['Xbox',/Xbox/i],
];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
let items=[],cat='all',plat=null,videos=false,generated=null,leadItem=null;

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>/^https?:\/\//i.test(u||'')?u:'#';
const platformOf=i=>{if(i.category!=='device')return null;for(const t of [i.title,i.summary]){const hit=PLATFORMS.find(([,re])=>re.test(t||''));if(hit)return hit[0]}return null};
const ytId=u=>{const m=/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(u||'');return m?m[1]:null};
const isVideo=i=>i.kind==='video'||!!ytId(i.url);
const catLabel=c=>c==='ai'?'AI':'Devices';
const parseDate=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?{y:+m[1],m:+m[2]-1,d:+m[3]}:null};

function storyHTML(i){
  const d=parseDate(i.date);
  const when=d?`<time datetime="${esc(i.date)}">${d.d} ${SHORT[d.m]}</time>`:`<span class="nodate" aria-label="Date unknown">—</span>`;
  const vid=i.video?ytId(i.url):null;
  const thumb=vid?`<a class="thumb" href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true"><img src="https://i.ytimg.com/vi/${vid}/mqdefault.jpg" alt="" loading="lazy" width="320" height="180"><span class="play"></span></a>`:'';
  return `<article class="story ${esc(i.category)}${vid?' has-thumb':''}">${when}<div class="body">${thumb}<div>
    <h3><a href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener noreferrer">${esc(i.title)}</a></h3>
    <p>${esc(i.summary)}</p>
    <div class="meta"><span class="cat ${esc(i.category)}">${catLabel(i.category)}</span>${i.platform?`<span class="plat">${esc(i.platform)}</span>`:''}${i.video?'<span class="plat">Video</span>':''}<span class="src">${esc(i.source)}</span></div>
  </div></div></article>`;
}

function renderLead(){
  const lead=leadItem=items.find(i=>i.date)||null;
  const el=document.getElementById('lead');
  if(!lead){el.hidden=true;return}
  const d=parseDate(lead.date);
  el.hidden=false;
  el.innerHTML=`<div class="kicker"><span>Latest</span><span class="cat ${esc(lead.category)}">${catLabel(lead.category)}</span><span class="src">${esc(lead.source)}, ${d.d} ${MONTHS[d.m]}</span></div>
    <h2><a href="${esc(safeUrl(lead.url))}" target="_blank" rel="noopener noreferrer">${esc(lead.title)}</a></h2>
    <p>${esc(lead.summary)}</p>`;
}

function renderChips(){
  const counts={};
  items.forEach(i=>{if(i.platform)counts[i.platform]=(counts[i.platform]||0)+1});
  const el=document.getElementById('chips');
  const show=cat!=='ai';
  el.hidden=!show;
  el.innerHTML=PLATFORMS.filter(([p])=>counts[p]).map(([p])=>
    `<li><button data-plat="${esc(p)}" aria-pressed="${plat===p}">${esc(p)}<span class="n">${counts[p]}</span></button></li>`).join('');
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>{plat=plat===b.dataset.plat?null:b.dataset.plat;if(plat&&cat==='ai')setCat('device');render()});
}

function render(){
  renderChips();
  const q=document.getElementById('q').value.trim().toLowerCase();
  const unfiltered=cat==='all'&&!plat&&!q&&!videos;
  const shown=items.filter(i=>!(unfiltered&&i===leadItem)&&(cat==='all'||i.category===cat)&&(!plat||i.platform===plat)&&(!videos||i.video)&&
    (!q||(i.title+' '+i.summary+' '+i.source).toLowerCase().includes(q)));
  const feed=document.getElementById('feed');
  if(!shown.length){
    feed.innerHTML=`<div class="empty"><h2>No stories match these filters</h2><p class="note">Try a shorter search, or show every category.</p><button class="btn" id="clear">Clear filters</button></div>`;
    document.getElementById('clear').onclick=()=>{document.getElementById('q').value='';plat=null;setVideos(false);setCat('all')};
    return;
  }
  const groups=new Map();
  shown.forEach(i=>{const d=parseDate(i.date);const k=d?`${MONTHS[d.m]} ${d.y}`:'undated';(groups.get(k)||groups.set(k,[]).get(k)).push(i)});
  let html='';
  for(const [k,list] of groups){
    html+=k==='undated'
      ?`<h2 class="month">Date not found<small>${list.length} ${list.length===1?'story':'stories'}</small></h2><p class="note">The source page didn't show a publish date, so these are listed in the order they were found.</p>`
      :`<h2 class="month">${k}<small>${list.length} ${list.length===1?'story':'stories'}</small></h2>`;
    html+=list.map(storyHTML).join('');
  }
  feed.innerHTML=html;
}

function setCat(c){
  cat=c;
  if(c==='ai')plat=null;
  document.querySelectorAll('.seg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.cat===c));
  render();
}
document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>setCat(b.dataset.cat));
function setVideos(v){videos=v;document.getElementById('vids').setAttribute('aria-pressed',v)}
document.getElementById('vids').onclick=()=>{setVideos(!videos);render()};
document.getElementById('q').addEventListener('input',render);

function updated(){
  if(!generated)return '';
  const t=new Date(generated);
  return isNaN(t)?'':` Last updated ${t.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})} at ${t.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}.`;
}

async function load(){
  try{
    const r=await fetch('data/news.json',{cache:'no-store'});
    if(!r.ok)throw new Error(r.status);
    const d=await r.json();
    if(d.generated===generated)return;
    generated=d.generated;
    items=(d.items||[]).map(i=>({...i,platform:platformOf(i),video:isVideo(i)}));
    document.getElementById('vids').hidden=!items.some(i=>i.video);
    const dev=items.filter(i=>i.category==='device').length;
    document.getElementById('lede').innerHTML=
      `News on device and AI jailbreaks, gathered every morning. <strong>${dev} device stories</strong> and <strong>${items.length-dev} AI stories</strong> right now.${esc(updated())}`;
    renderLead();render();
  }catch(e){
    if(items.length)return;
    document.getElementById('feed').innerHTML=`<div class="empty"><h2>No stories yet</h2><p class="note">The page couldn't load <code>data/news.json</code>. Run <code>systemctl --user start jailbreak-news-refresh</code> to fetch the first batch, then reload.</p></div>`;
  }
}
load();
setInterval(load,30*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
