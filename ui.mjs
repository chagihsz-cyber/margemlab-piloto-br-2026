import { calculate } from './core.mjs';
const el = id => document.getElementById(id);
const brl = n => n == null ? 'Inviável' : n.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
const pct = n => n.toLocaleString('pt-BR', {maximumFractionDigits:2}) + '%';
const ids = ['price','productCost','packaging','sellerShipping','otherFixed','fixedFee','commission','taxes','ads','targetMargin'];
let saved = [];
try {
  const data = JSON.parse(localStorage.getItem('margemlab-v1') || '[]');
  if (Array.isArray(data)) saved = data;
} catch { saved = []; }
function values() {
  const pairs = ids.map(id => [id, el(id).value.trim() === '' ? NaN : Number(el(id).value)]);
  return Object.fromEntries([...pairs, ['channel', el('channel').value]]);
}
function refresh() {
  const channel = el('channel').value;
  for (const id of ['fixedFee','commission']) el(id).disabled = channel === 'tiktok';
  try {
    const r = calculate(values());
    el('notice').textContent = '';
    el('profit').textContent = brl(r.profit);
    el('margin').textContent = pct(r.margin);
    el('breakEven').textContent = brl(r.breakEven);
    el('suggested').textContent = brl(r.suggested);
    el('fees').textContent = brl(r.variableFees + r.fees.fixed);
    el('feeDescription').textContent = r.fees.description;
    el('hundred').textContent = brl(r.profit * 100);
    el('profitCard').className = 'kpi ' + (r.profit >= 0 ? 'positive' : 'negative');
  } catch (error) {
    el('notice').textContent = error.message;
    for (const id of ['profit','margin','breakEven','suggested','fees','hundred']) el(id).textContent = '—';
  }
}
function persist() {
  try { localStorage.setItem('margemlab-v1', JSON.stringify(saved)); return true; }
  catch { el('notice').textContent = 'Este navegador não permitiu salvar.'; return false; }
}
function renderSaved() {
  const list = el('savedList'); list.replaceChildren();
  if (!saved.length) {
    const empty = document.createElement('small');
    empty.textContent = 'Nenhum cenário salvo.'; list.append(empty); return;
  }
  saved.forEach((item, index) => {
    const row = document.createElement('div'); row.className = 'saved-item';
    const info = document.createElement('div'), name = document.createElement('strong');
    name.textContent = item.name;
    const meta = document.createElement('small');
    meta.textContent = item.channel + ' · ' + brl(item.price) + ' · lucro ' + brl(item.profit);
    info.append(name, meta);
    const button = document.createElement('button'); button.className = 'secondary';
    button.textContent = 'Excluir';
    button.onclick = () => { saved.splice(index, 1); persist(); renderSaved(); };
    row.append(info, button); list.append(row);
  });
}
el('simulator').addEventListener('input', refresh);
el('channel').addEventListener('change', refresh);
el('simulator').addEventListener('submit', event => event.preventDefault());
el('save').onclick = () => {
  try {
    const v = values(), result = calculate(v);
    const name = el('scenarioName').value.trim() || 'Sem nome';
    saved.unshift({name, ...v, profit:result.profit, margin:result.margin,
      createdAt:new Date().toISOString()});
    if (saved.length > 100) saved.length = 100;
    if (persist()) { el('notice').textContent = 'Cenário salvo neste navegador.'; renderSaved(); }
  } catch (error) { el('notice').textContent = error.message; }
};
function csvField(value) {
  const raw = String(value ?? '');
  const escapeFormula = ['=', '+', '-', '@'].includes(raw.charAt(0));
  const safe = escapeFormula ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}
el('export').onclick = () => {
  if (!saved.length) { el('notice').textContent = 'Salve um cenário antes de exportar.'; return; }
  const columns = ['name','channel',...ids,'profit','margin','createdAt'];
  const rows = [columns.join(','), ...saved.map(item =>
    columns.map(key => csvField(item[key])).join(','))];
  const content = rows.join('\r\n');
  const blob = new Blob([content], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'margemlab-cenarios.csv'; link.click();
  URL.revokeObjectURL(url);
};
renderSaved();
refresh();
