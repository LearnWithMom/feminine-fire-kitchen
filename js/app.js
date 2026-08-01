/* Feminine Fire Kitchen — planner, vault, and grocery logic */

let recipes = [];
let groceries = {};
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

let favorites = new Set(JSON.parse(localStorage.getItem('ff2-favorites') || '[]'));
let plan = JSON.parse(localStorage.getItem('ff2-plan') || '{}');
let current = null;
let favOnly = false;
let pickerDay = null;

const recipeModal = $('#modal');
const pickerModal = $('#picker');

const PREF_IDS = {
  prefFridayFlex: 'fridayFlex',
  prefAlternateWeekdays: 'alternateWeekdays',
  prefCrockpot: 'crockpot',
  prefBreakfast: 'breakfast',
  prefSeafood: 'seafood',
  prefSundayComfort: 'sundayComfort',
  prefFreeze: 'freezer',
  prefNoBackToBackBeef: 'noBackToBackBeef'
};

/* ---------- helpers ---------- */

function save() {
  localStorage.setItem('ff2-plan', JSON.stringify(plan));
  localStorage.setItem('ff2-favorites', JSON.stringify([...favorites]));
}

function toast(t) {
  const el = $('#toast');
  el.textContent = t;
  el.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove('show'), 1800);
}

function recipeById(id) {
  return recipes.find(r => r.day === id) || null;
}

function planDays() {
  return Number($('#monthSelect').value);
}

function linkedLeftoverDay(day, recipeName) {
  const next = plan[day + 1];
  return next && next.type === 'leftover' && next.name === recipeName ? day + 1 : null;
}

/* Drop saved days that point at a recipe that no longer exists, so one stale
   entry from an older recipes.json can't corrupt the plan. */
function prunePlan() {
  Object.keys(plan).forEach(d => {
    const entry = plan[d];
    if (!entry || !entry.type) { delete plan[d]; return; }
    if (entry.type === 'cook' && !recipeById(entry.recipeId)) delete plan[d];
  });
}

/* ---------- planner ---------- */

function emptyDayMarkup(d) {
  return `<article class="plan-day empty"><div class="date">Day ${d}</div><p>Open night</p><button class="small swap" onclick="pickForDay(${d})">Add meal</button></article>`;
}

function renderPlanner() {
  const days = planDays();
  let cook = 0, left = 0, crock = 0, open = 0;
  let html = '';

  for (let d = 1; d <= days; d++) {
    const x = plan[d];

    if (!x) {
      open++;
      html += emptyDayMarkup(d);
      continue;
    }

    if (x.type === 'leftover') {
      left++;
      html += `<article class="plan-day leftover"><button class="small remove" onclick="removeDay(${d})" aria-label="Remove leftovers on day ${d}">×</button><div class="date">Day ${d} · Leftovers</div><h3>${x.name}</h3><p>Heat, plate, done.</p></article>`;
      continue;
    }

    if (x.type === 'flex') {
      open++;
      html += `<article class="plan-day flex"><button class="small remove" onclick="removeDay(${d})" aria-label="Remove flex night on day ${d}">×</button><div class="date">Day ${d}</div><h3>Flex night</h3><p>Freezer, takeout, event, or whatever life is doing.</p><button class="small swap" onclick="pickForDay(${d})">Add meal instead</button></article>`;
      continue;
    }

    const r = recipeById(x.recipeId);
    if (!r) {
      delete plan[d];
      open++;
      html += emptyDayMarkup(d);
      continue;
    }

    cook++;
    if (r.method === 'Crockpot') crock++;
    html += `<article class="plan-day">
      <button class="small remove" onclick="removeDay(${d})" aria-label="Remove ${r.name}">×</button>
      <div class="date">Day ${d} · Cook</div>
      <h3>${r.name}</h3>
      <p>${r.yield} · ${r.method}</p>
      <div class="day-actions">
        <button class="small swap" onclick="openRecipe(${r.day})">Recipe</button>
        <button class="small replace-one" onclick="replaceMeal(${d})">Replace meal</button>
      </div>
    </article>`;
  }

  $('#plannerGrid').innerHTML = html;
  $('#cookCount').textContent = cook;
  $('#leftoverCount').textContent = left;
  $('#crockCount').textContent = crock;
  $('#openCount').textContent = open;
  save();
}

