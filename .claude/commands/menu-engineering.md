# /menu-engineering

Analyse menu performance for the week. Surfaces which dishes are stars, which are underperforming, and which need a price or recipe review due to cost pressure.

---

## Step 1 — Pull this week's sales

Call `get_week_summary(start, end)` for the current week.
For each day in the week, call `get_top_items(date, 10)`.

Aggregate total qty sold and total revenue per item across the week.

---

## Step 2 — Load menu for cost targets

Read `data/synthetic/menu.json` for each item's `food_cost_target` and `price`.

---

## Step 3 — Check for price alerts

Load `data/synthetic/invoices-week.json` → `week_totals.alerts`.

For each alert, identify which menu items are affected (use ingredient_id cross-reference).

---

## Step 4 — Classify each item

Use the classic menu engineering matrix:

| Classification | High Popularity | Low Popularity |
|----------------|-----------------|----------------|
| **High Margin** | ⭐ Star | 🧩 Puzzle |
| **Low Margin** | 🐴 Plow Horse | 🐶 Dog |

Margin = 1 - food_cost_target.
Popularity = qty sold vs. average for the category.

---

## Step 5 — Write the report

Output to `outputs/menu-engineering-YYYY-MM-DD.md`:

```markdown
# Menu Engineering — Week of [Date]
*Casa Origen*

---

## This Week's Performance

| Item | Sold | Revenue | Margin | Classification |
|------|------|---------|--------|----------------|
| Grassfed Beef Bowl | X | $XXX | 70% | ⭐ Star |
| ... | | | | |

---

## Cost Alerts

[List any ingredients with price increases and their affected dishes, with estimated margin impact]

---

## Recommendations

1. **Stars** — Protect and promote. These are your most popular AND profitable.
2. **Puzzles** — High margin but low volume. Consider placement, description, or portioning.
3. **Plow Horses** — Popular but thin margin. Raise price slightly, or find a cheaper sourcing option.
4. **Dogs** — Consider removing or reworking.

---

*Prices current as of [date]. Next pricing review recommended if any ingredient alert exceeds 10%.*
```

---

## Step 6 — Report back

Summarise findings in 3 bullets. Ask if the user wants to drill into any specific item or category.
