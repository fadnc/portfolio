document.documentElement.classList.add('js');

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('.top');
const progress = document.querySelector('.page-progress span');
const pageField = document.querySelector('.page-field');
const sections = [...document.querySelectorAll('main > section')];
const navLinks = [...document.querySelectorAll('.top nav a[href^="#"]')];
const scrollDriftItems = [...document.querySelectorAll('.project-visual, .contact-art, .language-orbit')];
let pageScrollPhase = 0;
let activeSceneIndex = 0;
let scrollFrame = 0;
let requestScenePaint = () => {};

const sectionAtViewportCenter = () => {
  const mid = window.innerHeight * 0.52;
  let nearest = 0;
  let distance = Infinity;
  sections.forEach((section, index) => {
    const box = section.getBoundingClientRect();
    if (box.top <= mid && box.bottom >= mid) nearest = index;
    const center = box.top + box.height / 2;
    if (Math.abs(center - mid) < distance) {
      distance = Math.abs(center - mid);
      if (box.top > mid) nearest = index;
    }
  });
  return nearest;
};

const updateScrollChrome = () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    pageScrollPhase = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    activeSceneIndex = sectionAtViewportCenter();
    if (progress) progress.style.transform = `scaleY(${pageScrollPhase})`;
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 28);
    if (pageField) pageField.style.opacity = reduceMotion.matches ? '.28' : String(0.46 - pageScrollPhase * 0.08);
    const active = sections[activeSceneIndex];
    if (active?.id) {
      navLinks.forEach(link => {
        if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    if (!reduceMotion.matches) {
      const viewportMid = window.innerHeight * 0.5;
      scrollDriftItems.forEach(item => {
        const box = item.getBoundingClientRect();
        const offset = (box.top + box.height * 0.5 - viewportMid) * -0.025;
        item.style.setProperty('--scroll-shift', `${Math.max(-14, Math.min(14, offset)).toFixed(1)}px`);
      });
    }
    requestScenePaint();
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
    if (item.classList.contains('project-card')) item.style.setProperty('--reveal-delay', `${(index % 2) * 90}ms`);
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

// A small desktop-only reticle replaces the browser cursor without changing touch behavior.
const cursor = document.querySelector('.custom-cursor');
if (cursor && window.matchMedia('(pointer: fine)').matches && !reduceMotion.matches) {
  document.body.classList.add('has-custom-cursor');
  window.addEventListener('pointermove', event => {
    cursor.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0) translate(-50%,-50%)`;
    cursor.classList.toggle('is-active', Boolean(event.target.closest('a,button')));
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-active'));
}

// Brief, skippable systems check. The page remains usable underneath it.
const boot = document.getElementById('boot-intro');
const finishBoot = () => {
  if (!boot || boot.classList.contains('is-done')) return;
  boot.classList.add('is-done');
  window.setTimeout(() => { boot.hidden = true; }, 500);
};
if (boot) {
  const skipBoot = document.getElementById('skip-boot');
  skipBoot?.addEventListener('click', finishBoot);
  if (reduceMotion.matches) finishBoot();
  else window.setTimeout(finishBoot, 900);
}

// Three parallax star layers and a section-aware observatory scene, rendered in Canvas 2D.
const canvas = document.getElementById('scene-canvas');
if (canvas instanceof HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (ctx) {
    const colors = { amber: '#FF9F1C', hot: '#FF6B1A', teal: '#00B8C4', ice: '#3DE0E8', white: '#F2EFE8' };
    const stars = Array.from({ length: window.innerWidth < 640 ? 115 : 235 }, (_, index) => ({
      x: Math.random(), y: Math.random(), radius: 0.35 + Math.random() * (index % 7 === 0 ? 1.25 : 0.65),
      layer: index % 3, phase: Math.random() * Math.PI * 2, tint: index % 17 === 0 ? 1 : 0
    }));
    let width = 1;
    let height = 1;
    let dpr = 1;
    let pointerX = 0;
    let pointerY = 0;
    let lastY = window.scrollY;
    let scrollVelocity = 0;
    let lastPaint = 0;
    let frame = 0;
    let running = false;
    const reduced = () => reduceMotion.matches;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width || window.innerWidth);
      height = Math.max(1, rect.height || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(performance.now());
    };

    const planet = (x, y, radius, time, color = colors.amber) => {
      const glow = ctx.createRadialGradient(x, y, radius * 0.45, x, y, radius * 1.75);
      glow.addColorStop(0, `${color}30`);
      glow.addColorStop(1, `${color}00`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, radius * 1.75, 0, Math.PI * 2); ctx.fill();
      const surface = ctx.createRadialGradient(x - radius * 0.36, y - radius * 0.4, radius * 0.05, x, y, radius);
      surface.addColorStop(0, '#FFE1A6');
      surface.addColorStop(0.38, color);
      surface.addColorStop(1, '#50230F');
      ctx.fillStyle = surface;
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = 0.19;
      for (let band = 0; band < 5; band++) {
        ctx.beginPath(); ctx.ellipse(x + Math.sin(time * 0.15 + band) * radius * 0.25, y + (band - 2) * radius * 0.34, radius * 1.3, radius * 0.09, -0.25, 0, Math.PI * 2);
        ctx.fillStyle = band % 2 ? '#08121A' : '#FFE1A6'; ctx.fill();
      }
      ctx.restore();
    };

    const orbitSystem = (x, y, size, time) => {
      [0.72, 1.05, 1.42].forEach((factor, index) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.34 + index * 0.23);
        ctx.beginPath(); ctx.ellipse(0, 0, size * factor, size * factor * 0.31, 0, 0, Math.PI * 2);
        ctx.strokeStyle = index === 1 ? '#00B8C45A' : '#F2EFE82A'; ctx.lineWidth = 0.8; ctx.stroke();
        const angle = time * (0.22 + index * 0.06) + index * 2.05;
        const px = Math.cos(angle) * size * factor;
        const py = Math.sin(angle) * size * factor * 0.31;
        ctx.beginPath(); ctx.arc(px, py, 2.4 + index * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = index === 1 ? colors.ice : colors.amber; ctx.fill();
        ctx.restore();
      });
      planet(x, y, size * 0.2, time);
    };

    const constellation = (time) => {
      const pts = [[.70,.28],[.82,.22],[.88,.38],[.76,.47],[.63,.42],[.68,.62],[.84,.68],[.92,.56],[.56,.27]];
      const links = [[0,1],[1,2],[2,3],[3,4],[4,0],[4,5],[5,6],[6,7],[7,3],[0,8],[8,4]];
      ctx.lineWidth = 0.8;
      links.forEach(([a,b], index) => {
        ctx.beginPath(); ctx.moveTo(pts[a][0]*width,pts[a][1]*height); ctx.lineTo(pts[b][0]*width,pts[b][1]*height);
        ctx.strokeStyle = index % 4 === 0 ? '#00B8C45B' : '#FF9F1C40'; ctx.stroke();
      });
      pts.forEach((point, index) => {
        const x = point[0] * width, y = point[1] * height;
        ctx.beginPath(); ctx.arc(x,y,index%3===0?3:1.7,0,Math.PI*2);
        ctx.fillStyle = index % 3 === 0 ? colors.ice : colors.white; ctx.fill();
        if (index % 3 === 0) { ctx.beginPath(); ctx.arc(x,y,5 + Math.sin(time*2+index)*1.5,0,Math.PI*2); ctx.strokeStyle='#00B8C44A'; ctx.stroke(); }
      });
    };

    const contactHorizon = (time) => {
      const y = height * 0.78;
      const radius = width * 0.73;
      const x = width * 0.73;
      const surface = ctx.createRadialGradient(x, y - radius * .1, radius * .25, x, y, radius * 1.12);
      surface.addColorStop(0, '#18222A'); surface.addColorStop(.78, '#080E14'); surface.addColorStop(1, '#05070B');
      ctx.fillStyle = surface; ctx.beginPath(); ctx.arc(x,y,radius,Math.PI,Math.PI*2); ctx.lineTo(width,height); ctx.lineTo(0,height); ctx.closePath(); ctx.fill();
      const horizon = ctx.createLinearGradient(0,y-8,width,y+8);
      horizon.addColorStop(0, '#00B8C400'); horizon.addColorStop(.35, '#00B8C4B0'); horizon.addColorStop(.68, '#FF9F1CA8'); horizon.addColorStop(1, '#FF9F1C00');
      ctx.beginPath(); ctx.ellipse(x,y,radius,Math.max(10,height*.035),0,Math.PI,Math.PI*2); ctx.strokeStyle=horizon; ctx.lineWidth=2; ctx.shadowColor=colors.teal; ctx.shadowBlur=18; ctx.stroke(); ctx.shadowBlur=0;
      for (let band=0;band<3;band++) {
        ctx.beginPath(); ctx.moveTo(width*.28,y+10+band*8);
        ctx.bezierCurveTo(width*.48,y-38+Math.sin(time*.35+band)*14,width*.57,y+31,width*.77,y-8+band*5);
        ctx.strokeStyle=band===1?'#00B8C44A':'#FF9F1C32'; ctx.lineWidth=8-band*2; ctx.stroke();
      }
    };

    const paint = now => {
      if (!width || !height) return;
      const time = reduced() ? 0 : now * 0.001;
      ctx.clearRect(0,0,width,height);
      const starsDrift = reduced() ? 0 : pageScrollPhase * height * .08;
      stars.forEach(star => {
        const twinkle = reduced() ? .7 : .3 + .7 * (.5 + .5 * Math.sin(time * (1.1 + star.layer * .5) + star.phase));
        const parallax = (star.layer + 1) * starsDrift;
        const x = (star.x * width + pointerX * (star.layer + 1) * 3 + width) % width;
        const y = (star.y * height + parallax) % height;
        const radius = star.radius * (star.layer === 2 ? 1.2 : 1);
        ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2);
        ctx.fillStyle = star.tint ? `rgba(61,224,232,${.16+twinkle*.24})` : `rgba(242,239,232,${.13+twinkle*.36})`; ctx.fill();
        if (!reduced() && Math.abs(scrollVelocity) > 2 && star.layer === 2) {
          ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+Math.sign(scrollVelocity)*Math.min(18,Math.abs(scrollVelocity)*.7));
          ctx.strokeStyle=`rgba(255,159,28,${Math.min(.5,Math.abs(scrollVelocity)*.015)})`; ctx.lineWidth=radius; ctx.stroke();
        }
      });
      const index = activeSceneIndex;
      if (index === 0) {
        const x=width*.76+pointerX*12, y=height*.49+pointerY*9, radius=Math.min(145,width*.12,height*.22);
        const corona=ctx.createRadialGradient(x,y,radius*.25,x,y,radius*2.1);
        corona.addColorStop(0,'#FF9F1C32'); corona.addColorStop(.48,'#FF6B1A14'); corona.addColorStop(1,'#FF9F1C00');
        ctx.fillStyle=corona; ctx.fillRect(x-radius*2.1,y-radius*2.1,radius*4.2,radius*4.2);
        for(let ray=0;ray<36;ray++){const angle=ray*Math.PI/18+time*.025;const inner=radius*(1.08+(ray%3)*.025);const outer=radius*(1.2+(ray%5)*.04);ctx.beginPath();ctx.moveTo(x+Math.cos(angle)*inner,y+Math.sin(angle)*inner);ctx.lineTo(x+Math.cos(angle)*outer,y+Math.sin(angle)*outer);ctx.strokeStyle=ray%4===0?'#FFB64B38':'#FF9F1C20';ctx.lineWidth=1;ctx.stroke();}
        planet(x,y,radius,time);
        ctx.save();ctx.translate(x,y);ctx.rotate(-.25);ctx.beginPath();ctx.ellipse(0,0,radius*1.75,radius*.42,0,0,Math.PI*2);ctx.strokeStyle='#F2EFE832';ctx.lineWidth=.8;ctx.stroke();ctx.restore();
      } else if (index === 1 || index === 4) {
        orbitSystem(width*.75+pointerX*10,height*.48+pointerY*8,Math.min(105,width*.09,height*.16),time);
      } else if (index === 2) {
        constellation(time);
      } else if (index === 3) {
        planet(width*.83,height*.52,Math.min(100,width*.085,height*.15),time,colors.teal);
        ctx.save();ctx.translate(width*.83,height*.52);ctx.rotate(.3);ctx.beginPath();ctx.ellipse(0,0,150,40,0,0,Math.PI*2);ctx.strokeStyle='#00B8C43A';ctx.stroke();ctx.restore();
      } else if (index === 5) contactHorizon(time);
      scrollVelocity *= reduced() ? 0 : .88;
    };

    const animate = now => {
      if (!running || document.hidden) return;
      if (now - lastPaint > 32) { paint(now); lastPaint = now; }
      frame = requestAnimationFrame(animate);
    };
    const start = () => {
      if (running || document.hidden) return;
      running = true;
      if (reduced()) { paint(performance.now()); return; }
      frame = requestAnimationFrame(animate);
    };
    const stop = () => { running = false; cancelAnimationFrame(frame); paint(performance.now()); };
    requestScenePaint = () => { if (reduced() || document.hidden) paint(performance.now()); };
    window.addEventListener('scroll', () => {
      const current = window.scrollY;
      scrollVelocity = Math.max(-30,Math.min(30,current-lastY)); lastY=current;
    }, { passive: true });
    window.addEventListener('pointermove', event => { pointerX=(event.clientX/Math.max(1,width)-.5)*2; pointerY=(event.clientY/Math.max(1,height)-.5)*2; }, { passive: true });
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    if ('IntersectionObserver' in window) {
      const sceneObserver = new IntersectionObserver(entries => entries.forEach(entry => entry.isIntersecting ? start() : stop()));
      sceneObserver.observe(pageField);
    } else start();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize, { passive: true });
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', () => { if (reduced()) stop(); else { running = false; start(); } });
    resize(); start();
  }
}

// Subtle project depth responds only on pointer devices and stops for reduced motion.
if (!reduceMotion.matches && window.matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      const bounds = card.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 4;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -4;
      card.style.setProperty('--tilt-x', `${x.toFixed(1)}px`);
      card.style.setProperty('--tilt-y', `${y.toFixed(1)}px`);
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-x', '0');
      card.style.setProperty('--tilt-y', '0');
    });
  });
}
