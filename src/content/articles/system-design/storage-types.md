> There are three basic ways to store bytes on a network. **Block storage** is a raw disk that one machine formats and uses. **File storage** is a shared tree of folders and files. **Object storage** is a pile of named blobs reached over HTTP.

Every listing in the textbook app has about 3 photos of 300 KB each. For 3 million listings that is 2.7 terabytes, likely far more than the database's tables.

Where should it go? Not in the database rows, and not on the web server's own disk, which disappears with the server and can't be shared with the other five. This topic compares the three kinds of storage a team can pick from, and the photos are the running example.

## Block: A Raw Disk Over the Network

AWS's comparison of the three describes block storage as data split into blocks of a fixed size, each with a number, which can be read or written one at a time.

The operating system puts a file system or a database on top. A volume is used the way you would use a local hard drive, even though it sits across a network.

That makes block storage the fast, low latency choice. Virtual machines and databases are the typical uses, for the same reason.

It is also close to the machine: the volume usually belongs to one server's operating system, not to the whole fleet.

Two details from EBS are worth knowing. A volume's data is copied to several servers, but inside one Availability Zone, so a zone failure can still take it. And snapshots, point-in-time copies kept apart from the volume, are the way to back it up and move it. See [Redundancy and Failover](/system-design/redundancy-failover) for why the zone matters.

## File: Folders That Many Machines Share

File storage keeps the familiar hierarchy of directories and paths, with permissions on each file.

Its point is sharing: many machines see the same folders at the same time, over protocols such as NFS or SMB. A managed file service lets many compute instances use the same file system in parallel, with file locking, strong consistency and POSIX permissions.

It fits when several servers need to read and write the same files, or when existing software expects a folder. It is the least scalable of the three. A path like `/uploads/2026/11/17-a.jpg` is easy to understand, but a shared directory tree with locking is more to coordinate than a plain blob store.

## Object: Named Blobs Over HTTP

Object storage drops the directory tree. Each thing, called an object, is the data plus metadata, found by a bucket and a key.

It is a flat namespace in which the identifier is the address, and an object is an immutable piece of data. You don't edit the middle of an object. You store a new version of the whole thing.

The interface is an HTTP API with a few verbs, which is why any client that speaks HTTP can use it:

```text
PUT    /photos/17-a.jpg     store the object
GET    /photos/17-a.jpg     fetch it
DELETE /photos/17-a.jpg     remove it
```

The best known service is Amazon S3, and its numbers show why the model is attractive. Standard storage is designed for 99.999999999 percent durability, eleven nines, by keeping copies on multiple devices across at least three Availability Zones, with 99.99 percent availability.

Reads after a write are strongly consistent, so a `GET` right after a successful `PUT` returns the new object. An update to one key is atomic, though there are no atomic updates across several keys.

Object storage has a limit: it isn't meant for transactional data, since it has no locking for concurrent writers, so when two requests write the same key at once, the later one simply wins. A database on object storage would be slow, and a counter in an object would be a lost update waiting to happen.

## Letting the Phone Upload Directly

The photos raise a design question. If each upload passes through a web server, the server carries all the bytes: at a peak of 50 uploads a second, 300 KB each, that is 15 MB a second of traffic whose only job is to be forwarded.

A common answer uses the object store's own signing feature, a **presigned URL**.

<figure class="diagram">
<p class="rowname">Ask</p>
<div class="flow">
<div class="node">Phone</div>
<div class="arrow wide" data-label="may I upload?" aria-hidden="true"></div>
<div class="node">App Server</div>
</div>
<p class="rowname">Upload</p>
<div class="flow">
<div class="node">App Server</div>
<div class="arrow wide" data-label="signed URL" aria-hidden="true"></div>
<div class="node">Phone</div>
<div class="arrow" data-label="PUT photo" aria-hidden="true"></div>
<div class="node">Object Store</div>
</div>
<figcaption>The app signs a short lived URL, and the phone sends the photo straight to storage</figcaption>
</figure>

The app server asks the store for a URL that permits one upload of one key, valid for, say, ten minutes. The phone uploads to it, and the server then stores the key in the database.

Such a URL is time limited and acts as a bearer token: anyone holding it can use it until it expires, so keep the expiry short and the permission narrow. Downloads can work the same way, or be served through a CDN placed in front of the bucket, as in [Content Delivery Networks (CDNs)](/system-design/cdn).

## Side by Side

| | Block | File | Object |
| --- | --- | --- | --- |
| Looks Like | A raw disk | Folders and files | Named objects |
| Address | Block number | Path | Bucket and key |
| Shared by | One machine | Many machines | Anything on the network |
| Changed by | Writing any block | Editing part of a file | Replacing the whole object |
| Best for | Databases | Shared files | Photos, backups, static files |

## Cost and Tiers

Object storage is cheap per gigabyte, and cheaper still for data nobody reads. S3's storage classes trade the price of storing against the price of reading. Standard is meant for data accessed more than once a month.

The infrequent access classes cost less to keep and charge for retrieval, with a 30 day minimum. The Glacier archive classes are cheaper again, and the deepest ones need hours to restore before the data can be read.

For the textbook app, photos of sold listings are rarely opened after a term ends. A lifecycle rule, a setting that moves objects between classes by age, can shift them to a cheaper class automatically.

The savings come at the cost of a delay or a fee when someone does ask for an old photo, which is the tradeoff to check before enabling it.

## Where Each Piece of the App Goes

| Data | Storage | Why |
| --- | --- | --- |
| Database Files | Block | Low latency, and the database needs a disk |
| Listing Photos | Object, with a CDN | Many large files, written once, read many times |
| Nightly Backups | Object, in an archive class | Cheap, durable, and rarely read |
| A Staff Folder of Reports | File | People and tools expect folders |

The pattern is usual: block for what a database needs, objects for large files that are written once, and files only when something needs a shared folder. The next topics move on to storage shaped for a particular kind of question, starting with [OLTP, OLAP and Data Warehouses](/system-design/oltp-olap).

## Key Points

- Block storage is a raw, fast disk for one machine, file storage is a shared tree of folders, and object storage is named blobs reached over HTTP
- Use block storage for databases, object storage for large files that are written once and read many times, and file storage when machines must share folders
- Objects are replaced as a whole and aren't for transactional data, but S3 offers strong read-after-write consistency and designs for eleven nines of durability
- <u>Let clients upload straight to object storage</u> with a short lived presigned URL, so your servers don't carry the bytes
- Storage classes trade the price of keeping data against the price and delay of reading it
