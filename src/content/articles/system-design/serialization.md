> **Serialization** turns data held in a program's memory into bytes that can be sent or stored, and **deserialization** turns the bytes back. The format you choose decides how big the data is, who can read it and how safely it can change.

In [How HTTP Works](/system-design/http), a request carried a body like `{"title": "Calculus, Early Transcendentals", "price": 45}`, and the server's answer carried one too. That text is serialization at work. A program's objects live in memory, full of pointers that mean nothing on another machine, so before anything crosses a network or lands in a file it has to become a flat sequence of bytes. The receiver reads those bytes and rebuilds the object.

This choice shows up everywhere in the rest of the roadmap: API bodies, messages in a queue, rows in a cache, files in a data pipeline. So it pays to know the main options and, more importantly, how a format behaves when the data's shape changes.

## One Listing, Two Encodings

Take a small listing from the textbook app, with an id, a title and a price in dollars. Here it is as JSON, the format most web APIs use, and as Protocol Buffers, a binary format from Google that many internal services use:

```text
JSON, 39 bytes, readable by anyone:
{"id":42,"title":"Calculus","price":45}

Protocol Buffers, 14 bytes, as hex:
08 2a 12 08 43 61 6c 63 75 6c 75 73 18 2d
```

Both hold the same facts. The JSON repeats the words "id", "title" and "price" and writes the numbers as digits. The binary version replaces each name with a small number, called a **field number**, and packs the numbers tightly. To read the bytes you need the **schema**, a description such as "field 1 is the id, field 2 is the title, field 3 is the price". The JSON carries its own field names, so a person or a program can read it without one.

## The Common Formats

| Format | Readable | Needs a Schema | Size | Often Found In |
| --- | --- | --- | --- | --- |
| JSON | Yes, plain text | No | Largest | Web and mobile APIs, config files |
| Protocol Buffers | No, binary | Yes, a .proto file | Small | gRPC and internal services |
| Avro | No, binary | Yes, sent or looked up with the data | Small | Data pipelines and event streams |

A few others are worth knowing by name: XML, which is older and wordier and still common in enterprise systems, MessagePack, a binary format shaped like JSON, and CSV, for flat tables.

Binary formats are smaller and faster to read and write, which matters most when millions of messages move each second. Compression narrows the size gap, and for many systems the network and the database cost far more than the encoding, so the numbers from [Numbers Every Engineer Should Know](/system-design/numbers) are a better guide than a benchmark of formats. JSON has its own quirks. It has one kind of number, and in JavaScript that is a 64 bit float, so integers above about 9 quadrillion (2 to the power of 53) lose digits. APIs often send very large ids as strings for that reason.

## Why the Shape Changes

Now the harder part. The listing will gain fields next month. Ask what happens during the update, and recall from [Scaling Up and Scaling Out](/system-design/scaling) that servers are replaced a few at a time, so for a while old and new code run side by side. Old phone apps stay installed for years. Messages sitting in a queue were written by whatever code was running yesterday. So two versions of the data meet each other, in two directions:

<figure class="diagram">
<p class="rowname">Backward Compatible</p>
<div class="flow">
<div class="node">Old Data<small>no isbn field</small></div>
<div class="arrow" data-label="read by" aria-hidden="true"></div>
<div class="node">New Code<small>expects isbn</small></div>
</div>
<p class="rowname">Forward Compatible</p>
<div class="flow">
<div class="node">New Data<small>has an isbn field</small></div>
<div class="arrow" data-label="read by" aria-hidden="true"></div>
<div class="node">Old Code<small>has never heard of isbn</small></div>
</div>
<figcaption>New code must cope with old data, and old code must cope with new data</figcaption>
</figure>

Both directions matter. **Backward compatibility** is new code reading old data, which means a missing field gets a sensible default. **Forward compatibility** is old code reading new data, which means a field it doesn't know is skipped, not treated as an error. A format and a set of habits that allow both let you change one side at a time, without a moment where everything has to switch together.

