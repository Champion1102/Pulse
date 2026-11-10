# Scaling note: answer spikes and multi-server rooms

## 1. The answer spike

A class of 100–200 students submits answers within the same 2–5 seconds of a round.

**What Pulse does today (single server)**
- Every answer is an O(1) in-memory operation: validate shape → `Map.set` → publish an event. No database write sits in the hot path.
- The round closes early as soon as every connected player has answered, so the slowest step (waiting) is bounded.
- Grading and scoring happen once per round, not once per answer.
- Per-answer broadcasts go only to the host (`round:progress`) and the answering player; the class-wide broadcast happens once per round.

**Measured** (`npm run load-test -- --players 150`, MacBook, one Node process, same machine):

| metric | value |
|---|---|
| 150 bots join | ~190 ms |
| answers | 900 over 6 rounds, 0 errors |
| answer ack latency | p50 ≈ 1 ms, p95 ≈ 2 ms, p99 ≈ 4 ms |

Re-run this before the M2 demo and paste your own numbers. Try 300 and 500 players to find where p99 grows.

**If it ever becomes a problem:** throttle `round:progress` to the host (e.g. at most 5 updates/s), and move answer persistence to a batch write at round end (already the design: `SessionRecorder` snapshots once per round).

## 2. Where the Singleton breaks: more than one server

`RoomRegistry` is an in-memory Singleton: **one process = one list of rooms**. Put two servers behind a load balancer and:

1. The instructor creates room `ABC123` on server A.
2. A student's phone is routed to server B → "No live session with that room code".
3. Even if both had the room, `io.to('room:ABC123').emit(...)` on A never reaches sockets connected to B.

### Fix, in two layers

| Problem | Fix |
|---|---|
| A socket's requests land on different servers (Socket.IO long-polling needs one server per session) | **Sticky sessions** at the load balancer (e.g. nginx `ip_hash`, or cookie-based affinity) |
| Players of one room are on different servers | Route by room: a lookup `room_code → server` in **Redis**, and the load balancer / a tiny router sends `/play?code=…` to the owning server; **or** keep the room state in Redis |
| Broadcasts must reach sockets on every server | **`@socket.io/redis-adapter`** — Socket.IO publishes each `emit` through **Redis pub/sub**, so `io.to(room)` reaches all servers |

### Why the code is ready for this
- The engine depends on the **`RoomStore` interface**, not on `RoomRegistry` directly (Dependency Inversion). A `RedisRoomStore` (or a "room-owner router") replaces it in `src/config/container.ts` only.
- Broadcasting is isolated in **`SocketBroadcaster`** (an Observer). Adding the Redis adapter is a 3-line change in `src/app.ts`:
  ```ts
  import { createAdapter } from '@socket.io/redis-adapter';
  io.adapter(createAdapter(pubClient, subClient));
  ```
- `EventBus` is an interface too; an implementation backed by Redis pub/sub would let observers (analytics, logging) run on separate worker processes.

### Recommended production shape
Simplest robust option: **room affinity** — each live room lives entirely on one server (its timer, its state), sticky sessions + a Redis `room → server` map get every player of that room to the same server, and the Redis adapter covers any cross-server broadcast. Rooms are short-lived (≤ 1 hour), so rebalancing is rarely needed. If a server dies mid-quiz, that room is lost, so persist `SessionRecord`s after every round (already done via `SessionRecorder`) so the report survives.
