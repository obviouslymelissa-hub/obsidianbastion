// Enhanced SPA with separate custom-locations storage and UI
// (Updated: when at a custom location or targeting a custom destination, the large map shows ONLY
// the previous location and the new destination — no other planets)
const DATA_URL = 'systems.json';
let catalog = null;
let currentSystem = null;
let currentPlanet = null;
let currentCustom = null; // selected custom destination (object from customLocations)
const STORAGE = { LOC: 'nav:loc:v1', CUSTOMS: 'nav:customs_v1', HISTORY: 'nav:history_v1' };

function $(id){ return document.getElementById(id); }

async function loadCatalog(){
  if(window.__CATALOG__){
    catalog = window.__CATALOG__;
    return catalog;
  }
  try{
    const res = await fetch(DATA_URL);
    if(!res.ok) throw new Error('Network response not OK');
    catalog = await res.json();
    return catalog;
  }catch(e){
    if(window.__CATALOG__){
      catalog = window.__CATALOG__;
      return catalog;
    }
    throw e;
  }
}

/* custom locations storage helpers */
function loadCustoms(){ try{ return JSON.parse(localStorage.getItem(STORAGE.CUSTOMS)) || []; }catch(e){ return []; } }
function saveCustoms(list){ localStorage.setItem(STORAGE.CUSTOMS, JSON.stringify(list)); }
function addOrUpdateCustom(c){ const arr = loadCustoms(); const idx = arr.findIndex(x => x.id === c.id); if(idx>=0) arr[idx]=c; else arr.push(c); saveCustoms(arr); renderCustomList(); }
function removeCustomById(id){ let arr = loadCustoms(); arr = arr.filter(x=>x.id !== id); saveCustoms(arr); renderCustomList(); if(currentCustom && currentCustom.id===id) currentCustom=null; }

function saveLocation(loc){ 
  localStorage.setItem(STORAGE.LOC, JSON.stringify(loc)); 
  // Also add to travel history
  addToTravelHistory(loc);
}
function loadLocation(){ try{ return JSON.parse(localStorage.getItem(STORAGE.LOC)); }catch(e){return null} }

/* travel history helpers */
function loadTravelHistory(){ try{ return JSON.parse(localStorage.getItem(STORAGE.HISTORY)) || []; }catch(e){ return []; } }
function saveTravelHistory(list){ localStorage.setItem(STORAGE.HISTORY, JSON.stringify(list)); }
function addToTravelHistory(loc){
  const history = loadTravelHistory();
  const entry = {
    ...loc,
    timestamp: new Date().toISOString()
  };
  // Add to beginning and limit to 10 most recent
  history.unshift(entry);
  // Remove duplicates - keep only the most recent entry for each location
  const unique = [];
  const seen = new Set();
  for(const item of history){
    const key = `${item.system}:${item.planet}`;
    if(!seen.has(key)){
      seen.add(key);
      unique.push(item);
    }
  }
  const limited = unique.slice(0, 10);
  saveTravelHistory(limited);
  renderRecentlyTravelled();
}

function updateOverallStatus(text, progress = null){
  const el = $('overallStatus');
  el.textContent = `Status: ${text}`;
  const travelState = $('travelState');
  if(travelState) travelState.textContent = text;
  let bar = document.querySelector('.status-progress');
  if(progress === null){
    if(bar) bar.remove();
    return;
  }
  if(!bar){
    bar = document.createElement('div');
    bar.className = 'status-progress';
    const i = document.createElement('i');
    bar.appendChild(i);
    el.appendChild(bar);
  }
  const inner = document.querySelector('.status-progress > i');
  inner.style.width = `${Math.round(progress*100)}%`;
}

