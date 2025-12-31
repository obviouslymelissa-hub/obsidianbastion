// Universal Navigation Console — app.js

// State
let systems = [];
let currentSystem = null;
let currentPlanet = null;
let currentLocation = null; // { systemId, planetId }
let favorites = [];

// Storage keys
const STORAGE = {
  FAVS: 'nav:favs:v1',
  LOC: 'nav:loc:v1'
};

// DOM elements
let els = {};

// Initialize app
async function init() {
  // Cache DOM elements
  els = {
    search: document.getElementById('search'),
    showFavorites: document.getElementById('showFavorites'),
    systemsList: document.getElementById('systemsList'),
    systemTitle: document.getElementById('systemTitle'),
    planetsList: document.getElementById('planetsList'),
    locationBadge: document.getElementById('locationBadge'),
    planetName: document.getElementById('planetName'),
    planetSummary: document.getElementById('planetSummary'),
    planetType: document.getElementById('planetType'),
    planetOrbit: document.getElementById('planetOrbit'),
    planetRadius: document.getElementById('planetRadius'),
    travelBtn: document.getElementById('travelBtn'),
    favBtn: document.getElementById('favBtn'),
    shareBtn: document.getElementById('shareBtn'),
    travelState: document.getElementById('travelState'),
    mapSvg: document.getElementById('mapSvg')
  };

  // Load systems data
  await loadSystems();

  // Load saved state
  loadFavorites();
  loadLocation();

  // Render initial UI
  renderSystems();
  
  // Check for deep link
  const params = new URLSearchParams(window.location.search);
  const systemParam = params.get('system');
  const planetParam = params.get('planet');
  
  if (systemParam) {
    const system = systems.find(s => s.id === systemParam);
    if (system) {
      selectSystem(system);
      if (planetParam) {
        const planet = system.planets.find(p => p.id === planetParam);
        if (planet) {
          selectPlanet(planet);
        }
      }
    }
  } else if (currentLocation) {
    // Restore saved location
    const system = systems.find(s => s.id === currentLocation.systemId);
    if (system) {
      selectSystem(system);
      const planet = system.planets.find(p => p.id === currentLocation.planetId);
      if (planet) {
        selectPlanet(planet);
        // Move ship to saved location immediately (no animation on load)
        moveShipImmediate(planet.x, planet.y);
      }
    }
  }

  // Setup event listeners
  setupEventListeners();
}

// Load systems from JSON
async function loadSystems() {
  try {
    const response = await fetch('systems.json');
    systems = await response.json();
  } catch (error) {
    console.error('Failed to load systems:', error);
    systems = [];
  }
}

// Load favorites from localStorage
function loadFavorites() {
  try {
    const data = localStorage.getItem(STORAGE.FAVS);
    favorites = data ? JSON.parse(data) : [];
  } catch (e) {
    favorites = [];
  }
}

// Save favorites to localStorage
function saveFavorites() {
  try {
    localStorage.setItem(STORAGE.FAVS, JSON.stringify(favorites));
  } catch (e) {
    console.error('Failed to save favorites:', e);
  }
}

// Load location from localStorage
function loadLocation() {
  try {
    const data = localStorage.getItem(STORAGE.LOC);
    currentLocation = data ? JSON.parse(data) : null;
  } catch (e) {
    currentLocation = null;
  }
}

// Save location to localStorage
function saveLocation(systemId, planetId) {
  currentLocation = { systemId, planetId };
  try {
    localStorage.setItem(STORAGE.LOC, JSON.stringify(currentLocation));
  } catch (e) {
    console.error('Failed to save location:', e);
  }
  updateLocationBadge();
}

// Update location badge
function updateLocationBadge() {
  if (currentLocation) {
    const system = systems.find(s => s.id === currentLocation.systemId);
    const planet = system?.planets.find(p => p.id === currentLocation.planetId);
    if (planet) {
      els.locationBadge.innerHTML = `<span class="location-chip">Location: ${system.name} — ${planet.name}</span>`;
      return;
    }
  }
  els.locationBadge.textContent = 'Location: —';
}

// Setup event listeners
function setupEventListeners() {
  els.search.addEventListener('input', handleSearch);
  els.showFavorites.addEventListener('click', handleShowFavorites);
  els.travelBtn.addEventListener('click', handleTravel);
  els.favBtn.addEventListener('click', handleToggleFavorite);
  els.shareBtn.addEventListener('click', handleShare);
}

