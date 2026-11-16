> A **feature flag**, also called a feature toggle, is a switch in the code that turns a behavior on or off while the program runs, without a new deploy. The switch can depend on who is asking, so a feature can reach staff first, then 1 percent of students, then the whole student body.

[Canary Releases and Other Deployment Strategies](/system-design/deployments) shrank the share of users who meet a bad release. A flag takes a step further: it separates two things that look like one. **Deploying** puts code on servers.

**Releasing** lets users see its behavior. With a flag, the code can arrive on Thursday, switched off, and the release can happen on Monday, to a few users, and be undone in seconds if it goes wrong.

Google's SRE workbook recommends this separation, keeping feature launches apart from binary releases through flags or an experiment framework. The textbook app uses it for a new search ranking, for a new checkout page, and for a switch that turns off the recommendations when the servers are overloaded.

## Four Kinds of Flags

Pete Hodgson's article on feature toggles, hosted on Martin Fowler's site, sorts flags by purpose, and the purpose decides how long a flag lives and how it should be handled:

| Kind | Purpose | Typical Life |
| --- | --- | --- |
| Release | Ship unfinished code safely, turn it on when ready | A week or two |
| Experiment | Show different versions to cohorts and measure | Hours to weeks |
| Ops | Control operating behavior, such as a kill switch | Short, with a few long lived |
| Permission | Different experience for premium, beta or staff users | Years |

- **Release flags**: Mostly static, since a given build either has the feature on or off. The article says they shouldn't stay much beyond a week or two, though a product led flag may stay longer
- **Experiment flags**: Highly dynamic. Each user is put in a cohort and stays there, and the decision is made on each request
- **Ops flags**: They need to change quickly, since needing a new release to flip an ops flag is unlikely to make an operations person happy. A few long lived ones act as kill switches or manual circuit breakers
- **Permission flags**: Very dynamic, decided on each request and kept for years

The same flag can change kind over its life, from a release flag to an experiment to an ops switch, and its owner and its home change with it.

## The Parts

Hodgson splits a flag into three parts. The **toggle point** is the place in the code where the decision is used. The **toggle router** is the logic that makes the decision.

The **toggle configuration** is the data the router reads. Keeping the three apart is the main design advice: a toggle point that holds its own decision logic spreads that logic through the code.

Two techniques keep the code clean. In inversion of decision, a component receives its decisions through its configuration when it is built, so it has no knowledge of flags and can be tested by passing a setting.

And for a feature with several toggle points, or one that will live long, he recommends a strategy, a swappable behavior, instead of conditionals scattered through the code. A simple if and else is fine for a small, short lived flag.

OpenFeature, a vendor neutral standard for flag evaluation, shows the shape from the caller's side:

```ts
const client = OpenFeature.getClient("search-service");

const useNewRanking = await client.getBooleanValue(
  "new-search-ranking",
  false,                                  // the default
  { targetingKey: user.id, region: "KR" } // the evaluation context
);
```

- **The default value**: Required on each call. If evaluation fails, the default comes back, so the program gets a usable answer in each case, and the documentation says to give the default some thought. The safe default is the old behavior
- **The evaluation context**: Facts about the request, such as the user and the region, that the flag system uses to target. The targeting key should uniquely identify the subject
- **The provider**: The translation layer between the evaluation API and the flag system in use, so the application code doesn't depend on a vendor

When something goes wrong, the standard defines reasons and error codes, such as the flag not being found, a type mismatch or a provider that isn't ready, and the detailed form reports why the default was returned. A flag that can't be read means the default behavior, not a crash.

## Rolling Out by Percentage

A staged rollout must treat a user the same way each time. A coin flip on each request at 10 percent would show a student the new search on one page and the old one on the next. We simulated it: with a coin flip, 65 percent of users saw both versions within 10 visits.

The standard method is to hash. Flagsmith's documentation describes merging the identity with the segment's identifier and hashing it into a number between 0 and 1, which is then compared with the percentage. We tried the same idea with the flag name and the user id:

| Property | Result in Our Test of 100,000 Users |
| --- | --- |
| Share Given a 5% Flag | 4.98% |
| Share Given a 25% Flag | 24.81% |
| The 5% Group Inside the 10% and 25% Groups | Yes |
| Users in Two Separate 10% Flags | 1.0% |
| Users in Two 10% Flags With the Same Hash | 10.0% |

The first rows show the hash splits users close to the target. The next shows the property that makes a gradual rollout work: raising the percentage adds users and removes none, and nobody who had the feature loses it.

The last two rows show why the flag name belongs in the hash. With the same hash for two flags, the same 10 percent of users get both, and an experiment on one is polluted by the other. Salted by the flag, the overlap is the expected 1 percent.

Flagsmith adds a practical limit: a staged rollout needs an identified user. A visitor without an identity can't be bucketed, so a flag for anonymous traffic needs a different key, such as a stable cookie.

## Where the Configuration Lives

Hodgson lists the places, from slow and safe to fast and flexible:

| Home | Change Needs |
| --- | --- |
| Hardcoded | A new build |
| Environment Variable or Argument | A restart |
| File in the Repository | Usually a redeploy |
| Database With an Admin Screen | A click, and care for consistency |
| Distributed Store Such as etcd or Consul | A write, and the nodes are told |

