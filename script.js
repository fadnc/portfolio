document.documentElement.classList.add('js');

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('.hero');
const header = document.querySelector('.top');
const progress = document.querySelector('.page-progress span');
let scrollFrame = 0;
const updateScrollChrome = () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 28);
    if (hero) hero.style.setProperty('--scroll-phase', String(Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight)))));
    scrollFrame = 0;
  });
};
window.addEventListener('scroll', updateScrollChrome, { passive: true });
window.addEventListener('resize', updateScrollChrome, { passive: true });
updateScrollChrome();

const revealItems = [...document.querySelectorAll('[data-reveal]')];
if (reduceMotion.matches || !('IntersectionObserver' in window)) {
  revealItems.forEach(item => item.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -45px 0px' });
  revealItems.forEach((item, index) => {
    if (item.classList.contains('project-card')) item.style.setProperty('--reveal-delay', `${(index % 2) * 100}ms`);
    revealObserver.observe(item);
  });
}

const filterButtons = [...document.querySelectorAll('.filter-button')];
const projectCards = [...document.querySelectorAll('.project-card')];
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const category = button.dataset.filter;
    filterButtons.forEach(option => {
      const active = option === button;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-pressed', String(active));
    });
    projectCards.forEach(card => {
      const visible = category === 'all' || card.dataset.category === category;
      card.hidden = !visible;
      if (visible) card.classList.add('is-visible');
    });
  });
});

