// CPU Task Scheduling Simulator - DSA core (C++17)
// Data structures: Linked List (records), Circular Queue (Round Robin), Binary Min-Heap (Priority)
// Input (stdin):  <rr|priority> <quantum> <n>  then n lines: <pid> <arrival> <burst> <priority>
// Output (stdout): JSON consumed by the Node.js backend.
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

struct Process { string pid; int at, bt, pr, rem, ct = 0, tat = 0, wt = 0; };

// ---------- 1. Singly Linked List: maintains process records ----------
struct Node { Process p; Node* next; };
class ProcessList {
    Node *head = nullptr, *tail = nullptr; int n = 0;
public:
    void append(const Process& p) {
        Node* x = new Node{p, nullptr};
        if (!head) head = tail = x; else { tail->next = x; tail = x; }
        n++;
    }
    Node* first() const { return head; }
    int size() const { return n; }
    ~ProcessList() { while (head) { Node* t = head; head = head->next; delete t; } }
};

// ---------- 2. Circular Queue (array based, wrap-around with modulo) ----------
class CircularQueue {
    vector<int> a; int front = 0, rear = 0, count = 0, cap;
public:
    explicit CircularQueue(int k) : a(k), cap(k) {}
    bool empty() const { return count == 0; }
    bool full() const { return count == cap; }
    void enqueue(int v) { if (full()) return; a[rear] = v; rear = (rear + 1) % cap; count++; }
    int dequeue() { int v = a[front]; front = (front + 1) % cap; count--; return v; }
    int capacity() const { return cap; }
    int frontIndex() const { return front; }   // next slot to dequeue
    int rearIndex() const { return rear; }     // next free slot (enqueue writes here)
    int size() const { return count; }
    vector<int> layout() const {               // the real array: -1 marks an empty slot
        vector<int> s(cap, -1);
        for (int i = 0, j = front; i < count; i++, j = (j + 1) % cap) s[j] = a[j];
        return s;
    }
    vector<int> snapshot() const {            // front -> rear, for visualization
        vector<int> s;
        for (int i = 0, j = front; i < count; i++, j = (j + 1) % cap) s.push_back(a[j]);
        return s;
    }
};

// ---------- 3. Binary Min-Heap: smaller priority number = higher priority ----------
class MinHeap {
    vector<int> h; const vector<Process*>& P;
    bool less(int x, int y) const {           // tie-break: arrival time, then index (FCFS)
        const Process *a = P[x], *b = P[y];
        if (a->pr != b->pr) return a->pr < b->pr;
        if (a->at != b->at) return a->at < b->at;
        return x < y;
    }
    void up(int i) { while (i > 0) { int p = (i - 1) / 2; if (!less(h[i], h[p])) break; swap(h[i], h[p]); i = p; } }
    void down(int i) {
        int n = h.size();
        while (true) {
            int l = 2 * i + 1, r = l + 1, m = i;
            if (l < n && less(h[l], h[m])) m = l;
            if (r < n && less(h[r], h[m])) m = r;
            if (m == i) break;
            swap(h[i], h[m]); i = m;
        }
    }
public:
    explicit MinHeap(const vector<Process*>& p) : P(p) {}
    bool empty() const { return h.empty(); }
    void push(int v) { h.push_back(v); up(h.size() - 1); }
    int pop() { int t = h[0]; h[0] = h.back(); h.pop_back(); if (!h.empty()) down(0); return t; }
    vector<int> snapshot() const {            // priority order, without disturbing the heap
        MinHeap c = *this; vector<int> s;
        while (!c.empty()) s.push_back(c.pop());
        return s;
    }
};

struct Slice { string pid; int start, end; vector<string> ready; };
// One circular-queue operation, recorded for the visualization.
struct QEvent { bool enq; string pid, why; int slice, slot, front, rear, count; vector<string> slots; };

static vector<string> names(const vector<Process*>& P, const vector<int>& ids) {
    vector<string> r; for (int i : ids) r.push_back(P[i]->pid); return r;
}

// ---------- Round Robin (Circular Queue) ----------
// The scheduling logic is unchanged. Queue calls go through enq/deq only so each one is recorded in `log`.
static QEvent traceOf(const vector<Process*>& P, const CircularQueue& cq, bool enq, int i, const char* why, int slice, int slot) {
    QEvent e; e.enq = enq; e.pid = P[i]->pid; e.why = why; e.slice = slice; e.slot = slot;
    e.front = cq.frontIndex(); e.rear = cq.rearIndex(); e.count = cq.size();
    for (int id : cq.layout()) e.slots.push_back(id < 0 ? "" : P[id]->pid);
    return e;
}