He prefers static configuration, kept in source control, whenever the flag's nature allows it, since the configuration then moves through the same pipeline and review as code. Flags that need to change at runtime, such as ops switches, need a faster home, and with a database, keeping the whole fleet consistent is a challenge.

A flag system is a dependency, and it fails like one. Evaluate flags from a local copy with a refresh, not by a network call for each request, and keep the last known values if the service is down.

OpenFeature models this as a provider status that can be stale. The calls to the service need the timeouts and breakers of [Timeouts, Retries and Backoff](/system-design/timeouts-retries) and [Circuit Breakers](/system-design/circuit-breakers).

## Kill Switches and Degradation

An ops flag turns a feature off faster than any redeploy. If the recommendation service is struggling, the flag stops the page from calling it, which is the degraded mode of [Load Shedding and Graceful Degradation](/system-design/load-shedding).

A flip that reaches the servers in tens of seconds compares well with a rollback that takes minutes, though both figures are assumptions and depend on the system.

The switch has to be ready before it is needed. Decide who may flip it, test that flipping works, and tell the on call engineer where it is. A kill switch that nobody has tried is the same untested path that the SRE book warns about.

## The Cost of Flags

Hodgson treats flags as inventory with a carrying cost. Each flag adds conditional logic and a testing burden, since the code has to be tested with the flag in both states.

The states multiply, as our arithmetic shows:

| Flags | Possible States |
| --- | --- |
| 5 | 32 |
| 10 | 1,024 |
| 20 | 1,048,576 |

The article's answer is that most flags don't interact, so a team doesn't test each combination. It tests the configuration expected in production, and the fallback, and some teams add one with each flag on. That works if a convention holds, with the old behavior as off and the new behavior as on.

The cure for the cost is removal:

- **A removal task**: Added to the backlog when the flag is created
- **An expiry date**: In the flag's metadata, so the flag has an owner and a deadline
- **A time bomb**: A test that fails, or an application that refuses to start, after the expiry
- **A cap**: A limit on the number of flags, so adding one means removing one

The article also advises exposing the current flag state through an endpoint, so that operators and tests can see what a running server believes.

## A Dead Flag at Knight Capital

The SEC's order on Knight Capital shows what a flag left in the code can do.

On 1 August 2012, the firm's order router SMARS, processing 212 small retail orders, sent millions of orders into the market over 45 minutes and got over 4 million executions in 154 stocks, for more than 397 million shares. Knight lost over 460 million dollars.

The order gives the chain. An old function called Power Peg had been unused since 2003, yet remained callable on the production servers. In 2005, Knight moved a part of its code and didn't retest Power Peg.

In July 2012, new code for an exchange program reused a flag that used to activate Power Peg, with the plan to delete the old code.

The deployment was by hand, to 8 servers in stages, and a technician didn't copy the new code to one of them. Nobody reviewed the deployment, and Knight had no written procedure requiring it.

On August 1, orders with the reused flag reached that server and activated the old code, which kept sending child orders without regard to the shares already filled.

During the incident, the response made it worse. Knight had no procedures for incident response, and in one attempt it uninstalled the new code from the 7 correct servers, which sent more orders into the defective code. The order also says Knight lacked a control that compared the orders leaving the router with those that entered.

The lessons for flags match the lessons in the rest of this phase: don't reuse a flag name for a new meaning, remove dead code and the flag with it, verify that a deploy reached each server, have a way to halt a runaway system, and write the incident steps before the incident, as in [Incidents and Postmortems](/system-design/postmortems).

## Flags for the Textbook App

| Flag | Kind | Plan |
| --- | --- | --- |
| New Search Ranking | Release, then Experiment | Staff, then 1%, 5%, 25%, 100%, then delete the old code |
| New Checkout Page | Release | The same ramp, with the checkout error rate as the gate |
| Recommendations Off | Ops | A kill switch, kept, and tested on a game day |
| Beta Features | Permission | Staff and volunteers, with a named owner |

Each flag has an owner, a default of the old behavior, and an expiry date, except the permanent switch.

## Pitfalls

- **Reusing a flag**: A name that meant one thing now means another, with old code still behind it
- **Flags that outlive their purpose**: A hundred flags and no one who knows what they do
- **A risky default**: A default that turns the new behavior on when the flag service is down
- **A flag service in the request path without a fallback**: The switch becomes a point of failure
- **Testing a single state**: The off state is the one that runs when something fails
- **Mixing deploy and schema**: A flag can hide behavior and cannot hide an incompatible schema, which is the subject of [Schema Migrations Without Downtime](/system-design/schema-migrations)

## Key Points

- A feature flag separates deploying code from releasing behavior, so a feature can ship dark, reach users in steps and be undone in seconds
- Flags come in four kinds, release, experiment, ops and permission, and the kind sets the lifetime: a week or two for release flags, years for permission flags
- <u>Pass a safe default on each call</u>, and bucket users by hashing the user and the flag name: in our test, a coin flip showed 65 percent of users both versions, and a shared hash put 10 percent of users in two flags
- Keep the configuration where the flag's speed needs it, serve from a local copy, and remember that the flag system is itself a dependency
- Flags carry a cost in tests and complexity, so give each an owner and an expiry, and remember Knight Capital, where a reused flag and an unverified deploy cost over 460 million dollars
