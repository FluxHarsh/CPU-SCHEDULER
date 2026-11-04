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