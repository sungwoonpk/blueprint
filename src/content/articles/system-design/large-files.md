> **Handling large files** means moving bytes that are too big for the ordinary request path: uploads that take minutes and fail halfway, and downloads that must resume, seek and stream. The pattern is to keep file bytes away from the application servers, send the file in pieces that can be repeated, check what arrives, and serve it from a place built for bulk delivery.

The textbook app began with 300 KB photos, and a photo can be a normal request. Now sellers want to attach scanned past exams, up to 500 MB, and short video demos of a book's condition, up to 2 GB. Those figures are our assumptions.

The same upload form that handled photos will now run for minutes, and its failure modes change: a phone leaves Wi-Fi at 90 percent, a server restarts mid transfer, a proxy times out.

A file of this size isn't just a bigger request. It holds a connection, a worker, memory or disk, and bandwidth for a long time, so its handling decides whether the rest of the service stays healthy.

## Keep the Bytes Away From the App

The obvious design sends the file to the application server, which stores it. It works for small files and fails at scale.

With 200 sellers uploading at 40 Mbps at once, the app servers carry 8 Gbps of upload traffic, and each upload ties up a worker for minutes. A slow client doesn't cost the server CPU, but it costs a connection and a slot.

The standard answer is for the client to upload straight to object storage, as in [Choosing Between Block, Object and File Storage](/system-design/storage-types), using a **presigned URL**, an address that carries a signature granting one specific operation for a limited time. The flow:

1. **Ask**: The client tells the app what it wants to upload, with the name, size and type
2. **Check**: The app authenticates the user, checks the quota and the allowed type, and creates a presigned URL for a generated key
3. **Upload**: The client sends the bytes straight to the storage service
4. **Notify**: The storage service tells the app, through an event, that an object arrived
5. **Process**: The app records the metadata and starts the scanning and processing jobs

The Amazon S3 documentation describes the properties that matter. Anyone with valid credentials can create a URL, but it works within the permissions of its creator and no wider. The uploader needs no credentials of its own.

A URL can be used many times until it expires, and S3 checks the expiry when a request starts, so a transfer in progress keeps going while a restart after the expiry fails.

Expiry is between 1 minute and 12 hours in the console and up to 7 days through the command line or the SDKs, but temporary credentials cut it short: the URL dies when the session credentials do.

The common failure is a signature mismatch, from clock skew, a proxy that alters headers, or a content type that differs from the one signed.

For the app, keep the expiry short, such as 15 minutes, since the URL is a bearer credential and can be used by whoever holds it, and generate the object key on the server so that a client can't choose where its file lands.

## Send It in Pieces

Even straight to storage, one request for 2 GB is fragile. A drop near the end throws away the whole transfer. The answer is **multipart upload**: split the file into parts, send each separately, and ask the store to assemble them.

S3's multipart upload documents the numbers:

- **When**: A best practice for objects of 100 MB or larger
- **Parts**: 5 MiB to 5 GiB each, with no minimum for the last, numbered 1 to 10,000, and sent in any order, so in parallel too
- **Limit**: The maximum object size is 48.8 TiB
- **Resume**: An initiated upload has no expiry, so a client can pause and come back, and it has to complete or stop the upload explicitly
- **Cleanup**: Incomplete uploads keep their parts stored and billed, so a lifecycle rule with the `AbortIncompleteMultipartUpload` action deletes the leftovers after a number of days

The part size has a lower bound from the 10,000 limit: with 5 MiB parts the largest file is about 48.8 GiB, and a 100 GiB file needs parts of at least 10.2 MiB. Between the bounds is a trade, and we simulated it.

A 2,000 MB file goes over a 40 Mbps link where the connection drops about once a minute on average, which is typical of mobile data and a made up figure. A drop loses the part in flight, and each part costs 0.25 seconds of overhead:

| Part Size | Mean Time | 95th Percentile | Bytes Sent for Each Byte of File |
| --- | --- | --- | --- |
| Whole File, One Request | 51,729 s | 186,271 s | 123 |
| 500 MB | 1,101 s | 1,756 s | 2.6 |
| 100 MB | 505 s | 594 s | 1.2 |
| 25 MB | 458 s | 487 s | 1.04 |
| 5 MB | 524 s | 541 s | 1.01 |

On the flaky link, a single request rarely finishes, because each drop restarts it and the file needs about 7 minutes of clean transfer. Parts of 25 MB were the best in this model: small enough that a drop wastes little, large enough that the overhead stays small.

On a steady wired link, with a drop at 2 hour intervals, the single request took 411 seconds, 100 MB parts took 406 and 5 MB parts took 500, since the overhead was the sole cost left. The lesson is to size parts by the quality of the network, and to let the client adapt the size.

## Resuming Without the Cloud's Help

Multipart upload is a feature of one storage service. Open protocols give the same ability over plain HTTP. The tus protocol is the most used. A client creates an upload with a POST that declares the total length, and the server answers 201 with a location.

After an interruption, the client sends a HEAD request to learn the current `Upload-Offset`, then continues with a PATCH that carries that offset and the content type `application/offset+octet-stream`.

The server acknowledges with 204 and the new offset, and if the offset sent doesn't match the server's, it answers 409 and leaves the upload unchanged. Extensions add a checksum, where a mismatch returns a 460 status, expiration, termination with DELETE, and concatenation of parts uploaded separately.

The IETF's HTTP working group has a draft for resumable uploads that uses the same idea with standard parts: a 104 interim response announces the upload resource, and headers named `Upload-Offset` and `Upload-Complete` track progress.

