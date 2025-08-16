const state = { allergens: [], menu: [], selected: new Set(), mode: 'safe', q: '', ingQ: '' };

const badge = c => `<span class="badge">${c}</span>`;
const pill  = c => `<span class="badge">${c}</span>`;
const tag   = t => `<span class="tag">${t}</span>`;

function renderFilterPills(){
  const el = document.getElementById('activeFilters');
  if (!el) return;
  el.innerHTML = state.selected.size ? ('Selected: ' + Array.from(state.selected).map(pill).join(' ')) : '';
  const msCount = document.getElementById('msCount');
  if (msCount){
    if (state.selected.size){ msCount.textContent = state.selected.size; msCount.hidden = false; }
    else { msCount.hidden = true; }
  }
}

function matchesQ(d){
  if(!state.q) return true;
  const q=state.q.toLowerCase();
  return d.dish.toLowerCase().includes(q) || (d.notes||'').toLowerCase().includes(q);
}
function matchesIngredient(d){
  if(!state.ingQ) return true;
  const q = state.ingQ.toLowerCase();
  const ing = (d.ingredients||[]).join(' ').toLowerCase();
  return ing.includes(q);
}
function isSafe(d){ for(const c of state.selected){ if(d.codes.includes(c)) return false; } return true; }
function containsSel(d){ if(!state.selected.size) return false; for(const c of state.selected){ if(d.codes.includes(c)) return true; } return false; }

function shortTags(list, max=4){
  if (!list || !list.length) return '';
  const shown = list.slice(0, max).map(tag).join(' ');
  const more = list.length > max ? `<span class="note">+ ${list.length-max} more</span>` : '';
  return `<div class="tags">${shown} ${more}</div>`;
}
function kitchenBlock(d){
  if (!d.notes_kitchen) return '';
  const id = 'k_' + btoa(d.dish).replace(/[^a-z0-9]/gi,'').slice(0,10);
  return `<div>
    <button class="kbtn" data-target="${id}">Kitchen note</button>
    <div id="${id}" class="kitchen">${d.notes_kitchen}</div>
  </div>`;
}

function renderList(){
  const wrap=document.getElementById('results'); const empty=document.getElementById('empty');
  if (!wrap) return;
  let list=state.menu.filter(matchesQ).filter(matchesIngredient);
  list=(state.mode==='safe')?list.filter(isSafe):list.filter(containsSel);
  wrap.innerHTML=list.map(d=>`<article class="card card-dish">
      <h4>${d.dish}</h4>
      <div class="badges">${d.codes.map(badge).join(' ')||'<span class="badge">No codes</span>'}</div>
      ${shortTags(d.ingredients,4)}
      ${d.notes?`<div class="note">${d.notes}</div>`:''}
      ${kitchenBlock(d)}
    </article>`).join('');
  if (empty) empty.style.display=list.length?'none':'block';
  wrap.querySelectorAll('.kbtn').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-target');
      const box = document.getElementById(id);
      box.classList.toggle('show');
    });
  });
}

function renderDropdown(){
  const list = document.getElementById('msList');
  if (!list) return;
  list.innerHTML = state.allergens.map(a => `
    <label class="ms-item">
      <input type="checkbox" value="${a.code}" ${state.selected.has(a.code)?'checked':''}>
      <span class="code">${a.code}</span>
      <span class="name">${a.name}</span>
    </label>
  `).join('');
  list.querySelectorAll('input[type=checkbox]').forEach(chk => {
    chk.addEventListener('change', e => {
      const c = e.target.value;
      if (e.target.checked) state.selected.add(c); else state.selected.delete(c);
      renderFilterPills(); renderList();
    });
  });
}

