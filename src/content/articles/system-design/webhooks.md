> A **webhook** is an HTTP callback. You give another service a URL, and when something happens there, it sends an HTTP POST to that URL with the details.

The last three topics were about getting news to a browser. This one is about getting news to another server.

Say a student pays for a book, and the payment happens at a payment provider, not in our app. Our server has to find out when it succeeds so it can mark the order as paid. It could ask the provider every few seconds, which is [polling](/system-design/polling) with all its waste. GitHub's documentation, for one, tells developers to use webhooks instead of polling its API.

A webhook reverses the direction: the provider calls us.

## The Provider Calls You

You register a URL, such as `https://textbooks.example.com/webhooks/payments`, with the provider. When a payment succeeds, the provider sends a POST to it:

<figure class="diagram">
<div class="flow">
<div class="node">Student<small>pays</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Payment Provider</div>
<div class="arrow" data-label="POST" aria-hidden="true"></div>
<div class="node">Our Server<small>webhook URL</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Orders<small>marked paid</small></div>
</div>
<figcaption>The provider makes the call when there is news</figcaption>
</figure>

Here is what arrives, with a signature header we will come back to:

```http
POST /webhooks/payments HTTP/1.1
Content-Type: application/json
Pay-Signature: t=1794700000,v1=5b2f0c...

{"id": "evt_8d1f", "type": "payment.succeeded",
 "data": {"order": 311, "amount_cents": 4500}}
```

The body is a small JSON event: an `id` that is unique to the event, a `type` saying what happened, and the details in `data`. The names differ between providers. Stripe puts the signature in `Stripe-Signature`, GitHub in `X-Hub-Signature-256`, and the community Standard Webhooks specification suggests `webhook-id`, `webhook-timestamp` and `webhook-signature`. The shape is the same everywhere.

## Anyone Can POST to That URL

Our endpoint is public, because the provider has to reach it, and so anyone on the internet can send it a request that says `payment.succeeded`. Treat each call as unverified until you check it:

| Check | What It Stops |
| --- | --- |
| HTTPS | Someone reading or changing the event on the way |
| A Signature | Forged events from anyone who doesn't know the secret |
| A Timestamp Limit | A real event captured earlier and sent again later |
| The Event Id | The same event being processed twice |

The signature is an **HMAC**, a hash computed from the message and a secret that only the provider and you share. If the value you compute matches the one in the header, the message came from someone with the secret, and it wasn't changed.

Stripe signs the timestamp, a dot and the body, and its libraries refuse events more than 5 minutes old by default. A check along those lines looks like this:

```python
def verify(secret, header, body):
    ts, sig = parse(header)                    # t=... and v1=...
    if abs(time.time() - int(ts)) > 300:       # too old, maybe a replay
        return False
    signed = ts.encode() + b"." + body         # the exact bytes received
    expected = hmac.new(secret, signed, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)  # constant time
```

Three details matter:

- **Use the raw bytes of the body**: parsing the JSON and serializing it again can change it and break the match
- **Compare in constant time**, as GitHub's guidance says: an ordinary `==` can leak how many characters matched
- **Protect the secret**: keep it out of code and logs, and rotate it when needed. Stripe lets the old secret keep working for a while after a rotation, so nothing breaks in between

For anything that matters, treat the event as a doorbell and not as the final word. If it says order 311 was paid, you can ask the provider's API for the current state of that payment before shipping the book. Stripe's newer "thin" events are designed for exactly that, carrying only ids.

## Answer Fast, Work Later

The sender is waiting on our reply, and it won't wait long. GitHub expects a 2xx within 10 seconds, or it records a failure. Stripe says to return a 2xx before running any slow logic, and counts a timeout as a failure. So the endpoint does as little as possible: check the signature, save the event, say OK, and let a background worker do the real work:

<figure class="diagram">
<div class="flow">
<div class="node">Provider</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Endpoint<small>verify, save, reply 200</small></div>
<div class="arrow" data-label="job" aria-hidden="true"></div>
<div class="node">Queue</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Worker<small>marks paid, emails</small></div>
</div>
<figcaption>The reply goes out before the slow work starts</figcaption>
</figure>

```python
@app.post("/webhooks/payments")
def payments_webhook():
    body = request.get_data()
    if not verify(SECRET, request.headers["Pay-Signature"], body):
        return "", 400
    queue.publish("payment-events", body)
    return "", 200                      # reply first, work later
```

The queue is the one from [From One Server to Many](/system-design/one-server-to-many), covered fully in [Message Queues and Pub/Sub](/system-design/message-queues). It also protects you on busy days: if registration day sends thousands of payments in a minute, they pile up in the queue and the endpoint keeps answering quickly.

## Events Can Come Twice, and Out of Order

Senders retry whenever they don't get a clear 2xx, so an event may arrive more than once. It may also arrive late, or after a newer one. Stripe's documentation says both outright: duplicates happen, and delivery order isn't guaranteed. Two habits handle this.

The first is the idempotency idea from [Idempotency and Safe Retries](/system-design/idempotency), with the event id as the key. Record the id and the change in the same transaction:

```python
def handle(event):
    with db.transaction():
        if db.already_processed(event["id"]):
            return                       # a repeat, ignore it
        db.mark_processed(event["id"])
        apply(event)
```

The second is not to assume order. If a `payment.refunded` event shows up before `payment.succeeded`, replaying them in arrival order leaves the wrong state. Fetch the current state from the provider's API when the order matters, or compare a version or timestamp carried in the event, instead of trusting the sequence.

