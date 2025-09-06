// Wire sliders + labels
const solar   = document.getElementById('solar');
const battery = document.getElementById('battery');
const solarVal= document.getElementById('solarVal');
const batVal  = document.getElementById('batVal');
function updateLabels(){ solarVal.textContent = solar.value; batVal.textContent = battery.value; }
solar.addEventListener('input', updateLabels);
battery.addEventListener('input', updateLabels);
updateLabels();

// Simple network drawing (SVG)
function drawNetwork(data){
  const host = document.getElementById('plot-network');
  host.textContent = ''; // clear "Placeholder"

  // SVG setup
  const W = 420, H = 300;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');

  // helpers to get bus by id
  const byId = {};
  data.buses.forEach(b => byId[b.id] = b);

  // draw lines first
  data.lines.forEach(line => {
    const a = byId[line.from], b = byId[line.to];
    const el = document.createElementNS(svgNS, 'line');
    el.setAttribute('x1', a.x); el.setAttribute('y1', a.y);
    el.setAttribute('x2', b.x); el.setAttribute('y2', b.y);
    el.setAttribute('stroke', '#3a4253');
    el.setAttribute('stroke-width', '4');
    el.setAttribute('stroke-linecap', 'round');
    svg.appendChild(el);
  });

  // draw buses (nodes)
  data.buses.forEach(bus => {
    // node
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', bus.x); c.setAttribute('cy', bus.y);
    c.setAttribute('r', bus.type === 'slack' ? 8 : 6);
    c.setAttribute('fill', bus.type === 'slack' ? '#6cc04a' : '#e6e6e6');
    c.setAttribute('stroke', '#0b0c10'); c.setAttribute('stroke-width', '2');
    svg.appendChild(c);

    // label
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', bus.x + 10); t.setAttribute('y', bus.y - 10);
    t.setAttribute('fill', '#9aa0a6');
    t.setAttribute('font-size', '12');
    t.textContent = bus.id;
    svg.appendChild(t);
  });

  host.appendChild(svg);
}

// Load local data, then draw network
fetch('./grid.json')
  .then(r => r.json())
  .then(data => {
    console.log('grid.json loaded:', data);
    document.getElementById('score').textContent = '— ready —';
    drawNetwork(data);
  })
  .catch(err => {
    console.error('Failed to load grid.json', err);
    document.getElementById('score').textContent = 'error';
  });
