# Sched Forge: CPU Task Scheduling Simulator

DSA project (2026–27). React UI → Node.js API → C++ scheduling engine.

```
frontend/ (React + Vite)  --POST /api/schedule-->  backend/ (Express)  --stdin/stdout-->  cpp/scheduler (C++17)
```

## Run it
```bash
# 1. C++ engine (the backend also auto-compiles it if the binary is missing)
cd cpp && make

# 2. Backend  -> http://localhost:3000
cd ../backend && npm install && npm start

# 3. Frontend -> http://localhost:5173
cd ../frontend && npm install && npm run dev
```
Requires: g++ (C++17), Node 18+.

## Todo plan
**Phase 1: DSA core (C++)**
- [x] `ProcessList`: singly linked list for process records
- [x] `CircularQueue`: array queue with modulo wrap-around (enqueue, dequeue, snapshot)
- [x] `MinHeap`: binary heap, key = (priority, arrival, index)
- [x] Round Robin using the circular queue (re-queue at rear if unfinished, idle jumps)
- [x] Non-preemptive Priority using the min-heap
- [x] Compute CT, TAT = CT − AT, WT = TAT − BT, averages
- [x] Emit Gantt slices plus queue/heap snapshot per slice as JSON

**Phase 2: Backend (Node.js)**
- [x] Express server, CORS, JSON body limit
- [x] Input validation (algorithm, quantum, unique PIDs, integer ranges)
- [x] Spawn the C++ binary, pipe input, parse JSON output, handle errors and timeouts
- [x] Auto-compile binary on first start

**Phase 3: Frontend (React)**
- [x] Sketchbook theme: sticky notes, tape, pins, hand-drawn fonts
- [x] Process input table, algorithm switch, time quantum
- [x] Gantt chart with idle blocks, click to inspect
- [x] Step slider showing the circular queue / heap contents
- [x] Results table, average WT and TAT

**Phase 4: Next steps (optional)**
- [ ] Unit tests for the C++ structures (edge cases: all arrive late, equal priorities)
- [ ] "Compare both algorithms" view
- [ ] Preemptive priority and SJF as extra algorithms
- [ ] Deploy (Vercel/Render) and add screenshots to the report


## Production build (one server for API and site)
```bash
cd frontend && npm install && npm run build      # outputs frontend/dist (with .br and .gz copies)
cd ../backend && npm install && npm start        # serves the site and the API on http://localhost:3000
```
Before deploying, replace `https://sched.example.com` with your real domain in `frontend/index.html`,
`frontend/public/robots.txt`, `sitemap.xml` and `llms.txt`.

## Animation and performance stack
| Library | Role | Loaded |
|---|---|---|
| GSAP + ScrollTrigger | loader exit timeline, intro timeline, scroll reveals, Gantt build, magnetic buttons | lazy chunk after first paint |
| Lenis | smooth scrolling, wired to the GSAP ticker | lazy chunk |
| anime.js | masked text rise on headings, count-up of the averages | lazy chunk |
| Framer Motion (`motion`, LazyMotion) | hero scheduler demo (queue, CPU chip, Gantt), step ring, queue chips moving between steps, toast | async feature chunk |
| @fontsource-variable | self-hosted Lexend and Nunito, preloaded | first paint |
| web-vitals | logs FCP, LCP, CLS, INP in the dev console | dev only |
| vite-plugin-compression2 | Brotli and gzip copies of every asset | build |

AI and search: `public/llms.txt` (Markdown description and API), `robots.txt` (AI crawlers allowed), `sitemap.xml`,
JSON-LD `WebApplication`, Open Graph tags, canonical URL, manifest, and a `<noscript>` summary.
