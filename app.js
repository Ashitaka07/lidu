const DATA_URL = 'assets/lidu-relations.csv';
const $ = s => document.querySelector(s);
const state = { rows: [], shown: 24, threshold: 8000, selected: null, selectedNode: null };
const pct = n => `${(n / 100).toFixed(2)}%`;
const fmt = n => new Intl.NumberFormat('zh-CN').format(n);
const esc = text => { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; };
const key = (r, side) => side === 'li' ? `${r.liPoemId}:${r.liLineId}` : `${r.duPoemId}:${r.duLineId}`;

function parse(line) {
  const c = line.split(',');
  if (c.length !== 11) return null;
  const [liAuthor,liPoem,liLine,duAuthor,duPoem,duLine,raw,liPoemId,liLineId,duPoemId,duLineId] = c;
  return {liAuthor,liPoem,liLine,duAuthor,duPoem,duLine,score:Number(raw),liPoemId,liLineId,duPoemId,duLineId};
}
function matched(row) {
  const term = $('#search').value.trim().toLowerCase();
  return !term || [row.liPoem,row.liLine,row.duPoem,row.duLine,row.liPoemId,row.liLineId,row.duPoemId,row.duLineId].join(' ').toLowerCase().includes(term);
}
function activeRows() { return state.rows.filter(r => r.score >= state.threshold && matched(r)); }
function nodes(rows, side) {
  const map = new Map();
  rows.forEach(row => {
    const id = key(row, side);
    if (!map.has(id)) map.set(id, {id, side, degree:0, row});
    map.get(id).degree++;
  });
  const all = [...map.values()].sort((a,b) => b.degree-a.degree || a.id.localeCompare(b.id));
  return all.map((node,i) => ({...node, y: all.length === 1 ? 490 : 24 + i * 932 / (all.length - 1)}));
}
function stats() {
  const r = state.rows;
  const values = [[r.length,'条真实句间关系'],[new Set(r.map(x=>key(x,'li'))).size,'李白诗句节点'],[new Set(r.map(x=>key(x,'du'))).size,'杜甫诗句节点'],[r.filter(x=>x.score>=8000).length,'相似度不低于 80%']];
  $('#stats').innerHTML = values.map(([v,l])=>`<div class="stat"><strong>${fmt(v)}</strong><small>${l}</small></div>`).join('');
}
function histogram() {
  const starts = Array.from({length:30},(_,i)=>7000+i*100);
  const counts = starts.map(start=>state.rows.filter(r=>r.score>=start&&r.score<start+100).length);
  const max = Math.max(...counts);
  $('#histogram').innerHTML = counts.map((count,i)=>`<span class="hist-bar ${starts[i]>=state.threshold?'active':''}" title="${(starts[i]/100).toFixed(0)}%–${((starts[i]+99)/100).toFixed(0)}%：${fmt(count)} 条" style="height:${Math.max(5,count/max*100)}%"></span>`).join('');
}
function network(rows) {
  const li = nodes(rows,'li'), du = nodes(rows,'du');
  const left = new Map(li.map(n=>[n.id,n])), right = new Map(du.map(n=>[n.id,n]));
  const edges = rows.map((r,i) => {
    const a=left.get(key(r,'li')), b=right.get(key(r,'du')); const strength=(r.score-7000)/3000;
    return `<path class="edge" data-li="${a.id}" data-du="${b.id}" d="M58 ${a.y.toFixed(1)} C290 ${a.y.toFixed(1)},710 ${b.y.toFixed(1)},942 ${b.y.toFixed(1)}" style="stroke-width:${(0.35+strength*2.65).toFixed(2)};opacity:${(0.12+strength*.76).toFixed(2)}"><title>${esc(r.liLine)} ⇄ ${esc(r.duLine)}，${pct(r.score)}</title></path>`;
  }).join('');
  const marks = (list, x, side) => list.map(n => {
    const radius = (2.4 + Math.sqrt(n.degree)*1.7).toFixed(2), prop = side==='li'?'liLine':'duLine';
    const label = `《${n.row[side==='li'?'liPoem':'duPoem']}》｜${n.row[prop]}`;
    return `<g class="node ${side}" data-id="${n.id}" data-side="${side}" tabindex="0" role="button" aria-label="${esc(label)}，当前 ${n.degree} 条关系"><circle cx="${x}" cy="${n.y.toFixed(1)}" r="${radius}"><title>${esc(label)}｜当前 ${n.degree} 条关系</title></circle>${n.degree>4?`<text x="${side==='li'?x-10:x+10}" y="${(n.y+3).toFixed(1)}" text-anchor="${side==='li'?'end':'start'}">${esc(n.row[prop].slice(0,10))}</text>`:''}</g>`;
  }).join('');
  $('#network').innerHTML = `<svg viewBox="0 0 1000 980" preserveAspectRatio="none"><g>${edges}</g><g>${marks(li,58,'li')}${marks(du,942,'du')}</g></svg>`;
  $('#network').querySelectorAll('.node').forEach(el => {
    el.addEventListener('mouseenter',()=>highlight(el.dataset.id)); el.addEventListener('mouseleave',clearHighlight);
    el.addEventListener('focus',()=>highlight(el.dataset.id)); el.addEventListener('blur',clearHighlight);
    el.addEventListener('click',()=>selectNode(el.dataset.side,el.dataset.id));
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectNode(el.dataset.side,el.dataset.id);}});
  });
}
function highlight(id) {
  const edges=[...$('#network').querySelectorAll('.edge')];
  edges.forEach(e=>e.classList.toggle('muted',e.dataset.li!==id&&e.dataset.du!==id));
  const linked=new Set(edges.filter(e=>!e.classList.contains('muted')).flatMap(e=>[e.dataset.li,e.dataset.du]));
  $('#network').querySelectorAll('.node').forEach(n=>n.classList.toggle('muted',!linked.has(n.dataset.id)));
}
function clearHighlight() { $('#network').querySelectorAll('.muted').forEach(el=>el.classList.remove('muted')); }
function selectNode(side,id) { state.selectedNode={side,id}; state.selected=null; reader(); $('#reader').scrollIntoView({behavior:'smooth',block:'nearest'}); }
function reader() {
  if (state.selectedNode) {
    const {side,id}=state.selectedNode; const rows=state.rows.filter(r=>key(r,side)===id).sort((a,b)=>b.score-a.score); const r=rows[0];
    const poem=side==='li'?r.liPoem:r.duPoem, line=side==='li'?r.liLine:r.duLine, poemId=side==='li'?r.liPoemId:r.duPoemId, lineId=side==='li'?r.liLineId:r.duLineId;
    const other=side==='li'?'du':'li';
    $('#reader').innerHTML=`<p class="reader-mark">对读卷</p><h3>${side==='li'?'李白':'杜甫'} · 《${esc(poem)}》</h3><p class="reader-focus">“${esc(line)}”</p><p class="reader-meta">原始定位：诗歌 ${poemId} · 句序 ${lineId}<br>全部 ${fmt(rows.length)} 条匹配，按相似度降序</p><div class="reader-links">${rows.map(x=>`<button class="reader-link" data-row="${state.rows.indexOf(x)}"><span>《${esc(x[`${other}Poem`])}》 ${esc(x[`${other}Line`])}</span><b>${pct(x.score)}</b></button>`).join('')}</div>`;
    $('#reader').querySelectorAll('.reader-link').forEach(b=>b.addEventListener('click',()=>{state.selected=state.rows[Number(b.dataset.row)];state.selectedNode=null;render();}));
    return;
  }
  const r=state.selected;
  if(!r){$('#reader').innerHTML='<p class="reader-mark">对读</p><h3>未找到对应关系</h3><p>降低门槛或调整检索词后再试。</p>';return;}
  $('#reader').innerHTML=`<p class="reader-mark">对读</p><div class="pair"><section class="pair-side"><h4>李白</h4><p class="poem-title">《${esc(r.liPoem)}》</p><blockquote>“${esc(r.liLine)}”</blockquote><p class="pair-id">诗歌 ${r.liPoemId} · 句序 ${r.liLineId}</p></section><p class="pair-score">相似度　<strong>${pct(r.score)}</strong><br><span>原始值 ${r.score} / 10000</span></p><section class="pair-side du"><h4>杜甫</h4><p class="poem-title">《${esc(r.duPoem)}》</p><blockquote>“${esc(r.duLine)}”</blockquote><p class="pair-id">诗歌 ${r.duPoemId} · 句序 ${r.duLineId}</p></section></div>`;
}
function render() {
  const rows=activeRows().sort((a,b)=>b.score-a.score); if(!state.selected||!rows.includes(state.selected)) state.selected=rows[0]||null;
  $('#thresholdValue').textContent=pct(state.threshold); $('#activeCount').textContent=`当前纳入 ${fmt(rows.length)} 条关系`; $('#resultCount').textContent=`显示 ${Math.min(rows.length,state.shown)} / ${fmt(rows.length)} 条`;
  $('#relationList').innerHTML=rows.slice(0,state.shown).map(r=>`<button class="relation ${r===state.selected?'selected':''}" type="button" data-row="${state.rows.indexOf(r)}"><span class="line">${esc(r.liLine)}</span><span class="score">${pct(r.score)}</span><span class="line du-line">${esc(r.duLine)}</span></button>`).join('');
  $('#moreButton').hidden=state.shown>=rows.length; network(rows); reader(); histogram();
}
function bind() {
  $('#threshold').addEventListener('input',e=>{state.threshold=Number(e.target.value);state.shown=24;state.selectedNode=null;render();});
  $('#search').addEventListener('input',()=>{state.shown=24;state.selectedNode=null;render();});
  $('#moreButton').addEventListener('click',()=>{state.shown+=24;render();});
  $('#relationList').addEventListener('click',e=>{const b=e.target.closest('[data-row]');if(!b)return;state.selected=state.rows[Number(b.dataset.row)];state.selectedNode=null;reader();$('#reader').scrollIntoView({behavior:'smooth',block:'nearest'});});
}
async function init() {
  try { const text = window.LIDU_CSV || await fetch(DATA_URL).then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); }); state.rows=text.trim().split(/\r?\n/).map(parse).filter(Boolean); stats(); render(); bind(); }
  catch(err) { $('#stats').innerHTML=`<p class="loading">未能读取数据文件：${esc(err.message)}。请通过本地服务器或 GitHub Pages 打开本网站。</p>`; }
}
init();
