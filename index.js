// @local/stats-cost host half: declares this plugin's unit-price settings.
// The three fields are volatile: the plugin manager can edit them at runtime
// without restarting the plugin, and the browser half observes the settings
// document through the shared settings service (configForms).
import z from '@deepseek-ai/schemastery';

/** A unit price per million tokens: a non-negative number, or unset. */
const priceUnit = () => z.union([z.number().min(0), z.never()]).volatile();

export const Config = z.object({
  /** Uncached input tokens, ¥ per million. */
  priceInput: priceUnit(),
  /** Cached input (read) tokens, ¥ per million. */
  priceCache: priceUnit(),
  /** Output tokens, ¥ per million. */
  priceOutput: priceUnit()
});

export function apply(ctx, config) {}