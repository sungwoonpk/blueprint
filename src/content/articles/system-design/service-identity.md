> **Service identity** is a verifiable name for a running service, one that doesn't depend on its address or on which network it sits in. **Mutual TLS**, or mTLS, is a TLS connection in which both sides present certificates, so each proves its identity to the other and the traffic is encrypted.

The textbook app has grown into several internal services: the listings API, search, payments and the photo resizer. They talk over the data center network, and the first version trusted it. A request from an address inside the network was assumed to come from one of the app's own services, so payments allowed anything from that range.

That assumption fails the first time one service is compromised. The attacker sits inside the network, with an address in the trusted range, and calls payments directly. [Authentication and Authorization](/system-design/authn-authz) and [OAuth and JWT](/system-design/oauth-jwt) covered how users and clients prove themselves. This topic covers how services do it to each other.

## No Trust From Location

NIST's zero trust architecture, SP 800-207, puts the failed assumption in its second tenet: communication is secured whatever the network location, and network location alone doesn't imply trust. A request from inside a legacy perimeter must meet the same requirements as one from outside, and communication should protect confidentiality and integrity and provide source authentication.

The same document adds tenets that shape the design:

- **Per session access**: Access to each resource is granted per session, with the least privilege needed, and being allowed to reach one resource doesn't grant access to another
- **Dynamic policy**: The decision uses the observable state of the client's identity, the application or service, and the requesting asset, and it can include behavior and environment
- **Strict enforcement**: Authentication and authorization are dynamic and strictly enforced before access is allowed

It describes two roles. A policy decision point, split into a policy engine and a policy administrator, decides. A policy enforcement point enables, monitors and ends the connection. In a service mesh, the proxy next to each service plays the second role, and Istio's documentation calls sidecar and perimeter proxies policy enforcement points.

## What TLS Gives

The TLS 1.3 specification, RFC 8446, lists what its handshake provides: authentication, confidentiality and integrity. It says the server side is authenticated in each handshake and the client side is optionally authenticated.

Key exchange is by Diffie-Hellman in the common modes, and the specification says public key based key exchange now provides forward secrecy, so a stolen key doesn't open old recordings.

Mutual authentication comes from one optional message. A server that authenticates with a certificate may request one from the client in a CertificateRequest. If it does, the client must send its Certificate, then a CertificateVerify, a signature that the specification says gives explicit proof the endpoint possesses the private key, and then the Finished message.

If the server sends no request, the client sends no certificate. The full handshake takes one round trip before application data flows from the client.

The same document warns about a speed feature. With 0-RTT, a client can send data in its first flight, and the specification says the security properties of that data are weaker: it isn't forward secret, and there is no guarantee against replay between connections.

Early data should be limited to requests that are safe to repeat, as in [Idempotency and Safe Retries](/system-design/idempotency).

## A Working Example

We built a small certificate authority with the openssl tool and ran a real TLS 1.3 server that requires a client certificate. Each certificate carried a service name, in the form `spiffe://textbook.example/search-service`:

| Client | Result |
| --- | --- |
| No Client Certificate | Refused |
| Certificate From the Company CA | Accepted, and the server saw the name of the search service |
| Certificate From a Rogue CA With the Same Name | Refused for failing verification |

The server learned who the caller was from the certificate and not from the address, and an attacker who copied the name but not the key got nowhere. The same server, set to plain TLS, answered a client with no certificate.

The cost of the second certificate showed up in a timing test on one machine, with client and server in one process and 300 new connections each. Plain TLS took 0.82 ms for each connection and mutual TLS 1.14 ms, an extra 0.32 ms.

That is CPU alone, without network delay, and it is paid on a new connection, not on each request. Long lived connections and session reuse spread it thin.

## Naming a Service

An address says where a service runs now. Containers move and addresses are reused, so a name tied to an address names the wrong thing within minutes. SPIFFE, the Secure Production Identity Framework for Everyone, defines a name that follows the workload:

- **SPIFFE ID**: A URI in the form `spiffe://trust domain/workload identifier`, such as the documentation's example `spiffe://acme.com/billing/payments`
- **Trust domain**: The root of trust for a system, such as an organization or an environment. The guidance is to keep different environments, like staging and production, in different trust domains
- **SVID**: A SPIFFE verifiable identity document, which holds one SPIFFE ID and is valid when signed by an authority of that trust domain. It comes as an X.509 certificate or a JWT
- **Trust bundle**: The root certificates a workload uses to check the other side

The specification prefers the X.509 form, since a token can be replayed by an attacker who captures it in transit, and keeps the JWT form for cases such as a layer 7 proxy or load balancer between two workloads.

Kubernetes gives a close analogue: Istio's identity for a workload is the Kubernetes service account, and during the handshake the client side proxy checks that the server certificate's service account is the one expected for the service it called.

