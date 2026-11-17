> **Model serving** is running a trained model as a service that other programs call. It covers loading the weights onto accelerators, accepting requests, batching them, scaling the number of machines, and replacing one model version with another without hurting users. The model is the easy part to name and the hard part to operate: it is large, it runs on scarce hardware, and it starts slowly.

In [How LLM Inference Works](/system-design/llm-inference) the helper on the listing pages ran on one machine in a simulation. A real deployment has to answer other questions.

Which program holds the model and takes the requests? What happens when 30 students a second ask, not 8? How long does a new machine need before it can help? How is a new model version tried on a few users first?

Most of these have familiar answers from earlier phases: queues, autoscaling, canaries and metrics. What changes is the numbers. A replica costs a whole GPU, takes a minute or more to start, and serves a handful of requests a second.

## What a Model Server Adds

A web server handles a request with a function. A **model server** is a program built around a model held in accelerator memory. It owns the batching and the queue that [How LLM Inference Works](/system-design/llm-inference) showed were the main lever, and it exposes the model through an API.

vLLM is one example. One command, `vllm serve` with a model name, starts an HTTP server that speaks several interfaces, including the OpenAI style routes for chat, completions and embeddings, plus a health route and a metrics route.

The chat route needs a chat template, and without one the server can't process chat requests and they return errors.

NVIDIA's Triton Inference Server is a more general model server that handles many kinds of models, and it makes the batching explicit. A model's configuration enables the dynamic batcher with one line. By default, the batcher forms batches as large as it can up to the model's maximum batch size, without waiting.

An optional queue delay lets it wait a short time for a fuller batch. A list of preferred batch sizes also exists, mainly useful for TensorRT. The sound process is to start with the plain setting, measure, and then add a delay or raise the maximum.

<figure class="diagram">
<div class="flow">
<div class="node">Client</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Gateway</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Model Server<small>queue and batcher</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">GPU<small>weights, cache</small></div>
</div>
<figcaption>Where a request goes: the model server keeps the queue and the batcher next to the weights</figcaption>
</figure>

The pieces around the model server are ordinary: a gateway for authentication and rate limits, as in [API Gateways](/system-design/api-gateways), a router to the replicas, and the metrics and logs of [Logs, Metrics and Traces](/system-design/observability).

## Three Ways to Call a Model

Not each use needs an answer in seconds. The cloud providers draw the same line. An online inference is a synchronous request to a model deployed behind an endpoint, made in response to what a user just did. A batch inference is for cases where an immediate response isn't needed.

Amazon SageMaker adds an asynchronous option: the caller stores the request, receives an identifier, and collects the result later, with payloads up to 1 GB and processing times up to one hour, and the ability to scale the instance count to zero when the queue is empty.

| Mode | Fits | In the Textbook App |
| --- | --- | --- |
| Online | A student waits for the answer | The helper on a listing page |
| Asynchronous | The result can arrive later | A summary of a long uploaded syllabus |
| Batch | A whole set at once | A summary for each of 3 million listings |

Batch work is where tuning flips. Nobody waits on a single answer, so the server can run at the batch size that gives the most tokens a second. We estimated a job of 3 million summaries of 200 tokens each, which is 600 million tokens, with the throughput numbers from our roofline estimate:

| Tuning | Tokens a Second | One Replica | Eight Replicas |
| --- | --- | --- | --- |
| Latency Tuned, Batch 16 | 1,429 | 4.9 days | 14.6 hours |
| Throughput Tuned, Batch 64 | 2,692 | 2.6 days | 7.7 hours |

Tuning for throughput roughly halved the time and the replica hours. The same setting would make the online helper slow, since each user's speed fell from 89 tokens a second to 42 in that estimate.

Keeping the two workloads on separate replicas, each tuned for its goal, is usually simpler than one compromise, and the batch job can run when the online load is low, as in [Batch Processing](/system-design/batch-processing).

## GPUs Are Whole and Slow to Start

Kubernetes treats a GPU as a named resource that a vendor's device plugin advertises, such as `nvidia.com/gpu`. A container asks for GPUs in its `limits` section, the request is set equal to the limit by default, and if both are given they must be equal.

The page doesn't describe sharing a GPU between pods, so check the vendor's plugin documentation if you need it. The practical consequence is that capacity comes in whole units, and an idle GPU is expensive.

