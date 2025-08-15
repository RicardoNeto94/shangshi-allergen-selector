const state = { allergens: [], menu: [], selected: new Set(), mode: 'safe', q: '' };
const badge = code => `<span class="badge">${code}</span>`;

function renderFilters(){
  const el = document.getElementById('activeFilters');
  el.innerHTML = state.selected.size ? ('Selected: ' + Array.from(state.selected).map(badge).join(' ')) : '';
}
function matchesQ(d){ if(!state.q) return true; const q=state.q.toLowerCase(); return d.dish.toLowerCase().includes(q) || (d.notes||'').toLowerCase().includes(q); }
function isSafe(d){ for(const c of state.selected){ if(d.codes.includes(c)) return false; } return true; }
function containsSel(d){ if(!state.selected.size) return false; for(const c of state.selected){ if(d.codes.includes(c)) return true; } return false; }

function renderList(){
  const wrap = document.getElementById('results'); const empty = document.getElementById('empty');
  let list = state.menu.filter(matchesQ);
  list = (state.mode==='safe') ? list.filter(isSafe) : list.filter(containsSel);
  wrap.innerHTML = list.map(d => `
    <article class="card">
      <h4>${d.dish}</h4>
      <div>${d.codes.map(badge).join(' ') || '<span class="badge">No codes</span>'}</div>
      ${d.notes ? `<div class="note" style="margin-top:6px; color:var(--muted)">${d.notes}</div>` : ''}
    </article>
  `).join('');
  empty.style.display = list.length ? 'none' : 'block';
}

function renderChips(){
  const box = document.getElementById('allergenList');
  box.innerHTML = state.allergens.map(a => `
  <label class="chip">
    <input type="checkbox" value="${a.code}">
    <strong>${a.code}</strong><span class="name">${a.name}</span>
  </label>
`).join('');
  box.querySelectorAll('input[type=checkbox]').forEach(chk => {
    chk.addEventListener('change', e => {
      const c = e.target.value;
      if (e.target.checked) state.selected.add(c); else state.selected.delete(c);
      renderFilters(); renderList();
    });
  });
}

function wire(){
  const s = document.getElementById('search');
  s.addEventListener('input', e => { state.q = e.target.value; renderList(); });
  document.getElementById('clearBtn').addEventListener('click', () => {
    state.selected.clear();
    document.querySelectorAll('#allergenList input[type=checkbox]').forEach(c=>c.checked=false);
    s.value=''; state.q=''; renderFilters(); renderList();
  });
  document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', e => { state.mode = e.target.value; renderList(); }));
}

async function load(){
  const [aRes, mRes] = await Promise.all([fetch('allergens.json'), fetch('menu.json')]);
  state.allergens = await aRes.json(); state.menu = await mRes.json();
  renderChips(); renderList();
}

wire(); load();
