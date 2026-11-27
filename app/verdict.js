// verdict.js — one job: turn a deal's prices and evidence into an honest verdict.
//
// A verdict is only as good as its evidence, so every verdict carries a short
// note naming what backs it: a lowest-ever price, a deep cut against the
// usual price, or a price the product hits often.

export const VERDICT_ORDER = ['new-low', 'strong', 'good', 'routine'];

export const VERDICT_LABELS = {
  'new-low': 'New low',
  'strong': 'Strong deal',
  'good': 'Good deal',
  'routine': 'Routine sale',
};

/** Discount percent from the two prices, rounded to a whole number. */
export function discountPercent(deal) {
  if (!deal.usual || deal.usual <= 0) return 0;
  return Math.round((1 - deal.sale / deal.usual) * 100);
}

/** Dollars saved, rounded to cents. */
export function dollarsSaved(deal) {
  return Math.round((deal.usual - deal.sale) * 100) / 100;
}

/**
 * Rank a verdict for sorting: a new low beats a strong deal, and so on.
 * Ties inside one verdict fall back to the bigger discount.
 */
export function verdictRank(deal) {
  const at = VERDICT_ORDER.indexOf(deal.verdict);
  return at === -1 ? VERDICT_ORDER.length : at;
}

/** Money formatting, always US dollars with cents where they matter. */
export function money(amount) {
  return '$' + amount.toFixed(2).replace(/\.00$/, '');
}
