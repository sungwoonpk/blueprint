> **Borg** is Google's cluster manager. Users describe jobs, each made of tasks that run one program, and Borg decides which machine runs each task, starts it in a container, restarts it when it fails, and shares the machines between important services and low priority batch work. It reaches high utilization by packing tasks tightly, giving work priorities and quotas, and reusing resources that jobs reserve and don't use.

The textbook app now has ten services and a dozen batch jobs, running on a fleet of 300 machines. Someone has to decide where each piece goes.

A person with a spreadsheet can do it for a week. Then a machine dies at 3:00 AM, the search service needs six more copies for registration day, and the nightly report wants 200 cores for an hour.

The old way assigns machines to services. Search gets 40, checkout gets 20, and the batch jobs get a pool of their own. It is simple, and it wastes a lot: each pool is sized for its own peak, so the fleet is idle most of the time, and moving a machine between pools takes a person.

Borg's idea is to give up the idea of assigning machines. Users say what they want, in terms of cores, memory and copies, and the system finds room.

This turns a fleet into one pool, and it lets the system do the three things a person can't keep doing: pack tightly, replace what fails, and make room for what matters when there isn't enough.

This topic follows a task from submission to a running process, then the choices that raise utilization, and measures three of them on a small model of our own. It builds on [Containers and Orchestration](/system-design/containers), which is Borg's open source descendant at a smaller scale, and on [Capacity Planning](/system-design/capacity-planning) and [Autoscaling](/system-design/autoscaling).

## What the User Sees

A user submits a **job**: a name, an owner, a number of tasks and the resources each needs. Every task of a job runs the same program, in a Linux container, with no virtual machine in between.

Each resource, such as cores, memory, disk and ports, is requested on its own scale, with no fixed sizes. A job can carry constraints, hard ones that must be met and soft ones that act as preferences, such as a processor type or an external address.

The job is written in a declarative configuration language. The user says what the end state is, and Borg works toward it, which is the model that [Containers and Orchestration](/system-design/containers) uses too.

Updating a job is a rolling change, with a limit on how many tasks it may disrupt, and it can be undone until it is committed.

Work comes in two kinds. Long running services, such as search, mail and storage, should stay up and answer requests in microseconds to a few hundred milliseconds. Batch jobs take seconds to days and don't mind short slowdowns. The two share machines, and that is where most of the savings come from.

A group of machines managed as a unit is a **cell**. A cell sits in one data center and its median size is about 10,000 machines. A job runs in one cell.

## One Brain, Five Copies

A cell has a central controller, the **Borgmaster**, and an agent on each machine, the **Borglet**. The master is logically one process, and is replicated five times. Each replica keeps most of the cell's state in memory, and the state is also recorded in a Paxos based store on their disks.

One replica is elected master and serves as the Paxos leader, and the others take over within about 10 seconds if it fails. This is the same pattern as the lock service of [Chubby and ZooKeeper](/system-design/chubby-zookeeper), put to work as the cell's source of truth.

The master doesn't run tasks. It polls each Borglet at intervals of a few seconds, sends it instructions, and treats a Borglet that misses several polls as down, then reschedules its tasks elsewhere.

If the connection returns, it tells the Borglet to kill the tasks that were rescheduled, so that there are no duplicates. A Borglet keeps running its tasks even if the master replicas are down, so a failure of the control plane doesn't stop the work.

Scale needed some engineering. Communication with the Borglets is split among stateless link shards, one per slice of the machines, and the scheduler became a separate process that works on a cached copy of the cell's state, so it can run in parallel with the rest.

## Finding a Place for a Task

A submitted job is recorded in the store and its tasks go to a pending queue. The scheduler scans the queue, from high priority to low, and for each task does two steps.

**Feasibility** finds the machines that could run it: those with enough free resources, meeting the constraints, or having lower priority tasks that could be preempted. **Scoring** picks the best of those.

Scoring is the interesting policy question, and Borg tried the extremes. The first scoring was a spreading rule, which puts a task on the machine with the most free room, called worst fit.

It keeps headroom for spikes, and it leaves each machine partly empty in a way that makes large tasks hard to place. The opposite is best fit, which fills machines tightly, so that some are empty. It packs better and leaves little room for a task that is bigger than its estimate.