function renderSystems(){
  const container = $('systemsList');
  container.innerHTML = '';
  catalog.systems.forEach(sys=>{
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<div><strong>${sys.name}</strong><div class="small-muted">${sys.star.name}</div></div>
                    <div style="display:flex;gap:8px;align-items:center">
                      <button data-system="${sys.id}" class="btn">Open</button>
                    </div>`;
    container.appendChild(el);
    el.querySelector('button')?.addEventListener('click', ()=> selectSystem(sys.id));
  });
}

function renderPlanets(systemId){
  const sys = catalog.systems.find(s=>s.id===systemId);
  const list = $('planetsList'); list.innerHTML = '';
  if(!sys) return;
  $('systemTitle').textContent = sys.name;
  sys.planets.forEach(p=>{
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<div><strong>${p.name}</strong><div class="small-muted">${p.type} • ${p.orbitalAU} AU</div></div>
                    <div style="display:flex;gap:8px">
                      <button data-planet="${p.id}" class="btn">View</button>
                    </div>`;
    list.appendChild(el);
    el.querySelector('button')?.addEventListener('click', ()=> selectPlanet(sys.id, p.id));
  });
  // ensure large map shows this system (and any current custom)
  renderMapLarge(sys, currentPlanet, currentCustom);
}

function renderDetails(sysId, planetId){
  const sys = catalog.systems.find(s=>s.id===sysId);
  const p = sys?.planets.find(pl=>pl.id===planetId);
  if(!p){ $('planetName').textContent = '—'; $('planetSummary').textContent = ''; return; }
  currentSystem = sys; currentPlanet = p;
  currentCustom = null;
  $('planetName').textContent = p.name;
  $('planetSummary').textContent = p.summary || '';
  $('planetType').textContent = p.type;
  $('planetOrbit').textContent = p.orbitalAU + ' AU';
  $('planetRadius').textContent = p.radiusEarth + ' R⊕';
  renderMapLarge(sys, p, null);
}

/* Selection handlers */
function selectSystem(systemId){
  renderPlanets(systemId);
  history.replaceState({}, '', `?system=${encodeURIComponent(systemId)}`);
}

function selectPlanet(systemId, planetId){
  renderDetails(systemId, planetId);
  history.replaceState({}, '', `?system=${encodeURIComponent(systemId)}&planet=${encodeURIComponent(planetId)}`);
}

