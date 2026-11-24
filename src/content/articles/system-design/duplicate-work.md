> **Duplicate work** is the same operation running more than once because a request was repeated, a message was delivered again, or a process restarted midway. For a read it costs time. For a payment it is a double charge. The pattern is to give each logical operation an identity, and to make the system recognize that identity before it acts and replay the first result after.

A student taps pay, the app spins, the phone loses signal, and the student taps again. The first request reached the server and charged the card. Its reply was lost.

The second request arrives with the same order, and the server, which has no memory of the first, charges again. No component was broken: the network lost one packet, and each component did its job.

That is the normal case for a distributed system. [Timeouts, Retries and Backoff](/system-design/timeouts-retries) said that a caller that gets no reply can't tell whether the work happened, so it retries, and [Idempotency and Safe Retries](/system-design/idempotency) introduced the remedy. This topic is the full pattern, with the failure modes that a first version misses.

## Where Duplicates Come From

| Source | How It Happens |
| --- | --- |
| A Double Click | The user taps twice before the page responds |
| A Client Retry | The reply was lost or slow, and the client sends again |
| A Proxy or Load Balancer Retry | An intermediary repeats a request after a failure |
| Queue Redelivery | A message is delivered again, since the consumer was slow or crashed |
| A Crash Between Effect and Acknowledgment | The work was done, and the system died before recording it |
| A Replay | A log or a job is processed again from an earlier position |

SQS shows two of these plainly. Standard queues deliver at least once, so design applications to be idempotent, since a copy on an unavailable server can be received again.

The visibility timeout, 30 seconds by default and 12 hours at most, hides a received message from other consumers, and a consumer that takes longer than the timeout sees the message delivered to someone else too. Even the timeout doesn't guarantee that a message is delivered once.

## What Delivery Guarantees Can and Can't Do

Messaging systems describe three guarantees. At most once doesn't repeat and can lose. At least once doesn't lose and can repeat. **Exactly once** neither repeats nor loses, and it is the most desirable guarantee and a poorly understood one.

The honest summary is that exactly once is an effect and not a delivery. Systems get it by combining at least once delivery with deduplication or idempotent processing:

- **SQS FIFO queues**: deduplication by a `MessageDeduplicationId`, or by a SHA-256 hash of the body with content based deduplication, within a window of 5 minutes. A retry of a send within the window adds no duplicate. After the window, no promise holds
- **Kafka**: an idempotent producer attaches sequence numbers to batches so that the broker discards a retry's duplicates, and transactions make writes across partitions atomic. The scope is limited: exactly once in Kafka Streams covers processing inside Kafka. A call to an outside service, or an update of an outside database, isn't covered

Both stop duplicates at one hop, within one system, for a limited time. The charge to a card is outside both, so the application needs its own protection end to end.

## The Idempotency Key

The design in common use is the **idempotency key**. The client makes up a unique key for each logical operation, sends it with the request, and sends the same key on each retry. The server stores the key with the result and, on a repeat, returns the stored result without doing the work again.

Where does the key travel? In a header, and each big API has its own name for it: Stripe uses `Idempotency-Key` with keys up to 255 characters, PayPal uses `PayPal-Request-Id` with a limit of 38, and Adyen uses `idempotency-key` with a limit of 64.

An IETF draft, still unfinished, would standardize `Idempotency-Key` as a structured header with a string value, and recommends a UUID.

A key stands for one request, so a second request that reuses the key with a different payload is a bug in the client. Store the original parameters with the key and return a validation error when a retry differs. Both 422 and 409 are in use for that error, so pick one and document it.

A retry should get the first answer back. Returning an error such as "the resource already exists" leaves the caller guessing, since it can't tell whether its own earlier request created the resource. The goal is **semantic equivalence**: the caller gets a response with the same meaning as the first success.

Stripe goes as far as replaying a saved server error. If the original is still running when the retry arrives, the answer is 409 Conflict, and Adyen returns an error saying the request is already processed or in progress.

Finally, keys can't be kept forever. Stripe prunes them after at least 24 hours, Adyen keeps them 7 to 14 days, and a good API publishes its expiry policy.

<figure class="diagram">
<p class="rowname">First Request</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow wide" data-label="request, key K" aria-hidden="true"></div>
<div class="node">Server</div>
<div class="arrow wide" data-label="insert first" aria-hidden="true"></div>
<div class="node hot">Key Table<small>unique index</small></div>
</div>
<p class="rowname">Retry</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow wide" data-label="same key K" aria-hidden="true"></div>
<div class="node">Server</div>
<div class="arrow" data-label="key found" aria-hidden="true"></div>
<div class="node">Saved Response</div>
</div>
<figcaption>The idempotency key: the first request does the work once, and a retry gets the saved answer</figcaption>
</figure>

## Doing It Safely

A first version of the key check has two holes, and we measured both. The simulation: 500 orders, each sent more than once about 35 percent of the time, handled by 12 threads, with a mock payment provider.

In 5 percent of first attempts the process crashes after the charge and before saving the result, and each client retries once more after a timeout:

