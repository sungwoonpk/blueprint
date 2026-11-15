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
      ['numbers', 'Numbers Every Engineer Should Know', 'Basics'],
      ['estimation', 'Capacity Estimation', 'Basics'],
      ['client-server', 'Clients and Servers', 'Networking'],
      ['dns', 'DNS', 'Networking'],
      ['tcp-udp', 'TCP and UDP', 'Networking'],
      ['http', 'HTTP', 'Networking'],
      ['tls-https', 'TLS and HTTPS', 'Networking'],
      ['life-of-a-request', 'The Life of a Request', 'Networking'],
      ['latency-throughput', 'Latency and Throughput', 'Core Qualities'],
      ['performance-scalability', 'Performance and Scalability', 'Core Qualities'],
      ['scaling', 'Vertical and Horizontal Scaling', 'Core Qualities'],
      ['stateless-stateful', 'Stateless and Stateful Services', 'Core Qualities'],
      ['availability', 'Availability and the Nines', 'Core Qualities'],
      ['redundancy-failover', 'Redundancy and Failover', 'Core Qualities'],
      ['reliability', 'Reliability and Fault Tolerance', 'Core Qualities'],
      ['maintainability', 'Maintainability', 'Core Qualities'],
    ]),
  },
  {
    slug: 'apis-traffic-services',
    title: 'APIs, Traffic and Services',
    topics: topics([
      ['api-design-principles', 'API Design Principles', 'API Design'],
      ['rest', 'REST', 'API Design'],
      ['rpc-grpc', 'RPC and gRPC', 'API Design'],
      ['graphql', 'GraphQL', 'API Design'],
      ['api-style-choice', 'Choosing Between REST, RPC and GraphQL', 'API Design'],
      ['pagination', 'Pagination', 'API Design'],
      ['api-versioning', 'API Versioning', 'API Design'],
      ['idempotency', 'Idempotency', 'API Design'],
      ['serialization', 'Serialization and Schema Evolution', 'API Design'],
      ['polling', 'Polling and Long Polling', 'Beyond Request and Response'],
      ['server-sent-events', 'Server-Sent Events', 'Beyond Request and Response'],
      ['websockets', 'WebSockets', 'Beyond Request and Response'],
      ['webhooks', 'Webhooks', 'Beyond Request and Response'],
      ['proxies', 'Forward and Reverse Proxies', 'Routing Traffic'],
      ['load-balancers', 'Load Balancers', 'Routing Traffic'],
      ['load-balancing-algorithms', 'Load Balancing Algorithms', 'Routing Traffic'],
      ['health-checks', 'Health Checks', 'Routing Traffic'],
      ['global-routing', 'Global Traffic Routing', 'Routing Traffic'],
      ['cdn', 'Content Delivery Networks (CDNs)', 'Routing Traffic'],
      ['rate-limiting-algorithms', 'Rate Limiting Algorithms', 'Protection'],
      ['rate-limiting-in-practice', 'Rate Limiting in Practice', 'Protection'],
      ['ddos', 'DDoS Mitigation', 'Protection'],
      ['monoliths-microservices', 'Monoliths and Microservices', 'Services'],
      ['containers', 'Containers and Orchestration', 'Services'],
      ['service-discovery', 'Service Discovery', 'Services'],
      ['api-gateways', 'API Gateways', 'Services'],
      ['service-mesh', 'Service Meshes and Sidecars', 'Services'],
      ['serverless', 'Serverless Computing', 'Services'],
    ]),
  },
  {
    slug: 'data-and-caching',
    title: 'Data Storage and Caching',
    topics: topics([
      ['data-modeling', 'Data Modeling', 'Relational Databases'],
      ['relational-model', 'The Relational Model', 'Relational Databases'],
      ['normalization', 'Normalization and Denormalization', 'Relational Databases'],
      ['indexing', 'Indexing and Query Optimization', 'Relational Databases'],
      ['transactions-acid', 'Transactions and ACID', 'Relational Databases'],
      ['isolation-levels', 'Isolation Levels', 'Relational Databases'],
      ['key-value-stores', 'Key-Value Stores', 'NoSQL'],
      ['document-stores', 'Document Stores', 'NoSQL'],
      ['wide-column-stores', 'Wide Column Stores', 'NoSQL'],
      ['graph-databases', 'Graph Databases', 'NoSQL'],
      ['sql-nosql', 'Choosing Between SQL and NoSQL', 'NoSQL'],
      ['where-to-cache', 'Where to Cache', 'Caching'],
      ['caching-patterns', 'Caching Patterns', 'Caching'],
      ['cache-eviction', 'Cache Eviction', 'Caching'],
      ['cache-invalidation', 'Cache Invalidation', 'Caching'],
      ['cache-stampedes', 'Cache Stampedes', 'Caching'],
      ['consistent-hashing', 'Consistent Hashing', 'Caching'],
      ['distributed-caches', 'Distributed Caches', 'Caching'],
      ['redis-memcached', 'Redis and Memcached', 'Caching'],
      ['storage-types', 'Block, Object and File Storage', 'Specialized Storage'],
      ['oltp-olap', 'OLTP and OLAP', 'Specialized Storage'],
      ['search-engines', 'Search Engines and Inverted Indexes', 'Specialized Storage'],
      ['time-series', 'Time Series Databases', 'Specialized Storage'],
      ['geospatial', 'Geospatial Indexes', 'Specialized Storage'],
      ['write-ahead-logs', 'Write-Ahead Logs', 'Storage Internals'],
      ['b-trees', 'B-Trees', 'Storage Internals'],
      ['lsm-trees', 'LSM Trees', 'Storage Internals'],
      ['probabilistic-structures', 'Bloom Filters and Probabilistic Data Structures', 'Storage Internals'],
      ['column-storage', 'Column-Oriented Storage', 'Storage Internals'],
    ]),
  },
  {
    slug: 'async-processing',
    title: 'Asynchronous Processing',
    topics: topics([
      ['message-queues', 'Message Queues and Pub/Sub', 'Messaging'],
      ['delivery-guarantees', 'Delivery Guarantees', 'Messaging'],
      ['ordering', 'Ordering and Consumer Groups', 'Messaging'],
      ['redelivery-dlq', 'Redelivery and Dead Letter Queues', 'Messaging'],
      ['backpressure', 'Backpressure', 'Messaging'],
      ['log-based-brokers', 'Log-Based Message Brokers', 'Messaging'],
      ['event-driven', 'Event-Driven Architecture', 'Events'],
      ['transactional-outbox', 'Transactional Outbox', 'Events'],
      ['cdc', 'Change Data Capture', 'Events'],
      ['event-sourcing', 'Event Sourcing', 'Events'],
      ['cqrs', 'CQRS', 'Events'],
      ['batch-processing', 'Batch Processing', 'Data Processing'],
      ['stream-processing', 'Stream Processing', 'Data Processing'],
      ['windows-watermarks', 'Windows and Watermarks', 'Data Processing'],
      ['task-queues', 'Task Queues', 'Background Jobs'],
      ['job-schedulers', 'Job Schedulers', 'Background Jobs'],
      ['workflow-engines', 'Workflow Engines', 'Background Jobs'],
    ]),
  },
  {
    slug: 'distributed-systems',
    title: 'Distributed Systems',
    topics: topics([
      ['why-distributed-is-hard', 'Why Distributed Systems Are Hard', 'Fundamentals'],
      ['failure-detection', 'Failure Detection', 'Fundamentals'],
      ['clocks', 'Physical and Logical Clocks', 'Time and Order'],
      ['unique-ids', 'Unique ID Generation', 'Time and Order'],
      ['replication-one-leader', 'Replication with One Leader', 'Replication'],
      ['replication-many-leaders', 'Replication with Many Leaders', 'Replication'],
      ['leaderless-replication', 'Leaderless Replication and Quorums', 'Replication'],
      ['replication-lag', 'Replication Lag', 'Replication'],
      ['consistency-models', 'Consistency Models', 'Consistency'],
      ['cap', 'The CAP Theorem', 'Consistency'],
      ['pacelc', 'PACELC', 'Consistency'],
      ['sharding', 'Sharding Strategies', 'Partitioning'],
      ['sharded-secondary-indexes', 'Secondary Indexes on Sharded Data', 'Partitioning'],
      ['rebalancing', 'Rebalancing Shards', 'Partitioning'],
      ['two-phase-commit', 'Two-Phase Commit', 'Distributed Transactions'],
      ['sagas', 'Sagas', 'Distributed Transactions'],
      ['consensus-leader-election', 'Consensus and Leader Election', 'Coordination'],
      ['raft', 'Raft', 'Coordination'],
      ['distributed-locks', 'Distributed Locks and Fencing Tokens', 'Coordination'],
      ['conflicts', 'Detecting and Resolving Conflicts', 'Convergence'],
      ['crdts', 'CRDTs', 'Convergence'],
      ['repairing-replicas', 'Repairing Replicas', 'Convergence'],
    ]),
  },
  {
    slug: 'running-in-production',
    title: 'Running in Production',
    topics: topics([
      ['observability', 'Logs, Metrics and Traces', 'Observability'],
      ['slo', 'SLIs, SLOs and Error Budgets', 'Observability'],
      ['alerting', 'Alerting and Dashboards', 'Observability'],
      ['cascading-failures', 'Cascading Failures', 'Resilience'],
      ['timeouts-retries', 'Timeouts, Retries and Backoff', 'Resilience'],
      ['circuit-breakers', 'Circuit Breakers', 'Resilience'],
      ['bulkheads', 'Bulkheads', 'Resilience'],
      ['load-shedding', 'Load Shedding and Graceful Degradation', 'Resilience'],
      ['cells', 'Cell-Based Architecture', 'Resilience'],
      ['capacity-planning', 'Capacity Planning', 'Capacity and Cost'],
      ['load-testing', 'Load Testing', 'Capacity and Cost'],
      ['autoscaling', 'Autoscaling', 'Capacity and Cost'],
      ['cost-performance', 'Balancing Cost and Performance', 'Capacity and Cost'],
      ['deployments', 'Deployment Strategies', 'Releasing Changes'],
      ['feature-flags', 'Feature Flags', 'Releasing Changes'],
      ['schema-migrations', 'Schema Migrations Without Downtime', 'Releasing Changes'],
      ['authn-authz', 'Authentication and Authorization', 'Security'],
      ['oauth-jwt', 'OAuth and JWT', 'Security'],
      ['encryption', 'Encryption at Rest and Mutual TLS', 'Security'],
      ['secrets', 'Secrets and Key Management', 'Security'],
      ['privacy', 'Data Privacy and Compliance', 'Security'],
      ['backup-dr', 'Backups and Disaster Recovery', 'Recovery'],
      ['region-outage', 'Surviving a Region Outage', 'Recovery'],
      ['postmortems', 'Incidents and Postmortems', 'Recovery'],
    ]),
  },
  {
    slug: 'patterns',
    title: 'Patterns',
    topics: topics([
      ['scaling-reads', 'Scaling Reads', 'Handling Load'],
      ['scaling-writes', 'Scaling Writes', 'Handling Load'],
      ['hot-spots', 'Handling Hot Spots', 'Handling Load'],
      ['traffic-spikes', 'Absorbing Traffic Spikes', 'Handling Load'],
      ['global-users', 'Serving Users Worldwide', 'Handling Load'],
      ['large-files', 'Storing Large Files', 'Working with Data'],
      ['keeping-copies-in-sync', 'Keeping Copies in Sync', 'Working with Data'],
      ['counting-ranking', 'Counting and Ranking at Scale', 'Working with Data'],
      ['location-search', 'Searching by Location', 'Working with Data'],
      ['contention', 'Handling Contention', 'Staying Correct'],
      ['duplicate-work', 'Avoiding Duplicate Work', 'Staying Correct'],
      ['long-work', 'Running Long and Multistep Work', 'Staying Correct'],
      ['feeds', 'Building Feeds', 'Reaching Users'],
      ['push-updates', 'Pushing Updates to Clients', 'Reaching Users'],
      ['breaking-up-a-monolith', 'Breaking Up a Monolith', 'Evolving Systems'],
      ['migrating-datastores', 'Migrating Between Datastores', 'Evolving Systems'],
    ]),
  },
  {
    slug: 'ai-systems',
    title: 'AI Systems',
    topics: topics([
      ['llm-inference', 'LLM Inference', 'Building Blocks'],
      ['model-serving', 'Model Serving', 'Building Blocks'],
      ['embeddings', 'Embeddings and Semantic Search', 'Building Blocks'],
      ['vector-databases', 'Vector Databases', 'Building Blocks'],
      ['rag', 'Retrieval-Augmented Generation', 'Building Blocks'],
      ['agents', 'Agents and Tool Use', 'Building Blocks'],
      ['ai-evaluation', 'Evaluation', 'Quality and Safety'],
      ['guardrails', 'Guardrails', 'Quality and Safety'],
    ]),
  },
  {
    slug: 'classic-systems',
    title: 'Classic Systems',
    topics: topics([
      ['gfs-hdfs', 'GFS and HDFS', 'Storage'],
      ['bigtable', 'Bigtable', 'Storage'],
      ['dynamo', 'Dynamo', 'Storage'],
      ['cassandra', 'Cassandra', 'Storage'],
      ['spanner', 'Spanner', 'Storage'],
      ['mapreduce', 'MapReduce', 'Processing'],
      ['spark', 'Spark', 'Processing'],
      ['chubby-zookeeper', 'Chubby and ZooKeeper', 'Infrastructure'],
      ['dapper', 'Dapper', 'Infrastructure'],
      ['kafka', 'Kafka', 'Infrastructure'],
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
