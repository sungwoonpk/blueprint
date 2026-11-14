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
      ['what-is-system-design', 'What system design is', 'Basics'],
      ['requirements', 'Functional and non-functional requirements', 'Basics'],
      ['estimation', 'Back-of-the-envelope estimation', 'Basics'],
      ['latency-numbers', 'Latency numbers every engineer should know', 'Basics'],
      ['client-server', 'The client-server model and request flow', 'Networking'],
      ['dns', 'How DNS works', 'Networking'],
      ['http', 'HTTP', 'Networking'],
      ['tcp-udp', 'TCP vs UDP', 'Networking'],
      ['tls-https', 'TLS and HTTPS', 'Networking'],
      ['scalability', 'Scalability: vertical vs horizontal', 'Core qualities'],
      ['stateless-stateful', 'Stateless vs stateful services', 'Core qualities'],
      ['bottlenecks', 'Performance vs scalability, and finding bottlenecks', 'Core qualities'],
      ['latency-throughput', 'Latency vs throughput', 'Core qualities'],
      ['availability', 'Availability and the nines', 'Core qualities'],
      ['failover', 'Failover: active-passive and active-active', 'Core qualities'],
      ['reliability', 'Reliability, fault tolerance and maintainability', 'Core qualities'],
    ]),
  },
  {
    slug: 'traffic-and-apis',
    title: 'Traffic and APIs',
    topics: topics([
      ['dns-routing', 'DNS-based traffic routing', 'Traffic entry'],
      ['cdn', 'Content delivery networks (CDNs)', 'Traffic entry'],
      ['proxies', 'Forward and reverse proxies', 'Traffic entry'],
      ['load-balancers', 'Load balancers: L4 vs L7', 'Traffic entry'],
      ['load-balancing-algorithms', 'Load balancing algorithms and health checks', 'Traffic entry'],
      ['api-gateway', 'API gateway', 'Traffic entry'],
      ['rate-limiting-algorithms', 'Rate limiting algorithms', 'Protection'],
      ['rate-limiting-placement', 'Where to rate limit, and 429 responses', 'Protection'],
      ['ddos', 'DDoS protection', 'Protection'],
      ['monolith-microservices', 'Monolith vs microservices', 'Services'],
      ['service-discovery', 'Service discovery', 'Services'],
      ['serverless', 'Serverless', 'Services'],
      ['rest', 'REST', 'API design'],
      ['rpc-grpc', 'RPC and gRPC', 'API design'],
      ['graphql', 'GraphQL', 'API design'],
      ['api-style-choice', 'Choosing between REST, RPC and GraphQL', 'API design'],
      ['versioning-pagination', 'API versioning and pagination', 'API design'],
      ['idempotency', 'Idempotency', 'API design'],
      ['serialization', 'Serialization and schema evolution', 'API design'],
      ['polling-sse', 'Polling, long polling and server-sent events', 'Real-time communication'],
      ['websockets', 'WebSockets', 'Real-time communication'],
      ['webhooks', 'Webhooks', 'Real-time communication'],
    ]),
  },
  {
    slug: 'data-and-caching',
    title: 'Data Storage and Caching',
    topics: topics([
      ['data-modeling', 'Data modeling', 'Databases'],
      ['relational-databases', 'Relational databases and normalization', 'Databases'],
      ['indexing', 'Indexing and query optimization', 'Databases'],
      ['nosql-kv-document', 'NoSQL: key-value and document stores', 'Databases'],
      ['nosql-column-graph', 'NoSQL: wide-column and graph stores', 'Databases'],
      ['sql-vs-nosql', 'SQL vs NoSQL', 'Databases'],
      ['b-tree', 'B-trees', 'Storage internals'],
      ['lsm-wal', 'LSM trees and write-ahead logs', 'Storage internals'],
      ['bloom-filters', 'Bloom filters and probabilistic data structures', 'Storage internals'],
      ['storage-types', 'Block, object and file storage', 'Storage internals'],
      ['replication-leader-follower', 'Leader-follower replication', 'Replication and consistency'],
      ['replication-multi-leader-quorum', 'Multi-leader replication and quorums', 'Replication and consistency'],
      ['consistency-models', 'Consistency models: weak, eventual, strong', 'Replication and consistency'],
      ['cap', 'The CAP theorem', 'Replication and consistency'],
      ['pacelc', 'PACELC', 'Replication and consistency'],
      ['sharding', 'Partitioning and sharding strategies', 'Partitioning'],
      ['consistent-hashing', 'Consistent hashing', 'Partitioning'],
      ['rebalancing-hot-keys', 'Rebalancing and hot keys', 'Partitioning'],
      ['acid-base', 'ACID vs BASE', 'Transactions'],
      ['isolation-levels', 'Isolation levels', 'Transactions'],
      ['two-phase-commit', 'Distributed transactions: two-phase commit', 'Transactions'],
      ['sagas-tcc', 'Sagas and try-confirm-cancel', 'Transactions'],
      ['search-inverted-index', 'Search and inverted indexes', 'Specialized stores'],
      ['time-series', 'Time-series databases', 'Specialized stores'],
      ['vector-databases', 'Vector databases', 'Specialized stores'],
      ['geospatial', 'Geospatial indexes: geohash and quadtree', 'Specialized stores'],
      ['cache-layers', 'Cache layers', 'Caching'],
      ['cache-strategies', 'Read and write strategies', 'Caching'],
      ['eviction', 'Eviction policies', 'Caching'],
      ['cache-invalidation', 'Cache invalidation', 'Caching'],
      ['cache-stampede', 'Cache stampede', 'Caching'],
      ['distributed-cache', 'Distributed caches', 'Caching'],
      ['redis', 'Redis fundamentals', 'Caching'],
    ]),
  },
  {
    slug: 'messaging-and-streaming',
    title: 'Messaging and Streaming',
    topics: topics([
      ['queue-types', 'Message queues, task queues and pub/sub', 'Queues'],
      ['kafka-vs-rabbitmq', 'Kafka vs RabbitMQ', 'Queues'],
      ['delivery-guarantees', 'Delivery guarantees', 'Queues'],
      ['retries-dlq-backpressure', 'Retries, dead-letter queues and back pressure', 'Queues'],
      ['event-driven', 'Event-driven architecture', 'Event-driven design'],
      ['event-sourcing', 'Event sourcing', 'Event-driven design'],
      ['cqrs', 'CQRS', 'Event-driven design'],
      ['transactional-outbox', 'The transactional outbox', 'Event-driven design'],
      ['cdc', 'Change data capture', 'Event-driven design'],
      ['batch-vs-stream', 'Batch vs stream processing', 'Processing'],
      ['workflow-engines', 'Workflow engines for long-running tasks', 'Processing'],
      ['task-schedulers', 'Distributed task schedulers', 'Processing'],
    ]),
  },
  {
    slug: 'distributed-systems',
    title: 'Distributed Systems',
    topics: topics([
      ['why-distributed-is-hard', 'Why distributed systems are hard', 'Fundamentals'],
      ['clocks-ordering', 'Clocks and ordering', 'Fundamentals'],
      ['failure-detection', 'Failure detection: heartbeats and gossip', 'Fundamentals'],
      ['consensus-leader-election', 'Consensus and leader election', 'Agreement'],
      ['raft', 'Raft', 'Agreement'],
      ['distributed-locks', 'Distributed locks', 'Agreement'],
      ['unique-ids', 'Unique ID generation', 'Agreement'],
      ['conflict-resolution', 'Vector clocks, CRDTs and conflict resolution', 'Convergence'],
      ['anti-entropy', 'Hinted handoff and anti-entropy', 'Convergence'],
    ]),
  },
  {
    slug: 'running-in-production',
    title: 'Running in Production',
    topics: topics([
      ['timeouts-retries', 'Timeouts and retries', 'Resilience'],
      ['circuit-breaker', 'Circuit breakers', 'Resilience'],
      ['bulkhead', 'Bulkheads', 'Resilience'],
      ['observability', 'Logging, metrics and tracing', 'Observability'],
      ['alerting', 'Alerting and dashboards', 'Observability'],
      ['slo', 'SLIs, SLOs and error budgets', 'Observability'],
      ['load-testing', 'Load and stress testing', 'Delivery'],
      ['deployments', 'Deployment strategies: rolling, blue-green and canary', 'Delivery'],
      ['authn-authz', 'Authentication and authorization', 'Security'],
      ['oauth-jwt', 'OAuth and JWT', 'Security'],
      ['encryption', 'Encryption in transit and at rest', 'Security'],
      ['privacy', 'Data privacy and compliance', 'Security'],
      ['backup-dr', 'Backup and disaster recovery', 'Recovery and cost'],
      ['outages', 'Learning from real outages', 'Recovery and cost'],
      ['cost-performance', 'Cost vs performance', 'Recovery and cost'],
    ]),
  },
  {
    slug: 'patterns-and-case-studies',
    title: 'Patterns and Case Studies',
    topics: topics([
      ['design-method', 'A method for designing a system', 'Method'],
      ['pattern-push-updates', 'Pushing updates to clients', 'Patterns'],
      ['pattern-contention', 'Handling contention', 'Patterns'],
      ['pattern-long-running-work', 'Long-running and multi-step work', 'Patterns'],
      ['pattern-scaling-reads', 'Scaling reads', 'Patterns'],
      ['pattern-scaling-writes', 'Scaling writes', 'Patterns'],
      ['pattern-large-blobs', 'Large files and blobs', 'Patterns'],
      ['case-rate-limiter', 'Design a rate limiter', 'Infrastructure'],
      ['case-url-shortener', 'Design a URL shortener', 'Infrastructure'],
      ['case-key-value-store', 'Design a key-value store', 'Infrastructure'],
      ['case-message-queue', 'Design a distributed message queue', 'Infrastructure'],
      ['case-job-scheduler', 'Design a job scheduler', 'Infrastructure'],
      ['case-news-feed', 'Design a news feed', 'Social'],
      ['case-photo-sharing', 'Design a photo-sharing app', 'Social'],
      ['case-notifications', 'Design a notification system', 'Social'],
      ['case-matching', 'Design a swipe-based matching app', 'Social'],
      ['case-chat', 'Design a chat app', 'Messaging'],
      ['case-email', 'Design an email service', 'Messaging'],
      ['case-video-streaming', 'Design a video streaming service', 'Media and storage'],
      ['case-file-sync', 'Design a file storage and sync service', 'Media and storage'],
      ['case-object-storage', 'Design an object storage service', 'Media and storage'],
      ['case-ride-hailing', 'Design a ride-hailing service', 'Location'],
      ['case-proximity-service', 'Design a nearby-places service', 'Location'],
      ['case-nearby-friends', 'Design a nearby-friends feature', 'Location'],
      ['case-maps', 'Design a maps service', 'Location'],
      ['case-web-crawler', 'Design a web crawler', 'Search'],
      ['case-search-engine', 'Design a search system', 'Search'],
      ['case-typeahead', 'Design typeahead suggestions', 'Search'],
      ['case-ticket-booking', 'Design a ticket booking system', 'Booking and commerce'],
      ['case-flash-sale', 'Design a flash sale', 'Booking and commerce'],
      ['case-auction', 'Design an online auction', 'Booking and commerce'],
      ['case-payments', 'Design a payment system', 'Payments and finance'],
      ['case-wallet', 'Design a digital wallet', 'Payments and finance'],
      ['case-stock-exchange', 'Design a stock exchange', 'Payments and finance'],
      ['case-metrics-monitoring', 'Design a metrics monitoring system', 'Analytics and monitoring'],
      ['case-leaderboard', 'Design a leaderboard and top-K service', 'Analytics and monitoring'],
      ['case-ad-clicks', 'Design ad click aggregation', 'Analytics and monitoring'],
      ['case-collaborative-docs', 'Design collaborative document editing', 'Collaboration'],
      ['case-calendar', 'Design a calendar service', 'Collaboration'],
    ]),
  },
  {
    slug: 'ai-systems',
    title: 'AI Systems',
    topics: topics([
      ['ai-model-serving', 'Model serving', 'Building blocks'],
      ['ai-rag', 'Retrieval-augmented generation', 'Building blocks'],
      ['ai-agents', 'Agents and tool use', 'Building blocks'],
      ['ai-evaluation', 'Evaluating AI systems', 'Building blocks'],
      ['case-chatgpt', 'Design a ChatGPT-style service', 'Case studies'],
      ['case-support-bot', 'Design an LLM customer support bot', 'Case studies'],
      ['case-code-assistant', 'Design an AI code assistant', 'Case studies'],
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
      ['classic-zookeeper-chubby', 'Chubby and ZooKeeper', 'Coordination and messaging'],
      ['classic-kafka', 'Kafka', 'Coordination and messaging'],
      ['classic-dapper', 'Dapper', 'Coordination and messaging'],
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