/* Map rendering (shows current-location and destination).
   New behaviour: if either the saved location is a custom OR the current destination is custom,
   we enter "minimal mode" and DO NOT render other planets — only the two markers (origin + dest).
*/
function renderMapLarge(destSystem, highlightedPlanet, customDest){
  const svg = $('mapSvgLarge');
  svg.innerHTML = '';
  if(!destSystem) return;
  const W = 1000, H = 320;
  const marginLeft = 120;
  const marginRight = 80;
  const loc = loadLocation();
  const savedLocSystem = loc ? catalog.systems.find(s=>s.id===loc.system) : null;
  const destinationSystem = destSystem;

  // Determine minimal mode: saved location is a custom OR destination is a custom
  const savedCustom = (() => {
    if(!loc) return null;
    const customs = loadCustoms();
    return customs.find(c => c.id === loc.planet) || null;
  })();
  const minimalMode = Boolean(savedCustom || customDest);

  // For minimal mode we still may need two systems if origin and destination are on different systems
  const originSystem = savedCustom ? catalog.systems.find(s => s.id === savedCustom.system) : (loc ? catalog.systems.find(s=>s.id===loc.system) : null);
  const destSys = customDest ? catalog.systems.find(s => s.id === customDest.system) : destinationSystem;
  const twoSystem = originSystem && destSys && originSystem.id !== destSys.id && minimalMode;

  const starXFor = (index) => {
    if(!twoSystem) return marginLeft;
    return index === 0 ? marginLeft : (W - marginRight - 140);
  };

  // Draw stars only (no planet lists) when minimalMode; otherwise draw full system with planets
  if(minimalMode){
    // systems to render: origin (0) and maybe destination (1)
    const systemsToRender = twoSystem ? [originSystem, destSys] : [destSys];
    systemsToRender.forEach((sys, idx) => {
      const starX = starXFor(idx);
      const starY = H/2;
      svg.innerHTML += `<g data-sys="${sys.id}">
        <circle class="star" cx="${starX}" cy="${starY}" r="14"></circle>
        <text x="${starX+20}" y="${starY+6}" fill="#bfe6ff" font-size="13">${escapeHtml(sys.name)}</text>
      </g>`;
    });

    // compute origin coords (could be custom or catalog)
    let originCoords = { x: starXFor(0), y: H/2 };
    if(savedCustom){
      const idx = twoSystem ? 0 : 0;
      originCoords = getCoordsForCustom(originSystem, savedCustom, W, H, idx, twoSystem);
    } else if (loc && loc.system && loc.planet){
      const idx = twoSystem ? 0 : 0;
      originCoords = getPlanetCoordsLarge(originSystem || destSys, loc.planet, W, H, idx, twoSystem) || originCoords;
    }

    // compute destination coords
    let destCoords = null;
    if(customDest){
      const destIdx = twoSystem ? 1 : 0;
      destCoords = getCoordsForCustom(destSys, customDest, W, H, destIdx, twoSystem);
    } else if (highlightedPlanet){
      const destIdx = twoSystem ? 1 : 0;
      destCoords = getPlanetCoordsLarge(destSys, highlightedPlanet.id, W, H, destIdx, twoSystem);
    }

    // draw ship (origin)
    svg.innerHTML += `<g id="shipLarge" class="ship" transform="translate(${originCoords.x},${originCoords.y})">
        <circle class="ship-core" cx="0" cy="0" r="8"></circle>
        <path class="ship-tail" d="M-12 -4 L-22 0 L-12 4 Z" transform="translate(-3,0)"></path>
      </g>`;

    // separate "You are here" label offset to avoid overlap
    const labelOffsetX = (originCoords.x > W * 0.6) ? -120 : 14;
    const labelX = originCoords.x + labelOffsetX;
    const labelY = originCoords.y - 10;
    const labelText = 'You are here';
    const rectWidth = Math.max(80, Math.min(220, labelText.length * 7 + 16));
    svg.innerHTML += `<g class="you-here-label" transform="translate(0,0)">
        <rect x="${labelX - 6}" y="${labelY - 14}" rx="6" ry="6" width="${rectWidth}" height="22" fill="rgba(0,0,0,0.45)"></rect>
        <text x="${labelX}" y="${labelY}" fill="#ffd" font-size="12" font-weight="700">${escapeHtml(labelText)}</text>
      </g>`;

    // draw destination marker if available
    if(destCoords){
      svg.innerHTML += `<g class="destination-group" data-id="${customDest ? customDest.id : highlightedPlanet.id}" data-system="${destSys.id}">
        <circle class="destination" cx="${destCoords.x}" cy="${destCoords.y}" r="${Math.max(8, (customDest?customDest.radiusEarth:highlightedPlanet.radiusEarth) * 5)}" fill="#ff9" stroke="#ffb766" stroke-width="1.6"></circle>
        <text x="${destCoords.x+12}" y="${destCoords.y+4}" fill="#ffd" font-size="13" font-weight="700">${escapeHtml(customDest ? customDest.name : highlightedPlanet.name)}</text>
      </g>`;
    }

  } else {
    // Normal (non-minimal) mode: render full destination system (with planets) and saved location marker if applicable
    const systemsToRender = [destinationSystem];
    systemsToRender.forEach((sys, idx) => {
      const starX = starXFor(idx);
      const starY = H/2;
      svg.innerHTML += `<g data-sys="${sys.id}">
        <circle class="star" cx="${starX}" cy="${starY}" r="14"></circle>
        <text x="${starX+20}" y="${starY+6}" fill="#bfe6ff" font-size="13">${escapeHtml(sys.name)}</text>
      </g>`;
      const maxAU = Math.max(...sys.planets.map(pp=>pp.orbitalAU));
      const span = (W - marginLeft - marginRight);
      sys.planets.forEach((pl, pidx) => {
        const jitterY = ((pidx % 3) - 1) * 14;
        const x = starX + 60 + (pl.orbitalAU / (maxAU || 1)) * (span - 120);
        const y = starY + jitterY;
        const r = Math.max(6, Math.min(16, pl.radiusEarth * 5));
        const isDestination = (destinationSystem.id === sys.id && highlightedPlanet && pl.id === highlightedPlanet.id && !customDest);
        const fill = isDestination ? '#ffbf6e' : '#88c2ff';
        const strokeClass = isDestination ? 'selected-planet' : '';
        svg.innerHTML += `<g class="planet-group" data-id="${pl.id}" data-system="${sys.id}">
          <circle class="planet ${strokeClass}" data-id="${pl.id}" cx="${x}" cy="${y}" r="${r}" fill="${fill}"></circle>
          <text x="${x-24}" y="${y+28}" fill="#9aa6c0" font-size="12">${escapeHtml(pl.name)}</text>
        </g>`;
      });
    });

    // draw the ship (current location) if exists
    let shipPos = {x: marginLeft, y: H/2};
    if(loc){
      const isLocInRendered = savedLocSystem && savedLocSystem.id === destinationSystem.id;
      if(isLocInRendered){
        const coords = getPlanetCoordsLarge(destinationSystem, loc.planet, W, H, 0, false);
        if(coords) shipPos = coords;
      } else {
        shipPos = {x: marginLeft, y: H/2};
      }
    }
    svg.innerHTML += `<g id="shipLarge" class="ship" transform="translate(${shipPos.x},${shipPos.y})">
        <circle class="ship-core" cx="0" cy="0" r="8"></circle>
        <path class="ship-tail" d="M-12 -4 L-22 0 L-12 4 Z" transform="translate(-3,0)"></path>
      </g>`;
    // small label
    const labelOffsetX = (shipPos.x > W * 0.6) ? -120 : 14;
    const labelX = shipPos.x + labelOffsetX;
    const labelY = shipPos.y - 10;
    svg.innerHTML += `<g class="you-here-label" transform="translate(0,0)">
        <rect x="${labelX - 6}" y="${labelY - 14}" rx="6" ry="6" width="${Math.max(80, 14*7)}" height="22" fill="rgba(0,0,0,0.45)"></rect>
        <text x="${labelX}" y="${labelY}" fill="#ffd" font-size="12" font-weight="700">You are here</text>
      </g>`;

    // draw destination if highlighted
    if(highlightedPlanet){
      const destCoords = getPlanetCoordsLarge(destinationSystem, highlightedPlanet.id, W, H, 0, false);
      if(destCoords){
        svg.innerHTML += `<g class="destination-group" data-id="${highlightedPlanet.id}" data-system="${destinationSystem.id}">
          <circle class="destination" cx="${destCoords.x}" cy="${destCoords.y}" r="${Math.max(8, highlightedPlanet.radiusEarth * 5)}" fill="#ff9" stroke="#ffb766" stroke-width="1.6"></circle>
          <text x="${destCoords.x+12}" y="${destCoords.y+4}" fill="#ffd" font-size="13" font-weight="700">${escapeHtml(highlightedPlanet.name)}</text>
        </g>`;
      }
    }
  }

  // attach click handlers for catalog planets (only present in non-minimal mode)
  svg.querySelectorAll('.planet-group').forEach(g=>{
    g.addEventListener('click', (e)=>{
      const pid = g.getAttribute('data-id');
      const sid = g.getAttribute('data-system');
      selectPlanet(sid, pid);
    });
  });
}

