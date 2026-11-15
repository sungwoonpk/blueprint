System design is deciding how a piece of software is put together. Which parts it has, what each part does, how the parts talk to each other, and where the data lives.

Writing code answers "how do I make this feature work?" System design asks a bigger question: "how does the whole thing keep working once real people use it?"

## A small example

Say we're building a site where people share recipes. You can sign up, post a recipe with a photo, and browse what others posted.

A first design could look like this:

<figure class="diagram">
<div class="flow">
<div class="node">Browser or app</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Web server</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Database<small>users, recipes</small></div>
<div class="node">File storage<small>photos</small></div>
</div>
</div>
<figcaption>A first design for the recipe site</figcaption>
</figure>

- **Browser or app** is what the user touches.
- **Web server** runs our code. It checks who you are, saves new recipes and sends pages back.
- **Database** keeps users and recipes, so nothing is lost when the server restarts.
- **File storage** holds the photos. Images are big, so they live apart from the rest of the data.

That's already a system design. It's small, but each part is there for a reason.

## Same features, different systems

Now ask one more question: how many people will use it?

|  | Cooking club | Popular app |
| --- | --- | --- |
| Users | 50 | 5 million |
| Recipe views per second | less than 1 | thousands |
| Site down for an hour | a few annoyed friends | lost users and lost money |
| Design | one server is enough | many servers, copies of the data, a cache, photos served from near the user |

The features are the same. The numbers, and what a failure costs, are what change the design. How one server grows into many is the next topic, [From One Server to Many](/system-design/one-server-to-many).

## What a good design aims for

First, the system has to do its job. Past that, designs are judged on a few qualities:

- **Scalability**: it keeps up as users and data grow.
- **Availability**: it's up when people need it.
- **Reliability**: it gives correct results, even when a disk or a server fails.
- **Performance**: it answers fast.
- **Maintainability**: engineers can understand it and change it safely.
- **Cost**: it doesn't spend more than the problem is worth.
- **Security**: only the right people can see or change the data.

You can't max out all of them at once. Keeping three copies of the data makes the site much harder to take down, but it costs three times the storage and the copies have to be kept in sync. Picking what to give up is a big part of the job. More on that in [Thinking in Tradeoffs](/system-design/trade-offs).

## Big picture first, details later

Design happens at two levels.

|  | High level | Low level |
| --- | --- | --- |
| Looks at | the whole system | one part of it |
| Decides | which parts exist and how they connect | classes, functions, data structures |
| Example | photos go to file storage, not the database | how the upload code resizes a photo |

This roadmap is about the high level: the parts, how they connect, and why.

## How a design comes together

Most engineers go through roughly the same steps:

1. **Ask what it must do.** The features, and how fast, how big and how dependable it has to be.
2. **Estimate the size.** Rough numbers for users, requests per second and storage.
3. **Sketch the main parts.** Boxes for servers, databases and storage. Arrows for how data moves.
4. **Dig into the hard parts.** Find where it will break first and deal with that.
5. **Revisit.** Real traffic shows what you got wrong, and the design changes as the product grows.

Step 1 matters most. Two teams can both build "a chat app" and end up with very different systems, because one has 100 users and the other has 100 million.

## Why learn it

- **Your own code gets better.** A slow query or a missing timeout is easier to spot when you know what your code talks to.
- **It's how teams plan big changes.** Design docs and design reviews use these same ideas and words.
- **Interviews ask for it.** Many companies have a system design round, and it often sets the level you're hired at.

## Key points

- System design decides the parts of a system, how they talk and where the data lives.
- The same features can need very different systems. Scale and the cost of failure decide.
- Every choice gives up something. There is rarely one right answer, only one that fits the needs.
- Start simple, and add parts only when the numbers say you need them.
