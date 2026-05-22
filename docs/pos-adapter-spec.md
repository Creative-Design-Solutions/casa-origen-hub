# POS Adapter Interface Specification

**Version:** 0.1.0  
**Status:** Stable for synthetic implementation. Freeze before writing real Square/Toast adapters.

---

## Purpose

This document defines the interface contract for any POS connector in the Origen Backend system. All business logic (daily close, menu engineering, traceability) calls these functions — never POS-vendor-specific APIs directly.

When a real POS (Square, Toast) is connected, swap the data source inside these functions. The signatures must remain identical.

---

## Tools

### `get_sales_summary(date: string) → SalesSummary`

Returns a complete sales summary for a single date.

**Input:**
```
date: string   // ISO 8601 date, e.g. "2026-05-22"
```

**Output: `SalesSummary`**
```typescript
{
  date: string                          // "2026-05-22"
  day: string                           // "Friday"
  covers: number                        // total guests served
  gross_sales: number                   // pre-discount, pre-tax total
  net_sales: number                     // after discounts
  tax_collected: number
  discounts: number                     // total discount amount
  voids: number                         // total voided amount
  comps: number                         // total comped amount
  cash_deposit_expected: number         // what the system expects in the bank
  cash_deposit_actual: number           // what was actually deposited
  deposit_variance: number              // actual - expected (negative = short)
  breakdown_by_category: {             // revenue by menu category
    [category: string]: number
  }
  top_items: Array<{
    item_id: string
    name: string
    qty_sold: number
    revenue: number
  }>
  flags: Array<{
    type: 'void' | 'comp' | 'discount' | 'deposit_variance'
    amount: number
    note: string
  }>
  payment_methods: {
    card: number
    cash: number
    [method: string]: number
  }
}
```

**Error response:**
```typescript
{ error: string, available_dates?: string[] }
```

---

### `get_week_summary(start: string, end: string) → WeekSummary`

Returns aggregated totals for a date range.

**Input:**
```
start: string   // ISO 8601 date
end: string     // ISO 8601 date (inclusive)
```

**Output: `WeekSummary`**
```typescript
{
  covers: number
  gross_sales: number
  tax_collected: number
  discounts: number
  voids: number
  comps: number
  total_deposited: number
  average_check: number               // gross_sales / covers
  best_day: string                    // date with highest gross_sales
  flags_requiring_attention: string[] // human-readable list
}
```

---

### `get_top_items(date: string, limit?: number) → TopItem[]`

Returns the best-selling items for a date, sorted by revenue descending.

**Input:**
```
date: string      // ISO 8601 date
limit?: number    // default 5
```

**Output: `TopItem[]`**
```typescript
Array<{
  item_id: string
  name: string
  qty_sold: number
  revenue: number
}>
```

---

### `get_sales_flags(date: string) → FlagSummary`

Returns all flagged events for a date — voids, comps, discounts, deposit issues.

**Input:**
```
date: string   // ISO 8601 date
```

**Output: `FlagSummary`**
```typescript
{
  date: string
  flags: Array<{
    type: 'void' | 'comp' | 'discount' | 'deposit_variance'
    amount: number
    note: string
  }>
  deposit_variance: number
  voids: number
  comps: number
  discounts: number
}
```

---

## Implementing a Real POS Adapter

When connecting Square or Toast, create a new folder at:
```
mcp-servers/pos-adapter/square/
mcp-servers/pos-adapter/toast/
```

Each real adapter must:
1. Implement all four functions above with identical signatures
2. Map vendor-specific field names to the standard schema
3. Handle authentication via environment variables (never hardcoded)
4. Return the same error format: `{ error: string }`
5. Never return more than is specified in this contract (extra fields are ignored but discouraged)

### Square-specific notes

- Sales endpoint: `GET /v2/orders`
- Deposits: cross-reference with `GET /v2/cash-drawer-shifts`
- Item IDs from Square will need mapping to Origen item IDs (maintain a lookup table)
- Comps and voids appear as `DISCOUNT` and `VOID` order states

### Toast-specific notes

- Sales: `GET /restaurants/{guid}/orders`
- Toast uses `netAmount` not `gross`; calculate gross from `netAmount + discounts + voids`
- Payroll is bundled into Toast if using Toast Payroll — can use same credentials

---

## Environment Variables

```
POS_PROVIDER=synthetic|square|toast
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
TOAST_CLIENT_ID=
TOAST_CLIENT_SECRET=
TOAST_RESTAURANT_GUID=
```

Set in `.env` at project root. Never commit.

---

## Versioning

When breaking changes are needed to this spec, increment the version and update all implementations. Changes must be backward compatible where possible.

| Version | Change |
|---------|--------|
| 0.1.0 | Initial spec — synthetic implementation |
