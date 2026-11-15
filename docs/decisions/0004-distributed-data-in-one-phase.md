# 4. Distributed data lives with distributed systems

**Decision:** Replication, consistency, partitioning and distributed transactions move from Data Storage and Caching into Distributed Systems. Data Storage and Caching keeps storage on one machine and caching, with each group building on the one before. Consistent hashing moves to the caching group, next to distributed caches.

**Why:** Data Storage and Caching had grown to 37 topics covering two subjects: storing data on one machine (relational databases, indexes, caching) and spreading it over many (leaderless replication, PACELC, two-phase commit). Caching came after distributed transactions even though it needs none of them. Distributed Systems had only the theory (clocks, consensus, CRDTs) cut off from the replication and consistency problems that motivate it. Keeping distributed data and its theory together, as DDIA does, makes each phase one subject, which works for a reader going in order and for one jumping straight to a phase. Consistent hashing was invented for distributed web caches, so it is taught where it is first needed.

**Costs:** Topic numbers in phases 3 and 5 changed (no articles existed yet). Messaging mentions partitions before partitioning is covered in depth.

**Alternatives:** Split Data Storage and Caching into two phases (ten phases, and distributed theory still separate from the data problems), or keep the old layout and only reorder groups (caching would still follow distributed transactions, and the theory would stay cut off).