/* get coords for custom location (same logic as planet coords but using custom.orbitalAU) */
function getCoordsForCustom(sys, custom, W = 1000, H = 320, sysIndex = 0, renderTwo = false){
  const marginLeft = 120;
  const marginRight = 80;
  const starX = renderTwo ? (sysIndex === 0 ? marginLeft : (W - marginRight - 140)) : marginLeft;
  const starY = H/2;
  const maxAU = Math.max(...sys.planets.map(pp=>pp.orbitalAU));
  const span = (renderTwo ? (W - marginLeft - marginRight - 200) : (W - marginLeft - marginRight));
  const idx = sys.planets.length; // place after others for jitter calc
  const jitterY = ((idx % 3) - 1) * 14;
  const x = starX + 60 + (custom.orbitalAU / (Math.max(maxAU, custom.orbitalAU) || 1)) * (span - 120);
  const y = starY + jitterY;
  return {x, y};
}

/* get planet coords for large map */
function getPlanetCoordsLarge(sys, planetId, W = 1000, H = 320, sysIndex = 0, renderTwo = false){
  const marginLeft = 120;
  const marginRight = 80;
  const starX = renderTwo ? (sysIndex === 0 ? marginLeft : (W - marginRight - 140)) : marginLeft;
  const starY = H/2;
  const pl = sys.planets.find(p => p.id === planetId);
  if(!pl) return null;
  const maxAU = Math.max(...sys.planets.map(pp=>pp.orbitalAU));
  const span = (renderTwo ? (W - marginLeft - marginRight - 200) : (W - marginLeft - marginRight));
  const idx = sys.planets.indexOf(pl);
  const jitterY = ((idx % 3) - 1) * 14;
  const x = starX + 60 + (pl.orbitalAU / (maxAU || 1)) * (span - 120);
  const y = starY + jitterY;
  return {x, y};
}

