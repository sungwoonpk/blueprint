// The roadmap is the single source of truth for the site structure.
//
// - Display numbers (1.1, 1.2, ...) come from the order here, so reordering is safe.
// - A topic's slug is stable and names its article: src/content/topics/<slug>.md
// - A topic is "published" when its article exists and is not marked draft.

export interface Topic {
  slug: string;
  title: string;
  /** Optional sub-heading used to cluster topics inside a phase. */
  group?: string;
}

export interface Phase {
  slug: string;
  title: string;
  topics: Topic[];
}

type Row = [slug: string, title: string, group?: string];

const topics = (rows: Row[]): Topic[] =>
  rows.map(([slug, title, group]) => ({ slug, title, group }));

export const phases: Phase[] = [
  {
    slug: 'foundations',
    title: 'Foundations',
    topics: topics([
      ['what-is-system-design', 'What System Design Is', 'Basics'],
      ['requirements', 'Functional and Non-Functional Requirements', 'Basics'],
      ['estimation', 'Back-of-the-Envelope Estimation', 'Basics'],
      ['latency-numbers', 'Latency Numbers Every Engineer Should Know', 'Basics'],
      ['client-server', 'The Client-Server Model and Request Flow', 'Networking'],
      ['dns', 'How DNS Works', 'Networking'],
      ['http', 'HTTP', 'Networking'],
      ['tcp-udp', 'TCP vs UDP', 'Networking'],
      ['tls-https', 'TLS and HTTPS', 'Networking'],
      ['scalability', 'Scalability: Vertical vs Horizontal', 'Core Qualities'],
      ['stateless-stateful', 'Stateless vs Stateful Services', 'Core Qualities'],
      ['bottlenecks', 'Performance vs Scalability, and Finding Bottlenecks', 'Core Qualities'],
      ['latency-throughput', 'Latency vs Throughput', 'Core Qualities'],
      ['availability', 'Availability and the Nines', 'Core Qualities'],
      ['failover', 'Failover: Active-Passive and Active-Active', 'Core Qualities'],
      ['reliability', 'Reliability, Fault Tolerance and Maintainability', 'Core Qualities'],
    ]),
  },
  {
    slug: 'traffic-and-apis',
    title: 'Traffic and APIs',
    topics: topics([
      ['dns-routing', 'DNS-Based Traffic Routing', 'Traffic Entry'],
      ['cdn', 'Content Delivery Networks (CDNs)', 'Traffic Entry'],
      ['proxies', 'Forward and Reverse Proxies', 'Traffic Entry'],
      ['load-balancers', 'Load Balancers: L4 vs L7', 'Traffic Entry'],
      ['load-balancing-algorithms', 'Load Balancing Algorithms and Health Checks', 'Traffic Entry'],
      ['api-gateway', 'API Gateway', 'Traffic Entry'],
      ['rate-limiting-algorithms', 'Rate Limiting Algorithms', 'Protection'],
      ['rate-limiting-placement', 'Where to Rate Limit, and 429 Responses', 'Protection'],
      ['ddos', 'DDoS Protection', 'Protection'],
      ['monolith-microservices', 'Monolith vs Microservices', 'Services'],
      ['service-discovery', 'Service Discovery', 'Services'],
      ['serverless', 'Serverless', 'Services'],
      ['rest', 'REST', 'API Design'],
      ['rpc-grpc', 'RPC and gRPC', 'API Design'],
      ['graphql', 'GraphQL', 'API Design'],
      ['api-style-choice', 'Choosing Between REST, RPC and GraphQL', 'API Design'],
      ['versioning-pagination', 'API Versioning and Pagination', 'API Design'],
      ['idempotency', 'Idempotency', 'API Design'],
      ['serialization', 'Serialization and Schema Evolution', 'API Design'],
      ['polling-sse', 'Polling, Long Polling and Server-Sent Events', 'Real-Time Communication'],
      ['websockets', 'WebSockets', 'Real-Time Communication'],
      ['webhooks', 'Webhooks', 'Real-Time Communication'],
    ]),
  },
  {
    slug: 'data-and-caching',
    title: 'Data Storage and Caching',
    topics: topics([
      ['data-modeling', 'Data Modeling', 'Databases'],
      ['relational-databases', 'Relational Databases and Normalization', 'Databases'],
      ['indexing', 'Indexing and Query Optimization', 'Databases'],
      ['nosql-kv-document', 'NoSQL: Key-Value and Document Stores', 'Databases'],
      ['nosql-column-graph', 'NoSQL: Wide-Column and Graph Stores', 'Databases'],
      ['sql-vs-nosql', 'SQL vs NoSQL', 'Databases'],
      ['b-tree', 'B-Trees', 'Storage Internals'],
      ['lsm-wal', 'LSM Trees and Write-Ahead Logs', 'Storage Internals'],
      ['bloom-filters', 'Bloom Filters and Probabilistic Data Structures', 'Storage Internals'],
      ['storage-types', 'Block, Object and File Storage', 'Storage Internals'],
      ['replication-leader-follower', 'Leader-Follower Replication', 'Replication and Consistency'],
      ['replication-multi-leader-quorum', 'Multi-Leader Replication and Quorums', 'Replication and Consistency'],
      ['consistency-models', 'Consistency Models: Weak, Eventual, Strong', 'Replication and Consistency'],
      ['cap', 'The CAP Theorem', 'Replication and Consistency'],
      ['pacelc', 'PACELC', 'Replication and Consistency'],
      ['sharding', 'Partitioning and Sharding Strategies', 'Partitioning'],
      ['consistent-hashing', 'Consistent Hashing', 'Partitioning'],
      ['rebalancing-hot-keys', 'Rebalancing and Hot Keys', 'Partitioning'],
      ['acid-base', 'ACID vs BASE', 'Transactions'],
      ['isolation-levels', 'Isolation Levels', 'Transactions'],
      ['two-phase-commit', 'Distributed Transactions: Two-Phase Commit', 'Transactions'],
      ['sagas-tcc', 'Sagas and Try-Confirm-Cancel', 'Transactions'],
      ['search-inverted-index', 'Search and Inverted Indexes', 'Specialized Stores'],
      ['time-series', 'Time-Series Databases', 'Specialized Stores'],
      ['vector-databases', 'Vector Databases', 'Specialized Stores'],
      ['geospatial', 'Geospatial Indexes: Geohash and Quadtree', 'Specialized Stores'],
      ['cache-layers', 'Cache Layers', 'Caching'],
      ['cache-strategies', 'Read and Write Strategies', 'Caching'],
      ['eviction', 'Eviction Policies', 'Caching'],
      ['cache-invalidation', 'Cache Invalidation', 'Caching'],
      ['cache-stampede', 'Cache Stampede', 'Caching'],
      ['distributed-cache', 'Distributed Caches', 'Caching'],
      ['redis', 'Redis Fundamentals', 'Caching'],
    ]),
  },
  {
    slug: 'messaging-and-streaming',
    title: 'Messaging and Streaming',
    topics: topics([
      ['queue-types', 'Message Queues, Task Queues and Pub/Sub', 'Queues'],
      ['kafka-vs-rabbitmq', 'Kafka vs RabbitMQ', 'Queues'],
      ['delivery-guarantees', 'Delivery Guarantees', 'Queues'],
      ['retries-dlq-backpressure', 'Retries, Dead-Letter Queues and Back Pressure', 'Queues'],
      ['event-driven', 'Event-Driven Architecture', 'Event-Driven Design'],
      ['event-sourcing', 'Event Sourcing', 'Event-Driven Design'],
      ['cqrs', 'CQRS', 'Event-Driven Design'],
      ['transactional-outbox', 'The Transactional Outbox', 'Event-Driven Design'],
      ['cdc', 'Change Data Capture', 'Event-Driven Design'],
      ['batch-vs-stream', 'Batch vs Stream Processing', 'Processing'],
      ['workflow-engines', 'Workflow Engines for Long-Running Tasks', 'Processing'],
      ['task-schedulers', 'Distributed Task Schedulers', 'Processing'],
    ]),
  },
  {
    slug: 'distributed-systems',
    title: 'Distributed Systems',
    topics: topics([
      ['why-distributed-is-hard', 'Why Distributed Systems Are Hard', 'Fundamentals'],
      ['clocks-ordering', 'Clocks and Ordering', 'Fundamentals'],
      ['failure-detection', 'Failure Detection: Heartbeats and Gossip', 'Fundamentals'],
      ['consensus-leader-election', 'Consensus and Leader Election', 'Agreement'],
      ['raft', 'Raft', 'Agreement'],
      ['distributed-locks', 'Distributed Locks', 'Agreement'],
      ['unique-ids', 'Unique ID Generation', 'Agreement'],
      ['conflict-resolution', 'Vector Clocks, CRDTs and Conflict Resolution', 'Convergence'],
      ['anti-entropy', 'Hinted Handoff and Anti-Entropy', 'Convergence'],
    ]),
  },
  {
    slug: 'running-in-production',
    title: 'Running in Production',
    topics: topics([
      ['timeouts-retries', 'Timeouts and Retries', 'Resilience'],
      ['circuit-breaker', 'Circuit Breakers', 'Resilience'],
      ['bulkhead', 'Bulkheads', 'Resilience'],
      ['observability', 'Logging, Metrics and Tracing', 'Observability'],
      ['alerting', 'Alerting and Dashboards', 'Observability'],
      ['slo', 'SLIs, SLOs and Error Budgets', 'Observability'],
      ['load-testing', 'Load and Stress Testing', 'Delivery'],
      ['deployments', 'Deployment Strategies: Rolling, Blue-Green and Canary', 'Delivery'],
      ['authn-authz', 'Authentication and Authorization', 'Security'],
      ['oauth-jwt', 'OAuth and JWT', 'Security'],
      ['encryption', 'Encryption in Transit and at Rest', 'Security'],
      ['privacy', 'Data Privacy and Compliance', 'Security'],
      ['backup-dr', 'Backup and Disaster Recovery', 'Recovery and Cost'],
      ['outages', 'Learning from Real Outages', 'Recovery and Cost'],
      ['cost-performance', 'Cost vs Performance', 'Recovery and Cost'],
    ]),
  },
  {
    slug: 'patterns',
    title: 'Patterns',
    topics: topics([
      ['pattern-scaling-reads', 'Scaling Reads', 'Scale'],
      ['pattern-scaling-writes', 'Scaling Writes', 'Scale'],
      ['pattern-large-blobs', 'Large Files and Blobs', 'Scale'],
      ['pattern-contention', 'Handling Contention', 'Coordination'],
      ['pattern-long-running-work', 'Long-Running and Multi-Step Work', 'Coordination'],
      ['pattern-push-updates', 'Pushing Updates to Clients', 'Real-Time'],
    ]),
  },
  {
    slug: 'ai-systems',
    title: 'AI Systems',
    topics: topics([
      ['ai-model-serving', 'Model Serving', 'Models'],
      ['ai-evaluation', 'Evaluating AI Systems', 'Models'],
      ['ai-rag', 'Retrieval-Augmented Generation', 'Applications'],
      ['ai-agents', 'Agents and Tool Use', 'Applications'],
    ]),
  },
  {
    slug: 'classic-systems',
    title: 'Classic Systems',
    topics: topics([
      ['classic-gfs-hdfs', 'GFS and HDFS', 'Storage'],
      ['classic-bigtable', 'Bigtable', 'Storage'],
      ['classic-dynamo', 'Dynamo', 'Storage'],
      ['classic-cassandra', 'Cassandra', 'Storage'],
      ['classic-spanner', 'Spanner', 'Storage'],
      ['classic-mapreduce', 'MapReduce', 'Processing'],
      ['classic-spark', 'Spark', 'Processing'],
      ['classic-zookeeper-chubby', 'Chubby and ZooKeeper', 'Coordination and Messaging'],
      ['classic-kafka', 'Kafka', 'Coordination and Messaging'],
      ['classic-dapper', 'Dapper', 'Coordination and Messaging'],
    ]),
  },
];

export interface NumberedTopic extends Topic {
  /** Display number such as "4.12". */
  number: string;
  phase: Phase;
  phaseNumber: number;
}

export const numberedTopics: NumberedTopic[] = phases.flatMap((phase, p) =>
  phase.topics.map((topic, t) => ({
    ...topic,
    number: `${p + 1}.${t + 1}`,
    phase,
    phaseNumber: p + 1,
  })),
);

export function findTopic(slug: string): NumberedTopic | undefined {
  return numberedTopics.find((t) => t.slug === slug);
}

export interface TopicGroup {
  name: string | undefined;
  topics: NumberedTopic[];
}

/** Topics of one phase, clustered by their optional group label, in roadmap order. */
export function groupedTopics(phase: Phase): TopicGroup[] {
  const groups: TopicGroup[] = [];
  for (const topic of numberedTopics.filter((t) => t.phase === phase)) {
    const last = groups[groups.length - 1];
    if (last && last.name === topic.group) last.topics.push(topic);
    else groups.push({ name: topic.group, topics: [topic] });
  }
  return groups;
}
