> **TLS** is the encryption layer under HTTPS. It does three jobs: it keeps data private, it notices tampering, and it proves you are talking to the real server.

In [How HTTP Works](/system-design/http), a request carried a session cookie and an `Authorization` token. Plain HTTP sends all of that as readable text, and anyone along the path, such as the café Wi-Fi, a network provider or a proxy, can read it or change it. HTTPS is the same HTTP inside a TLS connection. Here is the same request as seen on the wire:

```text
HTTP, readable by anyone on the path:
POST /listings HTTP/1.1
Authorization: Bearer 8f3a...
{"title": "Calculus, Early Transcendentals", "price": 45}

HTTPS, the same bytes with TLS (made up for illustration):
17 03 03 00 4a 9f 2c e1 73 b8 05 d4 6a 11 f0 8e ...
```

## Three Promises

- **Privacy**: others on the path can't read what you send
- **Integrity**: others can't change it without the connection noticing
- **Identity**: the server is the one named in the URL, not an impostor

The third is easy to forget. Encryption alone wouldn't help if you were encrypting to the wrong machine.

## Making a Connection Secure

Before any request, the client and server run a **handshake**, the setup step from [TCP and UDP](/system-design/tcp-udp). In TLS 1.3 it fits in one round trip, where TLS 1.2 needed two:

<figure class="diagram">
<p class="rowname">1. The Client Speaks First</p>
<div class="flow">
<div class="node">Client<small>makes a one time key pair</small></div>
<div class="arrow wide" data-label="hello + key half" aria-hidden="true"></div>
<div class="node">Server</div>
</div>
<p class="rowname">2. The Server Answers</p>
<div class="flow">
<div class="node">Server<small>makes its own key pair</small></div>
<div class="arrow wide" data-label="key half + certificate" aria-hidden="true"></div>
<div class="node">Client<small>checks the certificate</small></div>
</div>
<p class="rowname">3. Both Sides Know a Secret</p>
<div class="flow">
<div class="node">Same secret key on both sides<small>everything after this is encrypted</small></div>
</div>
<figcaption>A TLS 1.3 handshake</figcaption>
</figure>

Each side keeps one half of a key pair private and sends the other half. Mixing its own private half with the other side's public half gives both sides the same secret, even though the secret itself never crossed the network. That is the Diffie-Hellman idea you may know from a security course. After that, both sides turn the shared secret into encryption keys and use fast symmetric encryption for the data.

The pair is new for every connection. So if someone records your traffic today and steals the server's long term key next year, the recording is still unreadable. That property is called **forward secrecy**, and TLS 1.3 builds it in.

TLS 1.3 also has a "0-RTT" mode for returning clients, which sends data in the very first message. That data can be replayed by an attacker, so it is only suitable for requests that are safe to repeat, the idempotent ones from [How HTTP Works](/system-design/http).

## Proving Who You Are

Encrypting to a stranger is no help, so the server also sends a **certificate**: a statement that this public key belongs to textbooks.example.com, signed by an organization called a certificate authority. Your device can't know every website, but it already holds a list of authorities it trusts, installed in advance. Trust passes down a chain:

<figure class="diagram">
<div class="flow">
<div class="node">Root Authority<small>trusted by your device</small></div>
<div class="arrow" data-label="signs" aria-hidden="true"></div>
<div class="node">Intermediate</div>
<div class="arrow" data-label="signs" aria-hidden="true"></div>
<div class="node">textbooks.example.com<small>server's certificate</small></div>
</div>
<figcaption>The chain of trust the client checks</figcaption>
</figure>

The server sends its own certificate and the intermediates. The client follows the signatures up to a root it already trusts, and checks that every certificate is inside its dates and that the name in the URL is one the certificate lists. Then the server proves it holds the matching private key by signing the handshake. If any step fails, the browser shows a warning.

That makes certificates something you have to operate. They expire, and an expired one makes clients refuse the connection. Microsoft Teams in 2020 and Starlink in 2023 have both had outages that lasted hours and were blamed on expired certificates. Lifetimes are getting shorter, with Let's Encrypt's at 90 days, so teams renew automatically and set an alert well before the expiry date, in case the renewal quietly fails.

## Where the Encryption Ends

In [From One Server to Many](/system-design/one-server-to-many), a load balancer sat in front of the web servers. Someone has to decide where the TLS connection stops:

<figure class="diagram">
<p class="rowname">Ends at the Load Balancer</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow" data-label="HTTPS" aria-hidden="true"></div>
<div class="node">Load Balancer</div>
<div class="arrow" data-label="HTTP" aria-hidden="true"></div>
<div class="node">Web Server</div>
</div>
<p class="rowname">Encrypted All the Way</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow" data-label="HTTPS" aria-hidden="true"></div>
<div class="node">Load Balancer</div>
<div class="arrow" data-label="HTTPS" aria-hidden="true"></div>
<div class="node">Web Server</div>
</div>
<figcaption>Two ways to place the end of the TLS connection</figcaption>
</figure>

- **Ending at the load balancer** is the simpler choice: certificates live in one place, the web servers do less work, and the load balancer can read each request to route it. The cost is that traffic inside your network is not encrypted
- **Encrypting to the web servers too** keeps traffic protected inside the network. The cost is a certificate on every server, more CPU, and harder debugging

Teams usually pick the second when the internal network isn't fully trusted, or when rules such as PCI DSS or HIPAA can call for it. When services should also prove their identity to each other, they use mutual TLS, covered in [Service Identity and Mutual TLS (mTLS)](/system-design/service-identity).

## What HTTPS Does Not Hide

TLS protects the contents of a connection, and some things stay visible:

- **Which site you connect to**: the server name usually travels in the clear in the first message, and the address is visible too. Encrypted Client Hello is meant to close that gap, but it's still being rolled out
- **Your DNS lookups**, unless the lookup itself is encrypted. See [How DNS Works](/system-design/dns)
- **When, how much and how often you send**, which can still reveal a lot

And a certificate only proves a name, not that the owner is honest. A site with a valid certificate can still be a scam, or have bugs of its own.

## Switching It On

Typical setups do the same four things:

1. Redirect http to https
2. Send a `Strict-Transport-Security` header, so browsers go straight to https next time
3. Mark session cookies `Secure`, the flag from [How HTTP Works](/system-design/http)
4. Renew certificates automatically, and alert before they expire

TLS protects data on the move. Data sitting on a disk is a separate problem, covered in [Encrypting Data at Rest](/system-design/encryption-at-rest).

## Key Points

- TLS gives privacy, integrity and identity, and HTTPS is HTTP inside TLS
- The handshake makes a fresh shared key in one round trip with TLS 1.3, and a stolen server key later can't unlock old recordings
- A certificate chain lets the client check who the server is, using authorities it already trusts
- <u>Certificates expire</u>, so renew them automatically and alert before the date
- Decide where TLS ends: at the load balancer is simpler, and all the way is more protected but costs more
- HTTPS hides contents, but not who you connect to or when
