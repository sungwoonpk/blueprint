> **Encryption at rest** stores data in encrypted form on disk, so that someone who gets hold of the storage, such as a stolen drive or a leaked backup, can't read it. It protects the media. It doesn't protect against anything that can ask the running system for the data.

The textbook app keeps a users table with emails and phone numbers, 9 million listing photos, and nightly backups.

A disk is retired from the data center, a backup copy is left in a storage bucket with the wrong permissions, or an engineer's laptop with a database dump is stolen. In each case a stranger holds files, and the question is whether the files are readable.

The answer depends on a decision made long before: which layer encrypts, with which keys, and where the keys live. The last part usually decides the outcome, since encrypted data with the key next to it is the same as plain data.

## What Each Layer Stops

Encryption can sit at several layers, and each defends against a different thief. The options are the same across databases:

| Layer | Stops | Doesn't Stop |
| --- | --- | --- |
| Disk or Volume | A stolen drive or a copied disk image | Anyone using the server while the disk is mounted |
| Database Files | Stolen data files and backups, if the keys are kept apart | A user who can run queries, which read decrypted data |
| Chosen Columns, Inside the Database | A stolen disk or backup | A server administrator at the moment of decryption |
| Client Side, in the Application | A stolen disk, a compromised server, an untrusted administrator | A compromised application, which holds the keys |

Each row has its own story. Disk or volume encryption prevents unencrypted reads if drives or the whole computer are stolen, and it doesn't protect against attacks while the file system is mounted.

Database file encryption is more selective. MySQL's InnoDB encryption uses a master key and a key for each tablespace, and losing the master key makes the encrypted data unrecoverable, so keep the keyring outside the data directory.

Column encryption inside the database, such as the pgcrypto extension, protects chosen columns. The plaintext and the key are present on the server for a moment, where someone with full access to the machine could capture them.

Client side encryption is the answer when the administrator of the server's machine can't be trusted, since plaintext doesn't reach the server. The price is that the server can't search or index the encrypted values.

The cloud platforms make the first layer a default. Azure encrypts data at rest by default with platform managed keys, and Amazon S3 has encrypted each new object upload automatically since 5 January 2023.

These protect against the lost disk and the leaked bucket copy, and they decrypt for any caller that the service lets in, so access control, from [Authentication and Authorization](/system-design/authn-authz), carries the rest of the load.

## Choosing the Cipher

The standard choice is AES with a key of at least 128 bits and ideally 256, in a mode that also detects tampering.

Prefer the authenticated modes, GCM and CCM. Avoid ECB outside very specific cases, and don't invent your own algorithm.

For public key encryption, use RSA with at least 2,048 bits and OAEP padding. Passwords are a separate case: they are hashed and not encrypted, as in [Authentication and Authorization](/system-design/authn-authz).

GCM comes with a rule that deserves attention. Each initialization value, or nonce, must be unique under one key, and a breach of that requirement may compromise the security assurance almost entirely.

The GCM standard recommends 96 bit values, and when the nonces are random it limits the total number of encryptions under one key to 2 to the 32nd power, about 4.3 billion.

The limit comes from the birthday effect: random values collide sooner than intuition says. We computed the chance of a repeat among random 96 bit nonces, and checked the formula by simulation on a small space:

| Messages Under One Key | Chance of a Repeated Nonce |
| --- | --- |
| About 1 Million | 7 in a quintillion |
| About 4.3 Billion, the Standard Limit | About 1 in 8.6 billion |
| About 69 Billion | About 1 in 34 million |
| About 1.1 Trillion | About 1 in 131,000 |

For the small space, with 24 bit nonces and 5,000 messages, the formula gave 52.5 percent and the simulation gave 50.2 percent. A repeat is a rare event at the standard limit and becomes likely if one key is used long enough, so the key has to change before the budget runs out.

Enforce the mode's limits on the number of encryptions and on nonce uniqueness across the instances that share the key.

In practice the library chooses the nonce, and the application's job is to use one key for a bounded amount of data and to rotate it.

## Two Kinds of Keys

Encrypting 2.7 terabytes of photos with one key creates two problems: the key is used a very large number of times, and rotating it means encrypting the whole store again. The standard answer is **envelope encryption**, with two levels.

A **data encryption key** encrypts the data, and can be unique for each object, file or volume. A **key encryption key** encrypts the data keys, and is kept in a separate, better protected place, a key management service or a hardware module.

