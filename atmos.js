(function file contents start)
// Shared atmospheric/system generator (ES module)
// Usage:
//   import { generateDataset, setEarth } from './atmos.js'
//   const data = generateDataset({ seed: 'Kepler-451' }); // deterministic
//   const data2 = generateDataset(); // random (uses time-based seed)

function xmur3(str) {
  for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
  h = (h << 13) | (h >>> 19);
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a) {
  return function() {
    var t = (a += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seedInput) {
  // Accept null/undefined => time based seed
  const seedText = seedInput === undefined || seedInput === null
    ? String(Date.now() + Math.floor(Math.random()*1e9))
    : String(seedInput);
  const seedFn = xmur3(seedText);
  const seed = seedFn();
  const rand = mulberry32(seed);
  return {
    seedText,
    seed,
    random: () => rand(),
    rand: (min, max) => (rand() * (max - min) + min),
    randint: (min, max) => Math.floor((rand() * (max - min + 1)) + min),
    choice: (arr) => arr[Math.floor(rand() * arr.length)]
  };
}

// Pools and templates (same as mainframeweather base)
const starClasses = ['O','B','A','F','G','K','M'];
const luminosity = ['I','II','III','IV','V'];
const starTypes = ["Hypergiant","Blue giant","White star","Yellow dwarf","Orange dwarf","Red dwarf","Red dwarf"];
const planetTypes = ['Terrestrial','Super-Earth','Sub-Neptune','Ice World','Gas Giant','Ocean World','Rocky','Desert','Lava'];
const phenomenaPool = [
  "Global dust storms", "Auroral curtains", "Methane rain", "Silicate particulates in atmosphere",
  "Supersonic jet streams", "Persistent lightning storms", "High-altitude hydrocarbons haze",
  "Cryovolcanic plumes", "Magnetospheric radiation belts", "Dense smog and photochemical haze",
  "Seasonal polar caps", "Thick sulfuric clouds", "Transient water vapor plumes"
];

function buildComposition(rng, pType, tempC){
  const comps = [];
  if(pType.includes('Gas')){
    comps.push({gas:'H2',pct: +(rng.rand(60,92)).toFixed(1)});
    comps.push({gas:'He',pct: +(rng.rand(6,30)).toFixed(1)});
    if(rng.random() < 0.4) comps.push({gas:'CH4',pct: +(rng.rand(0.1,4)).toFixed(2)});
  } else {
    let n2 = +(rng.rand(30,90)).toFixed(1);
    let o2 = +(rng.rand(0,30)).toFixed(1);
    let co2 = +(rng.rand(0,10)).toFixed(2);
    if(Math.abs(tempC - 15) < 40 && rng.random() < 0.5){
      n2 = +(rng.rand(60,80)).toFixed(1);
      o2 = +(rng.rand(10,25)).toFixed(1);
      co2 = +(rng.rand(0.01,0.8)).toFixed(2);
    }
    comps.push({gas:'N2',pct:n2});
    if(o2>0.05) comps.push({gas:'O2',pct:o2});
    if(co2>0.01) comps.push({gas:'CO2',pct:co2});
    if(rng.random() < 0.4) comps.push({gas:'Ar',pct: +(rng.rand(0.1,1.2)).toFixed(2)});
    if(rng.random() < 0.35) comps.push({gas:'CH4',pct: +(rng.rand(0,2)).toFixed(2)});
    if(rng.random() < 0.35) comps.push({gas:'H2O',pct: +(rng.rand(0,6)).toFixed(2)});
    if(rng.random() < 0.12) comps.push({gas:'SO2',pct: +(rng.rand(0,4)).toFixed(2)});
  }
  let sum = comps.reduce((s,c)=>s+Number(c.pct),0);
  if(sum < 30 && pType.includes('Gas')) {
    sum = comps.reduce((s,c)=>s+Number(c.pct),0);
  }
  comps.forEach(c => { c.pct = +(100 * c.pct / sum).toFixed(2); });
  return comps.sort((a,b)=>b.pct - a.pct);
}

function generatePhenomena(rng, type, tempC, pressure, composition){
  const pool = [];
  if(type.includes('Gas')){
    pool.push("High-altitude banded storms");
    pool.push("Strong magnetospheric radio emissions");
  } else {
    if(composition.some(g=>g.gas==='CH4' && g.pct>1)) pool.push("Hydrocarbon haze and orange skies");
    if(composition.some(g=>g.gas==='SO2')) pool.push("Acidic cloud layers and sulfuric aerosols");
    if(Math.abs(tempC) < 100 && rng.random() < 0.5) pool.push("Seasonal storms and weather fronts");
    if(pressure > 50) pool.push("Supercritical atmospheric phenomena");
    if(rng.random() < 0.2) pool.push(rng.choice(phenomenaPool));
  }
  if(pool.length === 0) pool.push(rng.choice(phenomenaPool));
  return pool;
}

function evaluateHabitability({tempC, pressure, comp, gravity, pType}){
  let score = 0;
  if(pType==='Terrestrial' || pType==='Super-Earth' || pType==='Ocean World') score += 1;
  if(tempC >= -20 && tempC <= 50) score += 2;
  if(pressure >= 0.4 && pressure <= 5) score += 2;
  const o2 = (comp.find(c=>c.gas==='O2')||{pct:0}).pct;
  if(o2 >= 18 && o2 <= 25) score += 2;
  const toxic = (comp.find(c=>c.gas==='SO2')||{pct:0}).pct + (comp.find(c=>c.gas==='CH4')||{pct:0}).pct*0.2;
  if(toxic < 5) score += 1;
  if(gravity >= 0.5 && gravity <= 2.5) score += 1;

  const reasons = [];
  if(score >= 7) reasons.push("Conditions compatible with surface life and human habitability (within rough heuristic).");
  else {
    if(!(pType==='Terrestrial' || pType==='Super-Earth' || pType==='Ocean World')) reasons.push("Planet type unlikely for terrestrial habitability.");
    if(!(tempC >= -20 && tempC <= 50)) reasons.push(`Temperature (${tempC}°C) outside comfortable range.`);
    if(!(pressure >= 0.4 && pressure <= 5)) reasons.push(`Pressure (${pressure} bar) outside habitable window.`);
    if(!(o2 >= 18 && o2 <= 25)) reasons.push("Oxygen concentration not suitable for Earth-like respiration.");
    if(toxic >= 5) reasons.push("Toxic trace gases may be hazardous.");
    if(!(gravity >= 0.5 && gravity <= 2.5)) reasons.push("Gravity outside comfortable human tolerance.");
  }

  return {
    score,
    habitable: score >= 7,
    reasons
  };
}

function makeSystemName(rng){
  if(rng.random() < 0.25){
    return rng.choice(['Kepler','TRAPPIST','Gliese','HD','KIC']) + '-' + rng.randint(10,9999);
  }
  const a = String.fromCharCode(65 + rng.randint(0,25));
  const b = String.fromCharCode(65 + rng.randint(0,25));
  const digits = rng.randint(10,999);
  return `${a}${b}-${digits}`;
}

function makeStar(rng){
  const cls = rng.choice(starClasses);
  const sub = rng.randint(0,9);
  const lum = rng.choice(luminosity);
  const name = `${cls}${sub}${lum}`;
  const type = (() => {
    if (cls==='O' || cls==='B') return 'Massive luminous';
    if (cls==='A' || cls==='F') return 'Hot luminous';
    if (cls==='G') return 'Yellow dwarf (G-type)';
    if (cls==='K') return 'Orange dwarf (K-type)';
    return 'Red dwarf (M-type)';
  })();
  const luminosityFactor = ({O:50000,B:1000,A:20,F:6,G:1,K:0.4,M:0.04})[cls] || 1;
  return {name, type, cls, sub, lum, luminosityFactor};
}

function makePlanet(rng, systemName, star){
  const index = rng.randint(1,12);
  const base = Math.pow(1.5, index-1) * 0.35;
  const orbital = +(base * (0.7 + rng.random()*0.6)).toFixed(2);
  const sizeCategory = rng.random();
  let radiusEarth, massEarth, pType;
  if(sizeCategory < 0.25){
    pType = 'Terrestrial'; radiusEarth = +(rng.rand(0.3,1.2).toFixed(2)); massEarth = +(Math.pow(radiusEarth,3) * (0.7 + rng.random()*1.3)).toFixed(2);
  } else if(sizeCategory < 0.45){
    pType = 'Super-Earth'; radiusEarth = +(rng.rand(1.3,2.4).toFixed(2)); massEarth = +(rng.rand(2,10).toFixed(2));
  } else if(sizeCategory < 0.7){
    pType = 'Sub-Neptune'; radiusEarth = +(rng.rand(2.5,4.0).toFixed(2)); massEarth = +(rng.rand(10,40).toFixed(2));
  } else {
    pType = 'Gas Giant'; radiusEarth = +(rng.rand(4.0,11.0).toFixed(2)); massEarth = +(rng.rand(50,600).toFixed(0));
  }
  const gravity = +(massEarth / (radiusEarth*radiusEarth)).toFixed(2);
  let tempK = 278 * Math.pow(star.luminosityFactor, 0.25) / Math.sqrt(Math.max(orbital,0.2));
  tempK = tempK * (0.6 + rng.random()*1.8);
  const tempC = +(tempK - 273.15).toFixed(1);
  let pressure = +(Math.pow(rng.random(), 2) * 150).toFixed(2);
  if(pType === 'Terrestrial' && rng.random() < 0.6) pressure = +(pressure * 0.02 + 0.6).toFixed(2);
  if(pType.includes('Gas')) pressure = +(rng.rand(50,300).toFixed(2));
  const comp = buildComposition(rng, pType, tempC);
  const clouds = +(Math.min(100, Math.max(0, (comp.some(g=>g.gas==='H2O')? rng.randint(10,90) : rng.randint(0,95)) ))).toFixed(0);
  const wind = (pType.includes('Gas') ? rng.randint(100,1200) : rng.randint(0,250));
  const phenomena = generatePhenomena(rng, pType, tempC, pressure, comp);
  const habitability = evaluateHabitability({tempC, pressure, comp, gravity, pType});
  const planetLetter = String.fromCharCode(98 + Math.min(25, index));
  const planetCode = `${systemName.split('-')[0]}-${String(index).padStart(2,'0')}${planetLetter}`;

  return {
    systemName,
    planetCode,
    index,
    orbitalAU: orbital,
    radiusEarth,
    massEarth,
    gravity,
    tempC,
    pressureBar: +pressure,
    composition: comp,
    cloudsPercent: clouds,
    windKph: wind,
    type: pType,
    phenomena,
    habitability
  };
}

function setEarth() {
  const systemName = 'Sol';
  const star = {name:'Sun (G2V)', type:'G2V', luminosityFactor:1, cls:'G', sub:2, lum:'V'};
  const planet = {
    systemName,
    planetCode: 'Sol-01b',
    index: 3,
    orbitalAU: 1.00,
    radiusEarth: 1.0,
    massEarth: 1.0,
    gravity: 1.0,
    tempC: 15.0,
    pressureBar: 1.013,
    composition: [
      {gas:'N2',pct:78.08},
      {gas:'O2',pct:20.95},
      {gas:'Ar',pct:0.93},
      {gas:'CO2',pct:0.04},
      {gas:'CH4',pct:0.00018}
    ],
    cloudsPercent: 60,
    windKph: 110,
    type: 'Terrestrial',
    phenomena: ['Stable climate; seasonal variations; aurora in polar regions'],
    habitability: {score:10, habitable:true, reasons:['Local conditions are stable and livable (reference Earth).']}
  };
  return { star, planet, meta: { seedText: 'earth' } };
}

function generateDataset(opts = {}) {
  if(opts.seed === 'earth' || opts.earth === true) {
    return setEarth();
  }
  const rng = makeRng(opts.seed);
  const systemName = makeSystemName(rng);
  const star = makeStar(rng);
  const planet = makePlanet(rng, systemName, star);
  return { star, planet, meta: { seedText: rng.seedText, seed: rng.seed } };
}

export { generateDataset, setEarth };

(function file contents end)
