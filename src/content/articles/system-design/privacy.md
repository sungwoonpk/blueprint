> **Data privacy** engineering means building a system so that personal data is collected for a stated purpose, kept no longer than needed, protected, and can be found, exported and erased when its owner asks. **Compliance** is being able to show a regulator that the system does this. This topic is an engineering overview of the laws' text, not legal advice.

A student writes to the textbook app: delete my account and the data you hold about me. The request is simple to read and hard to carry out.

The student's email sits in the users table, in the search index, in a cache, in the analytics warehouse, in the logs, at the email provider, and in 35 days of nightly backups.

A second scenario is worse. An engineer finds that a storage bucket with message exports was public for a week. The clock on a legal duty to report it has started, and the team has to know quickly what was exposed and whose it was.

The laws set rules for both, and the rules turn into design requirements. The best time to meet them is before the first row is written.

## The Rules in Brief

Three regimes matter for an app with students in several places, and each has its own text. The GDPR, the European Union's General Data Protection Regulation, covers the personal data of people in the Union. The CCPA, California's Consumer Privacy Act, has its own rights and enforcement and applies to businesses above thresholds.

The third is South Korea's Personal Information Protection Act, enforced by the Personal Information Protection Commission, which publishes its fines. We couldn't retrieve the statute text, so this topic doesn't describe it. Check the local law for the users you serve.

The GDPR's definitions set the vocabulary. **Personal data** is any information relating to an identified or identifiable natural person, directly or indirectly, such as a name, an identification number, location data or an online identifier. **Processing** is any operation on personal data, and storing it counts.

The **controller** is the party that determines the purposes and means of processing, which is the textbook app. A **processor** is a party that processes data on behalf of the controller, such as the email provider, which needs a contract that says so.

## Principles as Requirements

The GDPR's Article 5 lists principles that read like design requirements:

| Principle | What It Asks of the System |
| --- | --- |
| Lawfulness, Fairness and Transparency | A legal basis and a clear notice to users |
| Purpose Limitation | Collect for specified, explicit and legitimate purposes, and don't reuse for incompatible ones |
| Data Minimisation | Keep data adequate, relevant and limited to what is necessary |
| Accuracy | Keep data up to date, and fix or erase wrong data without delay |
| Storage Limitation | Keep identifiable data no longer than necessary |
| Integrity and Confidentiality | Appropriate security against unauthorized access, loss and damage |
| Accountability | Be able to demonstrate compliance |

The last one changes the work. A system that complies in silence isn't enough, so the logs, records and tests that show how data is handled are part of the product.

## Know Where the Data Is

Requests can't be honored for data nobody can find. The first step is an inventory, a data map with each place personal data lives and how long it stays. For the textbook app, with retention periods that are our assumptions:

| Store | Personal Data | Retention |
| --- | --- | --- |
| Users Table | Name, email, phone | While the account exists |
| Listings and Messages | Seller identity, message text | While the account exists |
| Search Index and Caches | Copies of listing text | Minutes to days |
| Analytics Warehouse | Event history with user identifiers | 13 months |
| Application Logs | IP addresses, user identifiers | 30 days |
| Backups | A copy of the whole system | 35 days |
| Email and Payment Providers | Email, payment token | Per contract |

Minimization pays here. Each field not collected is a field that doesn't need protecting, exporting or deleting. [Logs, Metrics and Traces](/system-design/observability) deserves a review for the same reason: a request log with full addresses and user identifiers is personal data with a long life.

## Rights as Features

The laws give people rights that the system has to support, and each right becomes a feature.

Access is the first. Under Article 15 of the GDPR, a person can ask whether data about them is processed and receive a copy, with information about purposes, recipients, storage period and rights.

Portability, in Article 20, gives back the data a person provided in a structured, commonly used and machine readable format, where the processing is based on consent or a contract and is automated.

Erasure, in Article 17, requires deletion without undue delay on grounds such as data no longer being necessary or consent being withdrawn, and it has exceptions, including a legal obligation and the defence of legal claims. Correction and objection complete the set: fixing wrong data, and stopping some kinds of processing.

The two main regimes compare like this:

| Question | GDPR | CCPA |
| --- | --- | --- |
| Time to Respond | One month, extendable by two months | 45 days, extendable by 45 days |
| Fee | Free, unless a request is manifestly unfounded or excessive | Free for requests to know, up to twice a year |
| Who Enforces | Supervisory authorities | The Attorney General and the California Privacy Protection Agency |
| Who Is Covered | Processing of data of people in the Union | Businesses above $25 million revenue, or 100,000 residents or households, or half of revenue from selling data |

CCPA adds rights to opt out of the sale or sharing of data, to correct, and to limit the use of sensitive data, and a business that sells data must offer a link and honor a global privacy signal.

It has a private right of action for certain data breaches alone, up to $750 for each incident after a 30 day notice. The GDPR also allows a business to ask for more information when it doubts a requester's identity, which a service should do before it exports an account's data to someone.

An access request needs a job that gathers data from each store in the map into one file. A portability request needs the same job with a stable format, such as JSON. Both need a tracked deadline, since the clock is a month, and a request queue with an owner.

## Deleting for Real

Erasure touches each store, and each deletes differently:

| Store | How It Is Deleted | Time |
| --- | --- | --- |
| Users Table | Mark the account, then remove the rows after a short grace period | Days |
| Search Index and Caches | A delete event from the source, as in [Change Data Capture](/system-design/cdc) | Seconds to minutes |
| Analytics Warehouse | A deletion job, or anonymized events from the start | Per batch cycle |
| Logs | Expire by retention | Up to 30 days |
| Email and Payment Providers | Their deletion API, tracked to completion | Per provider |
| Backups | Expire, plus a deletion log reapplied after any restore | Up to 35 days |

