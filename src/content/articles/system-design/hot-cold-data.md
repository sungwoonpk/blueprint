> **Tiering** stores data on different kinds of storage according to how often it is read: **hot** data on fast and costly media, **cold** data on slow and cheap media, with **warm** data between. The idea pays when access is skewed toward recent or popular data, and it costs when cold data is read more than the saving allows.

The textbook app has 3 million listings spread over three years, and most of the traffic goes to the newest. A listing sold in the first year keeps its photos, its messages and its event history, and almost nobody reads any of it.

The data takes up room in the database, in backups and on the fast disks, and it slows the queries that scan it.

The obvious move is to put old data on cheap storage. Whether it saves money depends on a number that is easy to get wrong: how often the cold data is still read. This topic is about finding that number and about the tools that act on it.

## How Fast Data Cools

Most data has a heat that falls with age. We modeled it for the listing photos: 3 million listings spread evenly over three years, with a listing's reads falling with its age, as age plus 30 days raised to the power of minus alpha.

A larger alpha means a faster cooling. The shape and the values are our assumptions, and the table shows three:

| Cooling Speed | Reads to Data Over 30 Days Old | Over 90 Days | Over 365 Days |
| --- | --- | --- | --- |
| Slow, Alpha 0.6 | 90.2% | 77.2% | 44.6% |
| Moderate, Alpha 1.0 | 80.7% | 61.6% | 28.8% |
| Fast, Alpha 1.4 | 68.1% | 44.1% | 15.8% |

Of the stored listings, 97 percent are older than 30 days, 92 percent are older than 90 and 67 percent are older than a year. Even with slow cooling, the oldest two thirds of the data get under half of the reads, and with fast cooling they get 16 percent.

The skew is what tiering uses, and it is also the reason to measure first: the real curve for the app has to come from the access logs, since the share of reads going to old data decides what follows.

## Decide by Arithmetic

Cold storage charges less for keeping data and more for reading it. The decision for a block of data is a comparison of the storage saving with the retrieval fees.

We used illustrative prices, which are our assumptions and not a price list: 2.3 cents for each gigabyte stored for a month in standard storage, 1.25 cents plus 1 cent for each gigabyte read in an infrequent access class, and 0.4 cents plus 3 cents for each gigabyte read in an archive class.

The key quantity is the **read ratio**: the gigabytes read in a month for each gigabyte stored.

With these prices, the infrequent class beats standard storage when the ratio is below about 1.05, since the saving of 1.05 cents is matched by the fee on that much reading. The archive class beats standard below about 0.63. Above those ratios, tiering makes the bill larger.

We applied this to the photo store in four age groups, with each group choosing its cheapest class. The result depends on how much of the traffic reaches the origin, so we ran two cases. A group's read ratio is the gigabytes read from it in a month divided by the gigabytes it stores:

With 15.6 million photo reads reaching the origin each month:

| Age Group | Read Ratio | Cheapest Class |
| --- | --- | --- |
| 0 to 30 Days | 36.6 | Standard |
| 30 to 90 Days | 18.2 | Standard |
| 90 to 365 Days | 6.8 | Standard |
| 1 to 3 Years | 2.2 | Standard |

With 1.56 million:

| Age Group | Read Ratio | Cheapest Class |
| --- | --- | --- |
| 0 to 30 Days | 3.7 | Standard |
| 30 to 90 Days | 1.8 | Standard |
| 90 to 365 Days | 0.68 | Infrequent |
| 1 to 3 Years | 0.22 | Archive |

With 15.6 million reads reaching the origin each month, no group of data was cold enough, and tiering saved no money: even the oldest photos were read 2.2 times each month for their size.

With a CDN absorbing 90 percent of those origin reads, the two oldest groups became candidates, and the bill fell by 40 percent, from 62 dollars to 38 dollars a month at 2.7 terabytes, and from 62,100 to 37,504 dollars at 1,000 times the size.

Two lessons come out of it. A CDN, covered in [Content Delivery Networks (CDNs)](/system-design/cdn), reduces the reads of old data and so makes tiering pay. And scale decides whether the work is worth doing: 25 dollars a month doesn't justify an engineer, and 24,600 dollars does. Run the arithmetic before the project.

The same idea is older than the cloud. The five minute rule, from Jim Gray and Franco Putzolu in the 1980s, asks whether to keep a page in memory or on disk, and its formula for the interval at which keeping a page in memory pays off is the pages per megabyte of memory divided by the accesses per second per disk, times the price of a disk drive divided by the price per megabyte of memory.

Its original answer, which gives it the name, was to keep in memory the pages used again within about five minutes. Later reviews changed the interval as prices changed, and the Wikipedia article reports figures of about 90 minutes for disk to memory and 15 minutes for flash to memory in a 2007 update.

The method is what lasts: compare the cost of holding the data in the faster tier with the cost of fetching it on access.

## The Tools

### Object storage classes and rules

The Amazon S3 documentation gives the structure of the classes. Standard, infrequent access and the instant retrieval archive class offer millisecond access, with durability designed at 99.999999999 percent.

Availability falls from 99.99 percent for standard to 99.9 percent for infrequent access, and the one zone class is 99.5 percent in a single zone. The coldest classes need a restore first: Glacier Flexible Retrieval is for retrieval in minutes to hours, and Deep Archive for hours.

The charges have conditions that catch people:

