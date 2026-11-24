> A **secret** is a credential that grants access, such as a database password, an API key, a private key or a token. **Secrets management** is how those values are stored, delivered, rotated and revoked so that the services that need them can read them and nobody else can. **Key management** is the same discipline for encryption keys.

The textbook app's services need values that must stay private. The listings service needs the database password. The payments service needs the provider's API key. The sign in service needs the key that signs tokens, from [OAuth and JWT](/system-design/oauth-jwt), and each service needs a private key for [Service Identity and Mutual TLS (mTLS)](/system-design/service-identity).

In the first version these values sit in a configuration file in the Git repository, and one of them was pasted into a team chat to fix a problem at night. That is how most leaks start, and how most of the habits in this topic got their reasons.

## What Counts and What Goes Wrong

The usual suspects are API keys, database credentials, cloud permissions, SSH keys and certificates. Two problems are common:

- Secrets hardcoded in plaintext in source code, configuration files and configuration tools
- One secret shared by many services, so when it leaks, the source is hard to identify

The Twelve-Factor App states the first rule as a strict separation of config from code. Config is whatever is likely to vary between deploys, and that includes credentials to external services. Its test is useful: could the codebase be made open source at any moment, without compromising any credentials? If not, a secret lives in the code.

The same guide proposes environment variables as the home for config, for being easy to change and unlikely to be committed by accident.

OWASP's guidance disagrees for secrets in particular. It lists mounted files, fetching into memory and environment variables as ways to inject a secret, and advises against environment variables unless the others aren't possible.

The two fit together. Twelve-Factor is about separating config from code, and OWASP is about how a secret is protected once it is outside the code.

## One Place, With a Log

The first step is to centralize. Use one secret store, or a few, that cover storing, providing, auditing and rotating, and protect the store's own primary credentials in a second system.

The cloud providers sell this as a service: AWS Secrets Manager, Google Cloud Secret Manager and Azure Key Vault. A good store supports granular access, automated rotation, encryption at rest and in transit, central audit logging, and versions with recovery.

Each of those exists for a reason:

- **Granular access**: a service reads its own secrets, and an engineer doesn't read the whole store. Secrets shouldn't be retrievable by any caller that asks
- **Audit**: the log says who asked for a secret, whether it was granted, when it was used and when it expired, and it resists tampering
- **Versions**: a rotation that goes wrong can be rolled back
- **Metadata**: owners, purpose and rotation history, so that a secret nobody remembers can still be traced

The store raises its own question: how does a service prove who it is, to be allowed to read its secrets, without already holding a secret? The answer is a platform identity.

A service running on a cloud platform or in Kubernetes presents the identity that the platform vouches for, the idea behind [Service Identity and Mutual TLS (mTLS)](/system-design/service-identity), and the store decides from it.

The recommended model is that the pipeline deploys with its own platform identity and the running service fetches its secrets when it starts, so application secrets don't pass through the build system.

## Credentials That Expire

A static password has no end date, so a leak is open ended. A **dynamic secret** is created on demand for one client and expires. HashiCorp Vault does it with leases:

- **A lease**: each dynamic secret has a time to live, and Vault promises the value for that period. A lease ID is the handle for renewing or revoking it
- **Revocation**: it invalidates the secret at once and stops renewal. Revoking a token revokes the leases created with it, and a whole path of leases can be revoked together
- **Per client credentials**: in Vault's database engine, each client that asks for credentials receives its own user, which helps auditing, and a role can have a default life of 1 hour and a maximum of 24 hours

A request for credentials returns a lease ID, a duration such as 1 hour, a flag for whether it can be renewed, and a fresh username and password.

When the lease ends, Vault removes the user from the database. For a database that needs a fixed user, Vault also offers a static role, where it stores and rotates that user's password, at 24 hour intervals by default.

The benefit shows when a credential leaks. If a leaked credential works until someone notices, the average time it stays usable is half of its lifetime, when the leak happens at a random moment:

| Credential | Average Time a Leaked Copy Works |
| --- | --- |
| Static, Not Rotated | Until someone notices |
| Rotated at 90 Day Intervals | About 45 days |
| Rotated Daily | About 12 hours |
| Dynamic, 1 Hour Lease | About 30 minutes |

The table is our arithmetic, and it also assumes the leak is unnoticed. OWASP makes a related point: restarting the application doesn't revoke stolen credentials, since the credential is still valid at the database.

Revocation or expiry ends it, and no other event does. Because the dynamic design needs a long lived secret to create the short lived ones, the store's own credentials deserve the strongest protection.

## Protecting the Master Key

A secret store holds the keys to the whole system, so the question is what protects it. Vault's design is an example of a hierarchy, like the envelope encryption of [Encrypting Data at Rest](/system-design/encryption-at-rest).

Data is encrypted with an encryption key, that key is encrypted by a root key, and the root key is encrypted by an unseal key. A Vault that has just started is sealed: it can reach its storage and can't decrypt anything.

The unseal key is split with Shamir's Secret Sharing, which turns a secret into several shares of which a threshold reconstructs it. We implemented it over a large prime field and tried it with 5 shares and a threshold of 3:

