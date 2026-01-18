/* Fun Mode for drones.html
   - overlay particle system
   - sound effects
   - collectible pickups that give short boosts
   - toggled with a button inserted into the page

   Drop into your site and include it after drones.html's main script.
*/
(function(){
  if(window._funModeInstalled) return;
  window._funModeInstalled = true;

  // Helpers
  const $ = (sel, root=document) => root.querySelector(sel);
  const mapCanvas = $('#mapCanvas');
  if(!mapCanvas) return;
  const mapWrap = mapCanvas.parentElement;
  const logEl = $('#log');
  const droneConsole = window.droneConsole;
  const dronesState = () => (window._drones && window._drones.state) ? window._drones.state() : [];
  const getDroneObj = (id) => (droneConsole && droneConsole.getStatus) ? droneConsole.getStatus(id) : null;

  // create overlay canvas
  const overlay = document.createElement('canvas');
  overlay.id = 'funOverlay';
  overlay.style.position = 'absolute';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = 999;
  overlay.width = mapCanvas.clientWidth;
  overlay.height = mapCanvas.clientHeight;
  mapWrap.style.position = mapWrap.style.position || 'relative';
  // position overlay to match mapCanvas
  mapWrap.appendChild(overlay);
  const octx = overlay.getContext('2d');

  function resizeOverlay(){
    const rect = mapCanvas.getBoundingClientRect();
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.width = Math.max(320, Math.round(rect.width * (window.devicePixelRatio||1)));
    overlay.height = Math.max(240, Math.round(rect.height * (window.devicePixelRatio||1)));
    octx.setTransform(window.devicePixelRatio||1,0,0,window.devicePixelRatio||1,0,0);
  }
  window.addEventListener('resize', resizeOverlay);
  resizeOverlay();

  // simple audio assets (dataURIs or placeholder -> replace with your own files)
  const audio = {
    launch: new Audio('data:audio/ogg;base64,T2dnUwACAAAAAAAAAAB...'), // placeholder (silent)
    land: new Audio('data:audio/ogg;base64,T2dnUwACAAAAAAAAAAB...'),
    ping: new Audio('data:audio/ogg;base64,T2dnUwACAAAAAAAAAAB...'),
    pickup: new Audio('data:audio/ogg;base64,T2dnUwACAAAAAAAAAAB...')
  };
  // volume setup
  Object.values(audio).forEach(a => { try { a.volume = 0.35; } catch(e){} });

  // small particle system
  const particles = [];
  function spawnParticles(x,y, color='#ffd47a', count=18, spread=2){
    for(let i=0;i<count;i++){
      particles.push({
        x, y,
        vx: (Math.random()-0.5) * spread,
        vy: (Math.random()-0.9) * spread * 0.6,
        life: 600 + Math.random()*700,
        size: 2 + Math.random()*4,
        color
      });
    }
  }

  // confetti (bigger, rectangular)
  const confetti = [];
  function spawnConfetti(x,y,count=32){
    for(let i=0;i<count;i++){
      confetti.push({
        x,y,
        vx: (Math.random()-0.5) * 4,
        vy: -2 - Math.random()*4,
        life: 1000 + Math.random()*1200,
        w: 6 + Math.random()*8,
        h: 4 + Math.random()*6,
        color: ['#ff7a7a','#ffd47a','#9be7c6','#7ac6ff'][Math.floor(Math.random()*4)],
        rot: Math.random()*Math.PI*2,
        rotSpeed: (Math.random()-0.5)*0.2
      });
    }
  }

  // pickups
  const pickups = [];
  function spawnPickup(){
    const rect = mapCanvas.getBoundingClientRect();
    const x = 40 + Math.random()*(rect.width-80);
    const y = 40 + Math.random()*(rect.height-80);
    pickups.push({
      id: 'p-'+Math.random().toString(36).slice(2,8),
      x, y, radius: 12,
      type: Math.random() < 0.6 ? 'boost' : 'battery',
      ttl: 18000
    });
  }
  let pickupSpawnTimer = setInterval(spawnPickup, 11000);
  // start with a couple
  spawnPickup(); spawnPickup();

  // toggle UI button
  function insertFunButton(){
    const controlsRow = document.querySelector('.controls-row');
    if(!controlsRow) return;
    const btn = document.createElement('button');
    btn.id = 'btnFunMode';
    btn.className = 'btn small';
    btn.textContent = 'Enable Fun Mode';
    let enabled = false;
    btn.addEventListener('click', () => {
      enabled = !enabled;
      btn.textContent = enabled ? 'Fun Mode: ON' : 'Enable Fun Mode';
      overlay.style.display = enabled ? 'block' : 'none';
      if(enabled) {
        spawnConfetti(overlay.width/2, overlay.height/4, 24);
        play('ping');
      }
      // store setting
      localStorage.setItem('funModeEnabled',''+enabled);
    });
    // insert before other control buttons so it's visible
    controlsRow.insertBefore(btn, controlsRow.firstChild);
    // restore
    const saved = localStorage.getItem('funModeEnabled');
    if(saved === 'true') btn.click();
  }
  insertFunButton();

  // small wrapper to play a sound defensively
  function play(name){
    try{
      const a = audio[name];
      if(!a) return;
      const clone = a.cloneNode(true);
      clone.volume = a.volume;
      clone.play().catch(()=>{ /* muted or auto-play blocked */ });
    }catch(e){}
  }

  // wrap certain droneConsole functions to add effects
  if(window.droneConsole){
    // launch
    const origLaunch = window.droneConsole.launchDrone;
    if(origLaunch){
      window.droneConsole.launchDrone = function(id){
        const ret = origLaunch(id);
        // try play and spawn
        const d = getDroneObj(id);
        if(d) {
          const rect = mapCanvas.getBoundingClientRect();
          spawnParticles(d.x, d.y, '#7ac6ff', 26, 3);
          play('launch');
        }
        return ret;
      };
    }
    // land
    const origLand = window.droneConsole.landDrone;
    if(origLand){
      window.droneConsole.landDrone = function(id){
        const ret = origLand(id);
        const d = getDroneObj(id);
        if(d){
          spawnParticles(d.x, d.y, '#9be7c6', 18, 2);
          play('land');
        }
        return ret;
      };
    }
    // goToCoords: spawn a ping
    const origGoto = window.droneConsole.goToCoords;
    if(origGoto){
      window.droneConsole.goToCoords = function(id, x, y, opts){
        const ret = origGoto(id, x, y, opts);
        const d = getDroneObj(id);
        if(d){
          spawnParticles(d.x, d.y, '#ffd47a', 10, 2);
          play('ping');
        }
        return ret;
      };
    }
  }

  // pickup collision & effect
  function applyPickupToDrone(pick, drone){
    // get live object (not the copy)
    const d = getDroneObj(drone.id);
    if(!d) return;
    if(pick.type === 'boost'){
      // tiny impulse in direction the drone already moves (or random)
      d.vx += (Math.random()-0.5) * 3;
      d.vy += (Math.random()-0.5) * 3;
      // short visual marker
      d._funBoostUntil = Date.now() + 1800;
      if(logEl) {
        const ts = new Date().toLocaleTimeString();
        logEl.textContent = (logEl.textContent==='No activity' ? '' : logEl.textContent + '\n') + `[${ts}] ${d.name} grabbed SPEED BOOST!`;
        logEl.scrollTop = logEl.scrollHeight;
      }
      play('pickup');
      spawnParticles(pick.x, pick.y, '#ffb482', 22, 2);
    } else if(pick.type === 'battery'){
      d.battery = Math.min(100, (d.battery || 10) + 18 + Math.random()*14);
      if(logEl) {
        const ts = new Date().toLocaleTimeString();
        logEl.textContent = (logEl.textContent==='No activity' ? '' : logEl.textContent + '\n') + `[${ts}] ${d.name} recharged battery`;
        logEl.scrollTop = logEl.scrollHeight;
      }
      play('pickup');
      spawnParticles(pick.x, pick.y, '#9be7c6', 18, 2);
    }
  }

  // short-lived "glow" indicator for boosted drones in overlay
  const glowCache = {};

  // animation loop for overlay elements
  let last = performance.now();
  function overlayLoop(ts){
    const dt = ts - last; last = ts;
    octx.clearRect(0,0,overlay.width,overlay.height);

    // update drones positions from public state
    const ds = dronesState();
    // draw pickups
    for(let i = pickups.length-1; i >= 0; --i){
      const p = pickups[i];
      p.ttl -= dt;
      if(p.ttl <= 0){ pickups.splice(i,1); continue; }
      // pulsing
      const pulse = 1 + Math.sin(Date.now()/250 + i)*0.12;
      octx.beginPath();
      octx.fillStyle = p.type === 'boost' ? 'rgba(255,186,130,0.95)' : 'rgba(155,231,198,0.95)';
      octx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI*2);
      octx.fill();
      octx.strokeStyle = 'rgba(255,255,255,0.08)';
      octx.lineWidth = 1;
      octx.stroke();

      // collision detection with drones
      for(const dcopy of ds){
        const dLive = getDroneObj(dcopy.id);
        if(!dLive) continue;
        const dx = dLive.x - p.x;
        const dy = dLive.y - p.y;
        if(Math.hypot(dx,dy) < p.radius + 10){
          // collect
          applyPickupToDrone(p, dcopy);
          pickups.splice(i,1);
          break;
        }
      }
    }

    // particles
    for(let i = particles.length-1; i >= 0; --i){
      const p = particles[i];
      p.life -= dt;
      if(p.life <= 0){ particles.splice(i,1); continue; }
      p.x += p.vx * (dt/16);
      p.y += p.vy * (dt/16);
      p.vy += 0.06 * (dt/16); // gravity
      octx.beginPath();
      const alpha = Math.max(0, Math.min(1, p.life / 900));
      octx.fillStyle = `rgba(${hexToRgb(p.color)}, ${alpha})`;
      octx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      octx.fill();
    }

    // confetti
    for(let i = confetti.length-1; i >= 0; --i){
      const c = confetti[i];
      c.life -= dt;
      if(c.life <= 0){ confetti.splice(i,1); continue; }
      c.x += c.vx * (dt/16);
      c.y += c.vy * (dt/16);
      c.vy += 0.08 * (dt/16);
      c.rot += c.rotSpeed * (dt/16);
      octx.save();
      octx.translate(c.x, c.y);
      octx.rotate(c.rot);
      octx.fillStyle = c.color;
      octx.fillRect(-c.w/2, -c.h/2, c.w, c.h);
      octx.restore();
    }

    // draw vibe/glow on boosted drones
    ds.forEach(dcopy => {
      const dLive = getDroneObj(dcopy.id);
      if(!dLive) return;
      if(dLive._funBoostUntil && dLive._funBoostUntil > Date.now()){
        const alpha = Math.max(0, (dLive._funBoostUntil - Date.now())/1800);
        octx.beginPath();
        octx.fillStyle = `rgba(255,214,122,${alpha*0.95})`;
        octx.arc(dLive.x, dLive.y, 18, 0, Math.PI*2);
        octx.fill();
      }
    });

    // occasional cleanup: if overlay is hidden (Fun Mode off), skip drawing
    const funBtn = document.getElementById('btnFunMode');
    if(funBtn && funBtn.textContent.indexOf('ON') === -1){
      // hidden; still update pickups ttl but don't draw heavy things
    }

    requestAnimationFrame(overlayLoop);
  }

  function hexToRgb(hex){
    // supports #rrggbb or named color; if not hex, return '255,255,255'
    if(!hex) return '255,255,255';
    if(hex[0] !== '#') {
      // simple parse for some knowns
      const map = {
        '#ffd47a':'255,212,122','#9be7c6':'155,231,198','#7ac6ff':'122,198,255','#ff7a7a':'255,122,122'
      };
      return map[hex] || '255,255,255';
    }
    const r = parseInt(hex.substr(1,2),16);
    const g = parseInt(hex.substr(3,2),16);
    const b = parseInt(hex.substr(5,2),16);
    return `${r},${g},${b}`;
  }

  // spawn a pickup on demand (exposed)
  window.funMode = window.funMode || {};
  window.funMode.spawnPickup = spawnPickup;

  // start loop
  requestAnimationFrame(overlayLoop);

  // resize overlay whenever the map canvas changes size
  const ro = new ResizeObserver(resizeOverlay);
  ro.observe(mapCanvas);

})();