// Tiny registry so components can use GSAP / anime.js once the lazy animation chunk has loaded.
let lib = null;
export const setLib = (l) => { lib = l; };
export const getLib = () => lib;
export const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