The key encryption key must be stored separately from the data key and should be at least as strong, while the encrypted data key can live beside the data.

Clouds use the same arrangement, with 256 bit data keys wrapped by keys in a vault. Disabling the key encryption key makes the dependent services inaccessible, which works as a cryptographic erase.

The arrangement changes what rotation costs. For the photo store, 3 million listings with 3 photos of 300 KB each make 9 million objects and 2.7 TB:

| Design | Rotation Means | Our Estimate |
| --- | --- | --- |
| One Key for the Whole Photo Store | Encrypt 2.7 TB Again | About 7.5 hours at an assumed 100 MB/s |
| One Data Key for Each Photo | Rewrap 9 million small keys, about 0.5 GB | 2.5 hours at 1,000 key operations a second |

The second design also bounds the damage of one leaked data key to one photo.

Key services add one more convenience: they keep a history of key versions. The service keeps the old key material, decryption uses the version that did the encryption, and rotation doesn't change the data the key protects. AWS's key service, for example, rotates automatically every 365 days by default. MySQL's design is similar, and rotating its master key encrypts just the tablespace keys again and not the data.

Changing a default doesn't touch old data. Switching a bucket's default to a different key type doesn't encrypt existing objects again; a batch copy job does that.

A migration to a new scheme is a project, with a plan like the one in [Schema Migrations Without Downtime](/system-design/schema-migrations).

## Where the Keys Live

Most failures of encryption at rest are failures of key handling, and the rules are direct:

- **Separate keys from data**: keep keys on one system and data on another, so one breach doesn't expose both
- **Generate carefully**: use a cryptographically secure random generator, with separate keys for separate purposes
- **Store in a key service**: a hardware module, a cloud key management service or a vault, and never in code, version control or environment variables
- **Rotate on triggers**: when a key may be compromised, including when someone with access leaves, after its planned period, and before the mode's usage limit
- **Keep retired keys for a while**: they are needed to read old backups

[Secrets and Key Management](/system-design/secrets) covers the machinery. One consequence is worth stating here: losing the key loses the data. Back the keys up on a different path from the data, and test a restore from an encrypted backup as part of [Backups and Disaster Recovery](/system-design/backup-dr).

## What to Encrypt

The best protection is not holding the data. Start there: minimize what is stored, then choose the layer from the threat. For the textbook app:

| Data | Approach |
| --- | --- |
| Listing Photos | Platform default encryption, with access control on who can fetch them |
| Emails and Phone Numbers | Database encryption, plus field level encryption for phone numbers |
| Messages Between Students | Application level encryption, with keys in a key service |
| Card Numbers | Not stored, since the payment provider holds them and returns a token |
| Backups | Encrypted with a key kept apart from the data, tested in restore drills |
| Logs | Scrubbed of personal data first, as in [Data Privacy and Compliance](/system-design/privacy) |

A reminder that data leaks into side channels: a virtual machine can write to a page file, swap, crash dumps or logs, which is why cloud platforms offer encryption at the host level for those.

## Pitfalls

- **Encryption with the key next to the data**: a stolen copy is readable
- **A feeling of safety**: at rest encryption doesn't stop a compromised application or an injected query
- **A single key for the whole store**: a huge blast radius and a rotation that gets postponed for good
- **Homemade crypto or ECB mode**: patterns show through, and tampering goes unnoticed
- **Reusing nonces**: a breach of uniqueness can undo the security of the mode
- **No key backup**: the data is gone with the key
- **Encrypting what could be deleted**: the safest sensitive field is one that isn't stored

## Key Points

- Encryption at rest protects the stored media against theft and leaks, and it doesn't protect against a user or program the system lets in
- Each layer has a different threat in mind: disk encryption stops the stolen drive, database encryption stops stolen files, and client side encryption alone protects against an untrusted server
- Use AES with an authenticated mode, and respect the mode's limits: the GCM standard caps random nonce use at 2 to the 32nd encryptions under one key, where a repeat has about a 1 in 8.6 billion chance
- <u>Use envelope encryption</u>: data keys encrypt the data, and a separately kept key encrypts the data keys, so in our photo store rotation rewraps 0.5 GB of keys and not 2.7 TB of photos
- Keep keys apart from data and out of code, rotate them on triggers, and back them up, since losing the key loses the data
