// Wire sliders + labels
const solar   = document.getElementById('solar');
const battery = document.getElementById('battery');
const solarVal= document.getElementById('solarVal');
const batVal  = document.getElementById('batVal');
function updateLabels(){ solarVal.textContent = solar.value; batVal.textContent = battery.value; }
solar.addEventListener('input', () => { updateLabels(); if (window._grid) drawTimeseries(window._grid); });
battery.addEventListener('input', updateLabels);
updateLabels();

// ----- Network drawing (SVG) -----
function drawNetwork(data){
  const host = document.getElementById('plot-network');
  host.textContent = ''; // clear placeholder
  const W = 420, H = 300, svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
  const byId = {}; data.buses.forEach(b => byId[b.id] = b);
  data.lines.forEach(line => {
    const a = byId[line.from], b = byId[line.to];
    const el = document.createElementNS(svgNS, 'line');
    el.setAttribute('x1', a.x); el.setAttribute('y1', a.y);
    el.setAttribute('x2', b.x); el.setAttribute('y2', b.y);
    el.setAttribute('stroke', '#3a4253'); el.setAttribute('stroke-width', '4'); el.setAttribute('stroke-linecap', 'round');
    svg.appendChild(el);
  });
  data.buses.forEach(bus => {
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', bus.x); c.setAttribute('cy', bus.y);
    c.setAttribute('r', bus.type === 'slack' ? 8 : 6);
    c.setAttribute('fill', bus.type === 'slack' ? '#6cc04a' : '#e6e6e6');
    c.setAttribute('stroke', '#0b0c10'); c.setAttribute('stroke-width', '2');
    svg.appendChild(c);
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', bus.x + 10); t.setAttribute('y', bus.y - 10);
    t.setAttribute('fill', '#9aa0a6'); t.setAttribute('font-size', '12'); t.textContent = bus.id;
    svg.appendChild(t);
  });
  host.appendChild(svg);
}

// ----- Simple time-series (Load vs Solar) -----
function drawTimeseries(data){
  const host = document.getElementById('plot-power');
  host.textContent = ''; // clear placeholder

  const W = 600, H = 220, P = {l:40,r:10,t:10,b:24};
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');

  const hours = [...Array(24).keys()];
  const load  = data.base_load_mw;                 // MW
  const solarPct = Number(solar.value)/100;
  const solarMW  = data.base_solar_mw.map(v => v * Math.max(...load) * solarPct); // scale normalized solar

  const ymax = Math.max(...load, ...solarMW) * 1.1;
  const x = h => P.l + (h/23)*(W-P.l-P.r);
  const y = v => H-P.b - (v/ymax)*(H-P.t-P.b);

  // axes
  const mk = (tag, attrs) => { const e=document.createElementNS(svgNS, tag); for(const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  svg.appendChild(mk('line',{x1:P.l,y1:H-P.b,x2:W-P.r,y2:H-P.b,stroke:'#2a2f3a'}));
  svg.appendChild(mk('line',{x1:P.l,y1:P.t,x2:P.l,y2:H-P.b,stroke:'#2a2f3a'}));

  // polyline helpers
  const poly = arr => arr.map((v,i)=>`${x(i)},${y(v)}`).join(' ');

  // solar (thin)
  const solarLine = mk('polyline',{points: poly(solarMW), fill:'none', stroke:'#8ab4f8', 'stroke-width':2});
  svg.appendChild(solarLine);
  // load (thick)
  const loadLine  = mk('polyline',{points: poly(load), fill:'none', stroke:'#e6e6e6', 'stroke-width':3});
  svg.appendChild(loadLine);

  // legend
  const legend = mk('g',{}); 
  legend.appendChild(mk('rect',{x:W-150,y:P.t+6,width:140,height:28,fill:'#111318',stroke:'#2a2f3a'}));
  legend.appendChild(mk('line',{x1:W-140,y1:P.t+20,x2:W-120,y2:P.t+20,stroke:'#e6e6e6','stroke-width':3}));
  legend.appendChild(mk('text',{x:W-115,y:P.t+24,fill:'#e6e6e6','font-size':12})).textContent='Load (MW)';
  legend.appendChild(mk('line',{x1:W-70,y1:P.t+20,x2:W-50,y2:P.t+20,stroke:'#8ab4f8','stroke-width':2}));
  legend.appendChild(mk('text',{x:W-45,y:P.t+24,fill:'#8ab4f8','font-size':12})).textContent='Solar (MW)';
  svg.appendChild(legend);

  host.appendChild(svg);
}

// Load data and draw
fetch('./grid.json')
  .then(r => r.json())
  .then(data => {
    window._grid = data; // cache
    document.getElementById('score').textContent = '— ready —';
    drawNetwork(data);
    drawTimeseries(data);
  })
  .catch(err => {
    console.error('Failed to load grid.json', err);
    document.getElementById('score').textContent = 'error';
  });
