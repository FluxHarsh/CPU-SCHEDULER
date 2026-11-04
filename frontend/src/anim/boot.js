// Loaded after first paint (dynamic import) so GSAP, Lenis and anime.js never block FCP or LCP.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { animate, stagger } from 'animejs';
import { setLib } from './store.js';

const doc = document.documentElement;
const rise = (targets) => animate(targets, { y: ['115%', '0%'], delay: stagger(16), duration: 750, ease: 'outExpo' });

export function boot() {
  gsap.registerPlugin(ScrollTrigger);
  setLib({ gsap, ScrollTrigger, anime: { animate, stagger } });

  const loader = document.getElementById('loader');
  const done = () => { loader?.remove(); try { sessionStorage.setItem('sched-seen', '1'); } catch { /* private mode */ } };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { doc.classList.add('no-anim'); done(); return () => {}; }

  const anims = [];
  const ac = new AbortController();
  const tick = (t) => lenis.raf(t * 1000);
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const ctx = gsap.context(() => {
    const reveal = (sel) => {
      const els = gsap.utils.toArray(sel);
      gsap.set(els, { opacity: 0, y: 40 });
      ScrollTrigger.batch(els, { start: 'top 90%', once: true,
        onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12, clearProps: 'transform' }) });
    };

    const intro = () => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.brand, .nav', { y: -28, opacity: 0, duration: 0.7, stagger: 0.08 }, 0)
        .from('.hero', { y: 56, duration: 1 }, 0)
        .add(() => anims.push(rise('.hero h1 .c')), 0.2)
        .from('.hero p', { y: 22, duration: 0.8 }, 0.5)
        .from('.hero .btn', { y: 22, opacity: 0, duration: 0.7 }, 0.65);

      reveal('.inputs, .bench .out > .card, .how .card, .formulas');
      gsap.utils.toArray('.block .split').forEach((h) => ScrollTrigger.create({ trigger: h, start: 'top 88%', once: true, onEnter: () => anims.push(rise(h.querySelectorAll('.c'))) }));
      gsap.to('.hero-art', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } });

      if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('.fab, .hero .btn').forEach((el) => {
          const x = gsap.quickTo(el, '--mx', { duration: 0.5, ease: 'power3' });
          const y = gsap.quickTo(el, '--my', { duration: 0.5, ease: 'power3' });
          el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.25); y((e.clientY - r.top - r.height / 2) * 0.25); }, { signal: ac.signal });
          el.addEventListener('pointerleave', () => { x(0); y(0); }, { signal: ac.signal });
        });
      }
    };

    if (!loader || doc.classList.contains('seen')) { done(); intro(); return; }

    lenis.stop();
    const pct = { v: 0 }, out = document.getElementById('ld-pct');
    const count = new Promise((res) => gsap.to(pct, { v: 100, duration: 1.05, ease: 'power2.out', onUpdate: () => { if (out) out.textContent = Math.round(pct.v); }, onComplete: res }));
    Promise.all([document.fonts?.ready, count]).then(() => {
      gsap.timeline({ onComplete: () => { done(); lenis.start(); } })
        .to('.ld-card', { y: -24, scale: 0.94, opacity: 0, duration: 0.4, ease: 'power2.in' })
        .to('.ld-strips i', { yPercent: -114, duration: 0.85, ease: 'power4.inOut', stagger: 0.07 }, '-=0.1')
        .add(intro, '-=0.55');
    });
  });

  const failsafe = setTimeout(() => { if (document.getElementById('loader')) { doc.classList.add('no-anim'); done(); lenis.start(); } }, 6000);

  return () => {
    clearTimeout(failsafe); ac.abort(); anims.forEach((a) => a.pause());
    gsap.ticker.remove(tick); ctx.revert(); lenis.destroy();
  };
}
