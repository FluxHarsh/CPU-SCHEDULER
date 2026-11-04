import '@fontsource-variable/lexend/wght.css';
import '@fontsource-variable/nunito/wght.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion } from 'motion/react';
import App from './App.jsx';
import './styles.css';

// Framer Motion features load after first paint so they stay out of the critical bundle.
const features = () => import('./motionFeatures.js').then((m) => m.default);

// Hold the page behind the loader until the display fonts are ready, so the swap cannot shift the layout (CLS).
const ready = () => document.documentElement.classList.add('fonts');
Promise.race([
  Promise.all([document.fonts.load('800 1em "Lexend Variable"'), document.fonts.load('700 1em "Nunito Variable"')]),
  new Promise((r) => setTimeout(r, 2500)),
]).then(ready, ready);

createRoot(document.getElementById('root')).render(<LazyMotion features={features}><App /></LazyMotion>);

if (import.meta.env.DEV) {
  import('web-vitals').then(({ onFCP, onLCP, onCLS, onINP }) => {
    const log = (m) => console.log(`[vitals] ${m.name}: ${Math.round(m.value * 100) / 100}`);
    onFCP(log); onLCP(log); onCLS(log); onINP(log);
  });
}
