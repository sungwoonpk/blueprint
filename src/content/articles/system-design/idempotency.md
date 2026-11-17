> An operation is **idempotent** if doing it several times leaves the server in the same state as doing it once. When an operation isn't, an **idempotency key** makes repeating it safe anyway.

In [How Clients and Servers Talk](/system-design/client-server), a call that times out left the client in the dark: the request may have arrived, with only the reply lost.

The fix that comes to mind is to try again, and [How HTTP Works](/system-design/http) showed that this is harmless for reads and risky for a POST. This topic is about making the risky ones safe, so a client can retry without fear.

## How a Retry Makes a Duplicate

A network call can go wrong in three ways: the request never arrives, the server fails halfway, or the work is done and the reply is lost. The first is harmless to retry. The last one is the trap, because from the client's side it looks exactly the same:

<figure class="diagram">
<p class="rowname">The Request is Lost</p>
<div class="flow">
<div class="node">Phone<small>sends and waits</small></div>
<div class="arrow" data-label="lost" aria-hidden="true"></div>
<div class="node wait">Server<small>never saw it</small></div>
</div>
<p class="rowname">The Reply is Lost</p>
<div class="flow">
<div class="node">Phone<small>times out, retries</small></div>
<div class="arrow" data-label="sends" aria-hidden="true"></div>
<div class="node">Server<small>charged the card</small></div>
<div class="arrow wide" data-label="reply lost" aria-hidden="true"></div>
<div class="node hot">Charged Twice<small>the retry ran again</small></div>
</div>
<figcaption>In both cases the phone only sees silence, and only one of them is safe to retry blindly</figcaption>
</figure>

The textbook app has this exact risk where students pay. A double charge is the kind of bug people remember. Stripe's engineering blog, in [a post on this problem](https://stripe.com/blog/idempotency), argues that if endpoints can be retried safely, clients can keep trying until they know the outcome.

## What Idempotent Means

The formal definition comes from the HTTP standard, [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html): a method is idempotent if the effect on the server of several identical requests is the same as the effect of one.

Notice it talks about the server's state, not the reply. A second DELETE can answer 404 because the listing is already gone, and the method is still idempotent, since the state is the same either way.

The standard lists PUT, DELETE and read only methods like GET as idempotent, which matches the table in [How HTTP Works](/system-design/http). It also says a client shouldn't automatically retry a non idempotent request, such as a POST, unless it knows the request is safe to repeat.

The idea is about what a request does, so it is easiest to see in examples:

| Do This Twice | The Result | Idempotent? |
| --- | --- | --- |
| Set the price of listing 42 to $40 | The price is $40 | Yes |
| Mark listing 42 as sold | It is sold | Yes |
| Delete listing 42 | It is gone | Yes |
| Send a message to the seller | Two messages | No |
| Add 1 to the view counter | The counter goes up by 2 | No |
| Charge the buyer $45 | $90 is charged | No |

Look at the pattern. Operations that say "make it this way" are idempotent, and operations that say "add one more" are not.

## Make the Operation Idempotent

The best fix is to design the action so repeating it is naturally harmless:

- **Set, don't add**: store `status = sold` and not a "sold count", and send the final price, not "lower the price by 5"
- **Let the client choose the id**: `PUT /orders/c1d9...` creates the order or replaces it with the same content, so a repeat lands on the same row
- **Let the database refuse duplicates**: a unique constraint turns a second insert into a harmless no-op

```sql
INSERT INTO reservations (listing_id, buyer_id)
VALUES (42, 7)
ON CONFLICT (listing_id) DO NOTHING;
```

Here the listing can have only one reservation, so a retry changes nothing. This works well for data. It doesn't fit actions with effects the database can't undo, such as charging a card or sending an email, and that is where keys come in.

## Idempotency Keys

An **idempotency key** is a unique token the client creates for one logical operation, and sends with every attempt at it. The server remembers which keys it has seen, and the result of each.

Stripe's API takes it as an `Idempotency-Key` header on POST requests, and Amazon's EC2 calls it a client token. The server's job is short:

