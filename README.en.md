# @minibear/dsh-stats-cost

Conversation cost statistics for DeepSeek Harness. Enter your model prices and see what your conversation costs in real time — the total for the whole conversation in the status bar under the composer, and each turn's cost in a chip at the end of that reply.

其他语言 / Other languages: [中文](./README.md)

## What it does

- The status bar under the composer shows the **total cost of the whole conversation**.
- The end of each reply shows a chip with **what that turn cost**.
- Values update live while you work — no restart, no page reload.
- Until prices are set (or for a part of the usage that has no price), the cost shows as `—`.
- The interface follows the Harness language (8 locales: zh, en, ja, de, es, fr, pt, ru).

## Requirements

- A DeepSeek Harness (dsh) build with the built-in plugin manager (Cordis bundle support).
- The one runtime dependency, `@deepseek-ai/schemastery` (~3.19.0), is installed from npm automatically.

## Install

Recommended: in DeepSeek Harness, open **Plugins** (the plugin manager) → install a bundle from npm, and enter

```
@minibear/dsh-stats-cost
```

Then open the bundle's detail page to configure prices.

## Configure

On the plugin's detail page, the **Model prices** section has three fields. All prices are **per 1,000,000 tokens**:

| Field | Meaning |
| --- | --- |
| Input (uncached) | Price of new input tokens |
| Cache read | Price of tokens read from the prompt cache |
| Output | Price of generated tokens |

- Tokens **written** to the prompt cache are billed at the *input (uncached)* price.
- Leaving a field empty excludes that part from the total; only priced parts are summed.
- Saving writes the values to the host's plugin configuration; the status bar and the turn chips update immediately.

## Cost model

```
cost = ( (uncached input + cache write) × input price
      +  cache read × cache read price
      +  output × output price ) ÷ 1,000,000
```

## Package contents

| File | Role |
| --- | --- |
| `index.js` | Host half: declares the three hot-updatable price settings |
| `client.js` | Client half: status-bar pill, per-turn chip, price form in the plugin manager |
| `cordis.patch.yml` | Bundle patch wiring the host and client halves together |
| `locale/*.json` | UI strings, 8 languages |
| `icon.svg` | Bundle icon shown in the plugin manager |