/* parse destination */
function parseDestination(text){
  if(!text) return null;
  const raw = text.trim();
  if(raw.includes('/')){
    const [sysPart, planetPart] = raw.split('/').map(s=>s.trim());
    const sys = catalog.systems.find(s => s.id.toLowerCase() === sysPart.toLowerCase() || s.name.toLowerCase() === sysPart.toLowerCase());
    if(sys){
      const pl = sys.planets.find(p => p.id.toLowerCase() === planetPart.toLowerCase() || p.name.toLowerCase() === planetPart.toLowerCase());
      if(pl) return { system: sys.id, planet: pl.id, planetObj: pl };
      return { system: sys.id, planet: null, planetObj: null };
    }
    return null;
  }
  for(const sys of catalog.systems){
    const p = sys.planets.find(p => p.id.toLowerCase() === raw.toLowerCase());
    if(p){ return { system: sys.id, planet: p.id, planetObj: p }; }
  }
  for(const sys of catalog.systems){
    const p = sys.planets.find(p => p.name.toLowerCase() === raw.toLowerCase());
    if(p){ return { system: sys.id, planet: p.id, planetObj: p }; }
  }
  const sysMatch = catalog.systems.find(s => s.id.toLowerCase() === raw.toLowerCase() || s.name.toLowerCase() === raw.toLowerCase());
  if(sysMatch) return { system: sysMatch.id, planet: null, planetObj: null };
  return null;
}

/* animation helpers (two-stage approach) */
function animateShipSegment(ship, fromX, fromY, toX, toY, duration, opts = {}, onProgress){
  const start = performance.now();
  const warpClass = opts.warpClass || 'warp';
  return new Promise(resolve=>{
    function step(now){
      const t = Math.min(1, (now - start) / duration);
      const eased = easeInOutCubic(t);
      const curX = fromX + (toX - fromX) * eased;
      const curY = fromY + (toY - fromY) * eased;
      ship.setAttribute('transform', `translate(${curX},${curY})`);
      if(onProgress) onProgress(eased);
      if(t < 1) requestAnimationFrame(step);
      else resolve();
    }
    ship.classList.add(warpClass);
    if(opts.flashRoot){
      document.querySelector('.app')?.classList.add('flash');
      setTimeout(()=> document.querySelector('.app')?.classList.remove('flash'), Math.min(400, duration+80));
    }
    requestAnimationFrame(step);
    setTimeout(()=> ship.classList.remove(warpClass), duration + 120);
  });
}