<figure class="diagram">
<p class="rowname">The First Time</p>
<div class="flow">
<div class="node">Phone<small>key 8f1c</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Server<small>new key, does the work</small></div>
<div class="arrow wide" data-label="saved together" aria-hidden="true"></div>
<div class="node">Database<small>the order and key 8f1c</small></div>
</div>
<p class="rowname">The Retry</p>
<div class="flow">
<div class="node">Phone<small>key 8f1c again</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Server<small>sees key 8f1c</small></div>
<div class="arrow wide" data-label="same reply" aria-hidden="true"></div>
<div class="node">Phone<small>gets the first answer</small></div>
</div>
<figcaption>The retry gets the saved answer, and no work runs twice</figcaption>
</figure>

On the server, that logic looks like this:

```python
def create_order(user, key, params):
    saved = db.find_key(user.id, key)
    if saved:
        if saved.params != params:
            return error(422, "Key reused with different parameters")
        return saved.response

    with db.transaction():
        order = db.insert_order(user.id, params)
        response = {"id": order.id, "status": "created"}
        db.save_key(user.id, key, params, response)
    return response
```

The `with db.transaction()` line carries the important detail. The order and the key have to be saved together, all or nothing. If the key were saved before the order existed, a crash in between would leave a key with no order, and a retry would get a reply about an order that was never made.

Amazon's [Builders' Library article on safe retries](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) stresses the same point: recording the token and making the change must succeed or fail as one.

The client side is small too. The key is made once per operation and reused by every retry:

```python
key = str(uuid.uuid4())          # one key for this purchase
for attempt in range(3):
    try:
        return api.post("/orders", body, headers={"Idempotency-Key": key})
    except Timeout:
        continue                 # same key on every retry
```

A new purchase gets a new key. Reusing one key for two different purchases would make the second one look like a repeat of the first.

## The Details That Matter

A few questions come up in most implementations, and the major APIs answer them in similar ways:

- **What if the same key arrives with different parameters?** That is probably a bug, so reject it with an error, as Stripe and Amazon do, and don't replay an answer to a different question
- **What if the first request is still running?** Treat the second as a conflict and ask the client to retry later, so the work doesn't run twice at once. A unique constraint on the user and key decides which request wins
- **What does the repeat get back?** The saved reply from the first attempt. If the state has changed since, an equivalent reply is usually fine, or the current state of the resource
- **How long are keys kept?** Not forever. Stripe may delete keys once they are at least 24 hours old, and Google leaves it to the server to pick a reasonable time. A retry after that looks like a new request, so retries have to happen within the window
- **What makes a good key?** Random, such as a version 4 UUID, and not built from personal data like an email address

Keys also have to travel down the chain. If our server calls a payment provider, it should pass along a key derived from the one it received, or the duplicate protection ends at our front door.

## Queues Retry Too

Clients aren't the only ones who repeat things. A message queue, from [From One Server to Many](/system-design/one-server-to-many), usually promises to deliver each message at least once, so after a crash the same message can arrive again.

The same remedy has a name, the **idempotent consumer**: the worker records the ids of messages it has handled and skips repeats. The idea is the same as a key, and [Message Queues and Pub/Sub](/system-design/message-queues) returns to it.

## Deciding Whether to Retry

Idempotency answers whether a retry is safe. Whether it's worthwhile is a separate question. From [How HTTP Works](/system-design/http), a 4xx other than 429 usually means the request itself needs fixing, so retrying changes nothing, while 429, 502, 503 and 504 are often temporary.

[Azure's retry guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry) adds two cautions: retry a limited number of times, and avoid stacking retries in several layers, because three layers with three tries each can send nine attempts at a service that is already struggling. The waiting between attempts, the timeouts and the limits are covered in [Timeouts, Retries and Backoff](/system-design/timeouts-retries).

## Key Points

- A lost reply makes a retry run twice, which is how a card gets charged two times
- An operation is idempotent if repeating it leaves the same server state, and "set it to this" is idempotent where "add one more" is not
- Prefer idempotent designs first: set instead of add, client chosen ids, unique constraints
- <u>An idempotency key</u> lets a repeat return the saved result: the client makes one key per operation and reuses it on every retry
- Save the key and the change together in one transaction, reject a key reused with different data, and delete old keys on a schedule
- Queues also deliver twice, so consumers record what they have handled
