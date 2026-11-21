> **Memcached** and **Redis** are two servers that keep data in memory and store it by key and answer in a fraction of a millisecond. Memcached does one job in a small, simple way. Redis does the same job and adds data structures, persistence and replication, at the price of more to understand.

The last topics talked about "a cache server" in general. In practice a team picks one of these two, and the choice shapes what the cache can do. This topic walks through both, using the textbook app's data, and ends with how to choose.

## Memcached: Small and Simple

Memcached is a key-value store that keeps data in memory, for small pieces of arbitrary data. The server doesn't care what the data looks like: it stores bytes under a key.

The servers are unaware of each other and don't replicate, and the client chooses a server by hashing the key, as in [Consistent Hashing](/system-design/consistent-hashing). When memory fills, old entries are evicted by LRU, and entries can carry an expiry time.

The text protocol is small enough to read. This stores 5 bytes for 60 seconds and fetches them:

```text
set listing:17 0 60 5
hello
STORED
get listing:17
VALUE listing:17 0 5
hello
END
```

The numbers after the key are flags that the client may use as it likes, the expiry in seconds, and the length of the data. The other commands: `add` fails if the key exists, `replace` fails if it doesn't, `incr` and `decr` change a number, and `delete` removes.

The one for safe updates is `cas`, which stores a value only if nobody has changed it since you read it with `gets`. That is the same protection against the lost update from [Isolation Levels](/system-design/isolation-levels), without locks.

The limits: a key can be up to 250 bytes, an item is 1 MiB by default, and the server uses 4 worker threads by default, so it can use several cores. Memcached must not be exposed directly to the internet.

## Redis: A Data Structure Server

Redis also stores values by key, but the values can have shape. Its values can be strings, hashes, lists, sets, sorted sets, streams and more, each with commands that change it in place. For the textbook app:

```text
HSET listing:17 title "Calculus" price_cents 4500
HINCRBY listing:17 views 1
ZADD popular:books 842 book:52
LPUSH recent:user:8 listing:17
LTRIM recent:user:8 0 19
```

The first two keep a listing as a hash, and `HINCRBY` adds one to the view count without reading the rest. The third keeps a ranking of popular books by score.

The last two keep a student's 20 most recently viewed listings. In Memcached each of these would be a value that the client reads, changes and writes back, and `cas` would be needed to make that safe.

Redis is mostly a server that runs commands on a single thread, though modern versions use threads for other work. It isn't designed to gain from many CPU cores, so the way to scale out is to run several instances, which is what [Distributed Caches](/system-design/distributed-caches) describes.

A command that runs alone is atomic, which is why `INCR` is safe. Each command normally waits for its reply, so a round trip is paid for each command, and **pipelining** sends many commands without waiting, which raises throughput significantly.

## Redis Can Keep Its Data

A Memcached restart empties the cache, which is acceptable for a cache. Redis offers two ways to keep data on disk:

```text
save 60 1000
appendonly yes
appendfsync everysec
```

- **RDB snapshots**: Redis forks and a child writes the whole data set to a file, here every 60 seconds if at least 1,000 keys changed. A snapshot is compact and restarts fast, but you can lose the changes since the last one, and the fork can pause clients for milliseconds, or up to about a second for a very large data set
- **AOF, the append-only file**: Each write command is added to a log and replayed on start. The `appendfsync` setting trades safety for speed: `always` waits for the disk before replying and is slow, `everysec` loses about a second of writes in a disaster and is the default, and `no` leaves the timing to the operating system

Use both if you want durability comparable to PostgreSQL, and a restart then uses the AOF, as the most complete. The idea is the same as the log in [Write-Ahead Logs](/system-design/write-ahead-logs): record the change first, and replay it after a crash.

Replication is asynchronous by default. A replica started with `replicaof host port` catches up with a full copy followed by a stream of commands.

The `WAIT` command makes a client wait until some replicas acknowledge its writes, but even that doesn't make Redis strongly consistent, because acknowledged writes can still be lost in a failover.

One warning from Redis's own documentation is worth knowing: if a master without persistence restarts empty, its replicas copy the empty state and erase their own data.

## Side by Side

| Feature | Memcached | Redis |
| --- | --- | --- |
| Values | Bytes | Strings, hashes, lists, sets, sorted sets, streams and more |
| Threads | Several workers | Mostly one for commands |
| Disk | None | Snapshots and an append-only log |
| Replication | None in the server | Replicas, and clusters with failover |
| Spreading Keys | The client hashes | Redis Cluster slots, or the client |
| Extras | `cas`, `incr` | Transactions, Lua scripts, pub/sub, geospatial queries |

## Choosing

Memcached suits you if you want the simplest model, run large nodes with many cores, scale by adding and removing nodes, and mainly cache objects. Redis suits you if you want its wider set of features.

For the textbook app, that gives a clear split:

- **Page and search caches**: Either one does the job, and the simple model is enough
- **Sessions, counters and rankings**: Redis, because of the structures and atomic commands
- **Anything that must survive a restart**: Redis with persistence and replicas, and a plan for backups

The last line carries a caution. Once a Redis instance holds data you can't rebuild, it is a database and needs a database's care: persistence settings, replicas, backups and a memory limit. With `noeviction`, a full instance refuses writes, as in [Cache Eviction Policies](/system-design/cache-eviction).

A cache can disappear at any time, so the real source of truth should live elsewhere. For a session store, that means accepting that a failure logs people out, or backing it with a database.

One more factor is the license. Redis OSS 7.2 was the last version under its older open source license, Redis 8.0 Community Edition uses AGPLv3, which some organizations forbid, and Valkey, a fork, is a more permissive option. Memcached is under the BSD license. Check what your organization allows before choosing.

## Key Points

- Memcached is a simple, multithreaded cache of bytes by key, with no replication or disk, where the client chooses the server
- Redis adds data structures changed in place, atomic commands, persistence with snapshots and a log, replicas and clusters
- Redis mostly runs commands on one thread, so scale it with more instances and use pipelining to cut round trips
- <u>Treat Redis as a database once it holds data you can't rebuild</u>, with persistence, replicas, backups and a memory limit
- Choose Memcached for a plain object cache, Redis for structures and durability, and check the license