function nextOpenDay() {
  for (let d = 1; d <= planDays(); d++) if (!plan[d]) return d;
  return null;
}

function addToPlan(recipeId, forcedDay = null, askLeftover = true) {
  const r = recipeById(recipeId);
  if (!r) { toast('That recipe is no longer in the vault.'); return; }

  const d = forcedDay || nextOpenDay();
  if (!d) { toast('Your plan is full.'); return; }

  plan[d] = { type: 'cook', recipeId };

  const canHoldLeftovers = d < planDays() && !plan[d + 1];
  if (canHoldLeftovers && askLeftover && confirm('Use Day ' + (d + 1) + ' for leftovers from ' + r.name + '?')) {
    plan[d + 1] = { type: 'leftover', name: r.name };
  }

  renderPlanner();
  toast(r.name + ' added to Day ' + d);
}

function removeDay(day) {
  const item = plan[day];

  if (item && item.type === 'cook') {
    const recipe = recipeById(item.recipeId);
    const leftoverDay = recipe ? linkedLeftoverDay(day, recipe.name) : null;
    delete plan[day];
    if (leftoverDay) delete plan[leftoverDay];
    renderPlanner();
    toast(leftoverDay ? 'Meal and its leftover day removed.' : 'Meal removed.');
    return;
  }

  delete plan[day];
  renderPlanner();
}

function clearPlan() {
  if (confirm('Clear the entire plan?')) {
    plan = {};
    $('#selectedGroceries').innerHTML = '';
    renderPlanner();
    toast('Plan cleared.');
  }
}

/* ---------- replace a single meal ---------- */

function replacementPool(day, currentRecipe) {
  const usedIds = new Set(
    Object.values(plan).filter(x => x && x.type === 'cook').map(x => x.recipeId)
  );

  const proteinAt = d => {
    const entry = plan[d];
    if (!entry || entry.type !== 'cook') return null;
    const r = recipeById(entry.recipeId);
    return r ? r.protein : null;
  };

  let previousProtein = null;
  for (let d = day - 1; d >= 1; d--) { const p = proteinAt(d); if (p) { previousProtein = p; break; } }

  let nextProtein = null;
  for (let d = day + 1; d <= planDays(); d++) { const p = proteinAt(d); if (p) { nextProtein = p; break; } }

  const currentId = currentRecipe ? currentRecipe.day : null;

  let pool = planningPool().filter(r =>
    r.day !== currentId &&
    !usedIds.has(r.day) &&
    !(r.protein === 'Beef' && (previousProtein === 'Beef' || nextProtein === 'Beef'))
  );
  if (!pool.length) pool = planningPool().filter(r => r.day !== currentId && !usedIds.has(r.day));
  if (!pool.length) pool = planningPool().filter(r => r.day !== currentId);

  return shuffle(pool);
}

function replaceMeal(day) {
  if (!recipes.length) { toast('Recipes are still loading. Try again in a moment.'); return; }

  const currentItem = plan[day];
  const currentRecipe = currentItem && currentItem.type === 'cook' ? recipeById(currentItem.recipeId) : null;
  const pool = replacementPool(day, currentRecipe);
  if (!pool.length) { toast('No replacement recipes are available.'); return; }

  const replacement = pool[0];
  const leftoverDay = currentRecipe ? linkedLeftoverDay(day, currentRecipe.name) : null;
  plan[day] = { type: 'cook', recipeId: replacement.day };

  if (leftoverDay) {
    plan[leftoverDay] = { type: 'leftover', name: replacement.name };
  } else if (
    day < planDays() &&
    !plan[day + 1] &&
    confirm('Use Day ' + (day + 1) + ' for leftovers from ' + replacement.name + '?')
  ) {
    plan[day + 1] = { type: 'leftover', name: replacement.name };
  }

  renderPlanner();
  toast(`${replacement.name} replaced that meal.`);
}

/* ---------- day picker ---------- */

function lastCookedNameBefore(day) {
  for (let d = day - 1; d >= 1; d--) {
    if (plan[d] && plan[d].type === 'cook') {
      const r = recipeById(plan[d].recipeId);
      if (r) return r.name;
    }
  }
  return null;
}

