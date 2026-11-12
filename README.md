# @minibear/dsh-stats-cost

Conversation cost statistics for DeepSeek Harness. A plugin that shows what your conversation is costing, per turn and in total.

## What it does

Once you enter your model prices:

- The status bar under the composer shows the **total cost of the whole conversation**.
- The end of each reply shows a chip with **what that turn cost**.
- Values update live while you work — no restart, no page reload.
- Until prices are set (or for a part of the usage that has no price), the cost shows as `—`.

The interface follows the Harness language (8 locales: zh, en, ja, de, es, fr, pt, ru).

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

On the plugin's detail page, the **Model prices** section has three fields. All prices are **per 1,000,000 tokens** of the model you use:

| Field | Meaning |
| --- | --- |
| Input (uncached) | Price of new input tokens |
| Cache read | Price of tokens read from the prompt cache |
| Output | Price of generated tokens |

Notes:

- Tokens **written** to the prompt cache are billed at the *input (uncached)* price.
- Leaving a field empty disables that part of the total; the plugin sums only the priced parts.
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
| `index.js` | Host half: declares the three volatile price settings |
| `client.js` | Client half: status-bar pill, per-turn chip, price form in the plugin manager |
| `cordis.patch.yml` | Bundle patch that wires the host and client halves together |
| `locale/*.json` | UI strings, 8 languages |
| `icon.svg` | Bundle icon shown in the plugin manager |

---

# 中文说明

DeepSeek Harness 的对话成本统计插件：设置模型单价后，输入框下方的状态栏显示整段对话的总花费，每轮回复末尾显示该轮花费。

**安装**：在插件管理器中从 npm 安装 bundle，填入 `@minibear/dsh-stats-cost`。

**配置**：打开插件详情页，在「模型单价」一栏填写单价（均按每 100 万 token 计）：

| 字段 | 含义 |
| --- | --- |
| 输入（未缓存） | 新输入 token 的单价 |
| 缓存读取 | 从提示缓存读取的 token 单价 |
| 输出 | 生成 token 的单价 |

- 写入缓存的 token 按「输入（未缓存）」单价计费。
- 留空的字段不参与合计；保存后状态栏与每轮标签立即更新，无需重启。
- 未设置单价时显示 `—`。

**计费公式**：

```
费用 = ( (未缓存输入 + 缓存写入) × 输入单价
      +  缓存读取 × 缓存单价
      +  输出 × 输出单价 ) ÷ 1000000
```