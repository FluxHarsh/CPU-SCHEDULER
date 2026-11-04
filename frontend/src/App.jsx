import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { getLib, reduced } from './anim/store.js';


const SAMPLE = [
  { pid: 'P1', at: 0, bt: 5, pr: 2 },
  { pid: 'P2', at: 1, bt: 3, pr: 1 },
  { pid: 'P3', at: 2, bt: 8, pr: 4 },
  { pid: 'P4', at: 3, bt: 6, pr: 3 },
];
const COLORS = ['#E5544E', '#8ED0E8', '#76B852', '#8FA0F8', '#F7E04A', '#F3A6C8', '#F29B4B', '#9ADAD0'];
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export default function App() {
  const [rows, setRows] = useState(SAMPLE);
  const [algo, setAlgo] = useState('rr');
  const [quantum, setQuantum] = useState(2);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState(false);
  const [play, setPlay] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState(0);
  const [toast, setToast] = useState('');
  const [flash, setFlash] = useState(-1);
  const [tab, setTab] = useState('bench');
  const chipsRef = useRef();

  const colorOf = useMemo(() => {
    const m = {}; rows.forEach((r, i) => (m[r.pid] = COLORS[i % COLORS.length])); return m;
  }, [rows]);
  const last = result ? result.gantt.length - 1 : 0;

  const edit = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: k === 'pid' ? v : v === '' ? '' : Number(v) } : r)));
  const addRow = () => {
    setRows([...rows, { pid: `P${rows.length + 1}`, at: 0, bt: 1, pr: 1 }]);
    setFlash(rows.length);
  };

  async function run(fromPerson = true) {
    setError(''); setLoading(true); setPlay(false);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: algo, quantum: Number(quantum), processes: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'The simulation failed. Try again.');
      setResult(data); setStep(0); setFocus(false); setRunId((n) => n + 1);
      if (fromPerson) setToast(`Scheduled ${data.processes.length} processes in ${data.gantt[data.gantt.length - 1].end} time units.`);
    } catch (e) {
      setResult(null);
      setError(e.message === 'Failed to fetch' ? 'The API is not reachable. Start the backend with "npm start" in the backend folder, then run again.' : e.message);
    } finally { setLoading(false); }
  }

  const runRef = useRef();
  runRef.current = run;
  useEffect(() => { runRef.current(false); }, []);
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runRef.current(true); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  useEffect(() => {
    if (!play || !result) return;
    if (step >= last) { setPlay(false); return; }
    const ops = result.queue ? result.queue.events.filter((e) => e.slice === step).length : 0;
    const id = setTimeout(() => setStep((s) => s + 1), Math.max(900, 450 + 520 * ops));
    return () => clearTimeout(id);
  }, [play, step, last, result]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 2800); return () => clearTimeout(id); }, [toast]);
  useEffect(() => { if (flash < 0) return; const id = setTimeout(() => setFlash(-1), 1200); return () => clearTimeout(id); }, [flash]);
  useEffect(() => {
    const c = chipsRef.current, el = c?.querySelector('.chip.on');
    if (!focus || !c || !el) return;
    const a = c.getBoundingClientRect(), b = el.getBoundingClientRect();
    if (b.left < a.left + 8 || b.right > a.right - 8) c.scrollTo({ left: el.offsetLeft - c.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [step, focus]);
  useEffect(() => {
    let stop;
    import('./anim/boot.js').then((b) => { stop = b.boot(); }).catch(() => document.documentElement.classList.add('no-anim'));
    return () => { stop?.(); };
  }, []);

  const select = (i) => { setPlay(false); setFocus(true); setStep(Math.max(0, Math.min(last, i))); };
  const togglePlay = () => { setFocus(true); if (step >= last) setStep(0); setPlay((p) => !p); };
  const g = result ? result.gantt[step] : null;
  const nav = (id, label) => <a href={`#${id}`} aria-current={tab === id ? 'true' : undefined} onClick={() => setTab(id)}>{label}</a>;

  return (
    <>
      <header className="top">
        <a className="brand" href="#top"><span className="logo" aria-hidden="true"><i /><i /><i /></span>Sched</a>
        <nav className="nav" aria-label="Sections">{nav('bench', 'Simulator')}{nav('how', 'Data structures')}{nav('formulas', 'Formulas')}</nav>
      </header>

      <section className="hero card" id="top">
        <div className="hero-text">
          <SplitText as="h1" parts={[['See which process the CPU runs '], ['next!', 'hot']]} />
          <p>Enter your processes, choose Round Robin or Priority scheduling, and follow every decision on a timeline. A C++ engine runs the circular queue and binary heap behind it.</p>
          <a className="btn" href="#bench" onClick={() => setTab('bench')}>Open the simulator</a>
        </div>
        <SchedDemo algo={algo} />
      </section>

      <main className="bench" id="bench">
        <form className="card inputs" onSubmit={(e) => { e.preventDefault(); run(true); }}>
          <h2>Processes</h2>
          <fieldset className="seg" data-v={algo}>
            <legend>Algorithm</legend>
            <i className="thumb" />
            <label><input type="radio" name="algo" checked={algo === 'rr'} onChange={() => setAlgo('rr')} /><span>Round Robin</span></label>
            <label><input type="radio" name="algo" checked={algo === 'priority'} onChange={() => setAlgo('priority')} /><span>Priority</span></label>
          </fieldset>
          <p className="note">
            {algo === 'rr'
              ? 'Each process runs for one time quantum, then waits at the rear of the circular queue.'
              : 'The waiting process with the lowest priority number runs first and finishes before the next starts.'}
          </p>
          {algo === 'rr' && (
            <label className="field">Time quantum
              <input type="number" min="1" value={quantum} onChange={(e) => setQuantum(e.target.value)} />
            </label>
          )}
          <table className="grid">
            <thead><tr><th>PID</th><th>Arrival</th><th>Burst</th><th>Priority</th><th /></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={flash === i ? 'flash' : ''}>
                  <td><input aria-label={`Process ${i + 1} ID`} value={r.pid} onChange={(e) => edit(i, 'pid', e.target.value)} /></td>
                  {[['at', 'arrival'], ['bt', 'burst'], ['pr', 'priority']].map(([k, n]) => (
                    <td key={k}><input aria-label={`${r.pid || `Process ${i + 1}`} ${n}`} type="number" min="0" value={r[k]} onChange={(e) => edit(i, k, e.target.value)} /></td>
                  ))}
                  <td><button type="button" className="icon" aria-label={`Remove ${r.pid || `process ${i + 1}`}`} disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="actions">
            <button type="submit" className="btn" disabled={loading}>{loading ? 'Running…' : 'Run simulation'}</button>
            <button type="button" className="btn alt" onClick={() => setRows(SAMPLE)}>Use sample</button>
          </div>
          <p className="hint">Ctrl or ⌘ + Enter also runs the simulation.</p>
          {error && <p className="err" role="alert">{error}</p>}
        </form>

        <div className="out">
          <section className="card">
            <h2>Timeline</h2>
            {!result ? <p className="empty">No simulation yet. Add processes and select Run simulation.</p> : (
              <>
                <Timeline key={runId} result={result} step={step} focus={focus} colorOf={colorOf} onSelect={select} />
                <div className="steps">
                  <button type="button" className="chev" aria-label="Previous step" disabled={step === 0} onClick={() => select(step - 1)}>‹</button>
                  <div className="chips" role="group" aria-label="Steps" ref={chipsRef}>
                    {result.gantt.map((s, i) => (
                      <button type="button" key={i} className={`chip ${i === step ? 'on' : ''}`} aria-pressed={i === step} aria-label={`Step ${i + 1}, ${s.pid === 'IDLE' ? 'idle' : s.pid}`} onClick={() => select(i)}>
                        <small>{s.pid === 'IDLE' ? 'idle' : s.pid}</small><span className="num">{i === step && <m.i layoutId="chip-ring" className="ring" transition={{ type: 'spring', stiffness: 520, damping: 36 }} />}<em>{i + 1}</em></span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className="chev" aria-label="Next step" disabled={step === last} onClick={() => select(step + 1)}>›</button>
                </div>
                <div className="controls">
                  <button type="button" className="btn" onClick={togglePlay}>{play ? 'Pause' : 'Play'}</button>
                  <p className="now" aria-live="polite">
                    {g.pid === 'IDLE' ? `The CPU is idle from ${g.start} to ${g.end}.`
                      : <><span className="dot" style={{ background: colorOf[g.pid] }} />{g.pid} runs from {g.start} to {g.end}.</>}
                  </p>
                </div>
              </>
            )}
          </section>

          {result && (
            <>
              {result.queue && result.queue.capacity <= 16
                ? <CircularQueueViz key={runId} result={result} step={step} colorOf={colorOf} />
                : (
<m.section className="card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                <h2>{result.algorithm === 'rr' ? 'Circular queue' : 'Priority queue'}</h2>
                <p className="note">{result.algorithm === 'rr'
                  ? 'Processes waiting once this slice ends, from front to rear.'
                  : 'Processes waiting while this one runs, highest priority first. The heap root is on the left.'}</p>
                <div className="bay">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {g.ready.length === 0 ? <m.span key="__empty" className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>The queue is empty.</m.span>
                      : g.ready.map((p, i, arr) => (
                        <m.span layout key={p} className="slot" initial={{ opacity: 0, scale: 0.6, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.6, y: -8 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
                          <b style={{ background: colorOf[p] }}>{p}</b>
                          <small>{i === 0 ? (result.algorithm === 'rr' ? 'front' : 'root') : i === arr.length - 1 && result.algorithm === 'rr' ? 'rear' : ''}</small>
                        </m.span>
                      ))}
                  </AnimatePresence>
                </div>
              </m.section>
              )}

              <m.section className="card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}>
                <h2>Results</h2>
                <div className="clocks" key={runId}>
                  <Clock value={result.avgWT} label="Average waiting time" />
                  <Clock value={result.avgTAT} label="Average turnaround time" />
                </div>
                <div className="tablewrap">
                  <table className="data">
                    <thead><tr><th>Process</th><th className="n">Arrival</th><th className="n">Burst</th><th className="n">Completion</th><th className="n">Turnaround</th><th>Waiting</th></tr></thead>
                    <tbody>{result.processes.map((p) => (
                      <tr key={p.pid}>
                        <td><span className="av" style={{ background: colorOf[p.pid] }}>{p.pid}</span></td>
                        <td className="n">{p.at}</td><td className="n">{p.bt}</td><td className="n">{p.ct}</td><td className="n">{p.tat}</td>
                        <td><span className="pill">{p.wt}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </m.section>
            </>
          )}
        </div>
      </main>

      <section className="block" id="how">
        <SplitText as="h2" className="h-lg" parts={[['The data structures behind it']]} />
        <div className="how">
          <article className="card"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="26" r="15" fill="none" stroke="#121212" strokeWidth="3" strokeDasharray="76 18" /><circle cx="24" cy="11" r="6" fill="#E5544E" stroke="#121212" strokeWidth="2.5" /></svg><h3>Circular queue</h3><p>An array with front and rear positions that wrap around using the remainder of the capacity. Round Robin takes a process from the front, runs it for one quantum and, if it is not finished, adds it back at the rear.</p></article>
          <article className="card"><svg viewBox="0 0 48 48" aria-hidden="true"><polygon points="24,6 43,40 5,40" fill="#8FA0F8" stroke="#121212" strokeWidth="3" strokeLinejoin="round" /></svg><h3>Binary min-heap</h3><p>A priority queue stored in an array, ordered by priority number and then arrival time. Insert and remove each take O(log n), so the next process to run is always at the root.</p></article>
          <article className="card"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 24h6M29 24h6" stroke="#121212" strokeWidth="3" /><rect x="2" y="16" width="11" height="16" rx="2" fill="#76B852" stroke="#121212" strokeWidth="2.5" /><rect x="18" y="16" width="11" height="16" rx="2" fill="#F7E04A" stroke="#121212" strokeWidth="2.5" /><rect x="35" y="16" width="11" height="16" rx="2" fill="#8ED0E8" stroke="#121212" strokeWidth="2.5" /></svg><h3>Linked list</h3><p>Every process record is a node in a singly linked list, kept in input order. Completion, turnaround and waiting times are written back into the nodes once scheduling ends.</p></article>
        </div>
      </section>

      <section className="block" id="formulas">
        <SplitText as="h2" className="h-lg" parts={[['How the times are calculated']]} />
        <dl className="formulas card">
          <div><dt>Turnaround time</dt><dd>completion time − arrival time</dd></div>
          <div><dt>Waiting time</dt><dd>turnaround time − burst time</dd></div>
          <div><dt>Averages</dt><dd>total across processes ÷ number of processes</dd></div>
        </dl>
      </section>

      <footer className="foot">
        <span>Data Structures and Algorithms project, CSE Section 2, 2026–27</span>
        <span>Harsh Jagtap (Roll 60) and Prarthana Sharma (Roll 7)</span>
      </footer>

      <div className="fabwrap">
        <span className="tip" aria-hidden="true">Add process</span>
        <button type="button" className="fab" aria-label="Add process" onClick={addRow}><span>+</span></button>
      </div>
      <AnimatePresence>{toast && <m.p className="toast" role="status" key={toast + runId} initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 420, damping: 28 }}>{toast}</m.p>}</AnimatePresence>
    </>
  );
}

function Clock({ value, label }) {
  const [shown, setShown] = useState(() => (getLib() && !reduced() ? 0 : value));
  useEffect(() => {
    const lib = getLib();
    if (!lib || reduced()) { setShown(value); return; }
    const o = { v: 0 };
    const anim = lib.anime.animate(o, { v: value, duration: 900, ease: 'outExpo', onUpdate: () => setShown(o.v) });
    return () => anim.pause();
  }, [value]);
  const [i, f] = (value % 1 === 0 ? String(Math.round(shown)) : shown.toFixed(2)).split('.');
  return (
    <div className="clock">
      <div className="boxes"><b>{i}</b>{f !== undefined && <><em>.</em><b>{f}</b></>}</div>
      <span>{label}</span>
    </div>
  );
}

function Timeline({ result, step, focus, colorOf, onSelect }) {
  const end = result.gantt[result.gantt.length - 1].end;
  const every = end <= 30 ? 1 : end <= 60 ? 2 : end <= 150 ? 5 : 10;
  const ticks = [];
  for (let t = 0; t < end; t += every) ticks.push(t);
  ticks.push(end);
  const at = result.gantt[step].end;
  const root = useRef();
  useLayoutEffect(() => {
    const lib = getLib();
    if (!lib || reduced()) return;
    const ctx = lib.gsap.context(() => {
      lib.gsap.timeline()
        .from('.blk', { scaleY: 0.15, opacity: 0, transformOrigin: '50% 100%', duration: 0.5, ease: 'back.out(1.6)', stagger: 0.05, clearProps: 'opacity,transform' })
        .from('.ruler span', { opacity: 0, duration: 0.35, stagger: 0.012, clearProps: 'opacity' }, 0.2);
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <div className="tl-scroll" ref={root}>
      <div className="track" style={{ minWidth: Math.max(end * 26, 320) }}>
        <div className="lane">
          {result.gantt.map((g, i) => (
            <button type="button" key={i} aria-label={`${g.pid === 'IDLE' ? 'Idle' : g.pid} from ${g.start} to ${g.end}`}
              className={`blk ${g.pid === 'IDLE' ? 'idle' : ''} ${focus && i > step ? 'later' : ''} ${focus && i === step ? 'sel' : ''}`}
              style={{ '--i': i, flex: `${g.end - g.start} 1 0px`, background: g.pid === 'IDLE' ? undefined : colorOf[g.pid] }}
              onClick={() => onSelect(i)}>{g.pid === 'IDLE' ? 'idle' : g.pid}</button>
          ))}
        </div>
        <div className="ruler">{ticks.map((t) => <span key={t} style={{ left: `${(t / end) * 100}%` }}>{t}</span>)}</div>
        {focus && (
          <div className="playhead" style={{ left: `${(at / end) * 100}%` }}>
            <svg className="cur" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2 L3 20 L8 15 L12 22 L15 20.5 L11 14 L18 14 Z" fill="#121212" stroke="#FDF1E6" strokeWidth="1.5" strokeLinejoin="round" /></svg>
            <b>t = {at}</b>
          </div>
        )}
      </div>
    </div>
  );
}

function SplitText({ as: Tag = 'span', parts, className = '' }) {
  const label = parts.map((p) => p[0]).join('');
  return (
    <Tag className={`split ${className}`} aria-label={label}>
      {parts.map(([text, cls], pi) => text.split(/(\s+)/).map((w, wi) => (/^\s*$/.test(w) ? w : (
        <span key={`${pi}-${wi}`} className={`w ${cls || ''}`} aria-hidden="true">{[...w].map((ch, ci) => <span className="c" key={ci}>{ch}</span>)}</span>
      ))))}
    </Tag>
  );
}

// ---- Circular queue: the real array, FRONT / REAR pointers and modulo wrap-around, driven by the engine's trace ----
const CQ_R = 33; // ring radius as % of the ring width

function CircularQueueViz({ result, step, colorOf }) {
  const { capacity: N, events } = result.queue;
  const steps = result.gantt.length;
  const instant = reduced();
  const spring = instant ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 };

  const info = useMemo(() => {
    const first = Array(steps).fill(-1), last = Array(steps).fill(-1);
    events.forEach((e, i) => { if (first[e.slice] < 0) first[e.slice] = i; last[e.slice] = i; });
    let carry = -1;
    const upTo = last.map((l) => (carry = l >= 0 ? l : carry));   // idle slices have no queue operations
    let enq = 0, deq = 0;
    const counts = events.map((e) => { if (e.op === 'enqueue') enq += 1; else deq += 1; return [enq, deq]; });
    return { first, last, upTo, counts };
  }, [events, steps]);

  // Each Gantt step plays its queue operations one after another: dequeue, arrivals, re-enqueue.
  const [cur, setCur] = useState(() => (info.first[step] >= 0 ? info.first[step] : info.upTo[step]));
  useEffect(() => {
    const a0 = info.first[step], b0 = info.last[step];
    if (a0 < 0) { setCur(info.upTo[step]); return undefined; }
    if (instant) { setCur(b0); return undefined; }
    let i = a0; setCur(i);
    const id = setInterval(() => { if (i >= b0) { clearInterval(id); return; } i += 1; setCur(i); }, 520);
    return () => clearInterval(id);
  }, [step, info, instant]);

  const ev = cur >= 0 ? events[cur] : null;
  const prev = cur > 0 ? events[cur - 1] : { front: 0, rear: 0 };
  const slots = ev ? ev.slots : Array(N).fill(null);
  const [enqN, deqN] = cur >= 0 ? info.counts[cur] : [0, 0];
  const deg = 360 / N;
  const tile = Math.min(19, Math.floor(((2 * Math.PI * CQ_R * 0.85) / N) * 10) / 10);
  const wrapped = ev && (ev.op === 'enqueue' ? prev.rear : prev.front) + 1 === N;
  const calc = !ev ? '' : ev.op === 'enqueue'
    ? `a[${ev.slot}] = ${ev.pid};  rear = (${prev.rear} + 1) % ${N} = ${ev.rear}`
    : `front = (${prev.front} + 1) % ${N} = ${ev.front}`;
  const title = !ev ? 'Queue is empty' : ev.op === 'dequeue' ? `${ev.pid} dequeued` : ev.why === 'requeue' ? `${ev.pid} re-enqueued` : `${ev.pid} arrived, enqueued`;
  const detail = !ev ? '' : ev.op === 'dequeue' ? `Taken from FRONT slot ${ev.slot}. It runs for one quantum.`
    : ev.why === 'requeue' ? `Quantum expired, so it goes to REAR slot ${ev.slot}.` : `Added at REAR slot ${ev.slot}.`;

  return (
    <m.section className="card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
      <h2>Circular queue</h2>
      <p className="note">A fixed array of {N} slots (indices 0 to {N - 1}). FRONT and REAR only move forward and wrap around with % {N}.</p>
      <div className="cq">
        <div className="cq-wrap">
          <div className="cq-ring" style={{ '--in': `${CQ_R - tile / 2 - 0.5}cqw`, '--out': `${CQ_R + tile / 2 + 0.5}cqw` }} role="img"
            aria-label={`Circular queue with ${N} slots. ${title}. FRONT at slot ${ev ? ev.front : 0}, REAR at slot ${ev ? ev.rear : 0}.`}>
            <span className="cq-center" aria-hidden="true">↻</span>
            {Array.from({ length: N }, (_, i) => {
              const th = ((-90 + i * deg) * Math.PI) / 180, cx = Math.cos(th), sy = Math.sin(th);
              const name = slots[i], touched = ev && ev.slot === i;
              const k = CQ_R / tile * 100;   // ring radius expressed in tile widths, for the chip's flight path
              const from = touched && ev.op === 'enqueue'
                ? (ev.why === 'arrival' ? { x: `${cx * 90}%`, y: `${sy * 90}%` } : { x: `${-cx * k}%`, y: `${-sy * k}%` })
                : { x: 0, y: 0 };
              return (
                <m.div key={i} className={`cq-tile ${name ? 'full' : ''} ${touched ? 'touch' : ''}`} style={{ left: `${50 + CQ_R * cx}%`, top: `${50 + CQ_R * sy}%`, width: `${tile}%` }}
                  animate={touched && !instant ? { scale: [1, 1.14, 1] } : { scale: 1 }} transition={{ duration: 0.42 }}>
                  <span className="cq-idx">{i}</span>
                  {!name && tile >= 13 && <span className="cq-e">EMPTY</span>}
                  <AnimatePresence initial={false}>
                    {name && (
                      <m.div key={name} className="cq-chip" style={{ background: colorOf[name] }}
                        initial={{ opacity: 0, scale: 0.5, ...from }} animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.4, x: `${-cx * k}%`, y: `${-sy * k}%` }} transition={spring}>{name}</m.div>
                    )}
                  </AnimatePresence>
                </m.div>
              );
            })}
            <CqPointer kind="front" deg={-90 + deqN * deg} instant={instant} />
            <CqPointer kind="rear" deg={-90 + enqN * deg} instant={instant} />
          </div>
        </div>
        <div className="cq-info">
          <AnimatePresence mode="wait" initial={false}>
            <m.div key={cur} className={`cq-status ${ev ? ev.op : ''}`} aria-live="polite" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
              <b>{title}</b><span>{detail}</span>
            </m.div>
          </AnimatePresence>
          {ev && <p className="cq-calc"><span>{calc}</span>{wrapped && <em className="cq-wrap-badge">wraps around to 0</em>}</p>}
          <dl className="cq-reg">
            <div><dt>FRONT</dt><dd>{ev ? ev.front : 0}</dd></div>
            <div><dt>REAR</dt><dd>{ev ? ev.rear : 0}</dd></div>
            <div><dt>Size</dt><dd>{ev ? ev.count : 0} of {N}</dd></div>
          </dl>
          <p className="cq-legend">FRONT is the next slot to dequeue. REAR is the next free slot, where an enqueue writes.</p>
        </div>
      </div>
    </m.section>
  );
}

function CqPointer({ kind, deg, instant }) {
  const t = instant ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 22 };
  return (
    <m.div className={`cq-ptr ${kind}`} initial={false} animate={{ rotate: deg }} transition={t}>
      <div className="cq-arm">
        <m.span className="cq-pill" initial={false} animate={{ rotate: -deg }} transition={t}>{kind === 'front' ? 'FRONT' : 'REAR'}</m.span>
        <i className="cq-tip" />
      </div>
    </m.div>
  );
}

// ---- Hero: a miniature, self-playing demonstration of the scheduler (Framer Motion) ----
const DEMO = [{ pid: 'P1', bt: 3, pr: 2 }, { pid: 'P2', bt: 2, pr: 1 }, { pid: 'P3', bt: 4, pr: 4 }, { pid: 'P4', bt: 2, pr: 3 }];
const demoColor = (pid) => COLORS[DEMO.findIndex((p) => p.pid === pid)];
const runTime = (len) => 420 * len + 260;
const fresh = () => ({ queue: [], cpu: null, out: false, hl: null, arrive: null, running: false, gantt: [], step: 0, runMs: 1000,
  rem: Object.fromEntries(DEMO.map((p) => [p.pid, p.bt])), note: 'Processes arrive and join the ready queue.' });

function demoPlan(algo, q = 2) {
  const steps = []; let t = 0;
  if (algo === 'rr') {
    const rem = Object.fromEntries(DEMO.map((p) => [p.pid, p.bt])), queue = DEMO.map((p) => p.pid);
    while (queue.length) {
      const pid = queue.shift(), run = Math.min(q, rem[pid]); rem[pid] -= run;
      steps.push({ pid, start: t, end: t + run, remAfter: rem[pid], requeue: rem[pid] > 0 }); t += run;
      if (rem[pid] > 0) queue.push(pid);
    }
  } else {
    [...DEMO].sort((x, y) => x.pr - y.pr).forEach((p) => { steps.push({ pid: p.pid, start: t, end: t + p.bt, remAfter: 0, requeue: false }); t += p.bt; });
  }
  return { steps, total: t };
}

function SchedDemo({ algo }) {
  const [v, setV] = useState(fresh);
  const root = useRef();
  const live = useRef(true);
  const plan = useMemo(() => demoPlan(algo), [algo]);

  useEffect(() => {
    if (reduced()) { setV({ ...fresh(), gantt: plan.steps, rem: Object.fromEntries(DEMO.map((p) => [p.pid, 0])), note: 'All processes finished.' }); return; }
    const io = new IntersectionObserver(([e]) => { live.current = e.isIntersecting && !document.hidden; });
    io.observe(root.current);
    const vis = () => { live.current = !document.hidden; };
    document.addEventListener('visibilitychange', vis);
    let dead = false;
    const nap = (ms) => new Promise((r) => setTimeout(r, ms));
    const wait = async (ms) => { await nap(ms); while (!live.current && !dead) await nap(200); if (dead) throw new Error('stopped'); };
    const set = (f) => setV((s) => ({ ...s, ...f(s) }));
    (async () => {
      try {
        for (;;) {
          setV(fresh()); await wait(300);
          for (const p of DEMO) { set((s) => ({ queue: [...s.queue, p.pid], arrive: p.pid })); await wait(380); }   // 1. arrival
          set(() => ({ arrive: null })); await wait(500);
          for (const [i, st] of plan.steps.entries()) {
            const len = st.end - st.start, ms = runTime(len);
            set(() => ({ hl: st.pid, note: algo === 'rr' ? `The scheduler takes ${st.pid} from the front.` : `The scheduler picks ${st.pid}, the lowest priority number.` }));   // 2. scheduling
            await wait(750);
            set((s) => ({ queue: s.queue.filter((x) => x !== st.pid), cpu: st.pid, hl: null, running: true, step: i, runMs: ms, gantt: [...s.gantt, st],
              note: `${st.pid} runs on the CPU for ${len} unit${len > 1 ? 's' : ''}.` }));   // 3. CPU execution, 4. Gantt block
            await wait(ms);
            if (st.requeue) {   // Round Robin: quantum expired, back to the rear
              set((s) => ({ cpu: null, running: false, queue: [...s.queue, st.pid], rem: { ...s.rem, [st.pid]: st.remAfter }, note: `${st.pid} used its quantum and goes to the rear of the queue.` }));
              await wait(900);
            } else {
              set((s) => ({ out: true, running: false, rem: { ...s.rem, [st.pid]: 0 }, note: `${st.pid} finished.` })); await wait(500);
              set(() => ({ cpu: null, out: false })); await wait(250);
            }
          }
          set(() => ({ note: 'All processes finished. Starting again.' })); await wait(2000);   // 5. repeat
        }
      } catch { /* effect cleaned up */ }
    })();
    return () => { dead = true; io.disconnect(); document.removeEventListener('visibilitychange', vis); };
  }, [algo, plan]);

  const label = (pid) => (pid === v.cpu ? (v.out ? 'done' : 'running') : algo === 'rr' ? `${v.rem[pid]} left` : `pri ${DEMO.find((p) => p.pid === pid).pr}`);
  const card = (pid, out) => <DemoCard key={pid} pid={pid} label={label(pid)} hot={v.hl === pid} out={out} fresh={v.arrive === pid} />;
  return (
    <div className="hero-art demo" ref={root} role="img" aria-label="Animated demonstration: processes P1 to P4 wait in the ready queue, the scheduler picks one, the CPU runs it and its block appears on the Gantt chart.">
      <div className="demo-head">
        <span className="dpill">{algo === 'rr' ? 'Round Robin, quantum 2' : 'Priority, lowest number first'}</span>
        <AnimatePresence mode="wait" initial={false}>
          <m.p key={v.note} className="demo-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>{v.note}</m.p>
        </AnimatePresence>
      </div>
      <div className="demo-flow">
        <div><p className="demo-label">Ready queue</p><div className="dq">{v.queue.map((pid) => card(pid, false))}</div></div>
        <svg className="darr" viewBox="0 0 28 20" aria-hidden="true"><path d="M2 10h20M16 3l8 7-8 7" fill="none" stroke="#121212" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <CpuChip running={v.running} step={v.step} runMs={v.runMs}>{v.cpu && card(v.cpu, v.out)}</CpuChip>
      </div>
      <div className="dg">
        <p className="demo-label">Gantt chart</p>
        <div className="dlane">
          {v.gantt.map((g) => (
            <m.div key={g.start} className="dblk" style={{ left: `${(g.start / plan.total) * 100}%`, width: `${((g.end - g.start) / plan.total) * 100}%`, background: demoColor(g.pid) }}
              initial={reduced() ? false : { clipPath: 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: runTime(g.end - g.start) / 1000, ease: 'linear' }}>{g.pid}</m.div>
          ))}
        </div>
        <div className="druler">
          {v.gantt.map((g) => <span key={g.start} style={{ left: `${(g.start / plan.total) * 100}%` }}>{g.start}</span>)}
          {v.gantt.length === plan.steps.length && <span style={{ left: '100%' }}>{plan.total}</span>}
        </div>
      </div>
    </div>
  );
}

function DemoCard({ pid, label, hot, out, fresh: isNew }) {
  return (
    <m.div layoutId={`dc-${pid}`} layout="position" className={`dcard ${hot ? 'pick' : ''}`} style={{ background: demoColor(pid) }}
      initial={isNew ? { opacity: 0, x: -70 } : false}
      animate={out ? { opacity: 0, y: 64, scale: 0.6 } : { opacity: 1, x: 0, y: 0, scale: hot ? 1.1 : 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28, layout: { type: 'tween', duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}>
      <b>{pid}</b><small>{label}</small>
    </m.div>
  );
}

function CpuChip({ running, step, runMs, children }) {
  const glow = (a) => `0 0 0 ${a ? 0 : 16}px rgba(247,224,74,${a ? 0.95 : 0}), 5px 6px 0 #121212`;
  return (
    <m.div className="cpu" initial={false} animate={running ? 'on' : 'off'}
      variants={{
        off: { backgroundColor: '#FDF1E6', boxShadow: '0 0 0 0 rgba(247,224,74,0), 5px 6px 0 #121212' },
        on: { backgroundColor: '#FFF4A8', boxShadow: [glow(true), glow(false)], transition: { boxShadow: { repeat: Infinity, duration: 1 } } },
      }}>
      {['t', 'b', 'l', 'r'].map((side) => (
        <span key={side} className={`pins ${side}`}>
          {[0, 1, 2, 3].map((i) => <m.i key={i} variants={{ off: { backgroundColor: '#121212' }, on: { backgroundColor: '#F7E04A' } }} />)}
        </span>
      ))}
      <div className="core">
        <small>CPU</small>
        <div className="cslot">{children}</div>
        <div className="qbar"><m.i key={step} initial={{ scaleX: 0 }} animate={{ scaleX: running ? 1 : 0 }} transition={running ? { duration: runMs / 1000, ease: 'linear' } : { duration: 0.15 }} /></div>
      </div>
    </m.div>
  );
}