| Shares Presented | Groups That Recovered the Secret |
| --- | --- |
| 2 of 5 | 0 of 10 |
| 3 of 5 | 10 of 10 |
| 4 of 5 | 5 of 5 |

Two shares gave no information: they were consistent with any secret. Three worked in each case. Giving the shares to five people means that no single person can open the store and that losing two shares doesn't lock the company out.

Operators then unseal each node by hand after each restart, which is a poor fit for automatic recovery. Vault offers auto unseal, where a trusted external service, such as a cloud key service, decrypts the root key at startup.

If the seal mechanism or its keys are permanently deleted, the cluster can't be recovered. As with any key, a copy of the root material belongs in a place that is tested and kept apart from the data.

## Pipelines, Containers and People

Build systems are a common leak, since they hold powerful credentials and run code from many sources. The OWASP guidance for pipelines has these points:

- **Short lived federation**: a pipeline proves itself with an OIDC workload identity and receives temporary cloud credentials, with no static cloud keys stored in the build tool
- **Separate permissions**: the permission to federate and the permission to read secrets are different, so a build can get one without the other
- **Don't bake secrets into images**: keep them out of Docker ENV or ARG settings, which travel with the image
- **Prefer files or memory in containers**: a sidecar or an agent fetches the secret, writes it to a shared in memory volume, and refreshes it

Rotation has to be rehearsed. OWASP's key guidance asks that rotation code exist before it is needed, so that a compromise doesn't start a scramble. A new key can be used for writes while the old one stays valid for reads, and the old one retires when no service depends on it.

## Finding Leaks Early

Secrets get committed. Scanning looks for them before and after. GitHub's secret scanning looks through the whole history of each branch, and for patterns from partner providers it notifies the provider, which can revoke the credential. Pre-commit tools, such as git-secrets and gitleaks, and push protection stop a commit at the source.

Detection approaches differ in what they catch, so we measured four on the text of this site's own repository, 28,958 lines in 179 files that contain no secrets, plus six planted fakes:

| Detector | Planted Found of 6 | False Alarms in 28,958 Lines |
| --- | --- | --- |
| Known Formats, Such as AWS Keys and Private Key Headers | 3 | 0 |
| Keywords Like password and token Followed by a Value | 4 | 1 |
| High Entropy Strings, 4.0 Bits for Each Character | 2 | 624 |
| High Entropy Strings, 4.5 Bits for Each Character | 1 | 453 |

Known formats are precise and narrow: they found the cloud key, the token and the private key header, and missed the random strings of no known shape. Keywords caught the weak password and the random hex string that formats missed.

Entropy found random keys with no label, missed the hex string whose alphabet is too small to reach the threshold, and raised hundreds of false alarms on long words and identifiers.

The three together found the whole set of six, and the entropy noise is the price. Use more than one scanner and a balance of pattern and entropy methods.

## When One Leaks

The order of steps starts with revoking:

1. **Revoke** exposed keys immediately
2. **Rotate** them, preferably by automation
3. **Remove** them from the exposed places, such as code and logs
4. **Log** the event

Removing sensitive data starts with the same step, revoke or rotate the secret, which may be sufficient.

Rewriting history comes after, and it isn't a substitute. Commits may remain reachable in forks, in other people's clones, in cached views by commit hash and in pull requests that refer to them.

GitHub's support team can remove cached views where rotating isn't enough. A secret that reached a public repository, even for a minute, counts as disclosed. The wider process is the subject of [Incidents and Postmortems](/system-design/postmortems).

## For the Textbook App

| Secret | Home | Lifetime |
| --- | --- | --- |
| Database Credentials | Dynamic, issued to each service by the secret store | 1 hour lease |
| Payment Provider Key | The secret store, readable by the payments service alone | Rotated on a schedule and after any exposure |
| Token Signing Key | A key service, signing without exporting the key | Rotated, with the old key kept to verify |
| Service Certificates | Issued by the identity system | Hours |
| Build Pipeline | Federated identity with temporary credentials | Minutes |
| Staff Accounts | Individual accounts with a second factor, not shared secrets | Per person |

## Pitfalls

- **A secret in Git**: it stays in the history, forks and clones even after a cleanup
- **A shared secret**: a leak can't be traced and each rotation breaks several services
- **A long lived static key in the pipeline**: the build system is a high value target
- **Untested rotation**: the first rotation happens during an incident
- **Secrets in logs and error messages**: scrubbing is easier before launch than after
- **A store with no audit trail**: there is no way to answer who read what
- **A single copy of the root key**: losing it loses the store

## Key Points

- Keep secrets out of code, ask the Twelve-Factor test, and centralize them in a store with granular access, audit logs and versions
- A service reaches its secrets by presenting a platform identity, so the secret that opens the store is not itself shipped with the code
- <u>Prefer credentials that expire</u>: a 1 hour dynamic lease leaves a leaked copy about 30 minutes of use on average, against 45 days for a credential rotated at 90 day intervals
- Protect the root key with split shares or an auto unseal service: in our test, 2 of 5 shares gave no information and any 3 recovered the secret
- Scan for leaks with several methods, since formats, keywords and entropy each miss something, and when a secret leaks, revoke first and then rotate, because rewriting Git history doesn't remove copies
