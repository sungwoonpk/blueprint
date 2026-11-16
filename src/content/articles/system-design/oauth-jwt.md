> **OAuth 2.0** is a framework that lets an application get limited access to a user's data without ever seeing the user's password. A **JSON Web Token**, or JWT, is a signed token format that carries its own claims that many systems use for the tokens OAuth hands out. **OpenID Connect** adds a standard way to say who signed in.

The textbook app grows two new requests. Students want a button that says sign in with the university account, and a partner campus bookstore wants to read a student's listings, with the student's permission, to show them in its own app.

Neither should ever receive a student's password, and the student should be able to take the permission back.

[Authentication and Authorization](/system-design/authn-authz) covered a session between one browser and one server. This topic covers the harder case: several parties, none of whom should hold the user's credentials, and tokens that travel between services.

## The Four Roles

RFC 6749, the OAuth 2.0 specification, names four roles. For the bookstore case:

| Role | Who It Is Here |
| --- | --- |
| Resource Owner | The student, who owns the listings |
| Client | The bookstore's app, which wants access |
| Authorization Server | The textbook app's sign in service, which asks and decides |
| Resource Server | The listings API, which holds the data |

The client is either confidential, able to keep a secret such as a server side web app, or public, like a mobile app or a browser app, where any secret shipped inside the code can be extracted.

The result of the flow is an **access token**, which the RFC describes as a string representing an authorization issued to the client. The client sends it to the resource server on each call, and the server decides what the token allows.

A **refresh token** is optional, and the authorization server may issue one so the client can get a new access token without bothering the user again. The RFC says refresh tokens are not sent to resource servers.

## The Authorization Code Flow

The flow most apps use is the authorization code grant, in five steps lettered A to E in the RFC:

1. **The client sends the user to the authorization server**: The request carries `response_type=code`, the `client_id`, a `redirect_uri`, the requested `scope` and a `state` value
2. **The user signs in and approves**: This happens at the authorization server, so the client doesn't see the password
3. **The server redirects back with a code**: The `code` is single use, short lived, with a maximum of 10 minutes recommended, and the `state` comes back unchanged
4. **The client exchanges the code**: A POST to the token endpoint with `grant_type=authorization_code`, the code and the same redirect URI
5. **The server returns tokens**: An `access_token`, a `token_type`, an `expires_in` and optionally a `refresh_token`

The `state` value is a random string that the client creates and checks on return, which protects against a forged request, a cross site request forgery.

The redirect URI has to be one registered in advance, and the current security guidance, RFC 9700, requires the server to compare it by exact string, with one exception for the port of a localhost address in native apps. A loose match lets an attacker steer the code to a page they control.

The code travels through the browser, which is the weak spot, and the code alone should not be worth stealing.

## PKCE

A mobile app can't keep a client secret, and a malicious app on the same phone can register the same custom address and catch the code on the redirect. RFC 7636, **Proof Key for Code Exchange**, closes the gap with a secret made for each request:

```python
import base64, hashlib, os

def b64url(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

code_verifier = b64url(os.urandom(32))                 # 43 characters, kept by the app
code_challenge = b64url(hashlib.sha256(code_verifier.encode()).digest())

# step 1 sends code_challenge and code_challenge_method=S256
# step 4 sends code_verifier, and the server checks it against the stored challenge
```

The verifier is a random string of 43 to 128 characters, and 32 random bytes encoded this way give 43. The first request sends just the hash, the challenge, with the method `S256`. The token request sends the verifier, and the server hashes it and compares.

A mismatch returns `invalid_grant`. An attacker who caught the code has no verifier, so the code is useless to them. The RFC says a client that can use S256 must, and it warns against falling back to the plain method.

RFC 9700 makes PKCE the default: public clients must use it, and it is recommended for confidential clients too.

## Scopes and Old Grants

A **scope** is a space separated list of strings defined by the authorization server, and it limits what the token can do. The server may grant less than requested, and it must say so in the response.

| Scope | Allows |
| --- | --- |
| listings:read | Read the student's listings |
| listings:write | Create and edit listings |
| messages:send | Send messages as the student |

Least privilege from [Authentication and Authorization](/system-design/authn-authz) applies: the bookstore asks for listings:read, and no more.

The older grants are discouraged. RFC 9700 says clients should not use the implicit grant, which puts the token in the redirect address where it can leak, and it says the resource owner password credentials grant must not be used, since it hands the password to the client and can't work with a second factor.

It also asks that refresh tokens for public clients be tied to the sender or rotated on each use, and that access tokens be limited to one resource server through the audience. Sender constraining by mutual TLS or by a proof of possession called DPoP keeps a stolen token from working elsewhere.

## Who Signed In

OAuth says what a client may do. It doesn't say who the user is. OpenID Connect describes that gap in its first section: OAuth alone can't provide information about the authentication of the end user. Connect is an identity layer on top, and its pieces:

- **The `openid` scope**: Asks the server for an identity
- **The ID token**: A signed JWT that says the user authenticated, which Connect requires to be signed
- **UserInfo**: An endpoint, protected by the access token, that returns claims about the user

An ID token has required claims: `iss`, the issuer, `sub`, a stable identifier for the user at that issuer, `aud`, which must contain the client's own `client_id`, `exp`, `iat` and, when the client sent one, a `nonce` that it must check, tying the token to its own request.

The audience shows who the token is for: the app that asked, not the API. The specification adds that the ID token's expiry is unrelated to the lifetime of the user's session.

## What a JWT Contains

