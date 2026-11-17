> **Authentication** is proving who a request comes from. **Authorization** is deciding what that identity may do. A system needs both on each request, and they fail in different ways: a stolen password breaks the first, and a missing ownership check breaks the second.

A student signs in to the textbook app, finds a listing at `/listings/5521` and edits the price of their own book. Two things have to be true for that to be safe. The app has to know the person is who they claim to be, and it has to know that listing 5521 belongs to them.

Both can go wrong at once. Someone guesses passwords until one works, or a student changes the number in the address to 5522 and edits a stranger's listing. Neither attack touches the servers' capacity, so the tools from earlier in this phase don't stop them. This group of topics covers the defenses.

## Proving Who You Are

An authenticator is something the user knows, has or is. The combinations rank in three authenticator assurance levels:

| Level | What It Requires | Phishing Resistance |
| --- | --- | --- |
| AAL1 | One factor or more | Not required |
| AAL2 | Two distinct factors | Must be offered |
| AAL3 | A cryptographic device whose key can't be exported | Required |

Identity proofing, which establishes that a person is who they claim to be, is separate from authentication, which establishes that the person controls the authenticator. A site that lets anyone register with any name has no proofing, and it can still authenticate returning users well.

Passwords remain the first factor for most systems, and the current practice is very different from the old habits. Length beats complexity: a minimum of 15 characters when the password is the sole factor and 8 when it is part of multifactor authentication, and a maximum of at least 64 so that passphrases fit.

Don't require a mix of capitals, digits and symbols, and don't force a change on a calendar, but when there is evidence of compromise.

Do check new passwords against lists of breached and common passwords, and explain a rejection. Accept paste and autofill so that password managers work, and don't truncate what the user typed.

One warning matters for the second factor: passwords, one time codes sent by text and codes typed from an authenticator app are not phishing resistant, since a fake site can collect them. Phishing resistance needs a cryptographic authenticator, such as a security key or a passkey, which signs a challenge for the real site alone.

The sign in page itself leaks information if it isn't careful. Give the same generic answer whether the user is unknown, the password is wrong or the account is locked, such as "Login failed; Invalid user ID or password", and the same for password reset: "If that email address is in our database, we will send you an email." Keep response times equal too, since a missing user that returns faster than a wrong password gives the secret away.

Rate limits on attempts, covered in [Rate Limiting in Practice](/system-design/rate-limiting-in-practice), slow the guessing, and a mechanism that effectively limits failed attempts is a standard requirement.

## Storing Passwords

The server doesn't need to know the password, just whether the guess matches, so it stores a hash. The choice of hash decides what a stolen database is worth.

We measured one CPU core on a laptop:

| Hash | Time for One Guess | Guesses a Second |
| --- | --- | --- |
| Plain SHA-256 | About 0.3 microseconds | About 3,000,000 |
| PBKDF2, SHA-256, 600,000 Iterations | 58 ms | About 17 |
| scrypt, 128 MiB of Memory | 193 ms | About 5 |

A fast hash is the wrong tool, because speed helps the attacker as much as the server. PBKDF2 is about 170,000 times slower than plain SHA-256 on the same core, a gap that decides the outcome:

| Password | Plain SHA-256 | PBKDF2 With 600,000 Iterations |
| --- | --- | --- |
| 8 Lowercase Letters | 19 hours | 381 years |
| 8 Random Letters and Digits | 2.3 years | About 400,000 years |
| 4 Random Words From 2,048 | 68 days | About 32,000 years |
| 12 Random Letters and Digits | 34 million years | About 6 trillion years |

These are the times to try the whole space on one core, so an attacker with many cores or GPUs is faster by orders of magnitude, and the search can stop when the password is found.

The table shows the relative cost, not a safe limit. A human chosen password sits in a far smaller space than a random one.

The order of preference is short. Argon2id comes first, with at least 19 MiB of memory, 2 iterations and 1 degree of parallelism, or equal options such as 46 MiB with 1 iteration.

Next is scrypt, with a CPU and memory cost of 2 to the 17th power, a block size of 8 and 1 degree of parallelism.

For older systems, bcrypt works with a work factor of at least 10 and a limit of 72 bytes on the password. And when a standard such as FIPS 140 is required, PBKDF2 with 600,000 iterations of HMAC SHA-256 is the option.

Each password gets a unique random salt, which most libraries generate, so that two users with the same password have different hashes and a precomputed table is useless.

A pepper is a secret shared across passwords and kept outside the database, in a vault or a hardware module, as an extra layer. Aim for under a second per hash, raise the work factor over time, and rehash at the next login.

## Staying Signed In

After a successful login, the server hands the browser a **session** identifier and recognizes it on later requests. That identifier is now as good as the password, so it gets care.

It must be unguessable: at least 64 bits of entropy from a secure random generator, with no personal data inside. At 10,000 guesses a second, it takes about 585 years to hit one of 100,000 active sessions, which we confirmed with the arithmetic.

