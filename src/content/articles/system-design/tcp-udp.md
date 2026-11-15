> **TCP** and **UDP** are the two main ways to move data between programs on different machines. TCP delivers data in order and pays for it in waiting. UDP just sends, and leaves the rest to you.

In [How Clients and Servers Talk](/system-design/client-server), a client needed a name, an address, a port, the number that tells a machine which program should get the data, and a protocol. [How DNS Works](/system-design/dns) found the address. Both TCP and UDP use the port to hand data to the right program. What differs is what happens to the data on the way.

## Phone Calls and Postcards

TCP works like a phone call. You dial, the other side picks up, you talk, and if you miss a word you ask again. UDP works like postcards. You drop them in the mailbox and hope.

| | TCP | UDP |
| --- | --- | --- |
| Before Sending | Set up a connection first | Nothing, just send |
| Delivery | Every byte arrives in order, or the connection reports an error | Each message may be lost, repeated or out of order |
| Lost Data | Resent automatically | Gone, unless the app resends it |
| Backs Off When Overloaded | Yes, on its own | No, the app has to do it |

## What TCP Does for You

Start with TCP, since most of what you build uses it. It turns a messy network into a clean stream of bytes:

- It numbers every byte, so the receiver can put data back in order and drop duplicates
- It waits for acknowledgments and resends anything that goes missing
- It slows the sender down when the receiver or the network can't keep up

The web, databases, email and file transfers all rely on this. Your code reads a stream and doesn't see lost packets.

## What TCP Costs

Those guarantees aren't free. Before any data moves, the two sides run a **handshake**, which costs one **round trip**: a message to the server and the reply back. Then, because bytes must arrive in order, one lost packet holds up everything behind it until it is resent. That is called **head-of-line blocking**. And every open connection uses memory on both ends.

The round trip is the cost that adds up. Say the server is 60 ms away, and the server answers instantly:

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>Reused connection</span><span class="track"><span class="fill" style="--w: 33%"></span></span><span class="value">60 ms</span></div>
<div class="hbar"><span>New connection</span><span class="track"><span class="fill" style="--w: 67%"></span></span><span class="value">120 ms</span></div>
<div class="hbar peak"><span>New connection, HTTPS</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">180 ms</span></div>
</div>
<figcaption>Time to get a first answer from a server 60 ms away (example numbers)</figcaption>
</figure>

The first request on a new connection pays for the handshakes, and later requests on the same connection don't. HTTPS adds its own handshake, to set up encryption (TLS), covered in [TLS and HTTPS](/system-design/tls-https).

## Reuse What You Open

So systems avoid opening connections they don't have to. A browser keeps an HTTP connection open and sends many requests over it. A server keeps a **connection pool** to the database: a small set of open connections that requests borrow and give back. A reused connection is also already up to speed, because TCP starts slowly and speeds up as it learns what the network can handle.

Pool size is a tradeoff, like the ones in [Thinking in Tradeoffs](/system-design/trade-offs), where gaining one thing costs another. Too small, and requests queue up waiting for a free connection. Too large, and the database spends memory on connections that sit idle.

## When Waiting Is the Wrong Choice

TCP's waiting is the right deal for web pages and databases. Sometimes it's the wrong one, because a late answer can be worse than none. That is where UDP fits:

- **DNS lookups**: the phone book from [How DNS Works](/system-design/dns) deals in one small question and one small answer, so a handshake would cost more than the exchange
- **Video and voice calls**: a resent frame arrives too late to show, so skipping it beats waiting for it
- **Fast online games**: the next position update replaces a lost one
- **Metrics**: sending a number should be cheap, and losing one reading rarely matters

Using UDP doesn't mean being careless. An app can add the little reliability it needs on top, such as resending a game's "player fired" message while letting position updates go. Some slower games use TCP instead.

## Building on UDP

UDP can also be a foundation. Head-of-line blocking hurts most when one connection carries many independent requests, such as a page and each of its images, because a single lost packet stalls all of them. **QUIC** avoids that. It runs on UDP and handles reliability itself, separately for each **stream**, one of those independent conversations inside the connection, and it folds the encryption handshake into connection setup, so a new connection can be ready in one round trip instead of two.

<figure class="diagram">
<p class="rowname">TCP: One Lane</p>
<div class="flow packets">
<div class="node">1</div>
<div class="node">2</div>
<div class="node lost">3<small>lost</small></div>
<div class="node wait">4<small>waits</small></div>
<div class="node wait">5<small>waits</small></div>
</div>
<p class="rowname">QUIC: A Lane for Each Stream</p>
<div class="flow packets">
<div class="node">A1</div>
<div class="node">A2</div>
<div class="node">A3</div>
</div>
<div class="flow packets">
<div class="node">B1</div>
<div class="node lost">B2<small>lost</small></div>
<div class="node wait">B3<small>waits</small></div>
</div>
<div class="flow packets">
<div class="node">C1</div>
<div class="node">C2</div>
<div class="node">C3</div>
</div>
<figcaption>With TCP a lost packet holds up everything behind it; with QUIC only its own stream waits</figcaption>
</figure>

It runs on UDP because networks already carry UDP, and because QUIC lives in software that can be updated without changing the operating system. It is what HTTP/3 uses. Some networks block UDP, so browsers keep TCP ready as a fallback. More in [How HTTP Works](/system-design/http).

## Which One to Pick

Ask one question: if this data arrives late, is it still useful?

- Yes, and every byte must be right: TCP, for web pages, APIs, databases, files, email and SSH
- No, a newer message will replace it: UDP, or something built on it, for calls, live games, metrics and DNS

Many apps use both. A video call app can use TCP to log in and send chat, and UDP for the call itself. It is a tradeoff between reliability and speed, and the right side depends on what the data is for.

## Key Points

- TCP gives an ordered, reliable stream, and pays with a handshake, waiting on lost packets and memory for each connection
- UDP just sends: no setup and no recovery, so the app decides what to do about loss
- The handshake costs a round trip, and HTTPS adds more, so reuse connections and pool database connections
- <u>Ask whether late data is still useful</u> to choose between them
- QUIC and HTTP/3 build reliable streams on UDP to avoid head-of-line blocking
