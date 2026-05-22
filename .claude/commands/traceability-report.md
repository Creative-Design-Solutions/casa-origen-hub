# /traceability-report

Generate a public-facing traceability report for a given date. Shows guests where their food came from — farms, lot numbers, certifications. Designed to be printed as a QR-linked page or posted digitally.

---

## Step 1 — Get the date

Default to today. Accept override from user.

---

## Step 2 — Pull traceability map

Call `get_traceability_map(date)` from the traceability server.

---

## Step 3 — For each dish sold, build a sourcing card

Format: **Dish name** → ingredients → farm → certification → lot.

Only include dishes sold that day (from top_items in sales data).

---

## Step 4 — Write the guest-facing report

Output to `outputs/traceability-YYYY-MM-DD.md`:

```markdown
# What's On Your Plate Today
*Casa Origen · [Date]*

Every ingredient on our menu is sourced from farms we know by name. Here's where today's food came from.

---

## On the Menu Today

### [Dish Name]
| Ingredient | Farm | Location | Certified |
|------------|------|----------|-----------|
| Pasture-raised eggs | Gamble Creek Farm | Parrish, FL | USDA Organic |
| Sweet potato | Gamble Creek Farm | Parrish, FL | USDA Organic |
| ... | | | |

---

[Repeat for each dish]

---

## Today's Farm Partners

[Name each farm, location, and what they supplied]

---

*All ingredients lot-tracked. Ask your server for full sourcing details.*
*Powered by Origen Backend — built for restaurants that take sourcing seriously.*
```

---

## Step 5 — Report back

Tell the user the file is ready and where it was saved. Offer to:
- Generate a simplified version for social media
- Identify which farms have been used most this week
