> A few numbers are worth knowing by heart: how long common operations take, how big common things are, and how a daily count turns into a rate. They let you judge a design in your head before building anything.

In [The Life of a Request](/system-design/life-of-a-request), 300 ms went mostly to waiting on distance, and in [Latency and Throughput](/system-design/latency-throughput) the speed of one request was the number to watch. Both rested on numbers like the ones here. The next topic, [Estimating Capacity](/system-design/estimation), uses them to size a system.

One warning first. Hardware keeps changing, so exact figures go stale. What lasts is the **order of magnitude**: whether something takes nanoseconds, microseconds or milliseconds, and how many times slower one thing is than another. Treat each number below as "about", and measure before you rely on one.

## A Scale You Can Feel

Computer times are hard to feel because they are so small. So stretch them: if reading a value from the CPU's closest cache took 1 second, here is how long everything else would take:

| Operation | Real Time | If 1 ns Were 1 Second |
| --- | --- | --- |
| Read from the CPU cache | 1 ns | 1 second |
| Read from main memory | 100 ns | About 2 minutes |
| Read from an SSD | 100 µs | About 1 day |
| Round trip inside a data center | 0.5 ms | About 6 days |
| Seek on a spinning disk | 10 ms | About 4 months |
| Round trip between continents | 150 ms | About 5 years |

Each row is much slower than the one above it. So the first rule of speed is to avoid going far: memory beats an SSD by a factor of a thousand, and anything that crosses a network is slower than anything that doesn't. The original table of numbers like these goes back to Jeff Dean at Google. Faster drives and networks have since shifted some rows, SSDs in particular, but the gaps between rows have changed far less than the numbers themselves.

## Distance Costs Time

The last row has a hard floor, because nothing is faster than light. In an optical fiber, light travels at about two thirds of its speed in empty space. For New York to London, that makes a round trip of about 56 ms at the very best, and real routes measure a little over that, around 60 to 70 ms. Engineering can't beat it, which is why a [CDN](/system-design/cdn) puts copies near users instead.

It also turns a harmless looking habit into a problem. Suppose a page needs ten calls to another service, one after the other:

| The Other Service is | One Call | Ten in a Row |
| --- | --- | --- |
| In the same program | About 100 ns | About 1 µs |
| In the same data center | About 0.5 ms | About 5 ms |
| On another continent | About 150 ms | About 1.5 seconds |

Ten calls cost almost nothing in memory and are noticeable in a data center, and they take far too long across an ocean. That is why calls that cross regions are batched or avoided, and why [Global Traffic Routing](/system-design/global-routing) keeps users close to their data.

## Sizes

Storage sizes step up by about a thousand each time, and it helps to attach each step to something you know:

| Unit | About | A Feel for It |
| --- | --- | --- |
| 1 KB | A thousand bytes | A short message or a small database record |
| 1 MB | A million bytes | A small compressed photo |
| 1 GB | A billion bytes | About a thousand small photos |
| 1 TB | A trillion bytes | About a million small photos |

A compressed photo runs from a couple hundred KB to a few MB, depending on its size, and a minute of HD video runs to tens of MB, which is why photos and video, not text, drive storage costs. Strictly, 1 KB is 1,000 bytes, and the binary version is 1,024. For estimates the difference doesn't matter.

## From a Daily Count to a Rate

A day has 86,400 seconds, which is close enough to 100,000 for the arithmetic. That gives a shortcut for turning a count per day into a rate per second:

- A million requests a day is about 12 per second
- 100 million a day is about 1,200 per second
- A billion a day is about 12,000 per second

Traffic isn't flat, so the peak runs well above these averages, often several times higher. The rate is where an estimate starts.

## What One Machine Can Do

A few more figures give a sense of what a single machine handles, though they vary with the machine:

- **Memory**: tens to hundreds of GB on an ordinary server, and terabytes on the largest cloud machines
- **A cache like Redis**: tens of thousands to hundreds of thousands of simple operations per second on one instance
- **A 10 Gbit/s network link**: about 1.25 GB per second at the very most, before overhead

## Using the Numbers

Three habits make them useful:

1. **Round hard**: use powers of ten, so 86,400 becomes 100,000, and check only that the answer is about the right size
2. **Ask where the data lives**: memory, disk or another machine, and use the scale above to see which one dominates
3. **Measure what matters**: the numbers tell you where to look, and a test tells you what is true on your hardware

## Key Points

- What lasts is the order of magnitude, since exact numbers change with hardware
- Memory is about a thousand times faster than an SSD read, and a network round trip is slower still
- <u>Distance has a physical floor</u>: New York to London takes at least 56 ms round trip
- Ten calls in a row add up to about 1.5 seconds across an ocean, and to microseconds in memory
- A million requests a day is about 12 a second, and the peak runs several times higher