- **Minimum storage duration**: 30 days for the infrequent classes, 90 days for the archive classes with flexible or instant retrieval, and 180 days for Deep Archive, with a pro rated charge for deleting or moving an object earlier
- **Minimum billable size**: Objects under 128 KB are billed as 128 KB in the infrequent and instant archive classes, so many tiny objects cost more there than in standard storage
- **Retrieval fees**: A per gigabyte charge on reads, which the arithmetic above depends on
- **Metadata overhead**: The archive classes add 40 KB per object for their bookkeeping

A **lifecycle rule** moves data on a schedule. It has transition actions, which move objects to another class, and expiration actions, which delete them, and it applies to existing objects as well as new ones.

The documentation says there are no data retrieval charges for lifecycle transitions, though there are request charges, and that a bucket policy can't prevent a lifecycle rule from deleting or transitioning an object. A rule such as move to infrequent access after 90 days and to archive after a year is a few lines of configuration.

For data whose pattern isn't known, Intelligent-Tiering decides for you. Objects move to an infrequent tier after 30 days without access and to an instant archive tier after 90, with optional deeper archive tiers that need a restore call.

It has no retrieval fees, charges a small monthly monitoring fee, and doesn't monitor objects under 128 KB. It trades a fee for not having to measure, which is a good deal when the access pattern is unpredictable and a poor one for objects whose pattern is known.

### Databases: partitions and tablespaces

A database table that grows with time is a candidate for partitioning by date. PostgreSQL's declarative partitioning splits a table into ranges, such as a month for each partition, and queries that filter on the date touch the matching partitions and no others, which the planner decides by pruning. The tiering benefits are concrete:

- **Dropping old data is cheap**: The documentation says dropping a partition, or detaching it, is far faster than a bulk delete, and avoids the vacuum overhead of a bulk delete. A detached partition remains a standalone table that can be archived first
- **Old partitions on cheap storage**: A partition can be placed in a tablespace on slower disks, and the documentation lists migrating seldom used data to cheaper and slower media as a use
- **Attaching safely**: Adding a prepared table as a partition needs a matching check constraint beforehand so that the attach doesn't scan under a heavy lock

ClickHouse puts the same idea in a rule. A time to live expression can delete rows, aggregate them, or move them to another volume, for instance hot for the first 2 years, warm to 4 years, and cold after.

The documentation notes that the effect isn't immediate: expired rows are handled during merges, and the related timeouts default to four hours. It also says that dropping whole partitions is much more efficient than deleting rows, so the partition key should match the time to live.

### Caches as the top tier

Memory, flash and disk form a hierarchy, and a cache is its fastest tier, as in [Where to Put a Cache](/system-design/where-to-cache).

The hot set sits in a cache or on a CDN, the warm set in the database, and the cold set in object storage. Moving a record down is a copy and a pointer change, and moving it back up is a read on demand.

## Designing for Cold Data

Tiering shapes the design of the data:

- **Separate hot attributes from cold blobs**: The listing row, a few kilobytes, stays in the database. The photos and the long message history live in object storage with pointers
- **Keep the index hot**: A search needs the metadata of old listings without waking the archive, so keep the small searchable part where it is cheap to read
- **Mark the state**: A listing records that it is archived, and the app knows what to show: a placeholder, a request to restore, or a delay
- **Make the slow path honest**: A restore of minutes or hours needs a user interface for waiting, as in [Running Long Jobs and Workflows](/system-design/long-jobs)
- **Pack small objects**: Under the 128 KB minimum, many small files should be combined into larger archives before they move
- **Deletion must reach the cold tier**: A request for erasure covers archives too, as in [Data Privacy and Compliance](/system-design/privacy)
- **Keep watching the ratio**: Data that was cold can warm up, such as a famous old textbook edition

## A Plan for the Textbook App

| Data | Hot | Cold |
| --- | --- | --- |
| Listing Rows | In the database while active | Moved to an archive table 90 days after the sale |
| Photos | Standard storage with the CDN | Infrequent access after 90 days, archive after a year, if the read ratio is low |
| Messages | Database for 90 days | Object storage, pulled up when a student opens an old chat |
| Event History | Monthly partitions in the warehouse | Detach and archive partitions after 13 months, then delete |
| Logs | Search index for 30 days | Compressed objects for a year, then deleted |

The plan says if the read ratio is low for the photos, since that has to be measured, and the decision for the archive class waits for a month of logs.

The savings are small at this size, so the first priority is the partitioned event table, where dropping a partition replaces a slow delete, and the rest follows as the data grows, along with the cost view of [Balancing Cost and Performance](/system-design/cost-performance).

## Pitfalls

- **Tiering by age without measuring reads**: Old data isn't automatically cold
- **Ignoring retrieval fees**: A busy archive costs more than standard storage
- **Tiny objects in cold classes**: The minimum billable size multiplies the bill
- **Moving data before the minimum duration ends**: An early deletion fee applies
- **No user experience for a slow restore**: A page that hangs for minutes
- **Deleting rows when a partition drop would do**: Hours of vacuum for no gain
- **Forgetting the cold copies**: Erasure and retention rules apply there too

## Key Points

- Tiering uses the skew in access: in our model, 97 percent of the listings were older than 30 days and received between 68 and 90 percent of the reads, depending on how fast data cooled
- The decision is the read ratio, the gigabytes read for each gigabyte stored in a month, and with our prices infrequent access paid below about 1.05 and archive below about 0.63
- In our photo store, 15.6 million origin reads a month made tiering save no money, and 1.56 million made it save 40 percent
- <u>Run the arithmetic before the project</u>: the same 40 percent was 25 dollars a month at 2.7 terabytes and about 24,600 dollars at 1,000 times the size
- Use lifecycle rules, time partitions and time to live rules as the mechanisms, keep the searchable part hot, mark archived state, and plan the slow path and the deletion path
