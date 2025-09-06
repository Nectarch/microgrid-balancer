// Wire sliders + confirm we can load data
const solar = document.getElementById('solar');
const battery = document.getElementById('battery');
const solarVal = document.getElementById('solarVal');
const batVal   = document.getElementById('batVal');

function updateLabels(){
  solarVal.textContent = solar.value;
  batVal.textContent   = battery.value;
}
solar.addEventListener('input', updateLabels);
battery.addEventListener('input', updateLabels);
updateLabels();

fetch('./grid.json')
  .then(r => r.json())
  .then(data => {
    console.log('grid.json loaded:', data);
    document.getElementById('score').textContent = '— ready —';
  })
  .catch(err => {
    console.error('Failed to load grid.json', err);
    document.getElementById('score').textContent = 'error';
  });
