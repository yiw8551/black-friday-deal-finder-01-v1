// finder.js — one job: render the deals and wire up search, filters and sorting.
//
// The page loads with every deal shown, best verdict first. Every control
// re-renders the same grid from the same data, so what the screenshots show
// is what the code actually does.

import { DEALS } from './data.js';
import { VERDICT_LABELS, discountPercent, dollarsSaved, money, verdictRank } from './verdict.js';

const grid = document.getElementById('deal-grid');
const topPicks = document.getElementById('top-picks');
const emptyState = document.getElementById('empty-state');
const resultCount = document.getElementById('result-count');
const activeFilters = document.getElementById('active-filters');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const storeSelect = document.getElementById('store-filter');
const discountSelect = document.getElementById('discount-filter');
const verdictSelect = document.getElementById('verdict-filter');
const chipGroup = document.getElementById('category-chips');

const CATEGORIES = [...new Set(DEALS.map((d) => d.category))].sort();
const STORES = [...new Set(DEALS.map((d) => d.store))].sort();

let activeCategory = '';

/** Build the category chips and the store list from the deals themselves. */
export function buildControls() {
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'chip';
  all.textContent = 'All categories';
  all.setAttribute('aria-pressed', 'true');
  all.addEventListener('click', () => setCategory('', all));
  chipGroup.appendChild(all);

  for (const category of CATEGORIES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = category;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => setCategory(category, chip));
    chipGroup.appendChild(chip);
  }

  for (const store of STORES) {
    const option = document.createElement('option');
    option.value = store;
    option.textContent = store;
    storeSelect.appendChild(option);
  }
}

function setCategory(category, chip) {
  activeCategory = category;
  for (const button of chipGroup.querySelectorAll('.chip')) {
    button.setAttribute('aria-pressed', button === chip ? 'true' : 'false');
  }
  renderDeals();
}

/** Deals matching every active control, in the chosen order. */
export function visibleDeals() {
  const query = searchInput.value.trim().toLowerCase();
  const store = storeSelect.value;
  const minDiscount = Number(discountSelect.value);
  const verdict = verdictSelect.value;

  const matched = DEALS.filter((deal) => {
    if (activeCategory && deal.category !== activeCategory) return false;
    if (store && deal.store !== store) return false;
    if (discountPercent(deal) < minDiscount) return false;
    if (verdict && deal.verdict !== verdict) return false;
    if (query) {
      const haystack = [deal.product, deal.store, deal.category, deal.note].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const sort = sortSelect.value;
  matched.sort((a, b) => {
    if (sort === 'discount') return discountPercent(b) - discountPercent(a);
    if (sort === 'price-asc') return a.sale - b.sale;
    if (sort === 'price-desc') return b.sale - a.sale;
    if (sort === 'name') return a.product.localeCompare(b.product);
    const byVerdict = verdictRank(a) - verdictRank(b);
    return byVerdict !== 0 ? byVerdict : discountPercent(b) - discountPercent(a);
  });
  return matched;
}

function dealCard(deal) {
  const card = document.createElement('article');
  card.className = 'deal';

  const top = document.createElement('div');
  top.className = 'deal-top';
  const category = document.createElement('span');
  category.className = 'category';
  category.textContent = deal.category;
  const pill = document.createElement('span');
  pill.className = 'discount-pill';
  pill.textContent = '−' + discountPercent(deal) + '%';
  top.append(category, pill);

  const title = document.createElement('h3');
  title.textContent = deal.product;
  const store = document.createElement('p');
  store.className = 'store';
  store.textContent = deal.store;

  const prices = document.createElement('p');
  prices.className = 'prices';
  const sale = document.createElement('span');
  sale.className = 'sale';
  sale.textContent = money(deal.sale);
  const usual = document.createElement('span');
  usual.className = 'usual';
  usual.textContent = money(deal.usual);
  const save = document.createElement('span');
  save.className = 'save';
  save.textContent = 'Save ' + money(dollarsSaved(deal));
  prices.append(sale, usual, save);

  const badge = document.createElement('span');
  badge.className = 'badge badge-' + deal.verdict;
  badge.textContent = VERDICT_LABELS[deal.verdict] || deal.verdict;

  const note = document.createElement('p');
  note.className = 'verdict-note';
  note.textContent = deal.note;

  const foot = document.createElement('div');
  foot.className = 'deal-foot';
  if (deal.alsoAt) {
    const also = document.createElement('p');
    also.className = 'also-at';
    also.textContent = 'Also at ' + deal.alsoAt.store + ' for ' + money(deal.alsoAt.price) + '.';
    foot.appendChild(also);
  }
  const check = document.createElement('p');
  check.className = 'check-line';
  check.textContent = 'Checked ' + deal.checked + ' · Price read at ' + deal.source + '.';
  const link = document.createElement('a');
  link.className = 'store-link';
  link.href = deal.link;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'View at ' + deal.store + ' →';
  foot.append(check, link);
  if (deal.code) {
    const promo = document.createElement('p');
    promo.className = 'promo';
    promo.textContent = 'Code at checkout: ';
    const code = document.createElement('code');
    code.textContent = deal.code;
    promo.appendChild(code);
    foot.appendChild(promo);
  }

  card.append(top, title, store, prices, badge, note, foot);
  return card;
}

/** The three strongest deals, as a short ranked list above the grid. */
export function renderTopPicks() {
  const best = [...DEALS].sort((a, b) => {
    const byVerdict = verdictRank(a) - verdictRank(b);
    return byVerdict !== 0 ? byVerdict : discountPercent(b) - discountPercent(a);
  }).slice(0, 3);
  topPicks.replaceChildren();
  best.forEach((deal, index) => {
    const item = document.createElement('li');
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = '#' + (index + 1) + ' pick · ' + (VERDICT_LABELS[deal.verdict] || deal.verdict);
    const name = document.createElement('span');
    name.className = 'pick-name';
    name.textContent = deal.product;
    const price = document.createElement('span');
    price.className = 'pick-price';
    const sale = document.createElement('b');
    sale.textContent = money(deal.sale);
    price.append(sale, document.createTextNode(' (was ' + money(deal.usual) + ', −' + discountPercent(deal) + '%)'));
    const store = document.createElement('span');
    store.className = 'pick-store';
    store.textContent = deal.store;
    item.append(rank, name, price, store);
    topPicks.appendChild(item);
  });
}

/** Re-render the grid from the current controls. */
export function renderDeals() {
  const shown = visibleDeals();
  grid.replaceChildren(...shown.map(dealCard));
  emptyState.hidden = shown.length > 0;
  resultCount.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = shown.length + ' of ' + DEALS.length + ' deals';
  resultCount.appendChild(strong);
  const bits = [];
  if (activeCategory) bits.push('in ' + activeCategory);
  if (storeSelect.value) bits.push('at ' + storeSelect.value);
  if (Number(discountSelect.value) > 0) bits.push(discountSelect.value + '% off or more');
  if (verdictSelect.value) bits.push('verdict: ' + (VERDICT_LABELS[verdictSelect.value] || verdictSelect.value));
  if (searchInput.value.trim()) bits.push('matching “' + searchInput.value.trim() + '”');
  activeFilters.textContent = bits.length ? ' — ' + bits.join(', ') : '';
}

for (const control of [searchInput, sortSelect, storeSelect, discountSelect, verdictSelect]) {
  control.addEventListener('input', renderDeals);
  control.addEventListener('change', renderDeals);
}

buildControls();
renderTopPicks();
renderDeals();
