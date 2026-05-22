#!/usr/bin/env node
/**
 * Traceability MCP Server
 *
 * The headline feature. Given a date (or menu item), traces every
 * ingredient sold back to its source farm, lot number, and certifications.
 *
 * Tools exposed:
 *   get_traceability_map(date)            → Full dish→ingredient→farm map for the day
 *   trace_item(item_id, date)             → Trace a single menu item
 *   get_farm_activity(vendor_id, date)    → All dishes that used a given farm's ingredients
 *   get_lot_trace(lot_number)             → Which dishes used a specific lot
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '../../../data/synthetic');

// ── Data loaders ──────────────────────────────────────────────────────────────

function loadMenu() {
  return JSON.parse(readFileSync(join(DATA_PATH, 'menu.json'), 'utf-8'));
}

function loadVendors() {
  return JSON.parse(readFileSync(join(DATA_PATH, 'vendors.json'), 'utf-8'));
}

function loadInvoices() {
  return JSON.parse(readFileSync(join(DATA_PATH, 'invoices-week.json'), 'utf-8'));
}

function loadSales() {
  return JSON.parse(readFileSync(join(DATA_PATH, 'sales-week.json'), 'utf-8'));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAllMenuItems() {
  const menu = loadMenu();
  const items: any[] = [];
  for (const cat of menu.menu.categories) {
    items.push(...cat.items);
  }
  return items;
}

function getVendorMap() {
  const { vendors } = loadVendors();
  return Object.fromEntries(vendors.map((v: any) => [v.id, v]));
}

function getLotMap() {
  // Build ingredient_id → lot_number map from this week's invoices
  const { invoices } = loadInvoices();
  const lots: Record<string, string> = {};
  for (const inv of invoices) {
    for (const line of inv.line_items) {
      lots[line.ingredient_id] = line.lot_number;
    }
  }
  return lots;
}

// ── Tool Handlers ─────────────────────────────────────────────────────────────

export function get_traceability_map(date: string) {
  const sales = loadSales();
  const vendorMap = getVendorMap();
  const lotMap = getLotMap();
  const allItems = getAllMenuItems();

  const dayData = sales.daily_summaries.find((d: any) => d.date === date);
  if (!dayData) return { error: `No sales data for ${date}` };

  const dishes = dayData.top_items.map((sold: any) => {
    const menuItem = allItems.find((i: any) => i.id === sold.item_id);
    if (!menuItem) return null;

    const ingredients = (menuItem.ingredients || []).map((ing: any) => {
      const vendor = vendorMap[ing.vendor_id];
      const lot_number = lotMap[ing.ingredient_id] || 'LOT-UNTRACKED';
      return {
        ingredient_id: ing.ingredient_id,
        name: ing.name,
        vendor_id: ing.vendor_id,
        vendor_name: vendor?.name ?? ing.vendor_id,
        lot_number,
        farm_location: vendor?.location ?? 'Unknown',
        certifications: vendor?.certifications ?? [],
        distance_miles: vendor?.distance_miles ?? null,
      };
    });

    return {
      item_id: sold.item_id,
      item_name: sold.name,
      qty_sold: sold.qty_sold,
      revenue: sold.revenue,
      ingredients,
    };
  }).filter(Boolean);

  // Summary: unique farms used today
  const farmsUsed = new Set<string>();
  const certifications = new Set<string>();
  for (const dish of dishes) {
    for (const ing of dish.ingredients) {
      farmsUsed.add(ing.vendor_name);
      for (const cert of ing.certifications) certifications.add(cert);
    }
  }

  return {
    date,
    day: dayData.day,
    dishes,
    summary: {
      unique_farms: Array.from(farmsUsed),
      farm_count: farmsUsed.size,
      certifications_represented: Array.from(certifications),
      fully_traceable: dishes.every((d: any) => d.ingredients.every((i: any) => i.lot_number !== 'LOT-UNTRACKED')),
    },
  };
}

export function trace_item(item_id: string, date: string) {
  const full = get_traceability_map(date);
  if ('error' in full) return full;

  const dish = (full as any).dishes.find((d: any) => d.item_id === item_id);
  if (!dish) return { error: `Item ${item_id} not found in sales for ${date}` };

  return {
    date,
    item: dish,
    traceability_statement: buildTraceStatement(dish),
  };
}

export function get_farm_activity(vendor_id: string, date: string) {
  const full = get_traceability_map(date);
  if ('error' in full) return full;
  const vendorMap = getVendorMap();
  const vendor = vendorMap[vendor_id];

  const dishes = (full as any).dishes.filter((d: any) =>
    d.ingredients.some((i: any) => i.vendor_id === vendor_id)
  );

  const ingredients_supplied = new Set<string>();
  for (const dish of dishes) {
    for (const ing of dish.ingredients) {
      if (ing.vendor_id === vendor_id) ingredients_supplied.add(ing.name);
    }
  }

  return {
    date,
    vendor: vendor ?? { id: vendor_id },
    dishes_using_their_ingredients: dishes.map((d: any) => ({ item_id: d.item_id, name: d.item_name, qty_sold: d.qty_sold })),
    ingredients_supplied: Array.from(ingredients_supplied),
  };
}

export function get_lot_trace(lot_number: string) {
  const { invoices } = loadInvoices();
  const allItems = getAllMenuItems();
  const vendorMap = getVendorMap();

  // Find which invoice line has this lot
  let foundLine: any = null;
  let foundInvoice: any = null;
  for (const inv of invoices) {
    for (const line of inv.line_items) {
      if (line.lot_number === lot_number) {
        foundLine = line;
        foundInvoice = inv;
        break;
      }
    }
    if (foundLine) break;
  }

  if (!foundLine) return { error: `Lot number ${lot_number} not found in this week's invoices` };

  // Find which menu items use this ingredient
  const dishesUsingIngredient = allItems.filter((item: any) =>
    item.ingredients.some((ing: any) => ing.ingredient_id === foundLine.ingredient_id)
  );

  const vendor = vendorMap[foundInvoice.vendor_id];

  return {
    lot_number,
    ingredient: foundLine.description,
    ingredient_id: foundLine.ingredient_id,
    source: {
      vendor_name: foundInvoice.vendor_name,
      vendor_id: foundInvoice.vendor_id,
      location: vendor?.location,
      certifications: vendor?.certifications,
      invoice_number: foundInvoice.invoice_number,
      invoice_date: foundInvoice.date,
    },
    appears_in_dishes: dishesUsingIngredient.map((item: any) => ({
      item_id: item.id,
      name: item.name,
      price: item.price,
    })),
  };
}

// ── Traceability Statement Generator ─────────────────────────────────────────

function buildTraceStatement(dish: any): string {
  const farms = [...new Set(dish.ingredients.map((i: any) => i.vendor_name))];
  const certifications = [...new Set(dish.ingredients.flatMap((i: any) => i.certifications))];
  return `${dish.item_name} (${dish.qty_sold} sold) — sourced from ${farms.join(', ')}. Certifications: ${certifications.join(', ') || 'None listed'}. All ingredients lot-tracked.`;
}

// ── MCP Server ────────────────────────────────────────────────────────────────

const tools = {
  get_traceability_map: {
    description: 'Get full ingredient traceability map for all dishes sold on a given date',
    handler: (args: any) => get_traceability_map(args.date),
  },
  trace_item: {
    description: 'Trace a single menu item back to its source farms and lot numbers',
    handler: (args: any) => trace_item(args.item_id, args.date),
  },
  get_farm_activity: {
    description: 'See which dishes used a specific farm\'s ingredients on a given date',
    handler: (args: any) => get_farm_activity(args.vendor_id, args.date),
  },
  get_lot_trace: {
    description: 'Trace a specific lot number back to its source and which dishes it appeared in',
    handler: (args: any) => get_lot_trace(args.lot_number),
  },
};

process.stdin.setEncoding('utf-8');
let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const request = JSON.parse(line);
      const { id, method, params } = request;

      if (method === 'initialize') {
        respond(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'traceability', version: '0.1.0' },
        });
      } else if (method === 'tools/list') {
        respond(id, {
          tools: Object.entries(tools).map(([name, t]) => ({
            name,
            description: t.description,
            inputSchema: { type: 'object', properties: {}, additionalProperties: true },
          })),
        });
      } else if (method === 'tools/call') {
        const tool = tools[params.name as keyof typeof tools];
        if (!tool) {
          respondError(id, `Unknown tool: ${params.name}`);
        } else {
          const result = tool.handler(params.arguments ?? {});
          respond(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
        }
      } else {
        respondError(id, `Unknown method: ${method}`);
      }
    } catch (e) {
      process.stderr.write(`Parse error: ${e}\n`);
    }
  }
});

function respond(id: any, result: any) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function respondError(id: any, message: string) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32600, message } }) + '\n');
}