A JWT is three base64url parts joined by dots: a header, a payload of claims and a signature. RFC 7519 defines seven registered claims, none mandatory:

| Claim | Meaning |
| --- | --- |
| iss | Who issued the token |
| sub | Who the token is about |
| aud | Which recipients it is meant for |
| exp | The time on or after which it must be rejected |
| nbf | The time before which it must be rejected |
| iat | When it was issued |
| jti | A unique identifier, useful against replay |

Here is a real one that our code made, 287 characters long:

```text
{"alg":"HS256","typ":"JWT"}
{"iss":"https://auth.textbook.example","sub":"user-4412","aud":"textbook-api",
 "exp":1794822516,"iat":1794821616,"scope":"listings:write","role":"student"}
```

Anyone can decode those two parts, since base64url is an encoding and not encryption. The jwt.io introduction warns not to put secret information in the payload or header unless the token is encrypted. The signature is what protects against changes.

We tested what a check does with edited tokens:

| Attack | Naive Verifier | Strict Verifier |
| --- | --- | --- |
| Change the Role to Admin and Keep the Signature | Rejected | Rejected |
| Header Says alg none, No Signature | Accepted as admin | Rejected |
| A Token for the Payments API | Accepted | Rejected for the audience |
| An Expired Token | Accepted | Rejected |

The naive verifier made the classic mistake of trusting the algorithm named in the token's own header, and the attacker simply chose none. RFC 8725, the JWT best current practice, lists the defenses:

- **The verifier picks the algorithm**: Accept a fixed list, and use each key with exactly one algorithm
- **Validate the issuer and audience**: A token meant for another service has to be refused
- **Strong keys**: A human chosen password must not be an HMAC key
- **Explicit typing**: Set and check the type, so a token for one purpose can't be used for another
- **Distrust header values**: Sanitize `kid`, and don't follow `jku` or `x5u` addresses blindly, to avoid injection and server side request forgery

## Self Contained or Looked Up

A JWT can be checked by any service that has the key, without a call to the authorization server. That is fast and scales well. It also means a token stays valid until it expires.

The alternative is an opaque token, a random string with no content, which the resource server checks by asking the authorization server. RFC 7662 describes that introspection: a POST with the token, and a JSON answer whose required field is `active`.

The caller has to authenticate, and an unknown token gets `{"active": false}`. The answer may be cached, but not beyond the token's expiry, and the RFC notes that a cached answer can accept a token that was revoked meanwhile.

| Property | Self Contained JWT | Opaque With Introspection |
| --- | --- | --- |
| Check Per Request | Local, fast | A call to the authorization server |
| Revocation | Waits for expiry, or a custom list | Immediate |
| Dependency | The key, cached | The authorization server, on each call |

RFC 7009 defines revocation, where a client posts the token, and the server answers 200 even if the token was already invalid. Revoking a refresh token should also invalidate the access tokens of the same grant.

For self contained tokens, the RFC says immediate revocation needs some backend interaction beyond the standard, and its alternatives are short lived access tokens or handles the server can revoke.

A stolen token that can't be revoked is usable for the rest of its life, which is on average half of the lifetime if the theft is at a random time:

| Access Token Life | Average Exposure | Worst Case |
| --- | --- | --- |
| 5 Minutes | 2.5 minutes | 5 minutes |
| 15 Minutes | 7.5 minutes | 15 minutes |
| 1 Hour | 30 minutes | 60 minutes |
| 24 Hours | 12 hours | 24 hours |

The load shows the other side of the trade. The textbook app has 3,000 requests a second and, say, 12,000 active tokens. Introspecting each request is 3,000 calls a second to the authorization server.

Caching each answer for 30 seconds cuts it to about 400. Short lived JWTs refreshed at 5 minute intervals cost about 40 refreshes a second. These are our arithmetic.

## For the Textbook App

| Decision | Choice | Reason |
| --- | --- | --- |
| Flow | Authorization code with PKCE | Works for web and mobile clients |
| Access Token | A JWT living 10 minutes | Local checks, small exposure |
| Refresh Token | Rotated on each use | A stolen one shows up as a replay |
| Verification | Algorithm list, issuer, audience, expiry, scope | The checks from RFC 8725 |
| Partner Bookstore | Its own client with listings:read | Least privilege |
| Sign Out | Revoke the refresh token | Ends the grant |
| Signing Keys | Rotated, kept as in [Secrets and Key Management](/system-design/secrets) | A leaked key forges tokens |

## Pitfalls

- **Trusting the header**: Letting the token choose its algorithm
- **A token without an audience check**: A token for one API works on another
- **Secrets in the payload**: It is readable by anyone who holds the token
- **Long lived access tokens**: They can't be taken back
- **A loose redirect address**: The code goes to the attacker
- **The password grant**: It teaches users to type their password into other apps
- **An ID token as an API credential**: It says who signed in, and its audience is the app

## Key Points

- OAuth 2.0 lets a client act for a user with limited, revocable access, and the authorization code flow keeps the password at the authorization server
- PKCE adds a per request secret so a stolen code is useless, and current guidance requires it for public clients and recommends it for the rest
- OpenID Connect adds identity: an ID token for the app, with `iss`, `sub`, `aud`, `exp` and a nonce, while the access token is for the API
- <u>Verify a JWT strictly</u>: the verifier chooses the algorithm, and checks the issuer, audience and expiry, since in our test a verifier that trusted the header accepted a token with no signature
- Short lived JWTs make checks local and cheap, and opaque tokens give immediate revocation at the price of a call to the authorization server
