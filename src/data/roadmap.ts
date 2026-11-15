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
      ['what-is-system-design', 'What Is System Design?', 'The Big Picture'],
      ['one-server-to-many', 'From One Server to Many', 'The Big Picture'],
      ['trade-offs', 'Thinking in Tradeoffs', 'The Big Picture'],
      ['client-server', 'How Clients and Servers Talk', 'How Computers Talk'],
      ['dns', 'Finding Servers with DNS', 'How Computers Talk'],
      ['tcp-udp', 'Delivering Data with TCP and UDP', 'How Computers Talk'],
      ['http', 'Requests and Responses with HTTP', 'How Computers Talk'],
      ['tls-https', 'Securing Connections with TLS', 'How Computers Talk'],
      ['life-of-a-request', 'The Life of a Request', 'How Computers Talk'],
      ['latency-throughput', 'Measuring Latency and Throughput', 'What Makes a System Good'],
      ['performance-scalability', 'Telling Performance from Scalability', 'What Makes a System Good'],
      ['scaling', 'Scaling Up and Scaling Out', 'What Makes a System Good'],
      ['stateless-stateful', 'Keeping Services Stateless', 'What Makes a System Good'],
      ['availability', 'Measuring Availability in Nines', 'What Makes a System Good'],
      ['redundancy-failover', 'Surviving Failures with Redundancy and Failover', 'What Makes a System Good'],
      ['reliability', 'Building Reliable Systems from Unreliable Parts', 'What Makes a System Good'],
      ['maintainability', 'Designing for Maintainability', 'What Makes a System Good'],
      ['requirements', 'Defining Functional and Nonfunctional Requirements', 'Sizing a System'],
      ['numbers', 'Numbers Every Engineer Should Know', 'Sizing a System'],
      ['estimation', 'Estimating Capacity', 'Sizing a System'],
    ]),
  },
  {
    slug: 'apis-traffic-services',
    title: 'APIs, Traffic and Services',
    topics: topics([
      ['good-apis', 'What Makes a Good API', 'Designing APIs'],
      ['serialization', 'Serializing Data and Evolving Schemas', 'Designing APIs'],
      ['rest', 'Modeling Resources with REST', 'Designing APIs'],
      ['rpc-grpc', 'Calling Services with RPC and gRPC', 'Designing APIs'],
      ['graphql', 'Flexible Queries with GraphQL', 'Designing APIs'],
      ['api-style-choice', 'Choosing Between REST, RPC and GraphQL', 'Designing APIs'],
      ['pagination', 'Paginating Large Results', 'Designing APIs'],
      ['api-versioning', 'Versioning APIs Without Breaking Clients', 'Designing APIs'],
      ['idempotency', 'Idempotent Requests and Safe Retries', 'Designing APIs'],
      ['polling', 'Checking for Updates with Polling', 'Beyond Request and Response'],
      ['server-sent-events', 'Streaming Updates with Server-Sent Events', 'Beyond Request and Response'],
      ['websockets', 'Talking Both Ways with WebSockets', 'Beyond Request and Response'],
      ['webhooks', 'Calling Other Systems Back with Webhooks', 'Beyond Request and Response'],
      ['proxies', 'Standing in Front with a Proxy', 'Routing Traffic'],
      ['load-balancers', 'Spreading Load with Load Balancers', 'Routing Traffic'],
      ['load-balancing-algorithms', 'Choosing a Load Balancing Algorithm', 'Routing Traffic'],
      ['health-checks', 'Checking Server Health', 'Routing Traffic'],
      ['global-routing', 'Routing Users to the Nearest Region', 'Routing Traffic'],
      ['cdn', 'Serving Content from the Edge with CDNs', 'Routing Traffic'],
      ['monoliths-microservices', 'When to Split into Microservices', 'Splitting into Services'],
      ['containers', 'Running Services in Containers', 'Splitting into Services'],
      ['service-discovery', 'Finding Each Other with Service Discovery', 'Splitting into Services'],
      ['api-gateways', 'Fronting Services with an API Gateway', 'Splitting into Services'],
      ['service-mesh', 'Managing Traffic with Sidecars and a Service Mesh', 'Splitting into Services'],
      ['serverless', 'Going Serverless', 'Splitting into Services'],
      ['rate-limiting-algorithms', 'How Rate Limiting Algorithms Work', 'Protecting the System'],
      ['rate-limiting-in-practice', 'Applying Rate Limits in Practice', 'Protecting the System'],
      ['ddos', 'Withstanding DDoS Attacks', 'Protecting the System'],
    ]),
  },
  {
    slug: 'data-and-caching',
    title: 'Data Storage and Caching',
    topics: topics([
      ['relational-model', 'Tables, Rows and the Relational Model', 'Working with Relational Databases'],
      ['data-modeling', 'Turning a Domain into a Data Model', 'Working with Relational Databases'],
      ['normalization', 'Choosing Between Normalization and Denormalization', 'Working with Relational Databases'],
      ['indexing', 'Making Every Query Fast with Indexes', 'Working with Relational Databases'],
      ['transactions-acid', 'All or Nothing with Transactions and ACID', 'Working with Relational Databases'],
      ['isolation-levels', 'How Isolation Levels Prevent Anomalies', 'Working with Relational Databases'],
      ['key-value-stores', 'Simple and Fast Key-Value Stores', 'Beyond Tables with NoSQL'],
      ['document-stores', 'Storing Whole Objects in Document Stores', 'Beyond Tables with NoSQL'],
      ['wide-column-stores', 'Huge Tables in Wide Column Stores', 'Beyond Tables with NoSQL'],
      ['graph-databases', 'Following Relationships with Graph Databases', 'Beyond Tables with NoSQL'],
      ['sql-nosql', 'Choosing Between SQL and NoSQL', 'Beyond Tables with NoSQL'],
      ['where-to-cache', 'Where to Put a Cache', 'Making Reads Fast with Caching'],
      ['caching-patterns', 'Caching Patterns for Reads and Writes', 'Making Reads Fast with Caching'],
      ['cache-eviction', 'Cache Eviction and Keeping Hot Data', 'Making Reads Fast with Caching'],
      ['cache-invalidation', 'Keeping Caches Fresh with Invalidation', 'Making Reads Fast with Caching'],
      ['cache-stampedes', 'Preventing Cache Stampedes', 'Making Reads Fast with Caching'],
      ['consistent-hashing', 'Spreading Keys with Consistent Hashing', 'Making Reads Fast with Caching'],
      ['distributed-caches', 'Running a Distributed Cache', 'Making Reads Fast with Caching'],
      ['redis-memcached', 'Redis and Memcached in Practice', 'Making Reads Fast with Caching'],
      ['storage-types', 'Choosing Between Block, Object and File Storage', 'Stores Built for One Job'],
      ['oltp-olap', 'From OLTP to OLAP and Data Warehouses', 'Stores Built for One Job'],
      ['search-engines', 'Full Text Search with Inverted Indexes', 'Stores Built for One Job'],
      ['time-series', 'Storing Metrics in Time Series Databases', 'Stores Built for One Job'],
      ['geospatial', 'Finding Nearby Points with Geospatial Indexes', 'Stores Built for One Job'],
      ['write-ahead-logs', 'Never Losing a Write with Write-Ahead Logs', 'Inside a Storage Engine'],
      ['b-trees', 'How B-Trees Organize Data on Disk', 'Inside a Storage Engine'],
      ['lsm-trees', 'Fast Writes with LSM Trees', 'Inside a Storage Engine'],
      ['probabilistic-structures', 'Approximate Answers with Bloom Filters and Sketches', 'Inside a Storage Engine'],
      ['column-storage', 'Fast Scans with Column-Oriented Storage', 'Inside a Storage Engine'],
    ]),
  },
  {
    slug: 'async-processing',
    title: 'Asynchronous Processing',
    topics: topics([
      ['when-async', 'When to Go Asynchronous', 'Talking Through Messages'],
      ['message-queues', 'Decoupling with Message Queues and Pub/Sub', 'Talking Through Messages'],
      ['log-based-brokers', 'Replayable Streams with Log-Based Brokers', 'Talking Through Messages'],
      ['delivery-guarantees', 'Delivery Guarantees and Exactly Once Processing', 'Talking Through Messages'],
      ['ordering', 'Keeping Order with Partitions and Consumer Groups', 'Talking Through Messages'],
      ['redelivery-dlq', 'Handling Failed Messages with Dead Letter Queues', 'Talking Through Messages'],
      ['backpressure', 'Slowing Producers Down with Backpressure', 'Talking Through Messages'],
      ['task-queues', 'Handing Off Work to Task Queues', 'Running Work in the Background'],
      ['job-schedulers', 'Running Recurring Work with Job Schedulers', 'Running Work in the Background'],
      ['workflow-engines', 'Coordinating Long Processes with Workflow Engines', 'Running Work in the Background'],
      ['event-driven', 'Reacting to Change with Event-Driven Architecture', 'Building Around Events'],
      ['transactional-outbox', 'Publishing Events Safely with a Transactional Outbox', 'Building Around Events'],
      ['cdc', 'Streaming Database Changes with Change Data Capture', 'Building Around Events'],
      ['event-sourcing', 'Storing History with Event Sourcing', 'Building Around Events'],
      ['cqrs', 'Separating Reads from Writes with CQRS', 'Building Around Events'],
      ['batch-processing', 'Crunching Large Datasets with Batch Processing', 'Processing Data in Bulk and in Streams'],
      ['stream-processing', 'Handling Data in Motion with Stream Processing', 'Processing Data in Bulk and in Streams'],
      ['windowing-watermarks', 'Windowing and Watermarks for Late Events', 'Processing Data in Bulk and in Streams'],
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
