// Node.js API: validates input, pipes it to the C++ scheduler binary, returns its JSON.
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CPP_DIR = path.join(HERE, 'cpp'); // the C++ engine now lives inside the backend folder
const BIN = path.join(CPP_DIR, process.platform === 'win32' ? 'scheduler.exe' : 'scheduler');
if (!existsSync(BIN)) { // normally built by `npm install`; this is the fallback
  console.log('Compiling C++ scheduler...');
  try {
    execFileSync('g++', ['-O2', '-std=c++17', '-o', BIN, path.join(CPP_DIR, 'scheduler.cpp')]);
  } catch {
    console.error('Could not compile the C++ scheduler. Install g++ (C++17) and run "npm run build".');
    process.exit(1);
  }
}

const DIST = path.resolve(HERE, '../frontend/dist');
const app = express();
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '100kb' }));

const isInt = (v, min) => Number.isInteger(v) && v >= min && v <= 100000;

function validate({ algorithm, quantum, processes }) {
  if (!['rr', 'priority'].includes(algorithm)) return 'Choose Round Robin or Priority scheduling.';
  if (!Array.isArray(processes) || processes.length < 1 || processes.length > 50) return 'Add between 1 and 50 processes.';
  if (algorithm === 'rr' && !isInt(quantum, 1)) return 'Time quantum must be a whole number of at least 1.';
  const seen = new Set();
  for (const p of processes) {
    if (!/^[A-Za-z0-9_-]{1,10}$/.test(p.pid ?? '')) return `Invalid PID "${p.pid}". Use letters, digits, _ or - (max 10).`;
    if (seen.has(p.pid)) return `PID "${p.pid}" is used twice.`;
    seen.add(p.pid);
    if (!isInt(p.at, 0)) return `${p.pid}: arrival time must be 0 or more.`;
    if (!isInt(p.bt, 1)) return `${p.pid}: burst time must be 1 or more.`;
    if (!isInt(p.pr, 0)) return `${p.pid}: priority must be 0 or more.`;
  }
  return null;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/schedule', (req, res) => {
  const err = validate(req.body ?? {});
  if (err) return res.status(400).json({ error: err });
  const { algorithm, quantum, processes } = req.body;
  const input = `${algorithm} ${algorithm === 'rr' ? quantum : 1} ${processes.length}\n` +
    processes.map((p) => `${p.pid} ${p.at} ${p.bt} ${p.pr}`).join('\n') + '\n';

  const child = spawn(BIN, [], { timeout: 5000 });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.on('error', () => res.status(500).json({ error: 'Could not start the C++ scheduler.' }));
  child.on('close', (code) => {
    if (code !== 0) return res.status(500).json({ error: 'The C++ scheduler failed to run.' });
    try { res.json(JSON.parse(out)); } catch { res.status(500).json({ error: 'Scheduler returned unreadable output.' }); }
  });
  child.stdin.end(input);
});

// Serve the built frontend in production: long-lived caching for hashed assets, revalidation for HTML and llms.txt.
if (existsSync(DIST)) {
  app.use(express.static(DIST, {
    maxAge: '1y', immutable: true,
    setHeaders: (res, file) => {
      if (/\.(html|txt|xml|webmanifest)$/.test(file)) res.setHeader('Cache-Control', 'no-cache');
      if (file.endsWith('llms.txt')) res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    },
  }));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));