function pickForDay(day) {
  if (!recipes.length) { toast('Recipes are still loading. Try again in a moment.'); return; }
  pickerDay = day;
  $('#pickerTitle').textContent = 'Day ' + day;
  $('#pickerSearch').value = '';
  renderPickerList();
  pickerModal.showModal();
  $('#pickerSearch').focus();
}

function renderPickerList() {
  const q = $('#pickerSearch').value.trim().toLowerCase();
  const matches = recipes.filter(r =>
    !q || [r.name, r.method, r.protein, r.mood, r.tag, r.yield].join(' ').toLowerCase().includes(q)
  );

  $('#pickerList').innerHTML = matches.length
    ? matches.map(r => `<button type="button" class="picker-item" onclick="choosePicked(${r.day})"><span><strong>${r.emoji} ${r.name}</strong><small>${r.method} · ${r.time} min · ${r.yield}</small></span></button>`).join('')
    : '<p class="picker-empty">No recipe matches that. Try an ingredient, a method, or a shorter word.</p>';
}

function choosePicked(id) {
  const day = pickerDay;
  pickerModal.close();
  if (day) addToPlan(id, day, true);
}

function setDayType(kind) {
  if (!pickerDay) return;
  if (kind === 'flex') {
    plan[pickerDay] = { type: 'flex' };
  } else {
    plan[pickerDay] = { type: 'leftover', name: lastCookedNameBefore(pickerDay) || 'Leftovers from earlier this week' };
  }
  pickerModal.close();
  renderPlanner();
  toast('Day ' + pickerDay + ' updated.');
}

/* ---------- preferences ---------- */

/* Reads the checkbox states into the object the planner expects. This function
   and savePreferences() were called in several places but never written, which
   is why "Create another balanced month" produced no calendar at all. */
function plannerPreferences() {
  const prefs = {};
  Object.entries(PREF_IDS).forEach(([id, key]) => {
    const el = $('#' + id);
    prefs[key] = el ? el.checked : true;
  });
  return prefs;
}

function savePreferences() {
  localStorage.setItem('ff2-preferences', JSON.stringify(plannerPreferences()));
}

function loadPreferences() {
  const saved = JSON.parse(localStorage.getItem('ff2-preferences') || 'null');
  if (!saved) return;
  Object.entries(PREF_IDS).forEach(([id, key]) => {
    const el = $('#' + id);
    if (el && typeof saved[key] === 'boolean') el.checked = saved[key];
  });
}

function togglePreferences(event) {
  if (event) event.stopPropagation();
  const body = $('#preferencesBody');
  const button = $('.preferences-toggle');
  const summary = $('.preferences-summary');
  const hidden = body.classList.toggle('hidden');
  button.textContent = hidden ? 'Show' : 'Hide';
  button.setAttribute('aria-label', hidden ? 'Show planner preferences' : 'Hide planner preferences');
  summary.setAttribute('aria-expanded', String(!hidden));
}

function resetPreferences(event) {
  if (event) event.stopPropagation();
  Object.keys(PREF_IDS).forEach(id => {
    const el = $('#' + id);
    if (el) el.checked = true;
  });
  savePreferences();
  toast('Planner preferences reset.');
}

/* ---------- recipe pools ---------- */

function planningPool() {
  return recipes.filter(r =>
    !['Creamed Spinach', 'Garlic Sautéed Spinach'].includes(r.name) &&
    !r.yield.toLowerCase().includes('side')
  );
}

function comfortCandidates() {
  return planningPool().filter(r =>
    r.mood === 'Comfort' ||
    /roast|stew|fried chicken|baked spaghetti|alfredo|meatloaf|pot roast/i.test(r.name)
  );
}

function freezerCandidates() {
  return planningPool().filter(r => /freezer|freeze/i.test(`${r.tag} ${r.leftovers} ${r.note}`));
}

function seafoodCandidates() {
  return planningPool().filter(r => r.protein === 'Seafood');
}

function breakfastCandidates() {
  return planningPool().filter(r => r.protein === 'Breakfast' || r.mood === 'Brunch');
}

