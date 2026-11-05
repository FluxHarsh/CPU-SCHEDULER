# Sched: CPU Task Scheduling Simulator

An interactive simulator that shows how an operating system decides which process gets the CPU next. Enter processes, choose **Round Robin** or **Priority** scheduling, and watch the Gantt chart, the ready queue and the waiting and turnaround times update step by step.

**Live demo:** https://cpu-scheduler-orpin.vercel.app/

The scheduling logic is written in **C++** using a circular queue, a binary min-heap and a linked list. A **Node.js** API runs the C++ engine, and a **React** interface shows the results.

> Data Structures and Algorithms project, CSE Section 2, 2026-27

## Features

- **Round Robin scheduling** with a configurable time quantum, built on a circular queue.
- **Non-preemptive Priority scheduling**, built on a binary min-heap. A smaller number means higher priority.
- **Gantt chart** with a time axis, idle gaps, and step-by-step playback of every CPU decision.
- **Circular queue visualization** showing the real array: slot indices, empty slots, FRONT and REAR pointers, and the modulo wrap-around (`rear = (rear + 1) % N`), driven by the C++ engine's own trace.
- **Results table** with completion, turnaround and waiting time per process, plus the average waiting and turnaround time.
- **Input validation** with clear messages (duplicate IDs, bad numbers, limits).
- Responsive layout, keyboard shortcut (Ctrl or Cmd + Enter runs the simulation), and reduced-motion support.

## How it works

```
React (frontend)  --POST /api/schedule-->  Node.js + Express (backend)  --stdin/stdout-->  C++ engine (backend/cpp)
```

1. The React app sends the processes and chosen algorithm to the API.
2. The API validates the input and passes it to the compiled C++ program.
3. The C++ program runs the algorithm using the data structures below and prints JSON: the Gantt slices, per-process times, averages and (for Round Robin) a trace of every queue operation.
4. The React app draws the Gantt chart, the circular queue and the results from that JSON.

## Data structures

| Data structure | Used for | Cost |
|---|---|---|
| Circular queue (array, `front`, `rear`, `count`, wrap with `% capacity`) | Round Robin ready queue | enqueue and dequeue are O(1) |
| Binary min-heap (ordered by priority number, then arrival time) | Priority scheduling ready queue | insert and remove are O(log n) |
| Singly linked list | Stores the process records in input order and receives the computed times | append is O(1) |

Capacity of the circular queue is the number of processes plus one.

## Formulas

- Turnaround time = completion time - arrival time
- Waiting time = turnaround time - burst time
- Average = total across processes / number of processes

## Rules the simulator follows

- **Round Robin:** a process that does not finish within its quantum goes to the rear of the queue. If a process arrives while another is running, or exactly when its slice ends, it joins the queue before the preempted process goes back.
- **Priority:** non-preemptive. Once a process starts it runs to completion. Equal priorities are broken by earlier arrival, then by input order.
- When no process is ready, the CPU is shown as idle until the next arrival.

## Worked example

Round Robin, quantum 2:

| Process | Arrival | Burst |
|---|---|---|
| P1 | 0 | 5 |
| P2 | 1 | 3 |
| P3 | 2 | 1 |
| P4 | 3 | 2 |

Gantt chart: P1 0-2, P2 2-4, P3 4-5, P1 5-7, P4 7-9, P2 9-10, P1 10-11

| Process | Completion | Turnaround | Waiting |
|---|---|---|---|
| P1 | 11 | 11 | 6 |
| P2 | 10 | 9 | 6 |
| P3 | 5 | 3 | 2 |
| P4 | 9 | 6 | 4 |

Average waiting time = 4.50, average turnaround time = 7.25.

## Tech stack

| Part | Technology |
|---|---|
| Scheduling engine | C++17 |
| API | Node.js, Express |
| Interface | React, Vite |
| Animation | Framer Motion, GSAP, Lenis, anime.js |
| Hosting | Vercel (frontend), Render (backend) |

## Project structure

```
cpu-scheduler/
├── backend/
│   ├── cpp/
│   │   ├── scheduler.cpp      C++ engine: linked list, circular queue, min-heap, both algorithms
│   │   └── Makefile
│   ├── server.js              Express API, input validation, runs the C++ binary
│   └── package.json
├── frontend/
│   ├── public/                favicon, manifest, robots.txt, sitemap.xml, llms.txt
│   ├── src/
│   │   ├── App.jsx            interface, Gantt chart, circular queue visualization
│   │   ├── anim/              animation setup (GSAP, Lenis)
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── vercel.json            forwards /api/* to the backend
│   └── vite.config.js
└── README.md
```

## Run it locally

Requirements: Node 18 or newer and g++ with C++17 support.

```bash
# Backend (also compiles the C++ engine)  ->  http://localhost:3000
cd backend
npm install
npm start

# Frontend  ->  http://localhost:5173
cd frontend
npm install
npm run dev
```

`npm install` in `backend` compiles `backend/cpp/scheduler.cpp` automatically. You can also run `npm run build`, or compile it by hand:

```bash
cd backend/cpp && make
```

To run the C++ engine on its own, pipe input into it:

```bash
printf 'rr 2 4\nP1 0 5 1\nP2 1 3 1\nP3 2 1 1\nP4 3 2 1\n' | ./backend/cpp/scheduler
```

Input format: `<rr|priority> <quantum> <n>`, then `n` lines of `<pid> <arrival> <burst> <priority>`.

## API

`GET /api/health` returns `{"ok":true}`.

`POST /api/schedule`

```json
{
  "algorithm": "rr",
  "quantum": 2,
  "processes": [
    { "pid": "P1", "at": 0, "bt": 5, "pr": 2 },
    { "pid": "P2", "at": 1, "bt": 3, "pr": 1 }
  ]
}
```

Limits: 1 to 50 processes, whole numbers only, unique IDs of up to 10 letters, digits, `_` or `-`.

The response contains:

- `gantt`: slices with `pid`, `start`, `end` and `ready` (the waiting queue)
- `processes`: each process with `ct`, `tat` and `wt`
- `avgWT` and `avgTAT`
- `queue` (Round Robin only): the circular queue's `capacity` and one event per enqueue or dequeue, with the array contents, `front`, `rear` and `count`

## Deployment

- **Frontend:** Vercel, with the project's root directory set to `frontend`.
- **Backend:** Render web service (Node), root directory `backend`, build command `npm install`, start command `npm start`, health check path `/api/health`.
- `frontend/vercel.json` forwards `/api/*` requests from the Vercel site to the Render service, so the frontend code needs no API address.

The free Render plan sleeps after about 15 minutes without traffic, so the first request after a pause can take 30 to 60 seconds.

## Authors

| Name | Roll no. | Scholar no. |
|---|---|---|
| Harsh Jagtap | 60 | 25112011260 |
| Prarthana Sharma | 7 | 25112011207 |