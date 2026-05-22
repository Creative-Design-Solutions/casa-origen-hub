#!/usr/bin/env node
/**
 * seed-synthetic.ts
 *
 * Validates and summarises the synthetic Casa Origen dataset.
 * Run with: npx ts-node --esm scripts/seed-synthetic.ts
 *
 * Checks:
 *   - All menu items have valid vendor references
 *   - All invoice line items have lot numbers
 *   - All top_items in sales reference real menu items
 *   - Traceability coverage (% of ingredients with lot numbers)
 *
 * Outputs a summary to stdout and writes outputs/seed-report.md
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data/synthetic');

function load(file: string) {
  return JSON.parse(readFileSync(join(DATA, file), 'utf-8'));
}

function run() {
  console.log('\n🌱  Seeding synthetic Casa Origen dataset...\n');

  const menu = load('menu.json');
  const vendors = load('vendors.json');
  const sales = load('sales-week.json');
  const invoices = load('invoices-week.json');

  const vendorIds = new Set(vendors.vendors.map((v: any) => v.id));
  const allItems: any[] = menu.menu.categories.flatMap((c: any) => c.items);
  const itemIds = new Set(allItems.map((i: any) => i.id));
  const lotNumbers = new Set<string>();
  const trackedIngredients = new Set<string>();

  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Validate menu ─────────────────────────────────────────────────────────
  console.log('📋  Validating menu...');
  for (const item of allItems) {
    for (const ing of item.ingredients) {
      if (ing.vendor_id !== 'internal' && ing.vendor_id !== 'external' && !vendorIds.has(ing.vendor_id)) {
        errors.push(`Menu item "${item.name}" references unknown vendor: ${ing.vendor_id}`);
      }
    }
  }
  console.log(`   ${allItems.length} menu items across ${menu.menu.categories.length} categories ✓`);

  // ── Validate invoices ─────────────────────────────────────────────────────
  console.log('🧾  Validating invoices...');
  for (const inv of invoices.invoices) {
    if (!vendorIds.has(inv.vendor_id)) {
      errors.push(`Invoice ${inv.invoice_number} references unknown vendor: ${inv.vendor_id}`);
    }
    for (const line of inv.line_items) {
      if (!line.lot_number) {
        warnings.push(`Invoice ${inv.invoice_number} line "${line.description}" has no lot number`);
      } else {
        lotNumbers.add(line.lot_number);
        trackedIngredients.add(line.ingredient_id);
      }
    }
  }
  console.log(`   ${invoices.invoices.length} invoices · ${lotNumbers.size} lot numbers ✓`);

  // ── Validate sales ────────────────────────────────────────────────────────
  console.log('💰  Validating sales...');
  for (const day of sales.daily_summaries) {
    for (const sold of day.top_items) {
      if (!itemIds.has(sold.item_id)) {
        warnings.push(`Sales on ${day.date} reference unknown item_id: ${sold.item_id}`);
      }
    }
  }
  console.log(`   ${sales.daily_summaries.length} days of sales · ${sales.week_totals.covers} total covers ✓`);

  // ── Traceability coverage ─────────────────────────────────────────────────
  console.log('🔍  Checking traceability coverage...');
  const allIngredientIds = new Set(allItems.flatMap((i: any) => i.ingredients.map((ing: any) => ing.ingredient_id)));
  const tracked = [...allIngredientIds].filter(id => trackedIngredients.has(id));
  const pct = Math.round((tracked.length / allIngredientIds.size) * 100);
  console.log(`   ${tracked.length}/${allIngredientIds.size} unique ingredients lot-tracked (${pct}%)`);

  // ── Results ───────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  if (errors.length) {
    console.log(`\n❌  ${errors.length} error(s):`);
    errors.forEach(e => console.log(`   • ${e}`));
  }
  if (warnings.length) {
    console.log(`\n⚠️   ${warnings.length} warning(s):`);
    warnings.forEach(w => console.log(`   • ${w}`));
  }
  if (!errors.length && !warnings.length) {
    console.log('\n✅  Dataset is clean. All references valid, all lots tracked.');
  }

  // ── Write report ──────────────────────────────────────────────────────────
  mkdirSync(join(ROOT, 'outputs'), { recursive: true });
  const report = [
    '# Synthetic Data Seed Report',
    `*Generated: ${new Date().toISOString()}*`,
    '',
    '## Summary',
    `- **Menu items:** ${allItems.length} across ${menu.menu.categories.length} categories`,
    `- **Vendors:** ${vendors.vendors.length}`,
    `- **Invoices this week:** ${invoices.invoices.length}`,
    `- **Lot numbers:** ${lotNumbers.size}`,
    `- **Sales days:** ${sales.daily_summaries.length}`,
    `- **Week covers:** ${sales.week_totals.covers}`,
    `- **Week gross sales:** $${sales.week_totals.gross_sales.toLocaleString()}`,
    `- **Traceability coverage:** ${pct}% of unique ingredients lot-tracked`,
    '',
    errors.length ? `## Errors\n${errors.map(e => `- ${e}`).join('\n')}` : '## Errors\nNone.',
    '',
    warnings.length ? `## Warnings\n${warnings.map(w => `- ${w}`).join('\n')}` : '## Warnings\nNone.',
    '',
    '## Vendors',
    vendors.vendors.map((v: any) => `- **${v.name}** (${v.location}) — ${v.supplies.join(', ')}`).join('\n'),
    '',
    '## Week Sales by Day',
    sales.daily_summaries.map((d: any) => `- **${d.day} ${d.date}** — ${d.covers} covers · $${d.gross_sales.toLocaleString()}`).join('\n'),
  ].join('\n');

  const reportPath = join(ROOT, 'outputs/seed-report.md');
  writeFileSync(reportPath, report);
  console.log(`\n📄  Report written to outputs/seed-report.md`);
  console.log('\n🌿  Casa Origen synthetic dataset ready.\n');
}

run();
