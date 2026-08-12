# Feminine Fire Kitchen

A flexible personal recipe collection and meal-planning website.
110 recipes, a 30-day planner, and grocery lists — all running in the browser, no server needed.

## Project structure

```text
feminine-fire-kitchen/
├── index.html
├── .nojekyll
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── data/
│   ├── recipes.json
│   └── groceries.json
├── assets/
│   └── images/
└── README.md
```

Keep this structure exactly. `index.html` looks for `css/styles.css`, `js/app.js`,
and `data/*.json` at those paths.

## Publish with GitHub Pages

1. Open your `feminine-fire-kitchen` repository.
2. Upload the **contents of this folder** (not the folder itself), replacing the existing files.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**
5. Save, then wait about a minute for the deploy to finish.

Site address: `https://learnwithmom.github.io/feminine-fire-kitchen/`

After updating, refresh with **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac).

### Confirming the upload actually landed

The footer shows a build stamp — this package reads **Build 6 · shop from your phone**. If the footer shows nothing or an older build, the new `js/app.js` did
not upload. Replacing `index.html` alone is not enough: **`js/app.js` and
`css/styles.css` must be replaced too**, and GitHub will not warn you if one of
them silently didn't upload.

A second check: build a list from your plan. The line under the heading should
read "N meals · N things to buy, combined from N recipe lines." If it instead
says "Quantities are shown exactly as written in each recipe", you are still
running an older `app.js`.

The CSS and JS are linked with `?v=6` so browsers cannot serve a stale cached
copy once the files are in place.

## What was fixed in this version

The previous upload was missing two functions, `plannerPreferences()` and
`savePreferences()`. `savePreferences` was referenced on line 456 while the page
was still setting itself up, so the script stopped there and never reached
`initializeApp()` on line 521. Nothing loaded — no recipes, no calendar.

| Problem | Fix |
| --- | --- |
| No calendar could be created; page stayed empty | Wrote the two missing functions |
| Preference checkboxes never saved | Same fix |
| "Reset defaults" gave no confirmation | Same fix |
| "Show" / "Hide" on Planner Preferences did nothing | The button was blocking its own click; it now toggles the panel |
| "Add meal" used a typing prompt that rejected common words | Replaced with a searchable recipe picker |
| "Vegetarian" and "Oven + Skillet" recipes unreachable in the vault | Added both to the filter dropdowns |
| A deleted recipe left a gap in the planner grid | Those days now show as open nights |
| Searching "30 minutes" found nothing | Cook time added to the search index |
| Print sometimes lost its formatting | Cleanup now waits for the print dialog to close |

Kept from your version: replace-a-single-meal, removing a meal also clearing its
leftover day, and the 4 / 6 / 8 servings scaling.

Also added: keyboard focus outlines, reduced-motion support, click-outside to
close dialogs, and clearer empty-state messages.

## Adding recipes later

Edit `data/recipes.json`. Every recipe needs a unique `day` number — that value
is the recipe's ID, and the planner uses it to remember your choices.

Required fields: `name`, `day`, `time`, `method`, `protein`, `mood`, `tag`,
`emoji`, `yield`, `leftovers`, `note`, `ingredients` (list), `steps` (list).

Two notes on fields that affect behavior:

- `yield` drives the servings scaler. A recipe reading "4 servings" scales to 6
  and 8 correctly. Recipes whose yield contains the word "side" are treated as
  side dishes and kept out of auto-generated plans.
- If you add a new `method` or `protein` value, add it to the matching dropdown
  in `index.html` or those recipes won't be reachable through the filters.

## Your saved data

Your plan, favorites, and preferences are stored in your own browser under
`ff2-plan`, `ff2-favorites`, and `ff2-preferences`. They stay on the device you
used, and clearing your browsing data clears them.

## Recipe audit (this version)

**The Southern Fried Chicken screenshot was a display bug, not bad data.** The
stored recipe is correct: 3½ lb chicken, 2 cups buttermilk, 2½ cups flour, for
8 servings. The modal was hardcoded to open every recipe at "4 servings", so an
8-serving recipe was shown halved while the header still called it the recipe.
Every ingredient was halved proportionally — nothing was singled out.