// Handle search
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  
  if (!query) {
    renderSystems();
    return;
  }

  // Filter systems and planets by search query
  const filtered = systems.map(system => {
    const systemMatch = system.name.toLowerCase().includes(query);
    const matchingPlanets = system.planets.filter(p => 
      p.name.toLowerCase().includes(query)
    );
    
    if (systemMatch || matchingPlanets.length > 0) {
      return {
        ...system,
        planets: systemMatch ? system.planets : matchingPlanets
      };
    }
    return null;
  }).filter(Boolean);

  renderSystems(filtered);
}

// Handle show favorites
function handleShowFavorites() {
  if (favorites.length === 0) {
    alert('No favorites yet. Click the star icon to add favorites.');
    return;
  }

  // Show systems that have favorited planets
  const favSystems = [];
  favorites.forEach(fav => {
    const system = systems.find(s => s.id === fav.systemId);
    if (system) {
      const planet = system.planets.find(p => p.id === fav.planetId);
      if (planet) {
        let favSystem = favSystems.find(s => s.id === system.id);
        if (!favSystem) {
          favSystem = { ...system, planets: [] };
          favSystems.push(favSystem);
        }
        if (!favSystem.planets.find(p => p.id === planet.id)) {
          favSystem.planets.push(planet);
        }
      }
    }
  });

  renderSystems(favSystems);
}

// Render systems list
function renderSystems(systemsToRender = systems) {
  els.systemsList.innerHTML = '';
  
  if (systemsToRender.length === 0) {
    els.systemsList.innerHTML = '<div class="muted">No systems found</div>';
    return;
  }

  systemsToRender.forEach(system => {
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div>
        <div style="font-weight:600">${system.name}</div>
        <div style="font-size:12px;color:var(--muted)">${system.star} • ${system.planets.length} planets</div>
      </div>
    `;
    item.addEventListener('click', () => selectSystem(system));
    els.systemsList.appendChild(item);
  });
}

// Select a system
function selectSystem(system) {
  currentSystem = system;
  currentPlanet = null;
  
  els.systemTitle.textContent = system.name;
  renderPlanets(system.planets);
  renderMap(system);
  clearDetails();
}

// Render planets list
function renderPlanets(planets) {
  els.planetsList.innerHTML = '';
  
  if (planets.length === 0) {
    els.planetsList.innerHTML = '<div class="muted">No planets in this system</div>';
    return;
  }

  planets.forEach(planet => {
    const isFav = isFavorite(currentSystem.id, planet.id);
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div>
        <div style="font-weight:600">${planet.name} ${isFav ? '⭐' : ''}</div>
        <div style="font-size:12px;color:var(--muted)">${planet.type} • ${planet.orbit}</div>
      </div>
    `;
    item.addEventListener('click', () => selectPlanet(planet));
    els.planetsList.appendChild(item);
  });
}

// Select a planet
function selectPlanet(planet) {
  currentPlanet = planet;
  
  // Update details
  els.planetName.textContent = planet.name;
  els.planetSummary.textContent = planet.summary;
  els.planetType.textContent = planet.type;
  els.planetOrbit.textContent = planet.orbit;
  els.planetRadius.textContent = planet.radius;
  
  // Update favorite button
  updateFavoriteButton();
  
  // Update URL
  updateDeepLink();
}

// Clear details panel
function clearDetails() {
  els.planetName.textContent = '—';
  els.planetSummary.textContent = '—';
  els.planetType.textContent = '—';
  els.planetOrbit.textContent = '—';
  els.planetRadius.textContent = '—';
}

// Render map with star and planets
function renderMap(system) {
  els.mapSvg.innerHTML = '';
  
  // Create star in the center-left
  const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  star.setAttribute('cx', '80');
  star.setAttribute('cy', '80');
  star.setAttribute('r', '20');
  star.setAttribute('fill', '#FFD700');
  star.setAttribute('filter', 'drop-shadow(0 0 10px rgba(255,215,0,0.8))');
  els.mapSvg.appendChild(star);
  
  // Create star label
  const starLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  starLabel.setAttribute('x', '80');
  starLabel.setAttribute('y', '120');
  starLabel.setAttribute('text-anchor', 'middle');
  starLabel.setAttribute('fill', '#bfe6ff');
  starLabel.setAttribute('font-size', '12');
  starLabel.textContent = system.name;
  els.mapSvg.appendChild(starLabel);
  
  // Create planets
  system.planets.forEach(planet => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', planet.x);
    circle.setAttribute('cy', planet.y);
    circle.setAttribute('r', '8');
    circle.setAttribute('fill', '#6ee7b7');
    circle.setAttribute('data-id', planet.id);
    circle.style.cursor = 'pointer';
    els.mapSvg.appendChild(circle);
    
    // Planet label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', planet.x);
    label.setAttribute('y', planet.y - 15);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', '#bfe6ff');
    label.setAttribute('font-size', '11');
    label.textContent = planet.name;
    els.mapSvg.appendChild(label);
  });
  
  // Create or update ship
  let ship = els.mapSvg.querySelector('#ship');
  if (!ship) {
    ship = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    ship.setAttribute('id', 'ship');
    ship.setAttribute('points', '0,-10 -6,6 0,3 6,6');
    ship.setAttribute('fill', '#ff6b6b');
    ship.setAttribute('class', 'ship');
    els.mapSvg.appendChild(ship);
  }
  
  // Position ship at current location if in this system
  if (currentLocation && currentLocation.systemId === system.id) {
    const locPlanet = system.planets.find(p => p.id === currentLocation.planetId);
    if (locPlanet) {
      ship.setAttribute('transform', `translate(${locPlanet.x}, ${locPlanet.y})`);
    }
  } else {
    // Default position at star
    ship.setAttribute('transform', 'translate(80, 80)');
  }
}

