/* Pulse Credit — exemplo didático. TODOS OS DADOS SÃO FICTÍCIOS. */
'use strict';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('pt-BR');
const PERCENT = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const COLORS = { purple: '#7168ef', blue: '#4a94ee', green: '#23bf9c', amber: '#f3b24f', red: '#ef7182' };
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const SEGMENTS = ['Varejo', 'Uniclass', 'Personnalité'];
const REGIONS = ['Sudeste', 'Sul', 'Nordeste', 'Centro-Oeste', 'Norte'];
const $ = (id) => document.getElementById(id);
let chartTrend, chartRisk, chartSegment;
let page = 1;
let searchTerm = '';
let current = [];
const PAGE_SIZE = 7;

// Gerador reproduzível: nenhuma API, dado bancário ou informação pessoal utilizada.
function randomFactory(seed) {
  return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
const rand = randomFactory(20261117);
const reference = new Date(2026, 10, 1); // referência fixa para comparar gráficos em uma demo
const records = Array.from({ length: 1780 }, (_, i) => {
  const segment = SEGMENTS[rand() < .57 ? 0 : rand() < .66 ? 1 : 2];
  const region = REGIONS[Math.floor(rand() * REGIONS.length)];
  const monthOffset = Math.floor(rand() * 12);
  const date = new Date(reference.getFullYear(), reference.getMonth() - monthOffset, 1);
  const score = Math.max(300, Math.min(900, Math.round(390 + rand() * 470 + (segment === 'Personnalité' ? 38 : 0))));
  const defaultProbability = score < 500 ? .24 : score < 650 ? .11 : score < 750 ? .045 : .013;
  const u = rand();
  const status = u < defaultProbability ? 'Inadimplente' : u < defaultProbability + .075 ? 'Em atraso' : 'Em dia';
  const balance = Math.round((segment === 'Personnalité' ? 65000 : segment === 'Uniclass' ? 28000 : 9000) * (.35 + rand() * 2.15));
  return { id: `CR-${String(260000 + i).padStart(6, '0')}`, segment, region, score, status, balance, date, monthOffset };
});

function filters() {
  const period = Number($('periodFilter').value);
  const segment = $('segmentFilter').value;
  const region = $('regionFilter').value;
  return records.filter(r => r.monthOffset < period && (segment === 'Todos' || r.segment === segment) && (region === 'Todas' || r.region === region));
}
function percentChange(now, previous) { return previous ? ((now - previous) / previous) * 100 : 0; }
function formatChange(value, unit = '%') { return `${value >= 0 ? '+' : '−'}${PERCENT.format(Math.abs(value))}${unit}`; }
function setTag(id, value, unit, beneficialIncrease) {
  const el = $(id);
  el.textContent = formatChange(value, unit);
  const beneficial = beneficialIncrease ? value >= 0 : value <= 0;
  el.className = `kpi-tag ${beneficial ? 'green-tag' : 'red-tag'}`;
}
function stats(rows) {
  const total = rows.reduce((sum, r) => sum + r.balance, 0);
  const defaults = rows.filter(r => r.status === 'Inadimplente').length;
  return { total, count: rows.length, defaultRate: rows.length ? defaults / rows.length * 100 : 0, avgScore: rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : 0 };
}
function updateKPIs(rows) {
  const s = stats(rows);
  const comparison = stats(records.filter(r => r.monthOffset >= 6 && ( $('segmentFilter').value === 'Todos' || r.segment === $('segmentFilter').value ) && ( $('regionFilter').value === 'Todas' || r.region === $('regionFilter').value )));
  $('kpiPortfolio').textContent = `R$ ${(s.total / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} mi`;
  $('kpiClients').textContent = NUMBER.format(s.count);
  $('kpiDefault').textContent = `${PERCENT.format(s.defaultRate)}%`;
  $('kpiScore').textContent = NUMBER.format(Math.round(s.avgScore));
  // Comparação ilustrativa: entre os subconjuntos da amostra, não crescimento real temporal.
  $('portfolioChange').textContent = 'Base filtrada';
  $('clientsChange').textContent = 'Base filtrada';
  $('defaultChange').textContent = 'Indicador atual';
  $('scoreChange').textContent = 'Escala 300–900';
  $('portfolioChange').className = 'kpi-tag purple';
  $('clientsChange').className = 'kpi-tag blue-tag';
  $('defaultChange').className = 'kpi-tag red-tag';
  $('scoreChange').className = 'kpi-tag green-tag';
  document.querySelectorAll('.kpi-bottom > span:last-child').forEach(el => el.textContent = 'dados do filtro');
}

function initCharts() {
  if (typeof Chart === 'undefined') {
    document.querySelectorAll('.chart-container,.donut-wrapper').forEach(el => {
      el.innerHTML = '<p style="color:#9c5360;font-size:12px;padding-top:30px">Não foi possível carregar os gráficos. Verifique sua conexão com a internet.</p>';
    });
    return;
  }
  Chart.defaults.font.family = "'DM Sans', Arial, sans-serif";
  Chart.defaults.color = '#8793a6';
  Chart.defaults.plugins.legend.display = false;
  const grid = { color: '#eef1f6', drawTicks: false };
  chartTrend = new Chart($('trendChart'), {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], fill: true, borderColor: COLORS.purple, backgroundColor: context => {
      const ctx = context.chart.ctx; const gradient = ctx.createLinearGradient(0, 0, 0, 260);
      gradient.addColorStop(0, 'rgba(113,104,239,.19)'); gradient.addColorStop(1, 'rgba(113,104,239,0)'); return gradient;
    }, tension: .42, borderWidth: 2.7, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: '#fff', pointBorderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: c => `Inadimplência: ${PERCENT.format(c.parsed.y)}%` } } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, font: { size: 10 } } }, y: { beginAtZero: true, suggestedMax: 20, grid, border: { display: false, dash: [4, 4] }, ticks: { padding: 11, callback: v => `${v}%`, font: { size: 10 } } } } }
  });
  chartRisk = new Chart($('riskChart'), { type: 'doughnut', data: { labels: ['Baixo', 'Médio', 'Alto'], datasets: [{ data: [], backgroundColor: [COLORS.green, COLORS.amber, COLORS.red], borderWidth: 5, borderColor: '#fff', hoverOffset: 4, borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '76%', plugins: { tooltip: { callbacks: { label: c => `${c.label}: ${NUMBER.format(c.raw)} clientes` } } } } });
  chartSegment = new Chart($('segmentChart'), { type: 'bar', data: { labels: SEGMENTS, datasets: [{ data: [], backgroundColor: [COLORS.purple, '#9d98f4', '#c2bef9'], borderRadius: 6, maxBarThickness: 45 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: c => `R$ ${PERCENT.format(c.raw)} mi` } } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 } } }, y: { beginAtZero: true, grid, border: { display: false, dash: [4, 4] }, ticks: { callback: v => `${v} mi`, font: { size: 10 } } } } } });
}
function updateCharts(rows) {
  if (!chartTrend) return;
  const numMonths = Number($('periodFilter').value);
  const months = Array.from({ length: numMonths }, (_, i) => {
    const offset = numMonths - i - 1;
    const date = new Date(reference.getFullYear(), reference.getMonth() - offset, 1);
    const group = rows.filter(r => r.monthOffset === offset);
    const defaults = group.filter(r => r.status === 'Inadimplente').length;
    return { label: `${MONTHS[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`, rate: group.length ? defaults / group.length * 100 : 0 };
  });
  chartTrend.data.labels = months.map(m => m.label);
  chartTrend.data.datasets[0].data = months.map(m => +m.rate.toFixed(2));
  chartTrend.update();
  const risk = [rows.filter(r => r.score >= 750).length, rows.filter(r => r.score >= 550 && r.score < 750).length, rows.filter(r => r.score < 550).length];
  chartRisk.data.datasets[0].data = risk;
  chartRisk.update();
  $('donutTotal').textContent = NUMBER.format(rows.length);
  const names = ['Baixo', 'Médio', 'Alto']; const colors = [COLORS.green, COLORS.amber, COLORS.red];
  $('riskLegend').innerHTML = risk.map((n, i) => `<div class="risk-legend-item"><span><i style="background:${colors[i]}"></i>${names[i]}</span><strong>${rows.length ? Math.round(n / rows.length * 100) : 0}%</strong></div>`).join('');
  chartSegment.data.datasets[0].data = SEGMENTS.map(seg => +(rows.filter(r => r.segment === seg).reduce((s, r) => s + r.balance, 0) / 1e6).toFixed(2));
  chartSegment.update();
}
function updateInsights(rows) {
  const s = stats(rows);
  const bySegment = SEGMENTS.map(segment => ({ segment, balance: rows.filter(r => r.segment === segment).reduce((sum, r) => sum + r.balance, 0) })).sort((a,b) => b.balance-a.balance);
  const highRisk = rows.filter(r => r.score < 550).length;
  const values = [
    { icon: '▦', title: 'Maior exposição', desc: `${bySegment[0].segment} representa ${s.total ? PERCENT.format(bySegment[0].balance / s.total * 100) : '0,0'}% do saldo da carteira filtrada.` },
    { icon: '!', title: 'Clientes em alto risco', desc: `${NUMBER.format(highRisk)} clientes possuem score inferior a 550 (${rows.length ? PERCENT.format(highRisk / rows.length * 100) : '0,0'}% do total).` },
    { icon: '◎', title: 'Saúde da carteira', desc: `Inadimplência de ${PERCENT.format(s.defaultRate)}% entre ${NUMBER.format(rows.length)} contratos da amostra.` }
  ];
  $('insightsList').innerHTML = values.map(v => `<div class="insight"><div class="insight-icon">${v.icon}</div><div class="insight-content"><strong>${v.title}</strong><span>${v.desc}</span></div></div>`).join('');
}
function filteredTableRows() { return current.filter(r => r.id.toLowerCase().includes(searchTerm)); }
function renderTable() {
  const rows = filteredTableRows();
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  page = Math.min(page, totalPages);
  const slice = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  $('portfolioTable').innerHTML = slice.length ? slice.map(r => `<tr><td>${r.id}</td><td>${r.segment}</td><td>${r.region}</td><td>${BRL.format(r.balance)}</td><td class="score">${r.score}</td><td><span class="status ${r.status === 'Em dia' ? 'em-dia' : r.status === 'Em atraso' ? 'atraso' : 'inadimplente'}">${r.status}</span></td></tr>`).join('') : '<tr><td colspan="6">Nenhum contrato encontrado.</td></tr>';
  $('tableCount').textContent = `${NUMBER.format(rows.length)} registros`;
  $('tableFootnote').textContent = `${rows.length ? (page-1)*PAGE_SIZE+1 : 0}–${Math.min(page*PAGE_SIZE,rows.length)} de ${NUMBER.format(rows.length)} contratos`;
  $('pageInfo').textContent = `${page} / ${totalPages}`;
  $('prevPage').disabled = page <= 1;
  $('nextPage').disabled = page >= totalPages;
}
function refresh() { current = filters(); page = 1; updateKPIs(current); updateCharts(current); updateInsights(current); renderTable(); }
function exportCSV() {
  const header = ['Contrato', 'Segmento', 'Regiao', 'Saldo_BRL', 'Score', 'Status', 'Mes'];
  const lines = current.map(r => [r.id, r.segment, r.region, r.balance, r.score, r.status, `${MONTHS[r.date.getMonth()]}/${r.date.getFullYear()}`].join(';'));
  const csv = '\uFEFF' + [header.join(';'), ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'carteira_credito_simulada.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  $('todayLabel').textContent = 'Novembro de 2026';
  initCharts(); refresh();
  ['periodFilter','segmentFilter','regionFilter'].forEach(id => $(id).addEventListener('change', refresh));
  $('resetButton').addEventListener('click', () => { $('periodFilter').value = '12'; $('segmentFilter').value = 'Todos'; $('regionFilter').value = 'Todas'; $('searchInput').value = ''; searchTerm = ''; refresh(); });
  $('searchInput').addEventListener('input', e => { searchTerm = e.target.value.trim().toLowerCase(); page = 1; renderTable(); });
  $('prevPage').addEventListener('click', () => { page--; renderTable(); });
  $('nextPage').addEventListener('click', () => { page++; renderTable(); });
  $('exportButton').addEventListener('click', exportCSV);
  $('menuButton').addEventListener('click', () => $('sidebar').classList.toggle('open'));
  document.querySelectorAll('.nav-link').forEach(a => a.addEventListener('click', () => {
    $('sidebar').classList.remove('open'); document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active')); a.classList.add('active');
  }));
});