function wireMultiSelect(){
  const toggle = document.getElementById('msToggle');
  const menu = document.getElementById('msMenu');
  const done = document.getElementById('msDone');
  const clear = document.getElementById('msClear');
  function close(){ if(menu){ menu.classList.remove('open'); toggle?.setAttribute('aria-expanded','false'); menu?.setAttribute('aria-hidden','true'); } }
  function open(){ if(menu){ menu.classList.add('open'); toggle?.setAttribute('aria-expanded','true'); menu?.setAttribute('aria-hidden','false'); } }
  if (toggle){
    toggle.addEventListener('click', () => menu?.classList.contains('open') ? close() : open());
  }
  done?.addEventListener('click', close);
  clear?.addEventListener('click', () => { state.selected.clear(); renderDropdown(); renderFilterPills(); renderList(); });
  document.addEventListener('click', (e) => { if (!menu || !toggle) return; if (!menu.contains(e.target) && !toggle.contains(e.target)) close(); });
}

function wireCommon(){
  const s = document.getElementById('search');
  if (s){ s.addEventListener('input', e => { state.q = e.target.value; renderList(); }); }
  const clearBtn = document.getElementById('clearBtn');
  clearBtn?.addEventListener('click', () => {
    state.selected.clear();
    renderDropdown(); if(s) s.value=''; state.q=''; const ii=document.getElementById('ingInline'); if(ii) ii.value=''; state.ingQ=''; renderFilterPills(); renderList();
  });
  const ingInline = document.getElementById('ingInline');
  if (ingInline) ingInline.addEventListener('input', e => { state.ingQ = e.target.value; renderList(); });
  document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', e => { state.mode = e.target.value; renderList(); }));
}

function wireStickyCompact(){
  const panel = document.getElementById('stickyPanel');
  if (!panel) return;
  const menu = document.getElementById('msMenu');
  let lastY = window.scrollY;
  const downThreshold = 120;
  const upThreshold   = 80;
  function compactOn(){ panel.classList.add('compact'); menu?.classList.remove('open'); }
  function compactOff(){ panel.classList.remove('compact'); }
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > lastY && y > downThreshold) { compactOn(); }
    else if ((y < lastY && y < downThreshold) || y < upThreshold) { compactOff(); }
    lastY = y;
  }, {passive:true});
}

/* Mobile: selector as top bar that shrinks */
function wireMobileTopBar(){
  const panel = document.getElementById('stickyPanel');
  if (!panel) return;
  let last = window.pageYOffset;
  window.addEventListener('scroll', () => {
    const cur = window.pageYOffset;
    if (cur > last){ panel.classList.add('compact'); } else { panel.classList.remove('compact'); }
    last = cur;
  }, {passive:true});
  document.getElementById('msToggle')?.addEventListener('click', () => {
    panel.classList.toggle('expanded');
  });
}

function renderIngredients(){
  const box = document.getElementById('ingList');
  if (!box) return;
  const empty = document.getElementById('ingEmpty');
  const qEl = document.getElementById('ingSearch');
  const q = (qEl?.value || '').toLowerCase();
  const list = state.menu.filter(d => {
    const ing = (d.ingredients || []).join(' ').toLowerCase();
    return (!q) || d.dish.toLowerCase().includes(q) || ing.includes(q);
  });
  box.innerHTML = list.map(d => {
    const ings = d.ingredients && d.ingredients.length ? d.ingredients.map(i=>`<span class="tag">${i}</span>`).join('') : '';
    return `
      <article class="card card-dish">
        <h4>${d.dish}</h4>
        <div class="badges">${d.codes.map(c=>`<span class="badge">${c}</span>`).join(' ')}</div>
        ${ings?`<div class="tags">${ings}</div>`:`<div class="note">Ingredients: add later in <code>menu.json</code>.</div>`}
        ${d.notes?`<div class="note">${d.notes}</div>`:''}
      </article>`;
  }).join('');
  if (empty) empty.style.display = list.length ? 'none' : 'block';
  qEl?.addEventListener('input', renderIngredients);
}

async function load(){
  const [aRes,mRes]=await Promise.all([fetch('allergens.json'), fetch('menu.json')]);
  state.allergens=await aRes.json(); state.menu=await mRes.json();
  renderDropdown(); renderFilterPills(); renderList(); renderIngredients();
}

wireMultiSelect(); wireCommon(); wireStickyCompact(); wireMobileTopBar(); load();