The other consequence is the start. Before a new replica takes a request, it has to pull the container image, load the weights into GPU memory, and warm up. A cold start has three parts: the model size, the time to download it, and the container's startup time.

We computed the middle step alone, for the 14 GB of weights of a 7B model in 16 bit form, at four assumed read speeds:

<figure class="chart">
<div class="hbars" role="img" aria-label="Seconds to load the weights for four storage speeds">
<div class="hbar"><span>Local NVMe, 3 GB/s</span><span class="track"><span class="fill" style="--w: 3.4%"></span></span><span class="value">4.7 s</span></div>
<div class="hbar"><span>Network Disk, 1 GB/s</span><span class="track"><span class="fill" style="--w: 10%"></span></span><span class="value">14 s</span></div>
<div class="hbar"><span>Object Store, 250 MB/s</span><span class="track"><span class="fill" style="--w: 40%"></span></span><span class="value">56 s</span></div>
<div class="hbar peak"><span>Object Store, 100 MB/s</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">140 s</span></div>
</div>
<figcaption>Time to load 14 GB of weights at four assumed read speeds, from our arithmetic</figcaption>
</figure>

The image pull and the warm up are on top. A new replica from a slow store needs minutes, and larger models take proportionally longer, which is why the next section matters.

The engine also has a rule for when the cache runs out. Preempted requests are recomputed once enough cache is free again, and in the current version the default mode is recompute and not a swap to the host's memory.

It warns that this can hurt end to end performance, and it lists remedies: more memory for the cache, a lower limit on sequences or on tokens per batch, or more parallelism.

It also says that chunked prefill is on by default whenever possible, and gives the trade for the limit on tokens in a batch: smaller values favor the delay between tokens, larger ones favor the time to first token, with a recommendation above 8,192 for smaller models on large GPUs.

## Scaling the Fleet

Autoscaling on processor use doesn't suit a server that is limited by GPU memory and queue length.

The signals that fit are the ones the model server reports. vLLM exposes, among others, the time to first token, the delay between tokens, the time a request spent waiting, the number of requests waiting and running, the use of the cache as a fraction, and a count of preemptions.

KServe, a model serving platform on Kubernetes, offers request based autoscaling and canary rollouts. A caveat: a standard Kubernetes install doesn't support canary deployment and scale to zero, which need the Knative installation.

Knative shows what a request based scaler looks like: a target number of concurrent requests for each replica, with a default of 100 and a hard limit that defaults to no limit, and a requests a second target defaulting to 200.

Those defaults describe web services. One of our replicas handles about 6 requests a second in the simulation below, so the target has to come from measurement, as in [Autoscaling](/system-design/autoscaling) and [Capacity Planning](/system-design/capacity-planning).

The delay is the problem to quantify. We simulated registration day: 8 requests a second, then 30 for 10 minutes, with a replica serving 6 a second and starting 120 seconds after the decision. The model is a plain queue, and users give up after 30 seconds of waiting:

| Policy | Within 10 s | Rejected | Abandoned |
| --- | --- | --- | --- |
| Fixed at 2 Replicas | 33.8% | 0% | 37.8% |
| Reactive, Start in 120 s | 67.9% | 0% | 8.2% |
| Scheduled 5 Minutes Ahead | 100% | 0% | 0% |
| Reactive, Reject Past 10 s | 77.0% | 15.0% | 0% |

The reactive policy added a replica when the estimated wait passed 5 seconds. By the time the new replicas were ready, the queue had grown, and a third of the spike's users still waited longer than 10 seconds.

The scheduled policy added 4 replicas five minutes before 9:00, which a registration day allows, and served each user within 10 seconds at 140 replica minutes, against 152 for the reactive one and 60 for the fixed fleet that failed.

Rejecting early protected the wait and sent 15 percent of the users away, the trade of [Load Shedding and Graceful Degradation](/system-design/load-shedding).

The sensitivity to start time is what to take from the reactive row:

<figure class="chart">
<div class="hbars" role="img" aria-label="Share within 10 seconds for three start times">
<div class="hbar"><span>Start in 30 s</span><span class="track"><span class="fill" style="--w: 91.5%"></span></span><span class="value">91.5%</span></div>
<div class="hbar"><span>Start in 120 s</span><span class="track"><span class="fill" style="--w: 67.9%"></span></span><span class="value">67.9%</span></div>
<div class="hbar peak"><span>Start in 300 s</span><span class="track"><span class="fill" style="--w: 35.9%"></span></span><span class="value">35.9%</span></div>
</div>
<figcaption>Share of requests answered within 10 seconds by the reactive policy, by replica start time, from our simulation</figcaption>
</figure>

