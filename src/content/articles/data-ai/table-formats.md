> A **table format** such as Delta Lake or Apache Iceberg adds a metadata layer on top of plain files in object storage. The metadata lists exactly which files make up each version of a table, and a commit is a single atomic step that changes that list. That gives transactions, consistent reads, versions and safe schema changes to what would otherwise be a folder of files.

[Organizing Files in a Data Lake](/data-ai/lake-layout) arranged files for fast reads. A plain folder of Parquet files has a deeper problem: it is not a table in any strict sense. This article explains the problem and the standard answer.

## Why a Folder of Files Is Not a Table

The Delta Lake paper (Armbrust and colleagues, VLDB 2020) lists what goes wrong when a table is "just a bunch of files" in a cloud object store:

- **No atomicity across files**: a job that writes ten files can be seen at five. If it fails, the partial files stay
- **Eventual consistency**: a listing may not show a file that was just written, so readers can see some updates and not others
- **Poor performance**: finding the relevant files means listing objects, which is slow at scale
- **No history**: overwriting a file destroys the previous version
- **No safe schema or layout change**: renaming a column or changing the partitioning means rewriting data

Our toy sequence shows the first problem. A writer adds five files to a listings table:

| Step | Reader of a Plain Folder Sees | Reader of a Log-Based Table Sees |
| --- | --- | --- |
| Before the job | 0 new files | 0 new files |
| After file 1 is written | 1 of 5 | 0 of 5, the log doesn't mention it |
| After file 4 | 4 of 5 | 0 of 5 |
| Writer crashes here | 4 of 5, forever | 0 of 5, the orphans are unreferenced and later cleaned up |
| After the commit record is written | not applicable | 5 of 5, all at once |

A half-written table gives a wrong total, and nothing signals it.

## The Metadata Layer

Both major formats keep data in Parquet files and add metadata that says which files belong to the table now.

**Delta Lake** keeps a transaction log in a `_delta_log` folder. Each commit is a numbered JSON file, such as `000003.json`, holding actions like adding or removing data files. The current state of the table is the result of replaying the log. To stop long replays, clients write a **checkpoint**, a Parquet summary of the log so far, every 10 commits by default.

**Apache Iceberg** keeps a tree. A table metadata file records the schema, the partition setup and the list of **snapshots**. Each snapshot points to manifest files, each manifest lists data files with their statistics, and the data files hold the rows. A commit writes new metadata and swaps the table's pointer from the old metadata file to the new one with an atomic swap.

<figure class="diagram">
<div class="flow">
<div class="node">Catalog pointer</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Table metadata</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Snapshot</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Manifests</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Data files</div>
</div>
<figcaption>An Iceberg read starts at the pointer and follows the tree down to files</figcaption>
</figure>

In both, the files are immutable and the commit is the only change that readers observe. Hudi, a third format, makes similar choices with a timeline of commits.

## Commits and Concurrency

Two writers can try to change the table at once. Both formats use **optimistic concurrency**: each writer assumes nobody else interfered, prepares its change, and tries to commit.

In Delta, the commit creates the next log file with a put-if-absent operation, and only one writer can create `000004.json`. In Iceberg, the writer swaps the metadata pointer, and the swap fails if the base version is no longer current. The loser re-reads the new state and retries, or fails if the changes truly conflict.

We simulated two writers racing for 1,000 rounds on a toy log with put-if-absent semantics. There were 2,000 commits, and in each round one writer lost the race and succeeded on retry. Zero writes were lost, and the table had 2,000 versions. The simulation is a toy, with no real storage behind it, and it shows the logic: a lost race costs a retry, never a lost update.

Readers don't block. A reader uses the snapshot that was current when it loaded the metadata, and keeps a consistent view until it refreshes.

## What Versions Give Us

- **Time travel**: querying the table as of an earlier version. In our toy log, version 500 shows 501 of the 2,000 files. This is how we reproduce a training set from last month, and recover from a bad load by rolling back
- **Audit**: the log records who changed what and when
- **Safe compaction**: small files can be rewritten into big ones and swapped in atomically, as [Organizing Files in a Data Lake](/data-ai/lake-layout) recommended
- **Exactly-once streaming writes**: Delta records the stream's progress in the same commit as the data, so a replay doesn't duplicate rows
- **Row-level changes**: updates and deletes create new files plus metadata saying which old files or rows are gone, so a deletion request can be honored, as [Data Governance and Ownership](/data-ai/data-governance) requires

Old files still occupy storage until a cleanup job, often called vacuum or expire snapshots, removes them. Time travel reaches back only as far as that retention allows.

## Schema and Partition Evolution

Iceberg's specification lists evolution as a goal: safe add, drop, reorder and rename of columns, even in nested structures. It tracks columns by an internal ID rather than name or position, so a rename doesn't break old files. 

It also treats partitioning as table configuration and plans reads using predicates on data values, so queries needn't mention partition columns, and the partitioning can change over time. These are the files-level counterpart to the contract rules of [Data Contracts and Schema Changes](/data-ai/data-contracts).

## Choosing

Delta Lake, Iceberg and Hudi are all open source and overlap. The practical questions are which engines you use, which catalog manages the tables and what your cloud offers. Interoperability layers keep narrowing the gap. The key idea is the same: files plus an atomic metadata commit.

## Key Points

- A plain folder of files has no atomic commit, so readers can see partial writes and failed jobs leave debris
- Table formats add metadata that lists the files of each table version: a transaction log in Delta Lake, and a snapshot and manifest tree in Iceberg
- Commits are optimistic: one writer wins the atomic step and the others retry, and our toy race lost no updates over 2,000 commits
- Versions give time travel, audit, safe compaction and row-level deletes, until old files are cleaned up
- <u>Treat the metadata layer as the table, and give it a catalog and a cleanup policy</u>
