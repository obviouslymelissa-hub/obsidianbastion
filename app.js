// Universal Navigation SPA
// Static-only app: works from file:// and hosted environments
// Features: custom locations, deep-linking, travel animation, persistent state

(function() {
  'use strict';

  // ======== Storage Keys ========
  const STORAGE = {
    LOCATION: 'nav:loc:v1',
    CUSTOMS: 'nav:customs_v1'
  };

  // ======== State ========
  let systemsData = null;
  let currentLocation = null;
  let selectedDestination = null;
  let customLocations = [];
  let travelState = null; // { mode, startTime, duration, from, to, phase }

  // ======== DOM Elements ========
  let elements = {};

  // ======== Initialization ========
  function init() {
    cacheElements();
    loadSystemsData();
    loadCustomLocations();
    loadLastLocation();
    parseUrlParams();
    wireEventHandlers();
    render();
  }

  function cacheElements() {
    elements = {
      systemsList: document.getElementById('systemsList'),
      planetsList: document.getElementById('planetsList'),
      customsList: document.getElementById('customsList'),
      addCustomBtn: document.getElementById('addCustomBtn'),
      currentLocationName: document.getElementById('currentLocationName'),
      currentLocationCoords: document.getElementById('currentLocationCoords'),
      destinationName: document.getElementById('destinationName'),
      destinationCoords: document.getElementById('destinationCoords'),
      travelRegular: document.getElementById('travelRegular'),
      travelWarp: document.getElementById('travelWarp'),
      travelHyperwarp: document.getElementById('travelHyperwarp'),
      statusBanner: document.getElementById('statusBanner'),
      statusText: document.getElementById('statusText'),
      statusProgress: document.getElementById('statusProgress'),
      mapSvgLarge: document.getElementById('mapSvgLarge'),
      searchInput: document.getElementById('search')
    };
  }

  // ======== Data Loading ========
  function loadSystemsData() {
    // Try to fetch systems.json; if fails (file://), use embedded fallback
    fetch('./systems.json')
      .then(r => r.json())
      .then(data => {
        systemsData = data;
        render();
      })
      .catch(() => {
        // Fallback for file:// - embedded catalog
        systemsData = {
          systems: [
            {
              id: "Sol",
              name: "Sol",
              coords: [100, 80],
              star: { name: "Sun (G2V)", class: "G", luminosityFactor: 1 },
              planets: [
                { id: "Sol-01b", name: "Mercury", index: 1, orbitalAU: 0.39, radiusEarth: 0.383, massEarth: 0.055, type: "Terrestrial", summary: "Small, cratered rocky world." },
                { id: "Sol-03b", name: "Earth", index: 3, orbitalAU: 1.00, radiusEarth: 1.00, massEarth: 1.00, type: "Terrestrial", summary: "Blue planet with abundant life." },
                { id: "Sol-04b", name: "Mars", index: 4, orbitalAU: 1.52, radiusEarth: 0.53, massEarth: 0.107, type: "Terrestrial", summary: "Red dusty world with polar caps." }
              ]
            },
            {
              id: "Kepler-452",
              name: "Kepler-452",
              coords: [420, 80],
              star: { name: "Kepler-452", class: "G", luminosityFactor: 1.15 },
              planets: [
                { id: "Kepler-452-01b", name: "Kepler-452b", index: 1, orbitalAU: 1.05, radiusEarth: 1.6, massEarth: 5.0, type: "Super-Earth", summary: "Potentially habitable super-Earth." }
              ]
            }
          ]
        };
        render();
      });
  }

  function loadCustomLocations() {
    try {
      const raw = localStorage.getItem(STORAGE.CUSTOMS);
      customLocations = raw ? JSON.parse(raw) : [];
    } catch (e) {
      customLocations = [];
    }
  }

  function saveCustomLocations() {
    try {
      localStorage.setItem(STORAGE.CUSTOMS, JSON.stringify(customLocations));
    } catch (e) {
      console.error('Failed to save custom locations', e);
    }
  }

  function loadLastLocation() {
    try {
      const raw = localStorage.getItem(STORAGE.LOCATION);
      if (raw) {
        currentLocation = JSON.parse(raw);
      } else {
        // Default to Earth
        currentLocation = { type: 'planet', systemId: 'Sol', planetId: 'Sol-03b', name: 'Earth' };
      }
    } catch (e) {
      currentLocation = { type: 'planet', systemId: 'Sol', planetId: 'Sol-03b', name: 'Earth' };
    }
  }

  function saveLastLocation() {
    try {
      localStorage.setItem(STORAGE.LOCATION, JSON.stringify(currentLocation));
    } catch (e) {
      console.error('Failed to save location', e);
    }
  }

  // ======== URL Deep-linking ========
  function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const system = params.get('system');
    const planet = params.get('planet');
    const custom = params.get('custom');

    if (system && planet && systemsData) {
      const sys = systemsData.systems.find(s => s.id === system);
      if (sys) {
        const p = sys.planets.find(pl => pl.id === planet);
        if (p) {
          selectDestination({ type: 'planet', systemId: system, planetId: planet, name: p.name });
        }
      }
    } else if (system && custom) {
      const customLoc = customLocations.find(c => c.id === custom);
      if (customLoc) {
        selectDestination({ type: 'custom', id: custom, name: customLoc.name, coords: customLoc.coords });
      }
    }
  }

  function updateUrl(dest) {
    if (!dest) return;
    const params = new URLSearchParams();
    if (dest.type === 'planet') {
      params.set('system', dest.systemId);
      params.set('planet', dest.planetId);
    } else if (dest.type === 'custom') {
      params.set('system', 'custom');
      params.set('custom', dest.id);
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  // ======== Event Handlers ========
  function wireEventHandlers() {
    elements.addCustomBtn?.addEventListener('click', addCustomLocation);
    elements.travelRegular?.addEventListener('click', () => startTravel('regular'));
    elements.travelWarp?.addEventListener('click', () => startTravel('warp'));
    elements.travelHyperwarp?.addEventListener('click', () => startTravel('hyperwarp'));
    elements.searchInput?.addEventListener('input', handleSearch);
  }

  function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    renderPlanetsList(query);
  }

  // ======== Rendering ========
  function render() {
    renderSystemsList();
    renderPlanetsList();
    renderCustomsList();
    renderCurrentLocation();
    renderDestination();
    renderMap();
    updateTravelButtons();
  }

  function renderSystemsList() {
    if (!systemsData || !elements.systemsList) return;
    elements.systemsList.innerHTML = '';
    systemsData.systems.forEach(sys => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `<span>${sys.name}</span><span class="small-muted">${sys.planets.length} planets</span>`;
      div.addEventListener('click', () => selectSystem(sys.id));
      elements.systemsList.appendChild(div);
    });
  }

  function renderPlanetsList(query = '') {
    if (!systemsData || !elements.planetsList) return;
    elements.planetsList.innerHTML = '';
    systemsData.systems.forEach(sys => {
      sys.planets.forEach(p => {
        if (query && !p.name.toLowerCase().includes(query) && !sys.name.toLowerCase().includes(query)) return;
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `<div><div>${p.name}</div><div class="small-muted">${sys.name} • ${p.type}</div></div>`;
        div.addEventListener('click', () => selectDestination({ type: 'planet', systemId: sys.id, planetId: p.id, name: p.name }));
        elements.planetsList.appendChild(div);
      });
    });
  }

  function renderCustomsList() {
    if (!elements.customsList) return;
    elements.customsList.innerHTML = '';
    if (customLocations.length === 0) {
      elements.customsList.innerHTML = '<div class="muted">No custom locations yet. Click "Add Custom Location" to create one.</div>';
      return;
    }
    customLocations.forEach(loc => {
      const div = document.createElement('div');
      div.className = 'custom-item';
      div.innerHTML = `
        <div class="left">
          <span>${loc.name}</span>
          <span class="small-muted">${loc.coords[0]}, ${loc.coords[1]}</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button data-select="${loc.id}">Go</button>
          <button data-delete="${loc.id}">Delete</button>
        </div>
      `;
      div.querySelector(`[data-select="${loc.id}"]`).addEventListener('click', () => {
        selectDestination({ type: 'custom', id: loc.id, name: loc.name, coords: loc.coords });
      });
      div.querySelector(`[data-delete="${loc.id}"]`).addEventListener('click', () => deleteCustomLocation(loc.id));
      elements.customsList.appendChild(div);
    });
  }

  function renderCurrentLocation() {
    if (!elements.currentLocationName) return;
    if (currentLocation) {
      elements.currentLocationName.textContent = currentLocation.name;
      const coords = getLocationCoords(currentLocation);
      elements.currentLocationCoords.textContent = coords ? `[${coords[0]}, ${coords[1]}]` : '—';
    } else {
      elements.currentLocationName.textContent = '—';
      elements.currentLocationCoords.textContent = '—';
    }
  }

  function renderDestination() {
    if (!elements.destinationName) return;
    if (selectedDestination) {
      elements.destinationName.textContent = selectedDestination.name;
      const coords = getLocationCoords(selectedDestination);
      elements.destinationCoords.textContent = coords ? `[${coords[0]}, ${coords[1]}]` : '—';
    } else {
      elements.destinationName.textContent = '—';
      elements.destinationCoords.textContent = '—';
    }
  }

  function getLocationCoords(loc) {
    if (!loc) return null;
    if (loc.type === 'custom') return loc.coords;
    if (loc.type === 'planet' && systemsData) {
      const sys = systemsData.systems.find(s => s.id === loc.systemId);
      if (sys) return sys.coords;
    }
    return null;
  }

  // ======== Map Rendering ========
  function renderMap() {
    if (!elements.mapSvgLarge || !systemsData) return;

    // Determine if we're in minimal mode (custom location involved)
    const minimalMode = (currentLocation && currentLocation.type === 'custom') || 
                        (selectedDestination && selectedDestination.type === 'custom');

    // Clear existing content
    while (elements.mapSvgLarge.firstChild) {
      elements.mapSvgLarge.removeChild(elements.mapSvgLarge.firstChild);
    }
    
    const svg = elements.mapSvgLarge;
    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 320;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', width);
    bg.setAttribute('height', height);
    bg.setAttribute('fill', '#041427');
    svg.appendChild(bg);

    if (minimalMode) {
      // Minimal mode: show only origin and destination
      renderMinimalMap(svg, width, height);
    } else {
      // Full mode: show all systems
      renderFullMap(svg, width, height);
    }

    // Render ship
    renderShip(svg);
  }

  function renderFullMap(svg, width, height) {
    // Render all systems and their stars
    systemsData.systems.forEach(sys => {
      const [x, y] = sys.coords;
      
      // Draw star
      const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      star.setAttribute('cx', x);
      star.setAttribute('cy', y);
      star.setAttribute('r', 8);
      star.classList.add('star');
      svg.appendChild(star);

      // Draw label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', y - 15);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#e6eef8');
      label.setAttribute('font-size', '12');
      label.textContent = sys.name;
      svg.appendChild(label);

      // Draw planets around star
      sys.planets.forEach((planet, idx) => {
        const angle = (idx / sys.planets.length) * Math.PI * 2;
        const radius = 20 + idx * 8;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;

        const planetCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        planetCircle.setAttribute('cx', px);
        planetCircle.setAttribute('cy', py);
        planetCircle.setAttribute('r', 4);
        planetCircle.setAttribute('fill', getPlanetColor(planet.type));
        planetCircle.classList.add('planet');
        
        // Highlight if selected destination
        if (selectedDestination && selectedDestination.type === 'planet' && selectedDestination.planetId === planet.id) {
          planetCircle.classList.add('selected-planet');
        }

        planetCircle.addEventListener('click', () => {
          selectDestination({ type: 'planet', systemId: sys.id, planetId: planet.id, name: planet.name });
        });

        svg.appendChild(planetCircle);
      });
    });

    // Mark current location
    if (currentLocation && currentLocation.type === 'planet') {
      const coords = getLocationCoords(currentLocation);
      if (coords) {
        renderYouHereLabel(svg, coords[0], coords[1]);
      }
    }

    // Mark destination
    if (selectedDestination && selectedDestination.type === 'planet') {
      const coords = getLocationCoords(selectedDestination);
      if (coords) {
        renderDestinationMarker(svg, coords[0], coords[1]);
      }
    }
  }

  function renderMinimalMap(svg, width, height) {
    // Show only origin and destination
    const origin = getLocationCoords(currentLocation);
    const dest = selectedDestination ? getLocationCoords(selectedDestination) : null;

    if (origin) {
      // Origin marker
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', origin[0]);
      circle.setAttribute('cy', origin[1]);
      circle.setAttribute('r', 10);
      circle.setAttribute('fill', '#6ee7b7');
      svg.appendChild(circle);

      renderYouHereLabel(svg, origin[0], origin[1]);
    }

    if (dest) {
      // Destination marker
      renderDestinationMarker(svg, dest[0], dest[1]);
    }
  }

  function renderYouHereLabel(svg, x, y) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('you-here-label');

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x - 30);
    rect.setAttribute('y', y - 30);
    rect.setAttribute('width', 60);
    rect.setAttribute('height', 18);
    rect.setAttribute('rx', 4);
    g.appendChild(rect);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y - 17);
    text.setAttribute('text-anchor', 'middle');
    text.textContent = 'YOU HERE';
    g.appendChild(text);

    svg.appendChild(g);
  }

  function renderDestinationMarker(svg, x, y) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('destination-group');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', 8);
    circle.classList.add('destination');
    g.appendChild(circle);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y + 20);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#ffdf9b');
    text.setAttribute('font-size', '11');
    text.textContent = 'DESTINATION';
    g.appendChild(text);

    svg.appendChild(g);
  }

  function renderShip(svg) {
    if (!currentLocation) return;

    const coords = travelState ? getIntermediateShipPosition() : getLocationCoords(currentLocation);
    if (!coords) return;

    const [x, y] = coords;

    // Remove existing ship if present
    const existingShip = svg.querySelector('#shipGroup');
    if (existingShip) existingShip.remove();

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('ship');
    g.id = 'shipGroup';

    // Ship tail (triangle pointing back)
    const tail = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    tail.setAttribute('points', `${x},${y-8} ${x-6},${y+4} ${x+6},${y+4}`);
    tail.classList.add('ship-tail');
    g.appendChild(tail);

    // Ship core (circle)
    const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    core.setAttribute('cx', x);
    core.setAttribute('cy', y);
    core.setAttribute('r', 5);
    core.classList.add('ship-core');
    g.appendChild(core);

    svg.appendChild(g);
  }

  function getPlanetColor(type) {
    const colors = {
      'Terrestrial': '#8b7355',
      'Super-Earth': '#6b8e8f',
      'Sub-Neptune': '#7fa8da',
      'Gas Giant': '#daa67f',
      'Ice World': '#b0d4f1',
      'Ocean World': '#5a9bd5'
    };
    return colors[type] || '#888';
  }

  // ======== Actions ========
  function selectSystem(systemId) {
    // Just update the planets list filter - could expand this
    renderPlanetsList();
  }

  function selectDestination(dest) {
    selectedDestination = dest;
    updateUrl(dest);
    renderDestination();
    renderMap();
    updateTravelButtons();
  }

  function addCustomLocation() {
    const name = prompt('Enter custom location name:');
    if (!name) return;

    const x = parseFloat(prompt('Enter X coordinate (0-800):', '250'));
    const y = parseFloat(prompt('Enter Y coordinate (0-320):', '150'));

    if (isNaN(x) || isNaN(y)) {
      alert('Invalid coordinates');
      return;
    }

    const id = 'custom-' + Date.now();
    const custom = { id, name, coords: [x, y] };
    customLocations.push(custom);
    saveCustomLocations();
    renderCustomsList();
  }

  function deleteCustomLocation(id) {
    if (!confirm('Delete this custom location?')) return;
    customLocations = customLocations.filter(c => c.id !== id);
    saveCustomLocations();
    renderCustomsList();
  }

  function updateTravelButtons() {
    const canTravel = selectedDestination && currentLocation && 
                      (selectedDestination.type !== currentLocation.type || 
                       selectedDestination.planetId !== currentLocation.planetId ||
                       selectedDestination.id !== currentLocation.id);
    
    if (elements.travelRegular) elements.travelRegular.disabled = !canTravel;
    if (elements.travelWarp) elements.travelWarp.disabled = !canTravel;
    if (elements.travelHyperwarp) elements.travelHyperwarp.disabled = !canTravel;
  }

  // ======== Travel System ========
  function startTravel(mode) {
    if (!selectedDestination || !currentLocation) return;

    const durations = { regular: 8000, warp: 4000, hyperwarp: 2000 };
    const duration = durations[mode] || 8000;

    travelState = {
      mode,
      startTime: Date.now(),
      duration,
      from: currentLocation,
      to: selectedDestination,
      phase: 'approach' // approach -> final
    };

    showStatusBanner(`Traveling to ${selectedDestination.name} (${mode})...`, 0);
    
    // Add warp effect
    if (mode === 'warp' || mode === 'hyperwarp') {
      const svg = elements.mapSvgLarge;
      svg.classList.add(mode === 'hyperwarp' ? 'warp-strong' : 'warp');
      setTimeout(() => {
        svg.classList.remove('warp', 'warp-strong');
      }, mode === 'hyperwarp' ? 650 : 900);
    }

    animateTravel();
  }

  function animateTravel() {
    if (!travelState) return;

    const elapsed = Date.now() - travelState.startTime;
    const progress = Math.min(elapsed / travelState.duration, 1);

    // Two-stage animation
    let stageProgress = progress;
    if (progress < 0.7) {
      // Approach phase
      travelState.phase = 'approach';
      stageProgress = progress / 0.7;
    } else {
      // Final phase
      travelState.phase = 'final';
      stageProgress = (progress - 0.7) / 0.3;
    }

    showStatusBanner(`Traveling to ${travelState.to.name} (${travelState.mode})...`, progress * 100);
    renderMap();

    if (progress >= 1) {
      completeTravel();
    } else {
      requestAnimationFrame(animateTravel);
    }
  }

  function getIntermediateShipPosition() {
    if (!travelState) return getLocationCoords(currentLocation);

    const from = getLocationCoords(travelState.from);
    const to = getLocationCoords(travelState.to);
    if (!from || !to) return from;

    const elapsed = Date.now() - travelState.startTime;
    let progress = Math.min(elapsed / travelState.duration, 1);

    // Ease-in-out
    progress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const x = from[0] + (to[0] - from[0]) * progress;
    const y = from[1] + (to[1] - from[1]) * progress;

    return [x, y];
  }

  function completeTravel() {
    if (!travelState) return;

    // Flash effect
    elements.mapSvgLarge.classList.add('flash');
    setTimeout(() => {
      elements.mapSvgLarge.classList.remove('flash');
    }, 260);

    currentLocation = travelState.to;
    selectedDestination = null;
    travelState = null;

    saveLastLocation();
    hideStatusBanner();
    render();
  }

  function showStatusBanner(text, progress) {
    if (!elements.statusBanner) return;
    elements.statusBanner.style.display = 'flex';
    if (elements.statusText) elements.statusText.textContent = text;
    if (elements.statusProgress) {
      const bar = elements.statusProgress.querySelector('i');
      if (bar) bar.style.width = `${progress}%`;
    }
  }

  function hideStatusBanner() {
    if (elements.statusBanner) {
      elements.statusBanner.style.display = 'none';
    }
  }

  // ======== Start ========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