It says plainly that, unlike ranged downloads, it doesn't support sending one upload as several parallel requests. The document is still a draft, so tus, which has a published 1.0.0 version, is the safer choice today.

Both rely on integrity checks. A checksum on each part, verified by the server, finds a corrupted piece before assembly, and an end to end hash of the whole file, computed by the client and compared after assembly, finds the cases that a part check can't.

A retry of a part must be safe to repeat, as in [Idempotency and Safe Retries](/system-design/idempotency), and tus gets that from the offset: a repeated PATCH with an old offset is refused.

## Distrust the Upload

A file that a stranger sends and the system later serves or processes is an attack surface. The OWASP file upload guidance lists the defenses:

- **An allowlist of extensions**: The types the feature needs and no others, checked after the name is decoded
- **Don't trust the Content-Type header**: It is trivial to spoof, so check the file's signature, its first bytes, as well, though the signature check isn't enough alone
- **Rename**: Store the file under a name the application generated, such as a UUID, and keep the user's name as metadata
- **Limit size**: For archives, after decompression, and limit downloads too, against denial of service
- **Convert images**: Decode and encode again to an allowed format, which strips metadata, and keep the image library up to date, sandboxed and limited in resources, since it is attack surface too
- **Store it elsewhere**: On a different host, or outside the web root, and serve it through a handler that maps an id to a file, not by a path
- **Scan it**: With an antivirus or a sandbox, and for documents, content disarm and reconstruction where it applies
- **Authorize the upload**: Permitted users alone, with protection against cross site request forgery

The retrieval side has risks of its own: active content in a served file can run scripts in the user's browser, and a popular file can be a bandwidth attack. Serving uploads from a separate domain, with a download disposition for untrusted types, limits the first.

This work fits a pipeline with states: the object lands in a quarantine location, a scanning job runs, a processing job creates thumbnails or transcodes video, and after that the file becomes visible. The jobs are the [Task Queues](/system-design/task-queues) and [Running Long Jobs and Workflows](/system-design/long-jobs) of Phase 4.

## Serving Big Files

Downloads need the same care in the other direction. HTTP range requests let a client ask for part of a file, which gives resumable downloads and seeking in media. RFC 9110 and the MDN guide describe them:

- **Support**: A server that advertises `Accept-Ranges: bytes` supports ranges, and a server can also ignore a `Range` header and send the whole file
- **A request**: `Range: bytes=0-1023` asks for the first 1,024 bytes, since offsets start at zero and are inclusive, and `bytes=-500` asks for the last 500
- **A reply**: A `206 Partial Content` with `Content-Range: bytes 0-1023/146515`, which says where the piece sits in the whole
- **A changed file**: `If-Range`, with an ETag or a date, makes a resumed download restart if the file changed, with a 200 and the full body in place of a 206
- **A bad range**: A 416 for a range outside the file

Object stores use the same mechanism for speed. S3's guidance is to fetch large objects with several concurrent range requests, aligned with the part sizes used for the upload, which raises throughput and makes a retry cheap.

It states per prefix request rates of at least 3,500 writes and 5,500 reads a second, with a 503 Slow Down while the service scales up.

Video is a special case. HTTP Live Streaming, specified in RFC 8216, cuts a video into media segments, each an ordinary file listed in a playlist with its duration. A master playlist offers several variant streams of different quality, and a client switches between them to adapt to the network.

The specification's own example has a target duration of 10 seconds, and describes segments of that length or less. Because each segment is a normal file, a [Content Delivery Networks (CDNs)](/system-design/cdn) caches it like any other, which is why this design scales to a very large audience.

## Costs and Lifetimes

Large files dominate storage cost. [Tiering Hot and Cold Data](/system-design/hot-cold-data) moves old exams to cheaper storage, lifecycle rules remove incomplete uploads and expired files, and quotas keep one seller from filling the bucket.

## A Plan for the Textbook App

| Step | Decision |
| --- | --- |
| Upload Path | Presigned URLs to object storage, valid 15 minutes, with server generated keys |
| Large Files | Multipart over 100 MB, with parts of 25 MB, adapted to the connection |
| Resuming | The multipart upload ID, saved on the client, with a list of parts that arrived |
| Integrity | A checksum for each part and a whole file hash |
| Safety | Allowlist PDF and MP4, check signatures, scan, convert images, quarantine until clean |
| Serving | CDN with range requests, and HLS segments for video demos |
| Cleanup | Abort incomplete uploads after 3 days, and move exams older than a year to cold storage |

## Pitfalls

- **Proxying uploads through the app**: Workers and bandwidth are held for minutes
- **One request for a huge file**: Each drop restarts the transfer
- **A part size chosen once**: Parts that suit a wired link suit nobody on mobile data
- **A long presigned expiry**: A leaked URL is a credential
- **Trusting the extension or the header**: Both are chosen by the sender
- **Serving uploads from the main domain**: Active content runs with the site's privileges
- **Orphaned parts**: Incomplete uploads are billed until they are cleaned up

## Key Points

- Keep file bytes off the application servers: the app issues a short lived presigned URL, and the client uploads straight to object storage
- Send big files in parts: in our simulation of a 2 GB upload over a flaky link, one request averaged 51,729 seconds, and 25 MB parts averaged 458
- Pick the part size by the network: small parts waste little on a drop, large parts waste little on overhead, and the S3 limit of 10,000 parts sets a floor for huge files
- <u>Treat each upload as hostile</u>: allowlist types, check signatures, rename, scan, convert images, and keep files in quarantine until they pass
- Serve with range requests and segments through a CDN, so downloads resume, videos seek and the origin carries little