The current score is a hybrid that reduces **stranded resources**, the free resources on a machine that can't be used since the other dimension is full: a machine with free cores and no memory left can't take anything. The rule balances the remaining free fractions of each resource.

We tested this on a model of our own. 1,500 tasks with varied cores and memory, which add up to the load of 330 machines at best, on machines of 16 cores and 64 GB. We placed the tasks in random order and counted the machines each policy needed:

| Placement Rule | Machines Used | Over the Lower Bound |
| --- | --- | --- |
| Spread, Most Free Room First | 388 | 17.6% |
| First That Fits | 361 | 9.5% |
| Best Fit, Tightest First | 363 | 10.0% |
| Balanced Remainders | 358 | 8.7% |

<figure class="chart">
<div class="hbars" role="img" aria-label="Machines needed by four placement rules">
<div class="hbar peak"><span>Spread</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">388</span></div>
<div class="hbar"><span>Best Fit</span><span class="track"><span class="fill" style="--w: 93.5%"></span></span><span class="value">363</span></div>
<div class="hbar"><span>First Fit</span><span class="track"><span class="fill" style="--w: 93.1%"></span></span><span class="value">361</span></div>
<div class="hbar"><span>Balanced</span><span class="track"><span class="fill" style="--w: 92.3%"></span></span><span class="value">358</span></div>
</div>
<figcaption>Machines needed to place 1,500 tasks, from our simulation, by placement rule</figcaption>
</figure>

Spreading cost 30 machines, about 8 percent, more than the balanced rule, because of the stranded resources it leaves.

The differences among the other three were small, and the published result is in the same range: the hybrid packs about 3 to 5 percent better than best fit on real workloads. At the size of a cell, a few percent is hundreds of machines.

Two tricks keep scheduling fast in a cell of tens of thousands of machines. Tasks in a job usually have the same requirements, so Borg evaluates feasibility and score once for a group of identical tasks, an equivalence class.

And it doesn't look at the whole set of machines: it examines machines in random order until it has found enough feasible ones to score, and picks the best of them. Scores are cached until a machine or a task changes.

Starting is slower than placing. A task typically takes about 25 seconds from being scheduled to running, and installing the program packages takes about 80 percent of that, so the scheduler prefers machines that already hold the packages.

## Priorities, Quota and Preemption

More work shows up than fits, and Borg has two tools to decide. Each job has a **priority**, in bands for monitoring, production, batch and best effort.

A higher priority task can take resources from a lower one, by preempting it, which kills it. To avoid chains in which a preempted task preempts another, tasks in the production band can't preempt one another.

**Quota** decides what is admitted. It is a vector of resources at a given priority for a period, such as months, and a job without enough quota is rejected on submission and doesn't wait in a queue.

Quota at a high priority is limited to what the cell actually has, so a production job that fits within its quota can expect to run.

Quota at the lowest priority is oversold, since the work there can be preempted. The admission control is separate from scheduling, and it ties to capacity planning, so the price of quota reflects physical capacity.

A task gets a warning before it is preempted, a termination signal that gives it time to save state and finish requests, and in practice the warning arrived about 80 percent of the time.

A job is also free to ask for an **alloc**, a reserved set of resources on a machine in which several tasks run together, such as a web server and its log copier.

## Using What Is Reserved and Not Used

The largest saving comes from a fact about services. A production job reserves resources for its rare peaks, and uses a fraction of them most of the time.

In a typical cell, production jobs were allocated about 70 percent of the CPU and used about 60 percent, and memory was allocated at about 55 percent and used about 85 percent, so the reserved CPU of production jobs was well above their use.

Borg reclaims the gap. The master estimates a task's real needs from its recent usage plus a safety margin, called a reservation, and starts with the full request and lowers it as the usage proves to be steady.

Low priority work is placed against the reserved amount, not the requested one. If a production task suddenly needs what it asked for, the low priority work is killed or throttled, and the production work isn't. About 20 percent of the workload in a median cell ran in reclaimed resources.