function chooseUnused(pool, used, predicate = () => true) {
  const candidates = shuffle(pool.filter(r => !used.has(r.day) && predicate(r)));
  return candidates[0] || null;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function variedPicks(count, { crockpotMinimum = 0, includeBreakfast = false } = {}) {
  const pool = planningPool();
  const crockpots = shuffle(pool.filter(r => r.method === 'Crockpot'));
  const breakfasts = shuffle(pool.filter(r => r.protein === 'Breakfast' || r.mood === 'Brunch'));
  const dinners = shuffle(pool.filter(r => r.method !== 'Crockpot' && r.protein !== 'Breakfast'));
  const chosen = [];
  const usedProteins = new Map();

  function addCandidate(r) {
    if (!r || chosen.some(x => x.day === r.day)) return false;
    const proteinCount = usedProteins.get(r.protein) || 0;
    if (proteinCount >= Math.ceil(count / 3)) return false;
    chosen.push(r);
    usedProteins.set(r.protein, proteinCount + 1);
    return true;
  }

  crockpots.slice(0, crockpotMinimum).forEach(r => addCandidate(r));
  if (includeBreakfast && breakfasts.length) addCandidate(breakfasts[0]);

  const preferred = shuffle([
    ...dinners.filter(r => ['Seafood', 'Chicken', 'Beef', 'Turkey', 'Pork', 'Sausage'].includes(r.protein)),
    ...dinners
  ]);
  preferred.forEach(r => { if (chosen.length < count) addCandidate(r); });

  shuffle(pool).forEach(r => {
    if (chosen.length < count && !chosen.some(x => x.day === r.day)) chosen.push(r);
  });

  return chosen.slice(0, count);
}

function rerollNotice(label) {
  toast(`${label} created. Click again anytime for a different mix.`);
}

/* ---------- plan builders ---------- */

function makeSuggestedWeek() {
  const picks = variedPicks(4, { crockpotMinimum: 1, includeBreakfast: true });
  if (!picks.length) { toast('Recipes are still loading. Try again in a moment.'); return; }

  plan = {};
  [1, 3, 5, 7].forEach((d, i) => {
    const r = picks[i];
    if (!r) return;
    plan[d] = { type: 'cook', recipeId: r.day };
    if (d + 1 <= 8) plan[d + 1] = { type: 'leftover', name: r.name };
  });

  renderPlanner();
  location.hash = '#planner';
  rerollNotice('A new easy week');
}

function makeSuggestedMonth() {
  if (!recipes.length) { toast('Recipes are still loading. Try again in a moment.'); return; }

  savePreferences();
  plan = {};
  const prefs = plannerPreferences();
  const totalDays = planDays();
  const used = new Set();
  const pool = planningPool();

  function assignCook(day, recipe) {
    if (!recipe || day > totalDays) return false;
    plan[day] = { type: 'cook', recipeId: recipe.day };
    used.add(recipe.day);
    return true;
  }

  function previousCookProtein(day) {
    for (let d = day - 1; d >= 1; d--) {
      if (plan[d] && plan[d].type === 'cook') {
        const r = recipeById(plan[d].recipeId);
        return r ? r.protein : null;
      }
    }
    return null;
  }

  function chooseForDay(day) {
    const isSunday = day % 7 === 0;
    const previousProtein = previousCookProtein(day);
    const notBackToBackBeef = c => !(prefs.noBackToBackBeef && previousProtein === 'Beef' && c.protein === 'Beef');
    const daysRemaining = totalDays - day + 1;

    if (isSunday && prefs.sundayComfort) {
      const r = chooseUnused(comfortCandidates(), used, notBackToBackBeef);
      if (r) return r;
    }

    const remainingCrock = prefs.crockpot
      ? Math.max(0, 4 - [...used].filter(id => (recipeById(id) || {}).method === 'Crockpot').length)
      : 0;
    if (remainingCrock > 0 && daysRemaining <= remainingCrock * 4) {
      const r = chooseUnused(pool.filter(x => x.method === 'Crockpot'), used, notBackToBackBeef);
      if (r) return r;
    }

    const remainingSeafood = prefs.seafood
      ? Math.max(0, 3 - [...used].filter(id => (recipeById(id) || {}).protein === 'Seafood').length)
      : 0;
    if (remainingSeafood > 0 && daysRemaining <= remainingSeafood * 5) {
      const r = chooseUnused(seafoodCandidates(), used);
      if (r) return r;
    }

    const remainingBreakfast = prefs.breakfast
      ? Math.max(0, 2 - [...used].filter(id => {
          const x = recipeById(id) || {};
          return x.protein === 'Breakfast' || x.mood === 'Brunch';
        }).length)
      : 0;
    if (remainingBreakfast > 0 && daysRemaining <= remainingBreakfast * 6) {
      const r = chooseUnused(breakfastCandidates(), used);
      if (r) return r;
    }

    if (prefs.freezer && Math.random() < 0.18) {
      const r = chooseUnused(freezerCandidates(), used, notBackToBackBeef);
      if (r) return r;
    }

    return chooseUnused(pool, used, notBackToBackBeef) || chooseUnused(pool, used);
  }

  for (let day = 1; day <= totalDays; day++) {
    const weekday = ((day - 1) % 7) + 1; // 1 = Mon, 5 = Fri, 7 = Sun

    if (prefs.fridayFlex && weekday === 5) {
      plan[day] = { type: 'flex' };
      continue;
    }
    if (plan[day]) continue;

    const recipe = chooseForDay(day);
    if (!assignCook(day, recipe)) continue;

    const isWeekday = weekday <= 4;
    const nextDay = day + 1;
    const nextWeekday = ((nextDay - 1) % 7) + 1;

    if (
      prefs.alternateWeekdays &&
      isWeekday &&
      nextDay <= totalDays &&
      !(prefs.fridayFlex && nextWeekday === 5) &&
      !plan[nextDay]
    ) {
      plan[nextDay] = { type: 'leftover', name: recipe.name };
      day++;
    }
  }

  // Swap cook days where a preference target hasn't been met yet.
  function replaceCookWith(poolFilter, minimum) {
    const already = Object.values(plan).filter(x => {
      if (x.type !== 'cook') return false;
      const r = recipeById(x.recipeId);
      return r && poolFilter(r);
    }).length;

    let needed = Math.max(0, minimum - already);
    if (!needed) return;

    const candidates = shuffle(pool.filter(r => poolFilter(r) && !used.has(r.day)));
    const replaceable = shuffle(
      Object.keys(plan).map(Number).filter(d => {
        const entry = plan[d];
        if (!entry || entry.type !== 'cook') return false;
        if (((d - 1) % 7) + 1 === 7) return false; // leave Sunday comfort meals alone
        const r = recipeById(entry.recipeId);
        return r && !poolFilter(r);
      })
    );

    while (needed > 0 && candidates.length && replaceable.length) {
      const day = replaceable.pop();
      const replacement = candidates.pop();
      used.delete(plan[day].recipeId);
      plan[day] = { type: 'cook', recipeId: replacement.day };
      used.add(replacement.day);
      if (plan[day + 1] && plan[day + 1].type === 'leftover') plan[day + 1].name = replacement.name;
      needed--;
    }
  }

  if (prefs.crockpot) replaceCookWith(r => r.method === 'Crockpot', 4);
  if (prefs.seafood) replaceCookWith(r => r.protein === 'Seafood', 3);
  if (prefs.breakfast) replaceCookWith(r => r.protein === 'Breakfast' || r.mood === 'Brunch', 2);
  if (prefs.freezer) replaceCookWith(r => /freezer|freeze/i.test(`${r.tag} ${r.leftovers} ${r.note}`), 2);

  renderPlanner();
  location.hash = '#planner';
  rerollNotice('A new balanced month using your preferences');
}

/* ---------- recipe vault ---------- */

function filtered() {
  const q = $('#search').value.toLowerCase();
  const p = $('#protein').value;
  const m = $('#method').value;

  return recipes.filter(r => {
    const haystack = [r.name, r.method, r.protein, r.mood, r.tag, r.note, r.yield, r.leftovers, `${r.time} minutes`, ...r.ingredients]
      .join(' ').toLowerCase();
    return (!q || haystack.includes(q)) &&
      (!p || r.protein === p) &&
      (!m || r.method === m) &&
      (!favOnly || favorites.has(r.day));
  });
}

function toggleFav(id) {
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  save();
  renderRecipes();
}

function renderRecipes() {
  const f = filtered();
  $('#recipeGrid').innerHTML = f.map(r => `<article class="card"><div class="card-top"><div class="icon">${r.emoji}</div><button class="heart ${favorites.has(r.day) ? 'saved' : ''}" onclick="toggleFav(${r.day})" aria-label="${favorites.has(r.day) ? 'Remove from favorites' : 'Save to favorites'}">${favorites.has(r.day) ? '♥' : '♡'}</button></div><h3>${r.name}</h3><div><span class="pill">${r.tag}</span></div><p>${r.note}</p><div class="meta"><span>${r.method}</span><span>•</span><span>${r.time} min</span><span>•</span><span>${r.yield}</span></div><div class="card-actions"><button class="btn btn-dark" onclick="openRecipe(${r.day})">Recipe</button><button class="btn btn-ghost" onclick="addToPlan(${r.day})">Add to plan</button></div></article>`).join('')
    || '<p class="picker-empty">No recipes match those filters. Clear the search box or choose “All proteins.”</p>';
}

/* ---------- servings scaling ---------- */

function parseQuantity(text) {
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return Number(text);
}

function formatQuantity(value) {
  const rounded = Math.round(value * 8) / 8;
  const whole = Math.floor(rounded);
  const eighths = Math.round((rounded - whole) * 8);
  const fractions = { 1: '1/8', 2: '1/4', 3: '3/8', 4: '1/2', 5: '5/8', 6: '3/4', 7: '7/8' };
  if (eighths === 0) return String(whole);
  return `${whole ? whole + ' ' : ''}${fractions[eighths]}`;
}

/* Keeps countable words in agreement with the amount in front of them, so a
   scaled line reads "1 cup buttermilk" rather than "1 cups buttermilk". */
const COUNT_WORDS = ['cup', 'fillet', 'chop', 'steak', 'ear', 'tortilla', 'bun',
  'apple', 'lemon', 'lime', 'egg', 'clove', 'onion', 'drumstick', 'potato', 'serving'];

function agreeUnits(line, amount) {
  return line.replace(/\b([A-Za-z]+?)(es|s)?\b/g, (word, stem, suffix, offset) => {
    if (offset === 0) return word;
    const singular = stem.toLowerCase();
    if (!COUNT_WORDS.includes(singular)) return word;
    if (amount > 1) return stem + (singular.endsWith('o') ? 'es' : 's');
    return stem;
  });
}

function scaleIngredient(line, scale) {
  if (scale === 1) return line;
  return line.replace(
    /(^|[\s(])(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(?=\s|$)/,
    (match, prefix, quantity) => {
      const value = parseQuantity(quantity);
      if (!Number.isFinite(value)) return match;
      return prefix + formatQuantity(value * scale);
    }
  );
}

function scaleLine(line, scale) {
  const scaled = scaleIngredient(line, scale);
  const lead = parseQuantity((scaled.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/) || [])[1] || '');
  return Number.isFinite(lead) ? agreeUnits(scaled, lead) : scaled;
}

function baseServingCount(recipe) {
  const match = String((recipe && recipe.yield) || '').match(/\d+/);
  return match ? Number(match[0]) : 4;
}

/* The serving options are built from each recipe's own yield. A recipe that
   makes 8 offers 8 / 12 / 16 — never a silently halved version of itself. */
function servingOptions(recipe) {
  const base = baseServingCount(recipe) || 4;
  return [...new Set([base, Math.round(base * 1.5), base * 2])].sort((a, b) => a - b);
}

function renderServingButtons(recipe, active) {
  const base = baseServingCount(recipe) || 4;
  $('#mServings').innerHTML = servingOptions(recipe).map(n =>
    `<button type="button" data-servings="${n}" class="${n === active ? 'active' : ''}">${n} servings${n === base ? ' (as written)' : ''}</button>`
  ).join('');
}

function fillServings(targetServings) {
  if (!current) return;
  const base = baseServingCount(current) || 4;
  const target = targetServings || base;
  const scale = target / base;

  $('#mIngredients').innerHTML = current.ingredients
    .map(item => `<li>${scaleLine(item, scale)}</li>`)
    .join('');

  const asWritten = target === base ? ' (as written)' : ` · scaled from ${base}`;
  $('#mMeta').textContent = `${current.method} · ${current.time} minutes · Makes ${target} servings${asWritten}`;

  $$('.servings button').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.servings) === target);
  });
}

