# System Design & Core CS Interview Notes

## 1. Redis Caching & In-Memory Architecture
Redis is an in-memory key-value data store used primarily as a high-speed cache, message broker, and queue.
- **In-Memory Speed**: Operations run in sub-millisecond latency because datasets reside in RAM.
- **Persistence Mechanisms**:
  - **AOF (Append Only File)**: Logs every write command received by the server. It can be replayed at server boot to reconstruct the original dataset. AOF provides maximum durability with configurable sync intervals (always, everysec, no).
  - **RDB (Redis Database Snapshots)**: Creates point-in-time snapshot binaries of the dataset at specified intervals (e.g. every 5 minutes if 100 keys changed). RDB allows compact backup archives and faster restart recovery, but changes made between snapshots can be lost in an unexpected crash.
- **Cache Eviction Policies**:
  - LRU (Least Recently Used)
  - LFU (Least Frequently Used)
  - TTL-based expiration (Volatile LRU)

## 2. Distributed Database Architecture: MongoDB
MongoDB is a document-oriented NoSQL database that represents records as BSON documents.
- **Sharding Architecture**:
  - **Shards**: Each shard contains a subset of the sharded data and is deployed as a high-availability replica set.
  - **Mongos**: The query router. Client applications interact with mongos instances, which route queries to the correct shard based on the shard key.
  - **Config Servers**: Store the cluster metadata, shard key chunk ranges, and cluster routing configurations.
- **Index Strategies**:
  - Single-field index
  - Compound index (follows the Equality, Sort, Range rule)
  - Multikey index for array fields
  - Text search index

## 3. Node.js Event Loop & Concurrency
Node.js uses an event-driven, non-blocking I/O model backed by Libuv.
- **Phases of Event Loop**:
  1. **Timers**: Executes callbacks scheduled by `setTimeout()` and `setInterval()`.
  2. **Pending Callbacks**: Executes I/O callbacks deferred to the next loop iteration.
  3. **Idle, Prepare**: Used only internally.
  4. **Poll**: Retrieves new I/O events and executes I/O related callbacks.
  5. **Check**: Executes callbacks invoked by `setImmediate()`.
  6. **Close Callbacks**: Executes close event handlers (e.g. `socket.on('close')`).
- **Microtask Queue**:
  - `process.nextTick()` and resolved `Promise.then()` callbacks run immediately after the current operation completes, before the event loop advances to the next phase.