void roundRobin(vector<Process*>& P, int q, vector<Slice>& g, vector<QEvent>& log, int& capacity) {
    int n = P.size(), t = 0, next = 0, done = 0, slice = 0;
    CircularQueue cq(n + 1);
    capacity = cq.capacity();
    auto enq = [&](int i, const char* why) { int slot = cq.rearIndex(); cq.enqueue(i); log.push_back(traceOf(P, cq, true, i, why, slice, slot)); };
    auto deq = [&]() { int slot = cq.frontIndex(); int i = cq.dequeue(); log.push_back(traceOf(P, cq, false, i, "dispatch", slice, slot)); return i; };
    auto admit = [&] { while (next < n && P[next]->at <= t) enq(next++, "arrival"); };
    while (done < n) {
        slice = (int)g.size();
        admit();
        if (cq.empty()) { int s = t; t = P[next]->at; g.push_back({"IDLE", s, t, {}}); continue; }
        int i = deq(), run = min(q, P[i]->rem), s = t;
        t += run; P[i]->rem -= run;
        admit();                                   // processes that arrived during this slice
        g.push_back({P[i]->pid, s, t, names(P, cq.snapshot())});
        if (P[i]->rem > 0) enq(i, "requeue");      // re-insert at rear
        else { P[i]->ct = t; done++; }
    }
}

// ---------- Non-preemptive Priority (Min-Heap) ----------
void priorityNP(vector<Process*>& P, vector<Slice>& g) {
    int n = P.size(), t = 0, next = 0, done = 0;
    MinHeap heap(P);
    while (done < n) {
        while (next < n && P[next]->at <= t) heap.push(next++);
        if (heap.empty()) { int s = t; t = P[next]->at; g.push_back({"IDLE", s, t, {}}); continue; }
        int i = heap.pop(), s = t;
        t += P[i]->bt;
        P[i]->rem = 0; P[i]->ct = t; done++;
        g.push_back({P[i]->pid, s, t, names(P, heap.snapshot())});
    }
}

int main() {
    string algo; int q, n;
    if (!(cin >> algo >> q >> n) || n <= 0) return 1;
    ProcessList list;
    for (int i = 0; i < n; i++) {
        Process p; cin >> p.pid >> p.at >> p.bt >> p.pr; p.rem = p.bt; list.append(p);
    }
    vector<Process*> P;                            // arrival-ordered view over the list nodes
    for (Node* x = list.first(); x; x = x->next) P.push_back(&x->p);
    stable_sort(P.begin(), P.end(), [](Process* a, Process* b) { return a->at < b->at; });

    vector<Slice> g; vector<QEvent> qlog; int qcap = 0;
    if (algo == "rr") roundRobin(P, q, g, qlog, qcap); else priorityNP(P, g);

    double sw = 0, st = 0;
    for (Node* x = list.first(); x; x = x->next) {
        x->p.tat = x->p.ct - x->p.at; x->p.wt = x->p.tat - x->p.bt;
        sw += x->p.wt; st += x->p.tat;
    }
    cout << "{\"algorithm\":\"" << algo << "\",\"quantum\":" << q << ",\"gantt\":[";
    for (size_t i = 0; i < g.size(); i++) {
        cout << (i ? "," : "") << "{\"pid\":\"" << g[i].pid << "\",\"start\":" << g[i].start
             << ",\"end\":" << g[i].end << ",\"ready\":[";
        for (size_t j = 0; j < g[i].ready.size(); j++) cout << (j ? "," : "") << "\"" << g[i].ready[j] << "\"";
        cout << "]}";
    }
    cout << "],\"processes\":[";
    for (Node* x = list.first(); x; x = x->next) {
        const Process& p = x->p;
        cout << (x == list.first() ? "" : ",") << "{\"pid\":\"" << p.pid << "\",\"at\":" << p.at << ",\"bt\":" << p.bt
             << ",\"pr\":" << p.pr << ",\"ct\":" << p.ct << ",\"tat\":" << p.tat << ",\"wt\":" << p.wt << "}";
    }
    cout << "],\"avgWT\":" << sw / n << ",\"avgTAT\":" << st / n;
    if (algo == "rr") {                            // circular-queue trace for the visualization
        cout << ",\"queue\":{\"capacity\":" << qcap << ",\"events\":[";
        for (size_t i = 0; i < qlog.size(); i++) {
            const QEvent& e = qlog[i];
            cout << (i ? "," : "") << "{\"op\":\"" << (e.enq ? "enqueue" : "dequeue") << "\",\"pid\":\"" << e.pid << "\",\"why\":\"" << e.why
                 << "\",\"slice\":" << e.slice << ",\"slot\":" << e.slot << ",\"front\":" << e.front << ",\"rear\":" << e.rear
                 << ",\"count\":" << e.count << ",\"slots\":[";
            for (size_t j = 0; j < e.slots.size(); j++) cout << (j ? "," : "") << (e.slots[j].empty() ? "null" : "\"" + e.slots[j] + "\"");
            cout << "]}";
        }
        cout << "]}";
    }
    cout << "}\n";
}