## How Senders Retry

What the sender does after a failure matters just as much, because a receiver that was down for an hour should still get its events. Providers retry for a long time.

Stripe retries in live mode for up to three days with exponential backoff, and the Standard Webhooks specification recommends a schedule that spans days, with some randomness added. GitHub is the exception: it doesn't redeliver automatically, and offers manual redelivery through its dashboard and API. A schedule shaped like this one gives a struggling receiver room to recover:

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>Retry 1</span><span class="track"><span class="fill" style="--w: 0.1%"></span></span><span class="value">10 s</span></div>
<div class="hbar"><span>Retry 2</span><span class="track"><span class="fill" style="--w: 0.1%"></span></span><span class="value">1 min</span></div>
<div class="hbar"><span>Retry 3</span><span class="track"><span class="fill" style="--w: 0.4%"></span></span><span class="value">5 min</span></div>
<div class="hbar"><span>Retry 4</span><span class="track"><span class="fill" style="--w: 2.1%"></span></span><span class="value">30 min</span></div>
<div class="hbar"><span>Retry 5</span><span class="track"><span class="fill" style="--w: 8.3%"></span></span><span class="value">2 h</span></div>
<div class="hbar"><span>Retry 6</span><span class="track"><span class="fill" style="--w: 25%"></span></span><span class="value">6 h</span></div>
<div class="hbar peak"><span>Retry 7</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">24 h</span></div>
</div>
<figcaption>Wait before each retry, growing each time, about a day and a half in total (example schedule)</figcaption>
</figure>

Because every retry arrives as a fresh attempt, receivers can't tell a retry from a new event except by its id, which stays the same across retries. That is why the dedupe above keys on it. It is also why a receiver that runs behind should say so honestly, with a 429 or 503, and not time out silently, as in [Timeouts, Retries and Backoff](/system-design/timeouts-retries).

Delivery can still fail for good, since an endpoint may be down for longer than the schedule, or an event may be dropped on the sender's side. So careful teams add a safety net: a scheduled job that asks the provider for recent events, or recent payments, and handles any it hasn't seen. GitHub's documentation suggests the same for failed deliveries, with a script that finds them and redelivers.

## When You Are the Sender

Now turn it around. A campus bookstore wants to know when a listing sells, and we agree to send it a webhook. The design is mostly the lessons above, seen from our side:

- **Registration**: the partner gives a URL and picks event types, and we create a signing secret for that endpoint alone
- **A stable event shape**: an id that stays the same across retries, a type, a timestamp and a small payload. Standard Webhooks suggests keeping it under about 20 KB, and sending ids for the rest to fetch
- **Signed deliveries**: sign each one, so the partner can verify it, and include a timestamp
- **Failure rules**: treat anything other than a 2xx as a failure, including timeouts and redirects. Slow down on 429, 502 and 504, honor `Retry-After`, and stop for good when an endpoint answers 410 Gone
- **Retries with backoff and jitter**: growing waits with a little randomness added, over days, from a queue, with one line per attempt in a delivery log. Give the partner a way to see the log and resend an event
- **Disable dead endpoints**: after days of failures, tell the owner by email and stop sending, so one broken URL isn't retried forever
- **Isolation**: one slow partner shouldn't hold up the others, so each endpoint gets its own queue or limit, the idea behind [Bulkheads](/system-design/bulkheads)

One more risk is specific to senders. The partner chooses the URL, and our server will call whatever it says. A malicious user could register an address that points inside our own network, such as the cloud's metadata service at `169.254.169.254` or an internal admin page, and read the response through the delivery log. This is **server-side request forgery**, SSRF. OWASP's prevention guidance lists the defenses:

- Resolve the hostname, and refuse addresses that are loopback (`127.0.0.0/8`), private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`) or otherwise internal
- Connect to the address you checked, not to the name again, because a hostile name can answer differently the second time, a trick called DNS rebinding
- Don't follow redirects, since a harmless URL can redirect to an internal one
- Send the requests from workers with no route to internal systems, or through a filtering proxy

## Webhook or Something Else

| | Webhooks | Polling | SSE and WebSockets |
| --- | --- | --- | --- |
| Who Listens | A server with a public URL | Anyone | A browser or app |
| Delay | Seconds, plus retries | Up to one interval | Instant |
| Delivery | Sender retries for you | You retry yourself | You reconnect and catch up |
| Best For | Events between services | Simple or backup checks | Live screens for people |

Webhooks fit when another service owns the event and your server needs to react: payments, code pushes, shipping updates, messages from a chat platform. Their weak spot is that you must have a public HTTPS address, which is awkward on a laptop, so developers use tools such as Stripe's command line forwarder or ngrok during development. And since delivery can fail, pair them with an occasional check, as above.

The group on live updates ends here, and the next topics are about getting traffic to the right servers in the first place, beginning with [Forward and Reverse Proxy Servers](/system-design/proxies).

## Key Points

- A webhook is the provider calling a URL you registered when something happens, which beats polling for events between servers
- The endpoint is public, so verify each call: HTTPS, an HMAC signature over the raw body, a timestamp limit and a unique event id
- <u>Reply with a 2xx quickly and do the work later</u>, through a queue
- Events can repeat and arrive out of order, so record event ids, and fetch current state when order matters
- Senders retry with growing waits over days, so back them with a periodic check in case delivery fails for good
- If you send webhooks, sign them, log and retry with backoff, isolate slow endpoints, and block requests to internal addresses, because users choose the URL