The cookie that carries it needs guards. Mark it Secure so that it travels over HTTPS alone, HttpOnly so that scripts can't read it, and SameSite so that other sites can't trigger requests with it.

Issue a new identifier at login and after any change of privilege, which defeats fixation, where an attacker plants a known identifier before the victim signs in.

Limit its life. A reasonable overall limit is no more than 24 hours at the middle assurance level with an inactivity limit of 1 hour, and at the highest level, 12 hours and 15 minutes.

And end it on the server: logging out deletes the session there, since clearing the cookie in the browser leaves a copy that still works.

A server side session is easy to end. Tokens that carry their own claims, covered in [OAuth and JWT](/system-design/oauth-jwt), are harder, because the server holds no record to delete, and the guidance keeps them short lived for that reason.

## Deciding What You May Do

Authentication says who. Authorization is a separate check, and it has to run on each request. An attacker needs to find one way in, client side checks can't be relied on, and validating permissions correctly on just most requests is insufficient.

Three rules shape a design. The first is least privilege: give each user the minimum needed for the job, and look again after launch for privilege creep, since granting more later is easier than taking it back.

The second is deny by default. The application decides to permit or deny on each request, even when no rule matches, and except for public resources the default is no.

The third is to check on the server, in one place, with a global mechanism such as a filter or middleware, so a new endpoint is protected without anyone remembering.

Models for the rules differ in what they can express:

| Model | Decides By | Fits |
| --- | --- | --- |
| RBAC | The user's role | Simple permissions, such as admin and member |
| ABAC | Attributes of the user, the object and the setting | Time, device, location, tenant |
| ReBAC | A relationship between user and object | The owner may edit, others may not |

RBAC identifies permitted actions with roles and not with individual identities. It struggles with decisions about a single object and can suffer role explosion, so ABAC or ReBAC is the better fit for application code, with the caveat that RBAC is simpler to start.

## The Most Common Flaw

Broken access control topped the OWASP Top 10 for 2021, up from fifth place, and 94 percent of the applications tested had some form of it.

The API version of that list names its most common form, broken object level authorization, which is easy to exploit and widespread. An endpoint takes an object identifier from the client and acts on it without checking that this user may. The student who changes 5521 to 5522 is the example.

The code looks right and isn't:

```python
@app.put("/listings/<int:listing_id>")
def update_listing(listing_id):
    user = require_login()                      # authentication: who is this?
    listing = db.get_listing(listing_id)
    listing.price_cents = request.json["price_cents"]   # no ownership check
    db.save(listing)
```

The version with the check:

```python
    if listing.seller_id != user.id and not user.is_admin:
        abort(403)                              # authorization: may this user edit this one?
```

Comparing the session user with an identifier in the request isn't enough in general, and random identifiers help but don't replace the check.

The mitigations are a check in each function that takes an identifier, access rules in one reusable place, tests that fail the build when a check is missing, and logging of refused attempts with an alert on repeats.

## Where the Checks Live

In a system of many services, the edge, often a gateway, authenticates the request and passes the identity on. Each service still authorizes, since a service that trusts its callers blindly is open to anything that reaches it, a problem for [Service Identity and Mutual TLS (mTLS)](/system-design/service-identity).

Central policy, evaluated close to the data, keeps the rules consistent, and a refusal should be quick and cheap, like the shedding in [Load Shedding and Graceful Degradation](/system-design/load-shedding).

For the textbook app:

| Action | Rule |
| --- | --- |
| View a Listing | Public |
| Message a Seller | Signed in |
| Edit or Delete a Listing | The seller, or an admin |
| Mark a Book as Sold | The seller |
| Open the Admin Panel | An admin role and a second factor |

## Pitfalls

- **A fast hash for passwords**: A stolen database is cracked in hours
- **Different errors for a missing user**: The sign in page becomes a list of accounts
- **Checks in the browser**: The attacker doesn't use the browser
- **A check on some endpoints**: The unchecked one is the one that is found
- **Trusting an identifier from the client**: Any value the client sends can be changed
- **A long lived session without a server side record**: There is no way to end it

## Key Points

- Authentication proves who a request comes from and authorization decides what that identity may do, and both run on each request
- Store passwords with a slow, salted hash such as Argon2id: on our core, plain SHA-256 tried 3 million guesses a second and PBKDF2 with 600,000 iterations tried 17
- Follow current guidance on passwords: long and unrestricted in form, checked against breached lists, not forced to change on a schedule, and backed by a phishing resistant second factor where the risk is high
- <u>Check ownership on the server for each object a client names</u>, with least privilege and deny by default, since broken access control was first in the OWASP Top 10 for 2021
- Keep sessions unguessable, guarded by cookie attributes, renewed at login, time limited and ended on the server
