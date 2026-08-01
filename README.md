# Feminine Fire Kitchen

A flexible personal recipe collection and meal-planning website.
60 recipes, a 30-day planner, and grocery lists — all running in the browser, no server needed.

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
