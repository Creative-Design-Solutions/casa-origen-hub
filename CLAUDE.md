# CLAUDE.md — Origen Backend

> **Working title.** "Origen Backend" is grounded in the founding partner. The productized name (the thing eventually offered to other restaurants) is TBD. Rename when ready.

---

## 1. Project Mission

An AI-augmented back office for **independent, mission-driven restaurants** — the small, owner-operator places that pour everything into craft and have nothing left for admin.

The big tools (Restaurant365, Sage Intacct) are built for multi-unit operators with in-house controllers. The DIY stack (QuickBooks + MarginEdge + Gusto) still demands an owner with time to configure and tend it. The middle gap — *"I just want my back office to run itself so I can cook"* — is wide open.

**Operating principle:** these are businesses that already over give. They give craft, care, story, themselves. The system should give back time. That's the product, ultimately.

---

## 2. The Founding Partner: Casa Origen

A farm-to-table fast-casual concept opening **summer 2026** at 937 Central Avenue in the EDGE District of downtown St. Petersburg, Florida.

### Concept
- **Service model:** Counter ordering, food runners deliver to tables.
- **Day parts:** Breakfast and lunch (initially).
- **Cuisine philosophy:** Organic, nutrient-dense. Local farms across Tampa Bay. No preservatives, no seed oils. Cooking in grass-fed tallow, finishing with EVOO. No processed sugars. Fully traceable sourcing.
- **Coffee program:** Local beans, bagged for retail.
- **Retail layer:** Jars, coffee bags, bottled drinks, baked goods.
- **Aesthetic:** Warm, earthen — concrete, stone, weathered wood, hand-thrown ceramics.

---

## 3. Architecture

```
Owner / Chef
  ↓
Claude Code in VS Code  ← local, interactive
  ↓
CLAUDE.md + .claude/commands/
  ↓
MCP servers (POS, accounting, payroll, inventory, traceability)
  ↓
External APIs (Square/Toast, QBO, MarginEdge, Gusto)
  +
small cloud worker for scheduled jobs
```

**Chosen architecture: Hybrid** — local interactive + small cloud worker (~$5–20/mo) for scheduled automation (daily close, overnight invoice ingestion, alerts).

---

## 4. Tech Stack

- **Editor:** VS Code + Claude Code extension
- **Runtime:** Node.js / TypeScript (ESM)
- **Version control:** Git + GitHub (private)
- **MCP servers:** TypeScript, one per data source, POS-agnostic interfaces
- **Slash commands:** Markdown in `.claude/commands/`
- **Cloud worker:** Railway / Render / Fly.io (Phase 3+)
- **Database:** Supabase or Neon free tier (Phase 3+)

### Orchestrated tools (not replaced, orchestrated)
- **POS:** Square for Restaurants *(likely)* — Toast is alternative
- **Bookkeeping:** QuickBooks Online Plus
- **AP + Inventory + COGS:** MarginEdge
- **Payroll:** Gusto
- **Banking:** Relay or Mercury

---

## 5. The Four Data Streams

1. **Sales** — from the POS
2. **Labor** — from scheduling + payroll
3. **Cost of goods** — from vendor invoices and inventory
4. **Banking** — from the business bank account

---

## 6. Working Principles

1. **Read-only first, always.** Never write to partner systems until trust is earned over weeks of correct read behavior.
2. **Local-first, then hybrid.** Don't add cloud infrastructure until a specific need requires it.
3. **POS-agnostic.** All POS access goes through the abstraction layer (`get_sales_summary(date)`, not vendor-specific calls).
4. **Synthetic data first.** Every feature must work on simulated data before touching real credentials.
5. **Don't replace the orchestrated tools.** We're the conductor, not the orchestra.
6. **Traceability is sacred.** If we can't trace it, we don't claim it.
7. **One step at a time.** No multi-step automations that obscure what's happening.

---

## 7. Project Structure

```
origen-backend/
├── CLAUDE.md
├── .claude/
│   └── commands/
│       ├── daily-close.md
│       ├── traceability-report.md
│       └── menu-engineering.md
├── mcp-servers/
│   ├── pos-adapter/        ← POS-agnostic interface
│   │   ├── synthetic/      ← initial implementation
│   │   ├── square/         ← stub
│   │   └── toast/          ← stub
│   ├── accounting/         ← QBO adapter
│   ├── invoices/           ← MarginEdge or scan-from-photo
│   ├── traceability/       ← headline feature
│   └── shared/             ← shared types and utilities
├── data/
│   └── synthetic/          ← Casa Origen-shaped fake data
├── scripts/
│   └── seed-synthetic.ts   ← generates a believable test week
├── outputs/                ← daily close reports, traceability maps
└── docs/
    └── pos-adapter-spec.md ← interface contract for any POS connector
```

---

## 8. Current State

- Phase 1 scaffold in progress (see todo list above).
- Synthetic data MCP server being built.
- No real API credentials connected yet — all synthetic.
- Bryan meets with Casa Origen team Monday to plant the traceability seed.
