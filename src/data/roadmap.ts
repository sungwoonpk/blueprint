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
  summary: string;
  topics: Topic[];
}

type Row = [slug: string, title: string, group?: string];

const topics = (rows: Row[]): Topic[] =>
  rows.map(([slug, title, group]) => ({ slug, title, group }));

export const phases: Phase[] = [
  {
    slug: 'foundations',
    title: 'Foundations',
    summary: 'How to approach a design problem, do the math, and the web basics everything builds on.',
    topics: topics([
      ['what-is-system-design', 'What system design is', 'Approach'],
      ['problem-framework', 'A framework for approaching problems', 'Approach'],
      ['requirements', 'Functional and non-functional requirements', 'Approach'],
      ['estimation', 'Back-of-the-envelope estimation', 'Approach'],
      ['latency-numbers', 'Latency numbers every engineer should know', 'Approach'],
      ['common-mistakes', 'Common mistakes and communicating your design', 'Approach'],
      ['client-server', 'The client-server model and request flow', 'Web basics'],
      ['dns-http', 'DNS, HTTP and HTTPS', 'Web basics'],
      ['tcp-udp', 'TCP vs UDP', 'Web basics'],
      ['tls', 'TLS basics', 'Web basics'],
    ]),
  },
  {
    slug: 'principles',
    title: 'Principles and trade-offs',
    summary: 'The vocabulary of design decisions: scale, availability, consistency and architecture styles.',
    topics: topics([
      ['scalability', 'Scalability: vertical vs horizontal', 'Scale and speed'],
      ['bottlenecks', 'Performance vs scalability, and finding bottlenecks', 'Scale and speed'],
      ['latency-throughput', 'Latency vs throughput', 'Scale and speed'],
      ['availability', 'Availability and the nines', 'Availability and reliability'],
      ['failover', 'Failover: active-passive and active-active', 'Availability and reliability'],
      ['reliability', 'Reliability, fault tolerance and maintainability', 'Availability and reliability'],
      ['consistency-models', 'Consistency models: weak, eventual, strong', 'Consistency'],
      ['cap', 'The CAP theorem', 'Consistency'],
      ['pacelc', 'PACELC', 'Consistency'],
      ['acid-base', 'ACID vs BASE', 'Consistency'],
      ['monolith-microservices', 'Monolith vs microservices', 'Architecture styles'],
      ['service-discovery', 'Service discovery', 'Architecture styles'],
      ['event-driven-serverless', 'Event-driven and serverless architecture', 'Architecture styles'],
      ['stateless-stateful', 'Stateless vs stateful services', 'Architecture styles'],
    ]),
  },
  {
    slug: 'traffic-and-apis',
    title: 'Traffic and APIs',
    summary: 'How requests enter a system, get spread out and limited, and how services talk to each other.',
    topics: topics([
      ['dns-routing', 'DNS for traffic routing: caching and TTL', 'Traffic entry'],
      ['cdn', 'Content delivery networks', 'Traffic entry'],
      ['proxies', 'Forward and reverse proxies', 'Traffic entry'],
      ['load-balancers', 'Load balancers: L4 vs L7', 'Traffic entry'],
      ['load-balancing-algorithms', 'Load balancing algorithms and health checks', 'Traffic entry'],
      ['consistent-hashing', 'Consistent hashing', 'Traffic entry'],
      ['api-gateway', 'API gateway', 'Traffic entry'],
      ['rate-limiting-algorithms', 'Rate limiting algorithms', 'Traffic entry'],
      ['rate-limiting-placement', 'Where to rate limit, and 429 responses', 'Traffic entry'],
      ['rest', 'REST', 'API design'],
      ['rpc-grpc', 'RPC and gRPC', 'API design'],
      ['graphql', 'GraphQL', 'API design'],
      ['api-style-choice', 'Choosing between REST, RPC and GraphQL', 'API design'],
      ['versioning-pagination', 'API versioning and pagination', 'API design'],
      ['idempotency', 'Idempotency', 'API design'],
      ['polling-sse', 'Polling, long polling and server-sent events', 'Real-time communication'],
      ['websockets-webhooks', 'WebSockets and webhooks', 'Real-time communication'],
      ['serialization', 'Serialization and schema evolution', 'Real-time communication'],
    ]),
  },
  {
    slug: 'data-and-caching',
    title: 'Data storage and caching',
    summary: 'Choosing a database, how storage engines work, scaling data across machines, and caching in front of it.',
    topics: topics([
      ['data-modeling', 'Data modeling', 'Databases'],
      ['relational-databases', 'Relational databases and normalization', 'Databases'],
      ['indexing', 'Indexing and query optimization', 'Databases'],
      ['transactions-isolation', 'Transactions and isolation levels', 'Databases'],
      ['nosql-kv-document', 'NoSQL: key-value and document stores', 'Databases'],
      ['nosql-column-graph', 'NoSQL: wide-column and graph stores', 'Databases'],
      ['sql-vs-nosql', 'SQL vs NoSQL', 'Databases'],
      ['b-tree', 'B-trees', 'Storage internals'],
      ['lsm-wal', 'LSM trees and write-ahead logs', 'Storage internals'],
      ['storage-types', 'Block, object and file storage', 'Storage internals'],
      ['replication-leader-follower', 'Replication: leader and follower', 'Scaling data'],
      ['replication-multi-leader-quorum', 'Multi-leader replication and quorums', 'Scaling data'],
      ['sharding', 'Partitioning and sharding strategies', 'Scaling data'],
      ['rebalancing-hot-keys', 'Rebalancing and hot keys', 'Scaling data'],
      ['two-phase-commit', 'Distributed transactions: two-phase commit', 'Scaling data'],
      ['sagas-tcc', 'Sagas and try-confirm-cancel', 'Scaling data'],
      ['search-inverted-index', 'Search and inverted indexes', 'Specialized stores'],
      ['time-series', 'Time-series databases', 'Specialized stores'],
      ['vector-databases', 'Vector databases', 'Specialized stores'],
      ['geospatial', 'Geospatial indexes: geohash and quadtree', 'Specialized stores'],
      ['bloom-filters', 'Bloom filters and probabilistic data structures', 'Specialized stores'],
      ['cdc', 'Change data capture', 'Specialized stores'],
      ['redis', 'Redis fundamentals', 'Caching'],
      ['cache-layers', 'Cache layers', 'Caching'],
      ['cache-strategies', 'Read and write strategies', 'Caching'],
      ['eviction', 'Eviction policies', 'Caching'],
      ['cache-invalidation', 'Cache invalidation', 'Caching'],
      ['cache-stampede', 'Cache stampede', 'Caching'],
      ['distributed-cache', 'Distributed caches', 'Caching'],
    ]),
  },
  {
    slug: 'async-and-messaging',
    title: 'Async, messaging and streaming',
    summary: 'Decoupling work with queues, delivery guarantees, event-driven designs and stream processing.',
    topics: topics([
      ['queue-types', 'Message queues, task queues and pub/sub'],
      ['kafka-vs-rabbitmq', 'Kafka vs RabbitMQ'],
      ['delivery-guarantees', 'Delivery guarantees'],
      ['retries-dlq-backpressure', 'Retries, dead-letter queues and back pressure'],
      ['event-sourcing', 'Event sourcing'],
      ['cqrs', 'CQRS'],
      ['batch-vs-stream', 'Batch vs stream processing'],
      ['workflow-orchestration', 'Workflow orchestration for long-running tasks'],
      ['task-schedulers', 'Distributed task schedulers'],
      ['transactional-outbox', 'Transactional messaging and the outbox pattern'],
    ]),
  },
  {
    slug: 'distributed-systems-and-operations',
    title: 'Distributed systems and operations',
    summary: 'What goes wrong across machines, how to build for failure, and how to run, secure and pay for a system.',
    topics: topics([
      ['why-distributed-is-hard', 'Why distributed systems are hard', 'Distributed systems'],
      ['clocks-ordering', 'Clocks and ordering', 'Distributed systems'],
      ['consensus-leader-election', 'Consensus and leader election', 'Distributed systems'],
      ['raft', 'Raft', 'Distributed systems'],
      ['failure-detection', 'Failure detection: heartbeats and gossip', 'Distributed systems'],
      ['anti-entropy', 'Hinted handoff and anti-entropy', 'Distributed systems'],
      ['conflict-resolution', 'Vector clocks, CRDTs and conflict resolution', 'Distributed systems'],
      ['distributed-locks', 'Distributed locks and contention', 'Distributed systems'],
      ['unique-ids', 'Unique ID generation', 'Distributed systems'],
      ['sharded-counters', 'Sharded counters', 'Distributed systems'],
      ['timeouts-retries', 'Timeouts and retries', 'Resilience'],
      ['circuit-breaker', 'Circuit breakers', 'Resilience'],
      ['bulkhead', 'Bulkheads', 'Resilience'],
      ['observability', 'Logging, metrics and tracing', 'Observability'],
      ['alerting', 'Alerting and dashboards', 'Observability'],
      ['slo', 'SLIs, SLOs and error budgets', 'Observability'],
      ['testing', 'Testing: unit, integration, load and stress', 'Delivery'],
      ['ci-cd', 'CI/CD and rollout strategies', 'Delivery'],
      ['canary', 'Canary releases', 'Delivery'],
      ['authn-authz', 'Authentication and authorization', 'Security'],
      ['oauth-jwt', 'OAuth and JWT', 'Security'],
      ['encryption', 'Encryption and secure service-to-service communication', 'Security'],
      ['ddos-privacy', 'DDoS defense and privacy regulation', 'Security'],
      ['backup-dr', 'Backup and disaster recovery', 'Cost and recovery'],
      ['cost-performance', 'Cost vs performance', 'Cost and recovery'],
      ['outages', 'Learning from real outages', 'Cost and recovery'],
    ]),
  },
  {
    slug: 'patterns-and-case-studies',
    title: 'Patterns and case studies',
    summary: 'Reusable design patterns, then full designs of well-known systems that combine them.',
    topics: topics([
      ['pattern-push-updates', 'Pushing updates to clients', 'Patterns'],
      ['pattern-contention', 'Handling contention', 'Patterns'],
      ['pattern-multi-step', 'Multi-step workflows', 'Patterns'],
      ['pattern-scaling-reads', 'Scaling reads', 'Patterns'],
      ['pattern-scaling-writes', 'Scaling writes', 'Patterns'],
      ['pattern-large-blobs', 'Large files and blobs', 'Patterns'],
      ['pattern-long-running-jobs', 'Long-running jobs', 'Patterns'],
      ['pattern-proximity-search', 'Proximity search', 'Patterns'],
      ['case-rate-limiter', 'Design a rate limiter', 'Infrastructure'],
      ['case-url-shortener', 'Design a URL shortener', 'Infrastructure'],
      ['case-key-value-store', 'Design a key-value store', 'Infrastructure'],
      ['case-id-generator', 'Design a unique ID generator', 'Infrastructure'],
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
      ['case-metrics-monitoring', 'Design a metrics monitoring system', 'Data'],
      ['case-leaderboard', 'Design a leaderboard and top-K service', 'Data'],
      ['case-ad-clicks', 'Design ad click aggregation', 'Data'],
      ['case-collaborative-docs', 'Design collaborative document editing', 'Collaboration'],
      ['case-calendar', 'Design a calendar service', 'Collaboration'],
    ]),
  },
  {
    slug: 'ai-and-real-world',
    title: 'AI systems and real-world architectures',
    summary: 'Building blocks for AI products, and how well-known systems and companies actually did it.',
    topics: topics([
      ['ai-model-serving', 'Model serving', 'AI building blocks'],
      ['ai-agents', 'Agents and tool use', 'AI building blocks'],
      ['ai-evaluation', 'Evaluating AI systems', 'AI building blocks'],
      ['ai-rag', 'Retrieval-augmented generation', 'AI building blocks'],
      ['case-chatgpt', 'Design a ChatGPT-style service', 'AI case studies'],
      ['case-support-bot', 'Design an LLM customer support bot', 'AI case studies'],
      ['case-code-assistant', 'Design an AI code assistant', 'AI case studies'],
      ['real-shopify-inventory', 'Shopify: inventory reservation', 'Real-world systems'],
      ['real-discord-messages', 'Discord: message storage', 'Real-world systems'],
      ['real-slack-jobs', 'Slack: job queue', 'Real-world systems'],
      ['real-figma-multiplayer', 'Figma: multiplayer editing', 'Real-world systems'],
      ['real-spotify-data-lake', 'Spotify: data lake', 'Real-world systems'],
      ['classic-mapreduce', 'MapReduce', 'Classic systems'],
      ['classic-spark', 'Spark', 'Classic systems'],
      ['classic-bigtable', 'Bigtable', 'Classic systems'],
      ['classic-cassandra', 'Cassandra', 'Classic systems'],
      ['classic-dynamo', 'DynamoDB', 'Classic systems'],
      ['classic-spanner', 'Spanner', 'Classic systems'],
      ['classic-gfs-hdfs', 'GFS and HDFS', 'Classic systems'],
      ['classic-kafka', 'Kafka', 'Classic systems'],
      ['classic-zookeeper-chubby', 'ZooKeeper and Chubby', 'Classic systems'],
      ['classic-dapper', 'Dapper', 'Classic systems'],
      ['practice-checklist', 'A problem-solving checklist for interviews', 'Practice'],
      ['practice-engineering-blogs', 'Engineering blogs worth reading', 'Practice'],
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