const navLinks = [...document.querySelectorAll('.top nav a[href^="#"]')];
const navSections = navLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window) {
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        if (link.getAttribute('href') === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-30% 0px -62% 0px' });
  navSections.forEach(section => navObserver.observe(section));
}

// Low-cost 3D projection: a glass-bar helix responds to pointer position and page scroll.
const canvas = document.getElementById('helix');
const hint = document.getElementById('scene-hint');
const soundButton = document.getElementById('sound-toggle');
if (canvas && canvas.getContext) {
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (ctx) {
    const art = canvas.closest('.hero-art');
    const pointer = { x: 0, y: 0, active: false };
    const scene = { width: 0, height: 0, phase: 0, rotation: 0, running: false, frame: 0, selected: -1 };
    const wake = [];
    const bars = Array.from({ length: 32 }, (_, i) => ({ index: i, angle: i * 0.67, y: (i - 15.5) * 0.115 }));
    const dust = Array.from({ length: 92 }, (_, i) => ({
      x: ((i * 73.17) % 997) / 997,
      y: ((i * 151.71 + 13) % 991) / 991,
      size: 0.45 + ((i * 19) % 13) / 10,
      phase: i * 2.31
    }));
    let audio = null;
    let soundEnabled = false;
    let lastStrike = 0;
    const pentatonic = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      scene.width = Math.max(1, box.width);
      scene.height = Math.max(1, box.height);
      canvas.width = Math.round(scene.width * dpr);
      canvas.height = Math.round(scene.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(performance.now());
    };

    const project = (x, y, z, globalY, globalX, centerX, centerY, scale) => {
      const gx = x * Math.cos(globalY) + z * Math.sin(globalY);
      const gz = z * Math.cos(globalY) - x * Math.sin(globalY);
      const gy = y * Math.cos(globalX) - gz * Math.sin(globalX);
      const depth = y * Math.sin(globalX) + gz * Math.cos(globalX);
      const perspective = 6.4 / (6.4 + depth);
      return { x: centerX + gx * scale * perspective, y: centerY - gy * scale * perspective, z: depth, perspective };
    };

    const paint = now => {
      const { width, height } = scene;
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      const phase = scene.phase;
      const pointerX = pointer.active ? (pointer.x - 0.5) : 0;
      const pointerY = pointer.active ? (pointer.y - 0.5) : 0;
      const t = reduceMotion.matches ? 0 : now * 0.00016;
      const baseRotation = scene.rotation;
      const turnY = baseRotation + pointerX * 0.42 + Math.sin(t) * 0.08;
      const turnX = 0.13 + pointerY * 0.24;
      const scale = Math.min(width * 0.26, height * 0.49, 200);
      const centerX = width * 0.51 + pointerX * 18;
      const centerY = height * 0.5 + pointerY * 11;
      const wash = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, scale * 2.8);
      wash.addColorStop(0, 'rgba(123,145,255,0.105)');
      wash.addColorStop(0.47, 'rgba(82,99,195,0.035)');
      wash.addColorStop(1, 'rgba(5,5,7,0)');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, width, height);

      dust.forEach(point => {
        const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2 + point.phase));
        const dx = (point.x - 0.5) * width;
        const dy = (point.y - 0.5) * height;
        ctx.beginPath();
        ctx.fillStyle = `rgba(190,201,255,${0.09 * pulse})`;
        ctx.arc(width * 0.51 + dx, height * 0.5 + dy, point.size * pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      while (wake.length && now - wake[0].time > 620) wake.shift();
      if (wake.length > 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let index = 1; index < wake.length; index++) {
          const start = wake[index - 1];
          const end = wake[index];
          const age = (now - end.time) / 620;
          const alpha = Math.max(0, 0.24 * (1 - age));
          ctx.beginPath();
          ctx.moveTo(start.x * width, start.y * height);
          ctx.lineTo(end.x * width, end.y * height);
          ctx.strokeStyle = `rgba(145,166,255,${alpha})`;
          ctx.lineWidth = 15 * (1 - age) + 1;
          ctx.shadowColor = '#859dff';
          ctx.shadowBlur = 13 * (1 - age);
          ctx.stroke();
        }
        ctx.restore();
      }

      const objects = bars.map(bar => {
        const angle = bar.angle + phase * 3.8 + t * 0.28;
        const x = Math.cos(angle) * 1.05;
        const z = Math.sin(angle) * 0.84;
        const tangent = angle + Math.PI / 2 + Math.sin(t + bar.index) * 0.025;
        const vertices = [];
        for (const lx of [-0.52, 0.52]) for (const ly of [-0.065, 0.065]) for (const lz of [-0.15, 0.15]) {
          const rx = lx * Math.cos(tangent) + lz * Math.sin(tangent);
          const rz = lz * Math.cos(tangent) - lx * Math.sin(tangent);
          vertices.push(project(x + rx, bar.y + ly, z + rz, turnY, turnX, centerX, centerY, scale));
        }
        const faces = [
          { ids: [1, 3, 7, 5], tone: 1.25, edge: 0.4 },
          { ids: [0, 4, 6, 2], tone: 0.36, edge: 0.14 },
          { ids: [2, 6, 7, 3], tone: 0.9, edge: 0.34 },
          { ids: [0, 1, 5, 4], tone: 0.69, edge: 0.26 },
          { ids: [4, 5, 7, 6], tone: 0.56, edge: 0.22 },
          { ids: [0, 2, 3, 1], tone: 0.8, edge: 0.3 }
        ].map(face => ({ ...face, z: face.ids.reduce((sum, id) => sum + vertices[id].z, 0) / 4 }));
        const center = project(x, bar.y, z, turnY, turnX, centerX, centerY, scale);
        const dx = pointer.active ? (center.x - pointer.x * width) : 999;
        const dy = pointer.active ? (center.y - pointer.y * height) : 999;
        const distance = Math.hypot(dx, dy);
        return { bar, vertices, faces, center, depth: center.z, distance };
      }).sort((a, b) => b.depth - a.depth);

      let closest = null;
      if (pointer.active) closest = objects.reduce((best, item) => item.distance < best.distance ? item : best, objects[0]);
      scene.selected = closest && closest.distance < 38 ? closest.bar.index : -1;
      if (scene.selected >= 0 && hint) hint.textContent = soundEnabled ? 'TAP A BAR TO PLAY A NOTE' : 'GLASS FIELD / INTERACTIVE';
      else if (hint) hint.textContent = 'MOVE THROUGH THE FIELD';

      objects.forEach(item => {
        const active = item.bar.index === scene.selected;
        if (active) {
          ctx.save();
          ctx.shadowColor = 'rgba(168,185,255,0.9)';
          ctx.shadowBlur = 23;
          ctx.beginPath();
          ctx.ellipse(item.center.x, item.center.y, 33 * item.center.perspective, 8 * item.center.perspective, -0.12, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(178,194,255,0.48)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
        item.faces.sort((a, b) => a.z - b.z).forEach(face => {
          const rgb = active ? '191,204,255' : (item.bar.index % 4 === 0 ? '151,170,255' : '137,151,220');
          ctx.beginPath();
          face.ids.forEach((id, index) => {
            const point = item.vertices[id];
            if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
          });
          ctx.closePath();
          ctx.fillStyle = `rgba(${rgb},${Math.min(0.66, face.tone * (active ? 0.47 : 0.33) + 0.035)})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(209,218,255,${face.edge * (active ? 1.8 : 1)})`;
          ctx.lineWidth = active ? 1.1 : 0.7;
          if (active) { ctx.shadowColor = '#91a9ff'; ctx.shadowBlur = 12; }
          ctx.stroke();
          ctx.shadowBlur = 0;
          const topFace = face.ids.includes(7) && face.ids.includes(5);
          if (topFace) {
            const g = ctx.createLinearGradient(item.vertices[1].x, item.vertices[1].y, item.vertices[7].x, item.vertices[7].y);
            g.addColorStop(0, 'rgba(255,255,255,0.28)');
            g.addColorStop(0.55, 'rgba(190,204,255,0.04)');
            g.addColorStop(1, 'rgba(255,255,255,0.16)');
            ctx.beginPath();
            ctx.moveTo(item.vertices[1].x, item.vertices[1].y);
            ctx.lineTo(item.vertices[5].x, item.vertices[5].y);
            ctx.strokeStyle = g;
            ctx.lineWidth = 1.3;
            ctx.stroke();
          }
        });
      });

      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.strokeStyle = '#9aaaff';
      ctx.setLineDash([2, 8]);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, scale * 1.45, scale * 0.41, -0.16 + turnY * 0.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const animate = now => {
      if (!scene.running) return;
      scene.phase = Math.min(1, Math.max(0, Number(hero?.style.getPropertyValue('--scroll-phase')) || 0));
      paint(now);
      if (!reduceMotion.matches) scene.frame = requestAnimationFrame(animate);
    };
    const start = () => {
      if (scene.running) return;
      scene.running = true;
      scene.frame = requestAnimationFrame(animate);
    };
    const stop = () => {
      scene.running = false;
      cancelAnimationFrame(scene.frame);
      paint(performance.now());
    };
    if ('IntersectionObserver' in window) {
      const sceneObserver = new IntersectionObserver(entries => entries.forEach(entry => entry.isIntersecting ? start() : stop()), { rootMargin: '120px' });
      sceneObserver.observe(art);
    } else start();

    const onPointer = event => {
      const box = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - box.left) / box.width;
      pointer.y = (event.clientY - box.top) / box.height;
      pointer.active = true;
      wake.push({ x: pointer.x, y: pointer.y, time: performance.now() });
      if (wake.length > 22) wake.shift();
      if (!scene.running) paint(performance.now());
    };
    canvas.addEventListener('pointermove', onPointer, { passive: true });
    canvas.addEventListener('pointerleave', () => { pointer.active = false; if (!scene.running) paint(performance.now()); }, { passive: true });

    const playNote = index => {
      if (!soundEnabled || !audio || performance.now() - lastStrike < 95) return;
      lastStrike = performance.now();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const frequency = pentatonic[Math.abs(index) % pentatonic.length] * (index % 16 > 7 ? 2 : 1);
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(audio.destination);
      const now = audio.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      oscillator.start(now);
      oscillator.stop(now + 0.44);
    };
    canvas.addEventListener('pointerdown', () => playNote(scene.selected >= 0 ? scene.selected : 15));

    if (soundButton) soundButton.addEventListener('click', async () => {
      soundEnabled = !soundEnabled;
      soundButton.setAttribute('aria-pressed', String(soundEnabled));
      soundButton.textContent = soundEnabled ? 'Sound on · tap a bar' : 'Sound off';
      if (soundEnabled) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audio ||= new AudioContext();
          if (audio.state === 'suspended') await audio.resume();
          playNote(7);
        } else {
          soundEnabled = false;
          soundButton.setAttribute('aria-pressed', 'false');
          soundButton.textContent = 'Audio unavailable';
        }
      } else if (audio?.state === 'running') {
        audio.suspend();
      }
    });
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', () => scene.running ? (stop(), start()) : paint(performance.now()));
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize, { passive: true });
    resize();
  }
}

// Subtle pointer depth on the visuals; touch and reduced-motion users keep the stable layout.
if (!reduceMotion.matches && window.matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      const bounds = card.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 5;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -5;
      card.style.setProperty('--tilt-x', `${(x * 1.6).toFixed(1)}px`);
      card.style.setProperty('--tilt-y', `${(y * 1.6).toFixed(1)}px`);
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-x', '0');
      card.style.setProperty('--tilt-y', '0');
    }, { passive: true });
  });
}
