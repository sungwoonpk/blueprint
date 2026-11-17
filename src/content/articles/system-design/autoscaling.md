> **Autoscaling** adds and removes running capacity automatically as demand changes, so that a service has enough servers for the load of the moment without paying for the peak through the whole day. The signal can be a metric, a clock, a forecast or the length of a queue.

[Capacity Planning](/system-design/capacity-planning) ended with a plan for the textbook app: 2 servers for most of the year and 8 for the peak. The plan didn't say who adds the other 6, or when. Someone could do it by hand at 8:55 on registration day, and forget once. Autoscaling is that someone, in software.

It looks like a simple loop: measure the load, compare it with a target, add or remove servers. The details of that loop decide whether it works. The main one is time, since a server added at 9:00 AM doesn't take traffic at 9:00 AM.

## How a Scaler Decides

The common design, in AWS and Kubernetes alike, is **target tracking**. It works like a thermostat: you pick a metric and a target, such as an average CPU utilization of 50 percent, and the service adds capacity above the target and removes it below. AWS creates and manages the alarms itself.

Kubernetes' Horizontal Pod Autoscaler states the rule as a formula: the desired number of replicas is the current number times the ratio of the current metric to the desired one, rounded up. Its example is a current value of 200 against a desired 100, which doubles the replicas.

With 4 servers at 90 percent CPU and a target of 60 percent, the desired count is 4 times 0.9 divided by 0.6, which is 6.

Two details keep the loop calm. Kubernetes uses a tolerance of 10 percent, so a ratio close to 1 triggers no change, and it checks every 15 seconds.

A metric has to move in proportion to the number of instances. Average CPU does, because more servers share the same load. A total request count doesn't, since adding servers doesn't change how many requests arrive.

Scaling out and scaling in are treated differently on purpose. AWS scales in more gradually than it scales out, to protect availability. Kubernetes defaults let a scale out add the larger of 4 pods or 100 percent of the current count at 15 second intervals, and hold scale in back for a window of 300 seconds.

## The Delay

A scaler reacts to a number that is already old. Between the demand and the new capacity sit several waits:

| Step | Wait |
| --- | --- |
| Metric Collection | 1 to 5 minutes in AWS, depending on monitoring |
| Decision | A check at 15 second intervals in Kubernetes |
| Launching the Server | Seconds to minutes, depending on the image |
| Warm Up | Until the server is ready for full traffic |

Warm up is a period during which a new instance is left out of the group's metrics, and during it scale in is blocked.

It isn't enabled by default, and the AWS page on a default warm up suggests starting around 300 seconds and tuning from there. Kubernetes has similar settings: pods that aren't ready are treated as still starting, and CPU samples are ignored for a period that defaults to 5 minutes.

The total is the part that matters. In our simulation of registration day, we assumed 150 seconds from the decision to a server taking traffic, which is our assumption, and a metric that is a one minute average.

## Registration Day

The simulation: 600 requests a second until 9:00 AM, 3,000 a second within the next minute, held for 30 minutes, then a fall back over 10 minutes.

A server finishes 600 requests a second, so the peak needs 5 servers and our plan says 8. The reactive policy tracks 60 percent utilization, scales in one server at 10 minute intervals, and is capped at 10 servers:

| Policy | Requests Lost in the First 10 Minutes | Server Hours in 2 Hours |
| --- | --- | --- |
| 2 Servers, Fixed | 58.6% | 4.0 |
| 8 Servers, Fixed | 0% | 16.0 |
| Reactive, Target Tracking at 60% | 19.9% | 9.7 |
| Scheduled for 8:50, Plus Reactive | 0% | 10.8 |

The reactive policy took 269 seconds after 9:00 to have enough capacity. During that time the servers that were running were overloaded, which also drove the metric to its ceiling, so it took more than one round to reach the right count.

One request in five was lost in the first 10 minutes, though the policy saved 6.3 server hours compared with running 8 constantly.

The scheduled policy added 6 servers at 8:50, in time for the peak, and the reactive policy ran alongside it to handle a day busier than planned.

It lost no requests and cost 10.8 server hours, which is 5.2 fewer than the fixed fleet. The figures are from our simulation, with our assumptions, so they show the direction and not a forecast.

## Schedules and Forecasts

When the pattern is known, don't wait for the metric:

- **Scheduled scaling**: An action sets the desired capacity at a time, once or on a recurring cron schedule. AWS uses UTC by default, allows named time zones that follow daylight saving, and an action can run up to two minutes late. Schedules and dynamic policies can work together, with the dynamic policy acting inside the limits the schedule sets
- **Predictive scaling**: AWS needs at least 24 hours of history, looks at up to 14 days, produces an hourly forecast for the next 48 hours and refreshes it at 6 hour intervals. It suggests running first in a mode that just forecasts, to judge the forecast, and in the scaling mode it adds capacity for expected rises but doesn't remove it, so dynamic policies still handle scale in

A forecast suits a pattern that repeats, such as the daily rhythm of students. A one time event, like the first morning of a semester, is better served by a schedule that someone with knowledge of the calendar sets, which is the point of the inorganic demand in [Capacity Planning](/system-design/capacity-planning).

## Why It Flaps

A metric that is noisy and a scaler that answers each wiggle produces **flapping**, the Kubernetes name for replicas that change again and again, adding and removing servers within minutes. Each change costs a launch and a warm up.

We simulated a noisy load with a 6 minute wave over 2 hours, deciding at 15 second intervals. With no protection, the scaler made 252 changes. With a 5 minute stabilization window, in which it scales in to no lower than the highest recommendation of the window, it made 21.

The window works as approximately a rolling maximum, and it exists so that the autoscaler doesn't remove pods just to create the same number again a few moments later. The tolerance does a similar job at the small scale.

In AWS the equivalents are the gradual scale in and the cooldown, which defaults to 300 seconds and applies to simple scaling policies, since target tracking can scale out without waiting for it.

## Scaling by Queue

For background workers, CPU is the wrong signal: a worker with an empty queue and one with a million waiting messages can have the same utilization. The signal is the backlog.

A good signal for queue based scaling is backlog per instance, the visible messages divided by the instances in service, and the target comes from the acceptable latency divided by the average processing time of a message.

Its worked example has 10 instances, 1,500 messages, 0.1 seconds to process a message and 10 seconds as the longest acceptable wait. The acceptable backlog for each instance is 10 divided by 0.1, which is 100, and the current backlog is 150, so the group grows to 15.

For the textbook app, the workers that resize photos from the [Task Queues](/system-design/task-queues) topic scale this way: 3 photos for each listing, and a few seconds of delay is fine.

KEDA, an event driven scaler for Kubernetes, adds the ability to scale to zero when there is no work. It has two phases: activation, which moves from zero to one and back, and scaling from one to N, which it leaves to the Kubernetes autoscaler.

Its documented defaults check the source at 30 second intervals, wait 300 seconds of inactivity before scaling to zero, and allow a minimum of 0 and a maximum of 100 replicas.

## What Autoscaling Doesn't Solve

- **Speed**: A spike faster than the boot time gets there before the capacity does, and that is the job of [Load Shedding and Graceful Degradation](/system-design/load-shedding) while the new servers start
- **State**: A database or a cache isn't scaled by adding stateless servers, and more web servers can overload it with connections, as in [Bulkheads](/system-design/bulkheads)
- **Dependencies**: A payment provider with a rate limit stays at its limit, however many servers call it
- **Cost**: A bug or an attack can drive the count up, so set a maximum, and alert when the group stays near it
- **Shutdown**: A server removed in a scale in has requests and jobs in flight, so drain them first, and AWS offers scale in protection for instances busy with a job

## Settings for the Textbook App

| Setting | Value | Reason |
| --- | --- | --- |
| Minimum Servers | 2 | One failure leaves a server up |
| Maximum Servers | 10 | A cap on cost and on load for the database |
| Target | 60% CPU | The limit measured in [Load Testing](/system-design/load-testing) is higher, so this leaves room |
| Schedule | 8 servers at 8:50 on registration days | The reactive delay is longer than the surge |
| Scale In | One server at 10 minute intervals | A gradual descent avoids flapping |
| Photo Workers | Backlog Target of 100 Messages for Each Worker | 10 seconds of acceptable wait divided by 0.1 seconds for each photo |

Test the whole loop with a spike, as in [Load Testing](/system-design/load-testing), since the first time it is exercised shouldn't be registration day.

## Key Points

- A scaler compares a metric with a target and adds or removes capacity, for example desired servers equal to current servers times metric over target, rounded up
- Time is the hard part: collecting the metric, deciding, launching and warming up take minutes, so a reactive scaler is late for a sharp spike
- In our simulation, a reactive policy lost 19.9 percent of requests in the first 10 minutes of the spike, and a schedule set 10 minutes ahead lost none
- <u>Use schedules and forecasts for a known pattern</u>, a reactive policy as a safety net, and a queue backlog for workers
- Stabilization windows and gradual scale in cut flapping from 252 changes to 21 in our test, and a minimum, a maximum and graceful shutdown keep the loop safe