function openRecipe(id) {
  const r = recipeById(id);
  if (!r) { toast('That recipe could not be found.'); return; }
  current = r;
  $('#mEye').textContent = r.method === 'Crockpot' ? 'Batch + crockpot' : 'Flexible recipe';
  $('#mTitle').textContent = r.name;
  $('#mSteps').innerHTML = r.steps.map(x => `<li>${x}</li>`).join('');
  $('#mLeft').innerHTML = `<strong>Leftover plan:</strong> ${r.leftovers}`;
  $('#mNote').innerHTML = `<strong>Why it hits:</strong> ${r.note}`;
  const base = baseServingCount(r) || 4;
  renderServingButtons(r, base);
  fillServings(base);
  recipeModal.showModal();
}

/* ---------- printing ---------- */

function printSection(section) {
  document.body.classList.add(section === 'planner' ? 'print-planner' : 'print-groceries');
  const cleanup = () => {
    document.body.classList.remove('print-planner', 'print-groceries');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  setTimeout(cleanup, 3000);
}

/* ---------- groceries ---------- */

function buildSelectedGroceryList() {
  const selected = [...new Set(Object.values(plan).filter(x => x.type === 'cook').map(x => x.recipeId))];

  if (!selected.length) {
    $('#selectedGroceries').innerHTML = '<article class="generated-list"><h3>My planned grocery list</h3><p>Add meals to your plan first, then build the list.</p></article>';
    location.hash = '#groceries';
    return;
  }

  const items = [];
  selected.forEach(id => {
    const r = recipeById(id);
    if (!r) return;
    r.ingredients.forEach(i => items.push(i + ' — ' + r.name));
  });
  items.sort((a, b) => a.localeCompare(b));

  $('#selectedGroceries').innerHTML = `<article class="generated-list"><h3>My planned grocery list</h3><p class="sub">${selected.length} selected recipes. Quantities are shown exactly as written in each recipe.</p><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul></article>`;
  location.hash = '#groceries';
  toast('Your grocery list is ready.');
}

/* ---------- wiring ---------- */

document.addEventListener('click', event => {
  const button = event.target.closest('.servings button[data-servings]');
  if (button) fillServings(Number(button.dataset.servings));
});

['search', 'protein', 'method'].forEach(id =>
  $('#' + id).addEventListener(id === 'search' ? 'input' : 'change', renderRecipes)
);

$('#favOnly').addEventListener('click', () => {
  favOnly = !favOnly;
  $('#favOnly').textContent = favOnly ? '♥ Showing favorites' : '♡ Favorites';
  renderRecipes();
});

$('#monthSelect').addEventListener('change', renderPlanner);

$$('.preference-card input').forEach(input => input.addEventListener('change', savePreferences));

/* The Show/Hide control used to swallow its own click, so it never opened
   the panel. It now toggles and stops the click reaching the summary row. */
const preferenceButton = $('.preferences-toggle');
if (preferenceButton) preferenceButton.addEventListener('click', togglePreferences);

const preferenceSummary = $('.preferences-summary');
if (preferenceSummary) {
  preferenceSummary.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      togglePreferences();
    }
  });
}

