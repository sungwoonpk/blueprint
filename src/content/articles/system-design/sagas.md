> A **saga** is a business transaction built from a sequence of local transactions, each committing in its own service. If a step fails, the saga runs **compensating transactions** that undo the completed steps in reverse order. No locks are held across services, and the price is that the steps are visible to others while the saga runs.

[Two-Phase Commit](/system-design/two-phase-commit) made several databases agree, by holding their locks until a coordinator decided. That works inside one organization's database system, and it fits badly with a purchase that crosses the listing service, the wallet service and the email provider, owned by different teams and run on different stores.

The textbook app's purchase has four steps: reserve the listing, charge the buyer, credit the seller, send the receipt. A saga runs them one after another, each committing at once, and has a plan for what to do if one fails.

## Where the Idea Comes From

Hector Garcia-Molina and Kenneth Salem introduced sagas in 1987 for long lived transactions. Such a transaction holds database resources for a long time, which delays the short, common transactions that need them. Their examples are producing monthly account statements at a bank, processing insurance claims and collecting statistics over a whole database.

Their remedy was to break the long transaction into a sequence of shorter ones that can interleave with others, and to give each a compensating transaction. The same idea fits microservices, where a transaction is long because it crosses the network and not because it computes for hours.

## Steps and Their Undo Steps

For each step in the saga, someone writes an undo step. Some steps can't be undone, and There are three kinds:

| Step | Undo Step | Kind |
| --- | --- | --- |
| Reserve Listing | Release the reservation | Compensable |
| Charge Buyer | Refund the buyer | Compensable |
| Credit Seller | No undo, the saga finishes from here | Pivot |
| Send Receipt | No undo, retry until it works | Retryable |

A **compensable** step can be undone. The **pivot** is the point of no return: after it succeeds, the saga must go forward. The **retryable** steps that follow must be idempotent and must eventually succeed, so they are retried and not compensated.

<figure class="diagram">
<p class="rowname">Each Step Succeeds</p>
<div class="flow">
<div class="node">Reserve</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Charge</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Credit</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Receipt</div>
</div>
<p class="rowname">The Charge Fails</p>
<div class="flow">
<div class="node">Reserve</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node lost">Charge Fails</div>
<div class="arrow wide" data-label="compensate" aria-hidden="true"></div>
<div class="node wait">Release Listing</div>
</div>
<figcaption>Each step commits at once, and a failure runs the undo steps of the completed steps in reverse</figcaption>
</figure>

## Coordinating the Steps

Two styles exist, and both are described by microservices.io, Microsoft and AWS:

- **Choreography**: Each service does its local transaction and publishes an event, and the next service reacts. microservices.io's example is an order service that creates an order as pending and emits an event, the customer service reserves credit and emits its outcome, and the order service approves or rejects the order
- **Orchestration**: A central orchestrator tells each participant which local transaction to run, and handles the replies. In AWS, Step Functions can do it, with a failure path that runs Revert Payment, then Revert Inventory, then Remove Order

| Question | Choreography | Orchestration |
| --- | --- | --- |
| Fits | Simple flows with few services | Complex flows, or ones that change |
| Coordination | No extra service, through events | A coordinator with the flow in one place |
| Cyclic Dependencies | A risk between services | Avoided |
| Single Point of Failure | Absent | The orchestrator, unless it is durable |
| Hard Part | Seeing and changing the flow | Writing and running the coordinator |

These differences decide it, and the choice is the one from [Workflow Engines](/system-design/workflow-engines): a coordinator holds the process in one place and records its progress, which is why durable engines such as Step Functions and Temporal are common for sagas.

Each step also has the dual write problem from [The Transactional Outbox](/system-design/transactional-outbox): a service must update its database and publish an event or reply reliably.

A sketch of an orchestrated saga shows the structure. The undo steps are registered before the step runs, since a step that times out may have done its work:

```python
def purchase_saga(order):
    undo = []
    try:
        undo.append(lambda: release_listing(order))
        reserve_listing(order)
        undo.append(lambda: refund_buyer(order))
        charge_buyer(order)
        credit_seller(order)                  # the pivot
        retry_until_success(send_receipt, order)
    except StepFailed:
        for compensate in reversed(undo):
            retry(compensate, attempts=5)     # each undo step is idempotent
        raise
```