function easeInOutCubic(t){ return t<0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

async function animateShipToLarge(targetX, targetY, opts = {}, onProgress){
  const ship = $('shipLarge');
  if(!ship) return;
  const transform = ship.getAttribute('transform') || 'translate(0,0)';
  const m = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
  const fromX = m ? parseFloat(m[1]) : 0;
  const fromY = m ? parseFloat(m[2]) : 0;
  const dx = targetX - fromX;
  const dy = targetY - fromY;
  const dist = Math.sqrt(dx*dx + dy*dy) || 1;
  const approachDist = Math.min(140, Math.max(40, dist * 0.28));
  const approachX = targetX - (dx / dist) * approachDist;
  const approachY = targetY - (dy / dist) * approachDist;
  const seg1 = Math.max(200, (opts.duration ?? 1000) * 0.7);
  const seg2 = Math.max(120, (opts.duration ?? 1000) * 0.3);
  await animateShipSegment(ship, fromX, fromY, approachX, approachY, seg1, opts, (p)=> { if(onProgress) onProgress(p*0.85); } );
  await delay(90);
  await animateShipSegment(ship, approachX, approachY, targetX, targetY, seg2, opts, (p)=> { if(onProgress) onProgress(0.85 + p*0.15); } );
}

function delay(ms){ return new Promise(res=>setTimeout(res,ms)); }

/* Travel logic */
async function travelToCurrent(mode = 'regular'){
  if(currentCustom==null && (!currentSystem || !currentPlanet)) return updateOverallStatus('Select or create a destination first');
  updateOverallStatus('Preparing engines…', 0);
  let opts = {};
  if(mode === 'regular'){ opts.duration = 1200; opts.warpClass = 'warp'; }
  else if(mode === 'warp'){ opts.duration = 700; opts.warpClass = 'warp-strong'; }
  else if(mode === 'hyper'){ opts.duration = 260; opts.warpClass = 'warp-strong'; opts.flashRoot = true; }
  await delay(240);
  updateOverallStatus('In transit…', 0.02);

  const loc = loadLocation();
  const savedCustom = loc ? loadCustoms().find(c => c.id === loc.planet) : null;
  const originSystem = savedCustom ? catalog.systems.find(s => s.id === savedCustom.system) : (loc ? catalog.systems.find(s=>s.id===loc.system) : null);
  const destSys = currentCustom ? catalog.systems.find(s=>s.id===currentCustom.system) : currentSystem;
  const twoSystem = originSystem && destSys && originSystem.id !== destSys.id && (savedCustom || currentCustom);

  let target = null;
  if(currentCustom){
    const destIdx = twoSystem ? 1 : 0;
    target = getCoordsForCustom(destSys, currentCustom, 1000, 320, destIdx, twoSystem);
  } else {
    const destIdx = twoSystem ? 1 : 0;
    target = getPlanetCoordsLarge(currentSystem, currentPlanet.id, 1000, 320, destIdx, twoSystem);
  }
  if(!target){ updateOverallStatus('Unable to navigate to target'); return; }

  await animateShipToLarge(target.x, target.y, opts, (p)=> updateOverallStatus(`In transit… ${Math.round(p*100)}%`, p));

  if(currentCustom){
    saveLocation({ system: currentCustom.system, planet: currentCustom.id });
  } else {
    saveLocation({ system: currentSystem.id, planet: currentPlanet.id });
  }
  updateOverallStatus('Arrived', 1);
  setTimeout(()=> updateOverallStatus('Idle'), 900);
  renderMapLarge(currentSystem || catalog.systems[0], currentPlanet, currentCustom);
}

/* Favorites list UI (from pb_favorites) */
function renderFavoritesList(){
  const container = $('favoritesList');
  if(!container) return;
  
  let pbFavorites = [];
  try {
    const raw = localStorage.getItem('pb_favorites') || '[]';
    pbFavorites = JSON.parse(raw);
  } catch(e) {
    pbFavorites = [];
  }
  
  container.innerHTML = '';
  
  if(pbFavorites.length === 0){
    container.innerHTML = '<div class="small-muted" style="padding:8px">No favorites yet. Add favorites from the Mainframe Weather page.</div>';
    return;
  }
  
  // Show most recent favorites first (reverse order, limit to 8)
  pbFavorites.slice().reverse().slice(0,8).forEach(item => {
    const row = document.createElement('div');
    row.className = 'fav-item';
    
    const thumb = document.createElement('div');
    thumb.className = 'fav-thumb';
    if(item.thumbnail){
      const img = document.createElement('img');
      img.src = item.thumbnail;
      img.alt = item.name || (item.planet && item.planet.planetCode) || 'saved';
      thumb.appendChild(img);
    } else {
      thumb.textContent = '🔭';
      thumb.style.fontSize = '18px';
      thumb.style.display = 'flex';
      thumb.style.alignItems = 'center';
      thumb.style.justifyContent = 'center';
      thumb.style.color = 'rgba(191,230,255,0.6)';
    }
    
    const meta = document.createElement('div');
    meta.className = 'fav-meta';
    const title = document.createElement('div');
    title.className = 'fav-title';
    title.textContent = item.name || (item.planet && item.planet.planetCode) || 'Saved Location';
    const sub = document.createElement('div');
    sub.className = 'fav-sub';
    const sys = (item.star && item.star.name) ? item.star.name : (item.planet && item.planet.systemName) || '';
    const pcode = (item.planet && item.planet.planetCode) || '';
    sub.textContent = `${sys} ${pcode}`.trim();
    
    meta.appendChild(title);
    meta.appendChild(sub);
    
    const actions = document.createElement('div');
    actions.className = 'fav-actions';
    
    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.textContent = 'Load';
    loadBtn.title = 'Load into the custom location input';
    loadBtn.addEventListener('click', () => {
      const input = $('customGotoInput');
      if(!input) return;
      input.value = item.name || (item.planet && item.planet.planetCode) || '';
      input.focus();
    });
    
    const goBtn = document.createElement('button');
    goBtn.type = 'button';
    goBtn.className = 'primary';
    goBtn.textContent = 'Go';
    goBtn.title = 'Go to this saved location';
    goBtn.addEventListener('click', async () => {
      const favName = item.name || (item.planet && item.planet.planetCode) || '';
      const parsed = parseDestination(favName);
      if(parsed && parsed.system && parsed.planet){
        renderDetails(parsed.system, parsed.planet);
        currentCustom = null;
        const mode = $('travelModeSelect')?.value || 'regular';
        await travelToCurrent(mode);
      } else if(parsed && parsed.system && !parsed.planet){
        selectSystem(parsed.system);
        currentCustom = null;
        updateOverallStatus(`Opened system ${parsed.system}`);
      } else {
        updateOverallStatus(`Cannot travel to "${favName}" - not found in navigation catalog.`);
      }
    });
    
    actions.appendChild(loadBtn);
    actions.appendChild(goBtn);
    
    row.appendChild(thumb);
    row.appendChild(meta);
    row.appendChild(actions);
    
    container.appendChild(row);
  });
}

/* Recently travelled list UI */
function renderRecentlyTravelled(){
  const container = $('recentlyTravelledList');
  if(!container) return;
  
  const history = loadTravelHistory();
  
  container.innerHTML = '';
  
  if(history.length === 0){
    container.innerHTML = '<div class="small-muted" style="padding:8px">No travel history yet.</div>';
    return;
  }
  
  // Show up to 8 most recent travels
  history.slice(0, 8).forEach(entry => {
    const el = document.createElement('div');
    el.className = 'recent-item';
    
    // Try to find the destination details from catalog
    const sys = catalog.systems.find(s => s.id === entry.system);
    const planet = sys?.planets.find(p => p.id === entry.planet);
    const customs = loadCustoms();
    const custom = customs.find(c => c.id === entry.planet);
    
    const displayName = custom ? custom.name : (planet ? planet.name : entry.planet);
    const systemName = sys ? sys.name : entry.system;
    
    const meta = document.createElement('div');
    meta.className = 'recent-meta';
    
    const name = document.createElement('div');
    name.className = 'recent-name';
    name.textContent = displayName;
    
    const detail = document.createElement('div');
    detail.className = 'recent-detail';
    const timestamp = new Date(entry.timestamp);
    const timeAgo = getTimeAgo(timestamp);
    detail.textContent = `${systemName} • ${timeAgo}`;
    
    meta.appendChild(name);
    meta.appendChild(detail);
    
    const actions = document.createElement('div');
    actions.className = 'recent-actions';
    
    const goBtn = document.createElement('button');
    goBtn.type = 'button';
    goBtn.className = 'primary';
    goBtn.textContent = 'Go';
    goBtn.title = 'Travel to this location';
    goBtn.addEventListener('click', async () => {
      if(custom){
        currentCustom = custom;
        currentPlanet = null;
        currentSystem = sys || currentSystem;
        renderMapLarge(currentSystem, null, currentCustom);
        await travelToCurrent($('travelModeSelect')?.value || 'regular');
      } else if(planet){
        renderDetails(entry.system, entry.planet);
        currentCustom = null;
        await travelToCurrent($('travelModeSelect')?.value || 'regular');
      }
    });
    
    actions.appendChild(goBtn);
    
    el.appendChild(meta);
    el.appendChild(actions);
    
    container.appendChild(el);
  });
}

/* Helper function to format time ago */
function getTimeAgo(date){
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if(seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if(minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if(hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if(days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/* Wrapper function to render both lists */
function renderCustomList(){
  renderFavoritesList();
  renderRecentlyTravelled();
}

/* Creating/updating a custom location (stored separately) */
async function goToTypedDestination(rawInput, useMode = null){
  const raw = (rawInput || '').trim();
  if(!raw) return updateOverallStatus('Type a destination.');
  const parsed = parseDestination(raw);
  if(parsed && parsed.system && parsed.planet){
    renderDetails(parsed.system, parsed.planet);
    currentCustom = null;
    const mode = useMode || ($('travelModeSelect')?.value || 'regular');
    await travelToCurrent(mode);
    return;
  }
  if(parsed && parsed.system && !parsed.planet){
    selectSystem(parsed.system);
    currentCustom = null;
    updateOverallStatus(`Opened system ${parsed.system}`);
    return;
  }

  // create or update a custom location stored separately (won't be added to middle planets)
  const sys = currentSystem || catalog.systems[0];
  if(!sys){ updateOverallStatus('No system available'); return; }
  const existing = loadCustoms().find(c => c.name.toLowerCase() === raw.toLowerCase());
  const id = existing ? existing.id : `custom-${Date.now()}`;
  const maxAU = Math.max(...sys.planets.map(p=>p.orbitalAU));
  const orbital = (maxAU || 1) + 0.6;
  const custom = {
    id,
    name: raw,
    system: sys.id,
    orbitalAU: orbital,
    radiusEarth: 1.2,
    massEarth: 1.0,
    type: 'Waypoint',
    summary: 'Temporary destination saved as custom location'
  };
  addOrUpdateCustom(custom);
  currentCustom = custom;
  currentPlanet = null;
  renderMapLarge(sys, null, currentCustom);
  const mode = useMode || ($('travelModeSelect')?.value || 'regular');
  await travelToCurrent(mode);
}

/* Initialization and event wiring */
function initFromUrl(){
  const params = new URLSearchParams(location.search);
  const system = params.get('system');
  const planet = params.get('planet');
  const customId = params.get('custom');
  if(system){
    renderPlanets(system);
    if(customId){
      const customs = loadCustoms();
      const c = customs.find(x=>x.id===customId);
      if(c){ currentCustom = c; currentPlanet = null; currentSystem = catalog.systems.find(s=>s.id===c.system); renderMapLarge(currentSystem, null, currentCustom); }
    } else if(planet) {
      renderDetails(system, planet);
    } else {
      renderMapLarge(catalog.systems.find(s=>s.id===system), null, null);
    }
  }
}

async function start(){
  await loadCatalog();
  renderSystems();
  renderCustomList();

  // wire events
  $('travelBtn').addEventListener('click', ()=> {
    const mode = $('travelModeSelect')?.value || 'regular';
    travelToCurrent(mode);
  });
  $('customGotoBtn').addEventListener('click', ()=> goToTypedDestination($('customGotoInput')?.value, $('travelModeSelect')?.value));
  $('customGotoInput').addEventListener('keydown', e => { if(e.key === 'Enter') goToTypedDestination($('customGotoInput')?.value, $('travelModeSelect')?.value); });

  // restore last location or URL
  const urlParams = new URLSearchParams(location.search);
  const systemParam = urlParams.get('system');
  const planetParam = urlParams.get('planet');
  const customParam = urlParams.get('custom');
  const last = loadLocation();
  if(systemParam){
    renderPlanets(systemParam);
    if(customParam){
      const customs = loadCustoms();
      const c = customs.find(x=>x.id===customParam);
      if(c){ currentCustom = c; currentPlanet = null; currentSystem = catalog.systems.find(s=>s.id===c.system); renderMapLarge(currentSystem, null, currentCustom); }
    } else if(planetParam){
      renderDetails(systemParam, planetParam);
    } else {
      renderMapLarge(catalog.systems.find(s=>s.id===systemParam), null, null);
    }
  } else if(last){
    const customs = loadCustoms();
    const savedCustom = customs.find(c=>c.id === last.planet);
    if(savedCustom){
      currentCustom = savedCustom;
      currentPlanet = null;
      currentSystem = catalog.systems.find(s=>s.id === savedCustom.system);
      renderPlanets(currentSystem.id);
      renderMapLarge(currentSystem, null, currentCustom);
      $('planetName').textContent = savedCustom.name;
      $('planetSummary').textContent = savedCustom.summary || '';
    } else {
      renderPlanets(last.system);
      renderDetails(last.system, last.planet);
    }
  } else {
    const first = catalog.systems[0];
    if(first) selectSystem(first.id);
  }
  updateOverallStatus('Idle');
}

function escapeHtml(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

start().catch(err=>{
  console.error(err);
  updateOverallStatus('Failed to load catalog: '+err.message);
});