| Design | Orders Charged More Than Once | Extra Charges |
| --- | --- | --- |
| No Protection | 500 | 772 |
| Check for the Key, Then Insert It | 4 | 4 |
| Insert the Key First | 40 | 40 |
| Insert First, and Send the Key to the Provider | 0 | 0 |

Walk down the table to see why each row fails. With no protection, each duplicate request charged again, and the final retry of each order did too.

The first fix is to check for the key and insert it if it is missing. That leaves a gap: two requests that arrive together both find no key, and both proceed.

The gap is small, 4 orders here, and it is certain to be hit at scale. The cure is to let the database decide. Insert the key first and rely on a unique constraint, so that exactly one request wins.

That closes the race and opens a new hole. The winner charges the card, crashes before saving the result, and leaves the key marked as started.

A later retry sees a key that started and didn't finish, does the work again, and makes a fresh call to the provider, which charges a second time. That was 40 orders.

The last row closes it. The same key goes on to the provider, which recognizes the repeat and returns its first answer. No order was charged twice.

The lesson is that idempotency has to extend to each side effect. A local key table can protect the local database, and an outside effect, such as a charge, needs its own key or a way to ask what happened.

For the general case, a table holds, for each key, the request method, path and parameters, the response code and body, a lock time and a recovery point.

The unique index is on the user and the key. The request is split into atomic phases, each one a transaction, and each records a recovery point, a label such as started, charge created, finished, in the same transaction as its work.

If a request dies midway, a later retry reads the recovery point and continues from the last completed phase, and a lock time with a timeout stops two retries from running at once. A background process completes stuck requests, and a reaper deletes old keys.

## Idempotency Without a Key

Many operations can be made idempotent by their shape, which is cheaper than a key table:

- **A unique constraint on a business key**: one payment for each order id, one enrollment for each student and course, so a second insert fails and the code treats the failure as success
- **A conditional update**: `UPDATE orders SET status = 'paid' WHERE id = ? AND status = 'pending'`, which has no effect the second time, the technique of [Handling Contention for Scarce Resources](/system-design/contention)
- **An upsert with a deterministic id**: derived records, such as a receipt, get an id computed from the order, so a retry writes the same row
- **Set, don't increment**: set the stock to a value derived from the source, and not add one, where the arithmetic allows
- **A processed message table**: a consumer records each message id in the same transaction as the effect, and skips ids it has seen, the receiving side of [Keeping Caches, Indexes and Copies in Sync](/system-design/keeping-copies-in-sync)

## Duplicate Work Beyond Side Effects

Some duplicates waste time and no more, and they matter at scale:

- **Stampedes**: many requests recompute one expired cache entry, the problem of [Cache Stampedes](/system-design/cache-stampedes), solved by coalescing them into one
- **Repeated jobs**: two workers pick up the same job, or a scheduler fires twice. A key for the job, or a claim with a lease as in [Task Queues](/system-design/task-queues), prevents it
- **Retries multiplying through layers**: the arithmetic of retries at each layer, which the budgets in [Timeouts, Retries and Backoff](/system-design/timeouts-retries) cap

## When Prevention Isn't Enough

A system should also detect the duplicates that slip through. The nightly reconciliation of charges against the provider's records, and against orders, finds a double charge in hours, and a refund repairs it, the compensation steps of [Sagas](/system-design/sagas).

The user interface helps without being the guarantee: disable the button after the first tap, show a pending state, and let a returning user see the order in progress. The server must still assume that any request can arrive twice.

## A Plan for the Textbook App

| Operation | Protection |
| --- | --- |
| Checkout | A client generated key for each checkout, inserted first, sent on to the payment provider |
| Order Creation | A unique constraint on the cart id |
| Marking Paid | A conditional update from pending to paid |
| Receipt Email | A processed message table keyed by the event id |
| Search Reindexing | A version check, so a replay changes no data |
| Keys | UUIDs, kept 7 days, reaped nightly |
| Detection | A nightly comparison with the provider's settlement report |

## Pitfalls

- **Check, then insert**: concurrent duplicates pass the check together
- **A key table without the provider key**: a crash between charge and save causes a second charge
- **Hashing parameters in place of a client key**: two intentional identical orders become one
- **Returning an error on a repeat**: the caller can't tell whether its own request worked
- **Keys without an expiry**: the table grows without bound
- **Trusting the button**: a disabled button isn't a guarantee
- **Exactly once as a feature to buy**: it covers one system for a limited time

## Key Points

- Duplicates are normal: double clicks, retries after lost replies, queue redeliveries and crashes between effect and acknowledgment each produce them
- Exactly once is an effect, built from at least once delivery plus idempotent processing, and queue and log features cover one hop for a limited time
- Use an idempotency key chosen by the client, stored with the request, the state and the response, and replay the first answer on a repeat
- <u>Insert the key first and pass it to the provider</u>: in our simulation, check then insert left 4 orders charged twice, insert first left 40 because of crashes, and sending the key on left zero
- Use natural idempotency where possible, with unique constraints and conditional updates, and reconcile against outside records to catch what slips through