A replica that starts in 30 seconds made the reactive policy work, and one that took 5 minutes made it nearly useless.

Speeding up the start is as valuable as a smarter scaler: keep the weights on fast local storage or a warm image, keep a small pool of spare replicas, and scale on the queue while it is short and not after it is long.

## Rolling Out a New Model

A new model version is a deploy with a twist. A bad build crashes, and a bad model answers fluently and wrongly, so health checks pass. The methods of [Canary Releases and Other Deployment Strategies](/system-design/deployments) and [Feature Flags](/system-design/feature-flags) apply, with extra care:

- **A canary on a share of traffic**: KServe lists canary rollouts as a feature, and a router or a flag can do the same
- **Quality as a gate**: Compare answers on a fixed set of questions before the rollout, and sample live answers during it, the subject of [Evaluation](/system-design/ai-evaluation)
- **Shadow traffic**: Send copies of real requests to the new version and compare, without showing users the result, as in the shadow reads of [Migrating Between Datastores Without Downtime](/system-design/migrating-datastores)
- **Two versions cost two sets of GPUs**: Plan the capacity for the overlap
- **Keep the old version warm**: A rollback has to be quick, and loading weights isn't
- **Pin the version**: Record the model, the prompt template and the settings for each answer, so a complaint can be traced

## What to Watch

The metrics of [How LLM Inference Works](/system-design/llm-inference) become the dashboard:

- **Time to first token and time between tokens**: The two latencies a student feels, with an alert on the 95th percentile, as in [SLIs, SLOs and Error Budgets](/system-design/slo)
- **Queue wait and requests waiting**: The first sign of saturation, and the signal for scaling
- **Cache use and preemptions**: A cache near full with preemptions rising means the batch is too large for the memory
- **Rejections and errors**: By cause, so overload can be told apart from a bug
- **Cost for each answer**: GPU hours divided by tokens served, since the fleet is the main expense, covered further in [Caching and Model Routing](/system-design/llm-cost-latency)

[Monitoring AI Systems in Production](/system-design/ai-monitoring) adds the quality signals that these don't show.

## A Plan for the Textbook App

| Piece | Decision |
| --- | --- |
| Server | An existing model server with continuous batching and a paged cache |
| Fleet | 2 replicas as the base, 6 on registration day, scheduled to be ready by 8:55 |
| Start Time | Weights on local storage in the image, so a replica is ready in under a minute |
| Scaling Signal | Estimated queue wait, with a target from a load test |
| Overload | A bound on the wait, with a clear message when it is passed |
| Batch Jobs | A separate pool tuned for throughput, run overnight |
| Rollout | A canary on 5 percent of traffic, gated on a fixed question set |
| Dashboard | Time to first token, time between tokens, queue wait, cache use, cost for each answer |

## Pitfalls

- **Scaling on processor use**: The limit is GPU memory and queue length
- **Reacting to a spike after it starts**: A replica that takes minutes arrives too late
- **One tuning for online and batch work**: Each loses to a compromise
- **Ignoring load time in the plan**: A slow store turns a scale up into a long wait
- **Treating a model change as a normal deploy**: Health checks pass while quality falls
- **No bound on the queue**: Users wait past the point of giving up, and the work is wasted
- **Forgetting the overlap during a rollout**: Two versions need two sets of GPUs

## Key Points

- A model server holds the weights in accelerator memory, batches requests and exposes an API, and online, asynchronous and batch calls need different tuning
- Batch work runs at the throughput setting: in our estimate, 3 million summaries took 2.6 days on one replica, against 4.9 days at the latency setting
- GPUs come in whole units and start slowly: loading 14 GB of weights took 4.7 seconds from local NVMe and 140 seconds from a slow store, before the image pull and warm up
- <u>Scale before the spike, not during it</u>: in our simulation, a reactive policy with a 120 second start served 67.9 percent within 10 seconds, and a schedule that added replicas 5 minutes ahead served 100 percent
- Roll out models as canaries gated on quality, keep the old version warm, and watch time to first token, time between tokens, queue wait and cache use