## Getting Certificates

Issuing a certificate to a service raises a bootstrap question: how does a new process prove who it is before it has any credential? SPIRE, the reference implementation of SPIFFE, answers with attestation in two steps:

1. **Node attestation**: An agent on each machine proves the machine's identity to the SPIRE server, using evidence such as a cloud instance identity document or a Kubernetes service account token
2. **Workload attestation**: When a process asks the local agent for an identity, the agent asks the operating system or the kubelet about that process and compares what it finds, such as the Unix user or the Kubernetes service account and namespace, with the selectors registered for each identity

The server signs a certificate for a match, and the agent caches it.

The workload fetches its certificate and key through a local API, and the SPIFFE documentation notes that the caller needs no prior knowledge of its own identity and no authentication token, so no secret has to be shipped with the code. The keys and certificates are described as short lived, rotated frequently and automatically.

Istio does the same job for a mesh. An agent next to each proxy creates the private key and a signing request, sends it to the control plane, and passes the signed certificate to the proxy. The process repeats periodically for rotation.

## Short Lives Instead of Revocation

Revoking a certificate means telling each verifier, and some don't check. The answer built into these systems is a short life. A stolen key works until the certificate expires, and on average that is half the lifetime, if the theft is at a random time:

| Certificate Life | Average Time a Stolen Key Works |
| --- | --- |
| 1 Year | About 182 days |
| 90 Days | About 45 days |
| 1 Day | About 12 hours |
| 1 Hour | About 30 minutes |

The price is rotation traffic. If certificates are renewed at half their life, 10,000 workloads with 1 hour certificates need about 20,000 issuances an hour, or 5.6 a second, which is small. This is our arithmetic, and it assumes the issuing service is up around the clock.

That assumption is the risk. A certificate authority that is down for longer than a certificate's life leaves services unable to renew, and an expired certificate refuses connections as firmly as an attacker would.

Alert on days to expiry and on renewal failures, as in [Alerting and Dashboards](/system-design/alerting), and rehearse a lapse in a game day, as in [Chaos Engineering](/system-design/chaos-engineering). The keys that sign certificates belong to [Secrets and Key Management](/system-design/secrets).

## Who May Call Whom

mTLS proves who the caller is. It doesn't decide what the caller may do. That is authorization, and the identity in the certificate is the input.

Istio's AuthorizationPolicy shows the shape: rules that allow or deny by the caller's principal, namespace or other attributes, applied at the proxy in front of each service. Its documentation recommends strict mutual TLS when rules rely on principals or namespaces, since a plaintext request has no verified principal to match.

For the textbook app:

| Caller | Callee | Allowed |
| --- | --- | --- |
| Listings API | Photo Resizer | Yes, to resize |
| Listings API | Payments | Yes, to charge |
| Search Service | Payments | No |
| Photo Resizer | Listings API | No |
| Anything Else | Payments | No |

With these rules, a compromised search service holds a valid identity and still can't reach payments. The compromise is contained to what that identity may do, which is the same idea as the isolation in [Bulkheads](/system-design/bulkheads).

## Rolling It Out

Turning on mutual TLS across the fleet at once breaks each client that doesn't have a certificate yet. Istio's permissive mode is built for the transition: a service accepts both plaintext and mutual TLS traffic at the same time.

The path is to run permissive, move the callers one by one, watch the plaintext share fall to zero, and then switch to strict.

A proxy does the TLS work beside each service, so the application code is unchanged. That is a benefit and a cost: one more component per service to run, a bit more latency for each call, and a new way to fail.

## Pitfalls

- **IP allow lists as identity**: The address changes and proves no identity
- **A shared certificate for the whole set of services**: One compromise exposes the whole set, and the logs can't say who called
- **Long lived certificates without rotation**: A stolen key works for months
- **mTLS without authorization rules**: Any service can call any other service
- **0-RTT for writes**: Replayable early data
- **No expiry monitoring**: An expiry becomes an outage

## Key Points

- Network location isn't proof of identity: NIST's zero trust tenets ask for secured communication regardless of location, access per session, and policy that uses identity
- Mutual TLS adds a client certificate to the handshake, so both sides prove who they are: in our test, the server refused a client with no certificate and one from a rogue CA, and a new connection cost 0.32 ms more
- Name services by workload, not by address, as SPIFFE does with IDs such as `spiffe://textbook.example/search-service`, and issue the certificates through attestation, not by shipping a secret
- <u>Prefer short lived, automatically rotated certificates</u> to revocation: a 1 hour life leaves a stolen key about 30 minutes on average, and the issuer and the expiry dates need monitoring
- Identity isn't permission, so pair mutual TLS with rules for who may call whom, and roll it out through a permissive mode before strict
