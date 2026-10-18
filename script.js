document.documentElement.classList.add('js');
document.getElementById('year').textContent = new Date().getFullYear();

const revealItems = [...document.querySelectorAll('[data-reveal]')];
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealItems.forEach((item, index) => {
    if (item.classList.contains('project-row')) {
      item.style.setProperty('--reveal-delay', `${(index % 5) * 75}ms`);
    }
    revealObserver.observe(item);
  });
} else {
  revealItems.forEach(item => item.classList.add('is-visible'));
}

const filterButtons = [...document.querySelectorAll('.filter-button')];
const projectRows = [...document.querySelectorAll('.project-row')];
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach(option => {
      const selected = option === button;
      option.classList.toggle('is-active', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
    projectRows.forEach(row => {
      row.hidden = filter !== 'all' && row.dataset.category !== filter;
      if (!row.hidden) row.classList.add('is-visible');
    });
  });
});

const navLinks = [...document.querySelectorAll('.top nav a')];
const observedSections = navLinks
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        const current = link.getAttribute('href') === `#${entry.target.id}`;
        if (current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-28% 0px -62% 0px' });
  observedSections.forEach(section => sectionObserver.observe(section));
}

const hero = document.querySelector('.hero');
if (hero && window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const title = hero.querySelector('h1');
  hero.addEventListener('pointermove', event => {
    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 5;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 5;
    title.style.setProperty('--pointer-x', `${x}px`);
    title.style.setProperty('--pointer-y', `${y}px`);
  });
  hero.addEventListener('pointerleave', () => {
    title.style.setProperty('--pointer-x', '0px');
    title.style.setProperty('--pointer-y', '0px');
  });
}