$('#modalClose').addEventListener('click', () => recipeModal.close());
$('#pickerClose').addEventListener('click', () => pickerModal.close());
$('#pickerSearch').addEventListener('input', renderPickerList);
$$('#picker [data-pick]').forEach(b => b.addEventListener('click', () => setDayType(b.dataset.pick)));

// Click the dark backdrop to dismiss either dialog.
[recipeModal, pickerModal].forEach(d => {
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
});

/* ---------- startup ---------- */

async function initializeApp() {
  try {
    const [recipeResponse, groceryResponse] = await Promise.all([
      fetch('data/recipes.json'),
      fetch('data/groceries.json')
    ]);
    if (!recipeResponse.ok || !groceryResponse.ok) throw new Error('Unable to load recipe data.');

    recipes = await recipeResponse.json();
    groceries = await groceryResponse.json();

    $('#groceryLists').innerHTML = Object.entries(groceries)
      .map(([w, items]) => `<article class="week"><h3>Original Week ${w}</h3><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul></article>`)
      .join('');

    loadPreferences();
    prunePlan();
    renderPlanner();
    renderRecipes();
  } catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<div style="padding:12px;text-align:center;background:#fff0f0;color:#7b2448;font-weight:800">The recipe data could not be loaded. Open this site through GitHub Pages rather than directly from your computer.</div>'
    );
  }
}

initializeApp();