We counted what that does in a simple model. Suppose production jobs need 1,000 machines' worth of resources by their limits and use 45 percent of it, with a 15 percent margin on the reservation, and batch work needs 500 machines' worth:

| Layout | Machines Needed |
| --- | --- |
| Separate Production and Batch Clusters | 1,500 |
| One Cell With Reclamation | 1,018 |

The shared cell needed 32 percent fewer machines, because batch work uses the idle part of what production reserved. Google's own measurement of the same question, comparing a shared cell with separate ones for production and batch work, found that segregation needed 20 to 30 percent more machines in the median cell.

The risk is real and managed: a production spike pushes batch work out, so batch jobs have to be tolerant of being killed, and the system reclaims what it can take back quickly.

## Small Choices That Pay

Two more design choices show up in the measurements. Resource requests are fine grained, in thousandths of a core and in bytes, and not in fixed slots.

We rounded the requests of our model up to the next power of two, starting at half a core and 1 GiB, which is the kind of size menu that a cloud provider offers.

It inflated the CPU request by 44 percent and the memory by 37 percent, and the model then needed 565 machines in place of 358, about 58 percent more. The published figure, for real production jobs, was 30 to 50 percent more.

And tasks are isolated with containers, since most of the work doesn't run in virtual machines: the cost of virtualization wasn't worth paying, and the processors of the time lacked hardware support for it.

The risk of sharing a machine is interference between tasks, so Borg sets limits on CPU and memory per task and treats a task that exceeds its memory limit as the first to be killed.

## Lessons

The authors' own list of what they learned after a decade is useful as a list of what to do differently.

The job as the single unit of grouping turned out to be too coarse, and later systems added labels and a flat structure of objects. One IP address for each machine made port management awkward for tasks, which later designs gave an address of their own.

Rich introspection, such as a "why pending" explanation and the ability to simulate scheduling decisions, was worth as much as the scheduler itself, because a large system that can't be understood can't be operated.

And the master as the core of the system, with a small set of state machines behind a replicated store and the other controllers as clients of it, proved a good base to build many controllers on, which is the shape that Kubernetes took.

## What the Textbook App Takes From It

| Need | Decision |
| --- | --- |
| Fleet | One pool of machines and a scheduler, in place of a machine list for each service |
| Requests | Cores and memory in fine units, from measurements, and not from a short menu of sizes |
| Priorities | Checkout and search first, batch jobs preemptible, and a termination warning in the code |
| Quota | A cap on each team's resources at each priority, checked at submission |
| Sharing | Batch jobs use the unused reservations of services, and yield on a spike |
| Placement | Spread across failure domains, and balance cores against memory |
| Control Plane | A replicated store behind the master, with agents that keep working when it is down |

## Pitfalls

- **A machine list for each service**: Each pool is sized for its own peak and idle the rest of the time
- **Sizes from a short menu**: Requests are rounded up and the fleet grows by half
- **Spreading as the sole placement rule**: Free cores and free memory end up on different machines
- **Preemption without a warning**: A task can't save its state
- **Priorities that can preempt one another at the same level**: A chain of kills spreads through the cell
- **Batch work that can't be killed**: It can't share machines with services
- **Reclaiming without a way to take it back**: A spike in a service has nowhere to go
- **A control plane that stops the work when it fails**: The agents should keep running their tasks

## Key Points

- Borg turns a fleet into one pool: users submit jobs of tasks with resource requests, and a replicated Borgmaster, with a Paxos based store and a failover of about 10 seconds, schedules them onto machines with agents that keep working if it is down
- Scheduling is feasibility and then scoring, and packing rules matter: in our model spreading tasks needed 17.6 percent more machines than the lower bound and balancing the remaining cores and memory needed 8.7 percent
- Priorities say who runs, and quota, checked at submission, says who may ask, with preemption of low priority work and a warning before it
- <u>Reclaiming reserved but unused resources is the biggest saving</u>: in our model one cell with reclamation needed 32 percent fewer machines than separate production and batch clusters, and the measured figure for segregation was 20 to 30 percent more machines
- Fine grained requests matter: rounding requests up to powers of two inflated our fleet by about 58 percent, against 30 to 50 percent measured on real jobs
