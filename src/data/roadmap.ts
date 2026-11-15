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
      ['what-is-system-design', 'What Is System Design?', 'Basics'],
      ['trade-offs', 'Thinking in Tradeoffs', 'Basics'],
      ['requirements', 'Functional and Nonfunctional Requirements', 'Basics'],
      ['latency-numbers', 'Latency Numbers Every Engineer Should Know', 'Basics'],
      ['estimation', 'Capacity Estimation', 'Basics'],
      ['client-server', 'Clients, Servers and Request Flow', 'Networking'],
      ['dns', 'How DNS Works', 'Networking'],
      ['tcp-udp', 'TCP vs UDP', 'Networking'],
      ['http', 'How HTTP Works', 'Networking'],
      ['tls-https', 'TLS and HTTPS', 'Networking'],
      ['latency-throughput', 'Latency vs Throughput', 'Core Qualities'],
      ['bottlenecks', 'Performance vs Scalability', 'Core Qualities'],
      ['scalability', 'Vertical vs Horizontal Scaling', 'Core Qualities'],
      ['stateless-stateful', 'Stateless vs Stateful Services', 'Core Qualities'],
      ['availability', 'Availability and the Nines', 'Core Qualities'],
      ['redundancy-failover', 'Redundancy and Failover', 'Core Qualities'],
      ['reliability', 'Reliability, Fault Tolerance and Maintainability', 'Core Qualities'],
    ]),
  },
  {
    slug: 'apis-traffic-services',
    title: 'APIs, Traffic and Services',
    topics: topics([
      ['rest', 'REST', 'API Design'],
      ['rpc-grpc', 'RPC and gRPC', 'API Design'],
      ['graphql', 'GraphQL', 'API Design'],
      ['api-style-choice', 'Choosing Between REST, RPC and GraphQL', 'API Design'],
      ['api-versioning', 'API Versioning', 'API Design'],
      ['pagination', 'Pagination', 'API Design'],
      ['idempotency', 'Idempotency', 'API Design'],
      ['serialization', 'Serialization and Schema Evolution', 'API Design'],
      ['polling-sse', 'Polling, Long Polling and Server-Sent Events', 'Real Time and Push'],
      ['websockets', 'WebSockets', 'Real Time and Push'],
      ['webhooks', 'Webhooks', 'Real Time and Push'],
      ['proxies', 'Forward and Reverse Proxies', 'Traffic Entry'],
      ['load-balancers', 'L4 vs L7 Load Balancers', 'Traffic Entry'],
      ['load-balancing-algorithms', 'Load Balancing Algorithms and Health Checks', 'Traffic Entry'],
      ['dns-routing', 'Traffic Routing with DNS', 'Traffic Entry'],
      ['cdn', 'Content Delivery Networks (CDNs)', 'Traffic Entry'],
      ['rate-limiting-algorithms', 'Rate Limiting Algorithms', 'Protection'],
      ['rate-limiting-in-practice', 'Rate Limiting in Practice', 'Protection'],
      ['ddos', 'DDoS Protection', 'Protection'],
      ['monolith-microservices', 'Monolith vs Microservices', 'Services'],
      ['containers', 'Containers and Orchestration', 'Services'],
      ['service-discovery', 'Service Discovery', 'Services'],
      ['api-gateway', 'API Gateways', 'Services'],
      ['service-mesh', 'Service Meshes and Sidecars', 'Services'],
      ['serverless', 'Serverless', 'Services'],
    ]),
  },
  {
    slug: 'data-and-caching',
    title: 'Data Storage and Caching',
    topics: topics([
      ['data-modeling', 'Data Modeling', 'Databases'],
      ['relational-databases', 'Relational Databases', 'Databases'],
      ['normalization', 'Normalization vs Denormalization', 'Databases'],
      ['indexing', 'Indexing and Query Optimization', 'Databases'],
      ['transactions-acid', 'Transactions and ACID', 'Databases'],
      ['isolation-levels', 'Isolation Levels', 'Databases'],
      ['nosql-kv-document', 'Key-Value and Document Stores', 'NoSQL'],
      ['nosql-column-graph', 'Wide Column and Graph Stores', 'NoSQL'],
      ['sql-vs-nosql', 'SQL vs NoSQL', 'NoSQL'],
      ['cache-layers', 'Cache Layers', 'Caching'],
      ['cache-strategies', 'Caching Strategies', 'Caching'],
      ['eviction', 'Cache Eviction Policies', 'Caching'],
      ['cache-invalidation', 'Cache Invalidation', 'Caching'],
      ['cache-stampede', 'Cache Stampede', 'Caching'],
      ['consistent-hashing', 'Consistent Hashing', 'Caching'],
      ['distributed-cache', 'Distributed Caches', 'Caching'],
      ['redis', 'Redis Fundamentals', 'Caching'],
      ['storage-types', 'Block, Object and File Storage', 'Specialized Storage'],
      ['oltp-olap', 'OLTP vs OLAP', 'Specialized Storage'],
      ['search-inverted-index', 'Search Engines and Inverted Indexes', 'Specialized Storage'],
      ['time-series', 'Time Series Databases', 'Specialized Storage'],
      ['vector-databases', 'Vector Databases', 'Specialized Storage'],
      ['geospatial', 'Geospatial Indexes', 'Specialized Storage'],
      ['b-tree', 'B-Trees', 'Storage Internals'],
      ['lsm-wal', 'LSM Trees and Write-Ahead Logs', 'Storage Internals'],
      ['bloom-filters', 'Bloom Filters and Probabilistic Data Structures', 'Storage Internals'],
    ]),
  },
  {
    slug: 'async-processing',
    title: 'Asynchronous Processing',
    topics: topics([
      ['queue-types', 'Message Queues, Task Queues and Pub/Sub', 'Messaging'],
      ['delivery-guarantees', 'Delivery Guarantees', 'Messaging'],
      ['message-ordering', 'Message Ordering and Consumer Groups', 'Messaging'],
      ['retries-dlq-backpressure', 'Retries, Dead Letter Queues and Backpressure', 'Messaging'],
      ['kafka-vs-rabbitmq', 'Kafka vs RabbitMQ', 'Messaging'],
      ['event-driven', 'Event-Driven Architecture', 'Events'],
      ['transactional-outbox', 'Transactional Outbox', 'Events'],
      ['cdc', 'Change Data Capture', 'Events'],
      ['event-sourcing', 'Event Sourcing', 'Events'],
      ['cqrs', 'CQRS', 'Events'],
      ['batch-vs-stream', 'Batch vs Stream Processing', 'Stream Processing'],
      ['stream-windows', 'Windows and Watermarks', 'Stream Processing'],
      ['task-schedulers', 'Distributed Task Schedulers', 'Background Jobs'],
      ['workflow-engines', 'Workflow Engines', 'Background Jobs'],
    ]),
  },
  {
    slug: 'distributed-systems',
    title: 'Distributed Systems',
    topics: topics([
      ['why-distributed-is-hard', 'Why Distributed Systems Are Hard', 'Fundamentals'],
      ['failure-detection', 'Failure Detection', 'Fundamentals'],
      ['replication-leader-follower', 'Leader and Follower Replication', 'Replication'],
      ['replication-multi-leader', 'Replication with Multiple Leaders', 'Replication'],
      ['replication-leaderless', 'Leaderless Replication and Quorums', 'Replication'],
      ['consistency-models', 'Weak, Eventual and Strong Consistency', 'Consistency'],
      ['cap', 'The CAP Theorem', 'Consistency'],
      ['pacelc', 'PACELC', 'Consistency'],
      ['acid-base', 'ACID vs BASE', 'Consistency'],
      ['sharding', 'Sharding Strategies', 'Partitioning'],
      ['rebalancing-hot-keys', 'Rebalancing and Hot Keys', 'Partitioning'],
      ['two-phase-commit', 'Two-Phase Commit', 'Distributed Transactions'],
      ['sagas-tcc', 'Sagas', 'Distributed Transactions'],
      ['clocks-ordering', 'Clocks and Ordering', 'Time and Order'],
      ['unique-ids', 'Unique ID Generation', 'Time and Order'],
      ['consensus-leader-election', 'Consensus and Leader Election', 'Coordination'],
      ['raft', 'Raft', 'Coordination'],
      ['distributed-locks', 'Distributed Locks and Fencing Tokens', 'Coordination'],
      ['conflict-resolution', 'Vector Clocks and CRDTs', 'Convergence'],
      ['anti-entropy', 'Hinted Handoff and Merkle Trees', 'Convergence'],
    ]),
  },
  {
    slug: 'running-in-production',
    title: 'Running in Production',
    topics: topics([
      ['observability', 'Logging, Metrics and Tracing', 'Observability'],
      ['slo', 'SLIs, SLOs and Error Budgets', 'Observability'],
      ['alerting', 'Alerting and Dashboards', 'Observability'],
      ['timeouts-retries', 'Timeouts, Retries and Backoff', 'Resilience'],
      ['circuit-breaker', 'Circuit Breakers', 'Resilience'],
      ['bulkhead', 'Bulkheads', 'Resilience'],
      ['load-shedding', 'Load Shedding and Graceful Degradation', 'Resilience'],
      ['load-testing', 'Load and Stress Testing', 'Capacity and Cost'],
      ['autoscaling', 'Autoscaling and Capacity Planning', 'Capacity and Cost'],
      ['cost-performance', 'Cost vs Performance', 'Capacity and Cost'],
      ['deployments', 'Rolling, Blue-Green and Canary Deployments', 'Delivery'],
      ['feature-flags', 'Feature Flags', 'Delivery'],
      ['schema-migrations', 'Schema Migrations Without Downtime', 'Delivery'],
      ['authn-authz', 'Authentication and Authorization', 'Security'],
      ['oauth-jwt', 'OAuth and JWT', 'Security'],
      ['encryption', 'Encryption in Transit and at Rest', 'Security'],
      ['secrets', 'Secrets and Key Management', 'Security'],
      ['privacy', 'Data Privacy and Compliance', 'Security'],
      ['backup-dr', 'Backup and Disaster Recovery', 'Recovery'],
      ['multi-region', 'Deploying Across Regions', 'Recovery'],
      ['outages', 'Learning from Outages', 'Recovery'],
    ]),
  },
  {
    slug: 'patterns',
    title: 'Patterns',
    topics: topics([
      ['pattern-scaling-reads', 'Scaling Reads', 'Scaling'],
      ['pattern-scaling-writes', 'Scaling Writes', 'Scaling'],
      ['pattern-traffic-spikes', 'Absorbing Traffic Spikes', 'Scaling'],
      ['pattern-counting', 'Counting at Scale', 'Scaling'],
      ['pattern-large-blobs', 'Handling Large Files', 'Scaling'],
      ['pattern-contention', 'Handling Contention', 'Contention and Workflows'],
      ['pattern-long-running-work', 'Managing Long Jobs and Multistep Workflows', 'Contention and Workflows'],
      ['pattern-fan-out', 'Fanout on Write vs on Read', 'Fanout and Push'],
      ['pattern-push-updates', 'Pushing Updates to Clients', 'Fanout and Push'],
    ]),
  },
  {
    slug: 'ai-systems',
    title: 'AI Systems',
    topics: topics([
      ['ai-model-serving', 'Model Serving', 'Building Blocks'],
      ['ai-embeddings', 'Embeddings and Semantic Search', 'Building Blocks'],
      ['ai-rag', 'Retrieval-Augmented Generation', 'Building Blocks'],
      ['ai-agents', 'Agents and Tool Use', 'Building Blocks'],
      ['ai-evaluation', 'Evaluating AI Systems', 'Quality and Safety'],
      ['ai-guardrails', 'Guardrails', 'Quality and Safety'],
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
      ['classic-zookeeper-chubby', 'Chubby and ZooKeeper', 'Infrastructure'],
      ['classic-dapper', 'Dapper', 'Infrastructure'],
      ['classic-kafka', 'Kafka', 'Infrastructure'],
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
