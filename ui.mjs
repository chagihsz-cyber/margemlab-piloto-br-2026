import { calculate } from './core.mjs';
const el = id => document.getElementById(id);
const brl = n => n == null ? 'Inviável' : n.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
const pct = n => n.toLocaleString('pt-BR', {maximumFractionDigits:2}) + '%';
const ids = ['price','productCost','packaging','sellerShipping','otherFixed','fixedFee','commission','taxes','ads','targetMargin'];
const optionalIds = ['paymentFee','monthlyFee','monthlyOrders'];
const plans = {
 'ifood-basic': {commission:12, hint:'Referência iFood Básico: 12% de comissão; 3,2% adicionais se pago via iFood; mensalidade conforme faturamento e contrato.'},
 'ifood-delivery': {commission:23, hint:'Referência iFood Entrega: 23% de comissão; 3,2% adicionais se pago via iFood; confira frete e mensalidade.'},
 '99food-99': {commission:8.9, hint:'Referência 99Food com entrega da 99: comissão anunciada a partir de 8,9%; pode haver processamento e custo logístico.'},
 '99food-own': {commission:10.9, hint:'Referência 99Food com entrega própria: comissão anunciada a partir de 10,9%; confira seu contrato.'},
 shopee: {hint:'Shopee: informe as taxas da categoria e as condições do seu anúncio. Não presumimos tarifa universal.'},
 meli: {hint:'Mercado Livre: informe comissão, tarifa fixa e frete reais do anúncio.'},
 tiktok: {hint:'TikTok Shop: utiliza tabela de referência; verifique categoria, promoção e faixa de preço.'},
 manual: {hint:'Informe as tarifas do seu canal. Taxas extras devem entrar em seus respectivos campos.'}
};
let saved = [];
try {
  const data = JSON.parse(localStorage.getItem('margemlab-v1') || '[]');
  if (Array.isArray(data)) saved = data;
} catch { saved = []; }
function values() {
  const pairs = ids.map(id => [id, el(id).disabled ? 0 : (el(id).value.trim() === '' ? NaN : Number(el(id).value))]);
  pairs.push(['paymentFee', el('paymentFee').value.trim() === '' ? 0 : Number(el('paymentFee').value)]);
  pairs.push(['monthlyFee', el('monthlyFee').value.trim() === '' ? 0 : Number(el('monthlyFee').value)]);
  pairs.push(['monthlyOrders', el('monthlyOrders').value.trim() === ''
    ? (el('monthlyFee').value.trim() === '' || Number(el('monthlyFee').value) === 0 ? 1 : NaN)
    : Number(el('monthlyOrders').value)]);
  return Object.fromEntries([...pairs, ['channel', el('channel').value]]);
}
function refresh() {
  const channel = el('channel').value;
  for (const id of ['fixedFee','commission']) el(id).disabled = channel === 'tiktok';
  el('channelHint').textContent = plans[channel]?.hint || 'Confira as tarifas reais do canal.';
  try {
    const current = values();
    if ([...ids, ...optionalIds].some(id => Number.isNaN(current[id]))) {
      el('notice').textContent = 'Preencha os valores para calcular.';
      for (const id of ['profit','margin','breakEven','suggested','fees','hundred','monthlyShare']) el(id).textContent = '—';
      el('feeDescription').textContent = '';
      return;
    }
    const r = calculate(current);
    el('notice').textContent = '';
    el('profit').textContent = brl(r.profit);
    el('margin').textContent = pct(r.margin);
    el('breakEven').textContent = brl(r.breakEven);
    el('suggested').textContent = brl(r.suggested);
    el('fees').textContent = brl(r.variableFees + r.fees.fixed);
    el('monthlyShare').textContent = brl(r.monthlyShare);
    el('feeDescription').textContent = r.fees.description;
    el('hundred').textContent = brl(r.profit * 100);
    el('profitCard').className = 'kpi ' + (r.profit >= 0 ? 'positive' : 'negative');
  } catch (error) {
    el('notice').textContent = error.message;
    for (const id of ['profit','margin','breakEven','suggested','fees','hundred','monthlyShare']) el(id).textContent = '—';
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
el('channel').addEventListener('change', () => {
  const selected = plans[el('channel').value];
  el('commission').value = selected?.commission ?? '';
  el('paymentFee').value = '';
  el('monthlyFee').value = '';
  el('monthlyOrders').value = '';
  refresh();
});
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
  const columns = ['name','channel',...ids,...optionalIds,'profit','margin','createdAt'];
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
