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
      ['one-server-to-many', 'From One Server to Many', 'Basics'],
      ['trade-offs', 'Thinking in Tradeoffs', 'Basics'],
      ['client-server', 'How Clients and Servers Talk', 'Networking'],
      ['dns', 'Finding Servers with DNS', 'Networking'],
      ['tcp-udp', 'Delivering Data with TCP and UDP', 'Networking'],
      ['http', 'Requests and Responses with HTTP', 'Networking'],
      ['tls-https', 'Securing Connections with TLS', 'Networking'],
      ['life-of-a-request', 'The Life of a Request', 'Networking'],
      ['latency-throughput', 'Measuring Latency and Throughput', 'Core Qualities'],
      ['performance-scalability', 'Telling Performance from Scalability', 'Core Qualities'],
      ['scaling', 'Scaling Up and Scaling Out', 'Core Qualities'],
      ['stateless-stateful', 'Keeping Services Stateless', 'Core Qualities'],
      ['availability', 'Measuring Availability in Nines', 'Core Qualities'],
      ['redundancy-failover', 'Surviving Failures with Redundancy and Failover', 'Core Qualities'],
      ['reliability', 'Building Reliable Systems from Unreliable Parts', 'Core Qualities'],
      ['maintainability', 'Designing for Maintainability', 'Core Qualities'],
      ['requirements', 'Defining Functional and Nonfunctional Requirements', 'Requirements and Estimation'],
      ['numbers', 'Numbers Every Engineer Should Know', 'Requirements and Estimation'],
      ['estimation', 'Estimating Capacity', 'Requirements and Estimation'],
    ]),
  },
  {
    slug: 'apis-traffic-services',
    title: 'APIs, Traffic and Services',
    topics: topics([
      ['good-apis', 'What Makes a Good API', 'API Design'],
      ['serialization', 'Serializing Data and Evolving Schemas', 'API Design'],
      ['rest', 'Modeling Resources with REST', 'API Design'],
      ['rpc-grpc', 'Calling Services with RPC and gRPC', 'API Design'],
      ['graphql', 'Flexible Queries with GraphQL', 'API Design'],
      ['api-style-choice', 'Choosing Between REST, RPC and GraphQL', 'API Design'],
      ['pagination', 'Paginating Large Results', 'API Design'],
      ['api-versioning', 'Versioning APIs Without Breaking Clients', 'API Design'],
      ['idempotency', 'Idempotent Requests and Safe Retries', 'API Design'],
      ['polling', 'Checking for Updates with Polling', 'Real-Time Communication'],
      ['server-sent-events', 'Streaming Updates with Server-Sent Events', 'Real-Time Communication'],
      ['websockets', 'Talking Both Ways with WebSockets', 'Real-Time Communication'],
      ['webhooks', 'Calling Other Systems Back with Webhooks', 'Real-Time Communication'],
      ['proxies', 'Standing in Front with a Proxy', 'Traffic Routing'],
      ['load-balancers', 'Spreading Load with Load Balancers', 'Traffic Routing'],
      ['load-balancing-algorithms', 'Choosing a Load Balancing Algorithm', 'Traffic Routing'],
      ['health-checks', 'Checking Server Health', 'Traffic Routing'],
      ['global-routing', 'Routing Users to the Nearest Region', 'Traffic Routing'],
      ['cdn', 'Serving Content from the Edge with CDNs', 'Traffic Routing'],
      ['monoliths-microservices', 'When to Split into Microservices', 'Services'],
      ['containers', 'Running Services in Containers', 'Services'],
      ['service-discovery', 'Finding Each Other with Service Discovery', 'Services'],
      ['api-gateways', 'Fronting Services with an API Gateway', 'Services'],
      ['service-mesh', 'Managing Traffic with Sidecars and a Service Mesh', 'Services'],
      ['serverless', 'Going Serverless', 'Services'],
      ['rate-limiting-algorithms', 'How Rate Limiting Algorithms Work', 'Protection'],
      ['rate-limiting-in-practice', 'Applying Rate Limits in Practice', 'Protection'],
      ['ddos', 'Withstanding DDoS Attacks', 'Protection'],
    ]),
  },
  {
    slug: 'data-and-caching',
    title: 'Data Storage and Caching',
    topics: topics([
      ['relational-model', 'Tables, Rows and the Relational Model', 'Relational Databases'],
      ['data-modeling', 'Turning a Domain into a Data Model', 'Relational Databases'],
      ['normalization', 'Choosing Between Normalization and Denormalization', 'Relational Databases'],
      ['indexing', 'Making Every Query Fast with Indexes', 'Relational Databases'],
      ['transactions-acid', 'All or Nothing with Transactions and ACID', 'Relational Databases'],
      ['isolation-levels', 'How Isolation Levels Prevent Anomalies', 'Relational Databases'],
      ['key-value-stores', 'Simple and Fast Key-Value Stores', 'NoSQL'],
      ['document-stores', 'Storing Whole Objects in Document Stores', 'NoSQL'],
      ['wide-column-stores', 'Huge Tables in Wide Column Stores', 'NoSQL'],
      ['graph-databases', 'Following Relationships with Graph Databases', 'NoSQL'],
      ['sql-nosql', 'Choosing Between SQL and NoSQL', 'NoSQL'],
      ['where-to-cache', 'Where to Put a Cache', 'Caching'],
      ['caching-patterns', 'Caching Patterns for Reads and Writes', 'Caching'],
      ['cache-eviction', 'Cache Eviction and Keeping Hot Data', 'Caching'],
      ['cache-invalidation', 'Keeping Caches Fresh with Invalidation', 'Caching'],
      ['cache-stampedes', 'Preventing Cache Stampedes', 'Caching'],
      ['consistent-hashing', 'Spreading Keys with Consistent Hashing', 'Caching'],
      ['distributed-caches', 'Running a Distributed Cache', 'Caching'],
      ['redis-memcached', 'Redis and Memcached in Practice', 'Caching'],
      ['storage-types', 'Choosing Between Block, Object and File Storage', 'Specialized Storage'],
      ['oltp-olap', 'From OLTP to OLAP and Data Warehouses', 'Specialized Storage'],
      ['search-engines', 'Full Text Search with Inverted Indexes', 'Specialized Storage'],
      ['time-series', 'Storing Metrics in Time Series Databases', 'Specialized Storage'],
      ['geospatial', 'Finding Nearby Points with Geospatial Indexes', 'Specialized Storage'],
      ['write-ahead-logs', 'Never Losing a Write with Write-Ahead Logs', 'Storage Internals'],
      ['b-trees', 'How B-Trees Organize Data on Disk', 'Storage Internals'],
      ['lsm-trees', 'Fast Writes with LSM Trees', 'Storage Internals'],
      ['probabilistic-structures', 'Approximate Answers with Bloom Filters and Sketches', 'Storage Internals'],
      ['column-storage', 'Fast Scans with Column-Oriented Storage', 'Storage Internals'],
    ]),
  },
  {
    slug: 'async-processing',
    title: 'Asynchronous Processing',
    topics: topics([
      ['when-async', 'When to Go Asynchronous', 'Messaging'],
      ['message-queues', 'Decoupling with Message Queues and Pub/Sub', 'Messaging'],
      ['log-based-brokers', 'Replayable Streams with Log-Based Brokers', 'Messaging'],
      ['delivery-guarantees', 'Delivery Guarantees and Exactly Once Processing', 'Messaging'],
      ['ordering', 'Keeping Order with Partitions and Consumer Groups', 'Messaging'],
      ['redelivery-dlq', 'Handling Failed Messages with Dead Letter Queues', 'Messaging'],
      ['backpressure', 'Slowing Producers Down with Backpressure', 'Messaging'],
      ['task-queues', 'Handing Off Work to Task Queues', 'Background Jobs'],
      ['job-schedulers', 'Running Recurring Work with Job Schedulers', 'Background Jobs'],
      ['workflow-engines', 'Coordinating Long Processes with Workflow Engines', 'Background Jobs'],
      ['event-driven', 'Reacting to Change with Event-Driven Architecture', 'Events'],
      ['transactional-outbox', 'Publishing Events Safely with a Transactional Outbox', 'Events'],
      ['cdc', 'Streaming Database Changes with Change Data Capture', 'Events'],
      ['event-sourcing', 'Storing History with Event Sourcing', 'Events'],
      ['cqrs', 'Separating Reads from Writes with CQRS', 'Events'],
      ['batch-processing', 'Crunching Large Datasets with Batch Processing', 'Data Processing'],
      ['stream-processing', 'Handling Data in Motion with Stream Processing', 'Data Processing'],
      ['windowing-watermarks', 'Windowing and Watermarks for Late Events', 'Data Processing'],
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
      ['sharding', 'Sharding Strategies', 'Sharding'],
      ['sharded-secondary-indexes', 'Secondary Indexes on Sharded Data', 'Sharding'],
      ['rebalancing', 'Rebalancing Shards', 'Sharding'],
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
      ['service-identity', 'Service Identity and Mutual TLS', 'Security'],
      ['encryption-at-rest', 'Encrypting Data at Rest', 'Security'],
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
      ['long-jobs', 'Running Long Jobs and Workflows', 'Staying Correct'],
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
