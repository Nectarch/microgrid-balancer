// Wire sliders + labels
const solar    = document.getElementById('solar');
const battery  = document.getElementById('battery');
const solarVal = document.getElementById('solarVal');
const batVal   = document.getElementById('batVal');
function updateLabels(){ solarVal.textContent = solar.value; batVal.textContent = battery.value; }
function onChange(){ updateLabels(); if (window._grid) drawTimeseries(window._grid); }
solar.addEventListener('input', onChange);
battery.addEventListener('input', onChange);
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

// ----- Simulation: simple battery heuristic over 24 hours -----
function simulate(data){
  const loadMW   = data.base_load_mw.slice();            // 24 numbers
  const solarPct = Number(solar.value)/100;
  const solarMW  = data.base_solar_mw.map(v => v * Math.max(...loadMW) * solarPct);
  const capKWh   = Number(battery.value);                // battery capacity
  const pMax     = Math.max(5, capKWh * 0.25);           // max charge/discharge power (kW≈kWh/h) ~0.25C, min 5
  let soc        = capKWh * 0.5;                         // start at 50% state of charge

  const batPower = Array(24).fill(0);  // +discharge to serve load, -charge
  const unmet    = Array(24).fill(0);  // positive if still not served after battery

  for (let t=0; t<24; t++){
    const baseNet = loadMW[t] - solarMW[t]; // positive means deficit
    if (baseNet > 0){
      // Discharge to cover deficit
      const discharge = Math.min(baseNet, pMax, soc);
      batPower[t] = +discharge;
      soc -= discharge;
      const residual = baseNet - discharge;
      unmet[t] = Math.max(0, residual);
    } else {
      // Surplus: charge
      const surplus = -baseNet;
      const charge = Math.min(surplus, pMax, capKWh - soc);
      batPower[t] = -charge;
      soc += charge;
      unmet[t] = 0;
    }
  }
  const unservedKWh = unmet.reduce((a,b)=>a+b,0); // 1-hour steps → sum is kWh
  return { loadMW, solarMW, batPower, unmet, unservedKWh };
}

// ----- Simple time-series (Load / Solar / Battery / Net) -----
function drawTimeseries(data){
  const host = document.getElementById('plot-power');
  host.textContent = ''; // clear placeholder

  const { loadMW, solarMW, batPower, unmet, unservedKWh } = simulate(data);
  const netAfter = loadMW.map((v,i)=> v - solarMW[i] - batPower[i]); // >0 means unmet

  // Update metric: Unserved energy
  document.getElementById('ue').textContent = unservedKWh.toFixed(1);

  const W = 600, H = 220, P = {l:40,r:10,t:10,b:24};
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');

  const hours = [...Array(24).keys()];
  const ymax = Math.max(
    ...loadMW, 
    ...solarMW, 
    ...batPower.map(v=>Math.abs(v)), 
    ...netAfter.map(v=>Math.max(0,v))
  ) * 1.1;

  const x = h => P.l + (h/23)*(W-P.l-P.r);
  const y = v => H-P.b - (v/ymax)*(H-P.t-P.b);
  const mk = (tag, attrs) => { const e=document.createElementNS(svgNS, tag); for(const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const poly = arr => arr.map((v,i)=>`${x(i)},${y(v)}`).join(' ');

  // axes
  svg.appendChild(mk('line',{x1:P.l,y1:H-P.b,x2:W-P.r,y2:H-P.b,stroke:'#2a2f3a'}));
  svg.appendChild(mk('line',{x1:P.l,y1:P.t,x2:P.l,y2:H-P.b,stroke:'#2a2f3a'}));

  // series
  svg.appendChild(mk('polyline',{points: poly(loadMW),    fill:'none', stroke:'#e6e6e6','stroke-width':3})); // Load
  svg.appendChild(mk('polyline',{points: poly(solarMW),   fill:'none', stroke:'#8ab4f8','stroke-width':2})); // Solar
  svg.appendChild(mk('polyline',{points: poly(netAfter.map(v=>Math.max(0,v))), fill:'none', stroke:'#ffb74d','stroke-width':2})); // Residual net (>0)
  svg.appendChild(mk('polyline',{points: poly(batPower),  fill:'none', stroke:'#6cc04a','stroke-width':2})); // Battery power (+discharge, -charge)

  // legend
  const legend = mk('g',{}); 
  legend.appendChild(mk('rect',{x:W-260,y:P.t+6,width:250,height:44,fill:'#111318',stroke:'#2a2f3a'}));
  const addKey = (x1,y1,x2,y2,color,text,dx) => {
    legend.appendChild(mk('line',{x1,y1,x2,y2,stroke:color,'stroke-width':3}));
    legend.appendChild(mk('text',{x:x2+6+dx,y:y2+4,fill:color,'font-size':12})).textContent=text;
  };
  addKey(W-250,P.t+20, W-230,P.t+20, '#e6e6e6', 'Load (MW)', 0);
  addKey(W-170,P.t+20, W-150,P.t+20, '#8ab4f8', 'Solar (MW)', 0);
  addKey(W-250,P.t+34, W-230,P.t+34, '#6cc04a', 'Battery (+discharge, -charge)', 0);
  addKey(W-70 ,P.t+34, W-50 ,P.t+34, '#ffb74d', 'Residual > 0 (unmet)', 0);
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