Temporal uses the same pattern: a list of undo actions, run in reverse on failure, with the undo registered before its step and written to tolerate a step that did not run. A workflow timeout can end the workflow before compensations run, and a terminate or reset skips them.

## Compensation Is Not Rollback

A database rollback restores the state as it was. A compensation can't, since other transactions have run in the meantime.

Rolling data back is unsafe because concurrent writers may have changed it, so a compensation has to be specific to the business: a refund, not a reversal of the wallet row.

A compensation can fail too, so it must be idempotent, as in [Idempotency and Safe Retries](/system-design/idempotency), and the saga must record its progress so it can resume. Some failures need a person.

How much does retrying matter? We simulated 100,000 purchases with failure chances of 0.5, 3, 1 and 2 percent at the four steps, and a 5 percent chance that any single compensation attempt fails. These numbers are our assumptions:

| Compensation Policy | Completed | Cleanly Undone | Stuck Half Done |
| --- | --- | --- | --- |
| One Attempt, Then Give Up | 93,622 | 5,916 | 462 |
| Up to 5 Attempts | 93,571 | 6,429 | 0 |

A single attempt left 462 purchases, 0.46 percent, with a reserved listing or a charged buyer and no one to fix it. Retrying idempotent compensations removed them. The extra cost was about 1,000 more compensation calls over the whole run.

The same shape applies to the forward steps, with their own retry policy. The Step Functions tutorial's example retries after 1 second, up to 3 attempts, doubling each wait with full jitter, as in [Timeouts, Retries and Backoff](/system-design/timeouts-retries).

## The Missing Isolation

A saga is atomic in the sense that it completes or is compensated, and it is not isolated: other transactions can see the intermediate states.

The anomalies: **lost updates**, where one saga overwrites changes another made, **dirty reads**, where one reads data another saga will undo, and **fuzzy reads**, where a saga reads the same data twice and gets different values. The countermeasures are design techniques:

| Countermeasure | What It Does | In the Textbook App |
| --- | --- | --- |
| Semantic Lock | A flag marks a record as being changed by a saga | The listing shows "pending" while a purchase is in progress |
| Commutative Updates | Make updates order independent | Add and subtract amounts from a balance, and don't set it |
| Pessimistic View | Order steps so a dirty read does little harm | Credit the seller after the charge is safe |
| Reread Value | Check the data hasn't changed before updating | Read the listing's price again before charging |
| Version File | Record operations on a record and apply them in order | Log wallet entries and compute the balance |
| Risk Based Choice | Use sagas for low risk updates and stronger transactions for high risk | A single database transaction for the wallet |

The semantic lock is the common one. A second buyer who finds the listing pending can wait or choose another, and doesn't see a sold listing that may be released a moment later.

## Telling the Client

A saga takes time, so the client can't treat the first response as the result. microservices.io lists three ways: wait for the response if it is quick, poll for the order's state, or push a notification over a websocket or webhook.

The order moves from pending to approved or rejected, and the page shows the user that state, as in the seller's pending listing in [Replication Lag](/system-design/replication-lag).

## Sagas or Two-Phase Commit

| Situation | Use |
| --- | --- |
| Steps across services owned by different teams | A saga |
| Steps that take a long time or wait for a person | A saga |
| Two shards in one database system, a rare cross shard write | The database's own two phase commit |
| Money moves and temporary inconsistency is not allowed | A single transaction, or a stricter design |

Avoid sagas when transactions are tightly coupled, when compensations would fall on earlier participants in complicated ways, or when the system can't tolerate temporary inconsistency. Sagas are also hard to debug, and complexity grows with the number of services.

For the textbook app, the purchase is a saga with an orchestrator, because it spans services and ends in an email. The wallet itself stays in one database transaction, so the part that moves money is atomic.

## Key Points

- A saga runs local transactions in order and, if one fails, runs compensating transactions for the completed steps in reverse
- Steps are compensable, pivot or retryable, and the steps after the pivot are retried until they succeed
- Choreography uses events and suits simple flows, and orchestration uses a coordinator and suits complex ones, often as a durable workflow
- <u>Compensation is a business action and not a rollback</u>, so it must be idempotent and retried: one attempt left 462 of 100,000 purchases stuck in our simulation, and five attempts left 0
- Sagas have no isolation, so use semantic locks, commutative updates and rereads, and tell the client the order is pending
