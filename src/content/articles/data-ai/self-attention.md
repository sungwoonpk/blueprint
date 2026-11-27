> **Self-attention** lets every item in a sequence look at every other item in the same sequence and build a new representation as a weighted mix of them. Each item gets a query, a key and a value. The scores are dot products, scaled by the square root of the key size, and a mask can stop items from seeing the future.

[Attention](/data-ai/attention) let a decoder look at an encoder. Self-attention points the same idea at one sequence, so "it" can look back to find what "it" refers to.

## Query, Key, Value

From each item's vector x, three learned matrices make:

- a **query** q: what am I looking for?
- a **key** k: what do I offer to be matched?
- a **value** v: what do I pass on if matched?

For each item, compare its query with every key by dot product, divide by √d for key size d, apply a softmax, and take the weighted sum of values. In matrix form: softmax(QKᵀ / √d) V.

## By Hand

Three items with 2 numbers each, and for simplicity q = k = v = x: x₁ = (1, 0), x₂ = (0, 1), x₃ = (1, 1). The dot products form this table:

| Query | Score With x₁ | With x₂ | With x₃ |
| --- | --- | --- | --- |
| x₁ | 1 | 0 | 1 |
| x₂ | 0 | 1 | 1 |
| x₃ | 1 | 1 | 2 |

Divide by √2 and apply a softmax to each row:

| Item | Weight on x₁ | x₂ | x₃ | New Vector |
| --- | --- | --- | --- | --- |
| x₁ | 0.401 | 0.198 | 0.401 | (0.802, 0.599) |
| x₂ | 0.198 | 0.401 | 0.401 | (0.599, 0.802) |
| x₃ | 0.248 | 0.248 | 0.503 | (0.752, 0.752) |

Each item is now a blend, and items that look alike weigh each other more.

## Why Divide by √d

A dot product of two random vectors of size d with unit-variance entries has a spread of √d. Large scores make the softmax nearly one-hot, which leaves almost no gradient. We measured, with random queries and keys against 10 candidates:

| Key Size d | Spread of Raw Scores | Largest Weight, Raw | Largest Weight, Scaled |
| --- | --- | --- | --- |
| 4 | 2.0 | 0.50 | 0.30 |
| 64 | 7.9 | 0.86 | 0.32 |
| 1,024 | 32.0 | 0.97 | 0.32 |

Unscaled, the largest weight at size 1,024 takes 97 percent and the softmax's slope falls to about a tenth of the scaled value. Scaling keeps the weights spread at any size. The authors of the Transformer paper give this reason.

## Masking the Future

A model that predicts the next word must not look at it. A **causal mask** sets the scores of later positions to minus infinity before the softmax. With the same three items:

| Item | x₁ | x₂ | x₃ |
| --- | --- | --- | --- |
| x₁ | 1.000 | 0 | 0 |
| x₂ | 0.330 | 0.670 | 0 |
| x₃ | 0.248 | 0.248 | 0.503 |

Every item sees only itself and what came before. **Padding masks** hide filler positions the same way.

## Order and Cost

Self-attention treats its input as a set: swap two items and the outputs swap too, with no other change. Order has to be added, as [Multi-Head Attention and Positional Encoding](/data-ai/multi-head-positional) shows.

All items are processed in parallel, with no step-by-step loop as in a recurrent network. The price is that every item is compared with every other: cost grows with the **square** of the length. A sequence of 1,000 items has a million scores per head.

## Key Points

- Self-attention builds each item's new vector as a weighted sum of values, with weights from query-key dot products
- Dividing by √d keeps the softmax from saturating: unscaled, the top weight at size 1,024 was 0.97
- A causal mask stops a position from seeing later ones
- It runs in parallel, but cost grows with the square of the length, and it ignores order by itself
- <u>Trace the shapes: scores are a length by length table, one per head</u>