// Move ship immediately (no animation) - used on page load
function moveShipImmediate(x, y) {
  const ship = els.mapSvg.querySelector('#ship');
  if (ship) {
    ship.setAttribute('transform', `translate(${x}, ${y})`);
  }
}

// Handle travel button
async function handleTravel() {
  if (!currentSystem || !currentPlanet) {
    alert('Please select a planet to travel to');
    return;
  }

  // Get ship current position
  const ship = els.mapSvg.querySelector('#ship');
  if (!ship) return;
  
  const transform = ship.getAttribute('transform') || 'translate(80, 80)';
  const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
  const startX = match ? parseFloat(match[1]) : 80;
  const startY = match ? parseFloat(match[2]) : 80;
  
  const targetX = currentPlanet.x;
  const targetY = currentPlanet.y;
  
  // Check if already at destination
  if (Math.abs(startX - targetX) < 1 && Math.abs(startY - targetY) < 1) {
    els.travelState.textContent = 'Already at destination';
    return;
  }
  
  // Disable travel button during animation
  els.travelBtn.disabled = true;
  els.travelState.textContent = 'Traveling...';
  ship.classList.add('warp');
  
  // Animate ship
  await animateShip(startX, startY, targetX, targetY);
  
  // Animation complete
  ship.classList.remove('warp');
  els.travelBtn.disabled = false;
  els.travelState.textContent = 'Arrived';
  
  // Save new location
  saveLocation(currentSystem.id, currentPlanet.id);
  
  // Update planets list to refresh favorite icons
  renderPlanets(currentSystem.planets);
}

// Animate ship with easing
function animateShip(startX, startY, targetX, targetY) {
  return new Promise(resolve => {
    const ship = els.mapSvg.querySelector('#ship');
    const duration = 1000; // 1 second
    const startTime = performance.now();
    
    function easeInOutCubic(t) {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);
      
      const x = startX + (targetX - startX) * easedProgress;
      const y = startY + (targetY - startY) * easedProgress;
      
      ship.setAttribute('transform', `translate(${x}, ${y})`);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    requestAnimationFrame(animate);
  });
}

// Handle toggle favorite
function handleToggleFavorite() {
  if (!currentSystem || !currentPlanet) {
    alert('Please select a planet to favorite');
    return;
  }

  const favKey = { systemId: currentSystem.id, planetId: currentPlanet.id };
  const index = favorites.findIndex(f => 
    f.systemId === favKey.systemId && f.planetId === favKey.planetId
  );

  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.push(favKey);
  }

  saveFavorites();
  updateFavoriteButton();
  renderPlanets(currentSystem.planets);
}

// Check if planet is favorite
function isFavorite(systemId, planetId) {
  return favorites.some(f => f.systemId === systemId && f.planetId === planetId);
}

// Update favorite button
function updateFavoriteButton() {
  if (!currentSystem || !currentPlanet) return;
  
  const isFav = isFavorite(currentSystem.id, currentPlanet.id);
  els.favBtn.textContent = isFav ? '★ Favorite' : '☆ Favorite';
}

// Handle share
function handleShare() {
  if (!currentSystem || !currentPlanet) {
    alert('Please select a planet to share');
    return;
  }

  const url = `${window.location.origin}${window.location.pathname}?system=${currentSystem.id}&planet=${currentPlanet.id}`;
  
  navigator.clipboard.writeText(url).then(() => {
    alert('Link copied to clipboard!');
  }).catch(() => {
    // Fallback: show the URL
    prompt('Copy this link:', url);
  });
}

// Update deep link (URL)
function updateDeepLink() {
  if (!currentSystem || !currentPlanet) return;
  
  const url = new URL(window.location);
  url.searchParams.set('system', currentSystem.id);
  url.searchParams.set('planet', currentPlanet.id);
  window.history.replaceState({}, '', url);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