This affected all 18 recipes whose yield isn't 4, which is most of the crockpot
and Sunday batch meals. The modal now builds its serving buttons from each
recipe's own yield and opens "as written", so a recipe can never display shrunk
by default. You can still scale up deliberately.

Separately, the audit did find a real data problem: **13 recipes were labelled
"4 standard servings" but their ingredients only made 2.** Both the protein and
the starch were 2-serving amounts, so they were internally consistent — just
mislabelled. That broke the cook-once-eat-twice rhythm, because the planner
booked a leftover day after meals that had no leftovers.

Those 13 have been doubled to genuinely serve 4 (days 1, 3, 5, 6, 8, 9, 10, 15,
16, 17, 22, 26, 27). Quantities inside the instructions were scaled to match,
while temperatures and cook times were left alone. Where a step said to cook in
a single layer, it now says to work in two batches.

Unchanged: the other 47 recipes, and all cooking times and temperatures.

## Grocery list (this version)

The "Build list from my plan" button used to print one row per ingredient per
recipe, alphabetised. Seventeen meals produced 170 rows with black pepper listed
four separate times and no totals — accurate, but not shoppable.

It now consolidates. Each ingredient is parsed into amount, unit and item; the
same item is added up across every meal on the plan; and the results are grouped
the way a store is laid out:

Produce → Meat & Seafood → Dairy & Eggs → Bread & Tortillas → Canned & Jarred →
Frozen → Pantry & Dry Goods → Spices & Seasonings

That same 17-meal plan now comes to about 80 lines instead of 170, with one line
per thing you actually put in the cart.

Details worth knowing:

- Amounts are totalled within a unit family. Teaspoons, tablespoons and cups add
  together and print in the largest sensible unit; ounces and pounds do the same.
- Prep words are ignored when combining, so "diced onion" and "sliced onion"
  become one line. Words that change what you buy — cooked, shredded, frozen —
  are kept separate on purpose.
- If an item is measured by weight in one recipe and by count in another, it
  stays on two lines, because those can't be added honestly.
- Water is left off the list.
- Tap any item to check it off. "Show recipes" reveals which meals each item came
  from, and printing hides both that and the original weekly reference lists.

## Shopping from your phone

Your plan is saved in the browser you built it in, so a plan made on the laptop
does not exist on the phone. To move it, open the grocery list and tap **Send to
my phone**. On a Mac that offers the normal share sheet (Messages, AirDrop,
Mail); if the share sheet isn't available it copies a link instead. Opening that
link on your phone loads the plan and jumps straight to the grocery list.

The link carries the plan itself, not a login, so it keeps working offline once
the page has loaded and can be bookmarked or re-sent.

Checked-off items are saved on the device you're shopping with. They survive a
refresh, the phone locking, and Safari dropping the tab mid-aisle. **Uncheck all**
resets the list for the next trip, and a counter shows how far along you are.

On phones the aisle headings stick to the top as you scroll, the tap targets are
enlarged, and the section links stay visible so you can jump to Groceries without
scrolling the whole page.

One caution: checks are stored per device. If you send the link to a second phone
and shop from both, they will not see each other's checkmarks.

## Recipe audit edition

This edition uses 110 recipes. Each recipe now includes:
- a clearer household yield
- a quick-prep section that groups setup into simple chunks
- recipe-specific precomputed serving versions rather than browser-side blind doubling
- a batch-size note for larger skillet/oven/crockpot batches
- expanded chicken tender, chicken thigh, drumstick, ground-beef, steak, and fish options

The tested Smothered Beef Tips & Rice recipe has been restored to the 2 lb stew-meat house version.

## Final 110-meal collection
25 additional craveable meals emphasize browned sautéed chicken, garlic/herb butter, creamy pan sauces, steak, seafood, pork, and easy ground-beef dinners.

## Recipe correction pass
The original recipe-specific instructions were restored for recipes 1–75. Recipes 76–100 were individually rewritten with exact ingredients, amounts, heat, timing, and recipe-specific actions. Generic instruction templates were removed.