## Changes That Are Safe, and Ones That Aren't

Binary formats make the rules very concrete. Protocol Buffers identify each field on the wire by its number and not by its name, so the numbers are the real contract. Here is how common changes fare:

| Change | Safe? | Why |
| --- | --- | --- |
| Add a new optional field with a new number | Yes | Old code skips it, new code defaults it |
| Remove an optional field | Yes, if its number is retired | Readers fall back to the default |
| Rename a field | On the wire, yes | Names aren't sent, though JSON and generated code still use them |
| Change a field's type | Rarely | Some widenings work, and most changes corrupt data |
| Reuse a removed field's number for something new | No | Old data is read as the wrong thing, without any error |
| Make an optional field required | No | Old data and old code don't have it |

The fifth row is the dangerous one, because no error appears. Suppose the listing's price was stored as whole dollars in field 3, and we decide cents are better. The tempting move is to keep field 3 and start writing cents. Then an old phone app reads 4500 from field 3 and shows a $4,500 textbook. The right move is to add a new field and retire the old one:

```proto
message Listing {
  reserved 3;
  reserved "price";

  int64 id = 1;
  string title = 2;
  int32 price_cents = 4;
}
```

The `reserved` lines tell the compiler to reject any future attempt to reuse that number or name, and the Protocol Buffers documentation is blunt about the rule: never reuse a field number. For a while the server writes both the old field and the new one, then drops the old one once no client reads it. This is the expand, migrate, contract path from [Designing for Maintainability](/system-design/maintainability), applied to a message. Avro works differently, resolving the writer's schema against the reader's by field name and filling in declared defaults, but the idea is the same: each change needs a default or a retirement plan. JSON has no schema to enforce any of this, so the rules live in team habits and tests.

## Catching Breaks Before They Ship

Habits fail on a busy Friday, so teams add checks:

- **Compare against the last schema** in the build, so a reused number or a removed required field fails the pull request. Tools such as `buf breaking` do this for Protocol Buffers
- **A schema registry** for event streams, a service that stores every version of a schema and refuses one that breaks the compatibility rule you set. See [Message Queues and Pub/Sub](/system-design/message-queues)
- **Contract tests** that run the newest client against the oldest server still deployed, and the reverse

For public web APIs, the same care applies to JSON fields, as in [What Makes a Good API](/system-design/good-apis) and [API Versioning](/system-design/api-versioning).

## Don't Turn Untrusted Bytes Into Objects

One more rule has nothing to do with size. Some formats can rebuild any object, including ones that run code while loading, such as Java's built in serialization and Python's pickle. Feeding them bytes from outside lets an attacker run code on your server. Use a plain data format for anything that crosses a trust boundary, and validate the fields after reading them, since the client is outside your control, as [How Clients and Servers Talk](/system-design/client-server) put it.

## Choosing a Format

Start from who reads the data:

- **People and browsers read it**: JSON, because nearly every language and tool handles it and you can read it in a log
- **Services talk to each other at high volume**: Protocol Buffers, usually through gRPC. See [RPC and gRPC](/system-design/rpc-grpc)
- **Events flow through a pipeline for years**: Avro or Protocol Buffers with a schema registry, so old events stay readable

Many systems use two, JSON at the edge for clients and a binary format inside. Whatever you pick, plan for the schema to change, because it will.

## Key Points

- Serialization turns in memory data into bytes for sending or storing, and deserialization rebuilds it
- JSON is readable and needs no schema, binary formats like Protocol Buffers and Avro are smaller and faster but need one
- Old and new versions always meet during updates, so data must be backward compatible and forward compatible
- <u>Never reuse a field number</u>: add a new field, stop using the old one and reserve it
- Check schema changes automatically, with a build check or a schema registry
- Pick the format by who reads the data, and don't rebuild objects from untrusted bytes