Backups are the awkward case: a snapshot can't be edited without breaking it.

The practical options are to let the copy expire within a short retention, to keep a log of erasure requests and replay it after any restore so deleted people don't return, and to encrypt each user's data under its own key, so that deleting the key makes the copies unreadable.

The last idea builds on the keys of [Encrypting Data at Rest](/system-design/encryption-at-rest) and [Secrets and Key Management](/system-design/secrets). Whether a regulator accepts it for a given case is a legal question, and it has to be settled with legal advice.

Article 17 also tells a controller that has made data public to take reasonable steps to inform others processing it.

The deletion has to be verified: a job that reports success while an index still holds the text fails the request.

## Pseudonymised Isn't Anonymous

A common shortcut is to remove names and call the data anonymous. The GDPR's Article 4 defines **pseudonymisation** as processing so that data can't be attributed to a person without additional information, which is kept separately and protected.

Recital 26 states the consequence: pseudonymised data is still personal data. Information is anonymous, and outside the regulation, when the person is not or no longer identifiable by any means reasonably likely to be used, considering cost, time and available technology.

We tested how well removing a name works on 40,000 synthetic students, with skewed distributions of major, year, residence, birth year and gender. We counted the records that were unique on the attributes left:

| Attributes Kept | Unique Records | In Groups Under 5 |
| --- | --- | --- |
| Major, Year of Study | 0% | 0% |
| Major, Year, Residence | 3.4% | 23.2% |
| Major, Year, Residence, Birth Year | 33.5% | 75.2% |
| The Five Attributes Together | 51.5% | 88.9% |
| Faculty, Year, Zone, Generalized | 0% | 0% |

With names gone and five ordinary attributes left, half of the students were unique, which means anyone who knows those facts about a student can find the row. Generalizing the attributes, with 8 faculties and 4 residence zones in place of 50 majors and 25 buildings, and dropping the birth year and gender, left no unique records.

The lesson is about the combination: single fields look harmless. The result applies to our synthetic data and shows the mechanism, and a real release needs its own analysis of the data and of what an attacker could know.

## Security and Breaches

Article 32 asks for technical and organizational measures that fit the risk. Its examples are pseudonymisation and encryption, ongoing confidentiality, integrity, availability and resilience, the ability to restore availability and access to personal data in good time after an incident, and regular testing of the measures.

Those line up with the rest of this phase: [Authentication and Authorization](/system-design/authn-authz) for access, [Backups and Disaster Recovery](/system-design/backup-dr) for restoring, and [Chaos Engineering](/system-design/chaos-engineering) for testing.

Article 33 sets the clock for breaches. The controller notifies the supervisory authority without undue delay and, where feasible, not later than 72 hours after becoming aware. A later notice has to explain the delay, and no notice is needed if the breach is unlikely to result in a risk to people's rights and freedoms.

A processor tells the controller without undue delay. The notice describes the nature of the breach, a contact point, the likely consequences and the measures taken, and the controller documents each breach so the authority can check.

For engineers, the 72 hours begin at awareness, and the team can meet them with some preparation. Detection comes first: alerts on odd access, as in [Alerting and Dashboards](/system-design/alerting), and logs that say who read what.

A data map says whose data was exposed. A runbook says who decides that something is a reportable breach, and who writes the notice. And processor contracts put duties on vendors to tell the team quickly.

## The Size of the Stakes

GDPR fines come in two tiers. The lower tier, for obligations such as security and breach notification, is up to 10 million euros or 2 percent of worldwide annual turnover, whichever is higher.

The higher tier, for the basic principles, the rights of data subjects and transfers abroad, is up to 20 million euros or 4 percent. Article 25, on data protection by design and by default, sits in the lower tier.

Fines aren't the sole cost: a breach is a failure of trust with the students, and the incident process of [Incidents and Postmortems](/system-design/postmortems) applies.

## A Plan for the Textbook App

| Step | Action |
| --- | --- |
| 1 | Write the data map and assign each store an owner |
| 2 | Cut what is collected: no birth date, no precise location |
| 3 | Set retention for logs, events and backups, and enforce it by job |
| 4 | Build the export and erase jobs, with deadlines and an audit trail |
| 5 | Test erasure end to end: delete a test user and search each store |
| 6 | Keep a breach runbook, and rehearse it on a game day |

## Pitfalls

- **Names removed, so anonymous**: A combination of attributes still points to a person
- **Deleting from the primary database alone**: The search index, warehouse and logs still hold the data
- **Unlimited retention**: Old data raises the cost of each breach
- **Logs with personal data**: They outlive the code that wrote them
- **No identity check on an export**: The data goes to the wrong person
- **A runbook nobody has read**: The 72 hours pass while the team debates who decides

## Key Points

- Personal data is any information about an identifiable person, and the principles ask for purpose limits, minimization, limited storage, security and the ability to show compliance
- Make a data map first, since export and erasure requests, with deadlines of a month under the GDPR and 45 days under CCPA, can be met for data that can be found, and for no other data
- Erasure has to reach each store, and backups need a plan: short retention, a replayed deletion log, or per user keys
- <u>Pseudonymised data is still personal data</u>: in our test, removing names left 51.5 percent of students unique on five attributes, and generalizing left zero
- Prepare for a breach: detection, a data map and a runbook, since the notification clock of 72 hours where feasible starts at awareness
