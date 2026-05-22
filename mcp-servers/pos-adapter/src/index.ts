#!/usr/bin/env node
/**
 * POS Adapter MCP Server — Synthetic Implementation
 *
 * Provides a POS-agnostic interface over synthetic Casa Origen data.
 * When real Square or Toast credentials are available, swap the data
 * source in each function — the tool signatures stay identical.
 *
 * Tools exposed:
 *   get_sales_summary(date)          → SalesSummary for a single day
 *   get_week_summary(start, end)     → WeekSummary for a date range
 *   get_top_items(date, limit)       → Top-selling items for a day
 *   get_sales_flags(date)            → Voids, comps, discounts, variances
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '../../../data/synthetic');

// ── Data loaders ──────────────────────────────────────────────────────────────

function loadSalesWeek() {
  const raw = readFileSync(join(DATA_PATH, 'sales-week.json'), 'utf-8');
  return JSON.parse(raw);
}

// ── MCP Tool Handlers ─────────────────────────────────────────────────────────

export function get_sales_summary(date: string) {
  const data = loadSalesWeek();
  const day = data.daily_summaries.find((d: any) => d.date === date);
  if (!day) {
    return { error: `No sales data found for date: ${date}`, available_dates: data.daily_summaries.map((d: any) => d.date) };
  }
  return day;
}

export function get_week_summary(start: string, end: string) {
  const data = loadSalesWeek();
  if (data.week.start === start && data.week.end === end) {
    return data.week_totals;
  }
  // Compute on the fly if partial range requested
  const days = data.daily_summaries.filter((d: any) => d.date >= start && d.date <= end);
  if (!days.length) return { error: 'No data for requested range' };

  return {
    covers: days.reduce((s: number, d: any) => s + d.covers, 0),
    gross_sales: days.reduce((s: number, d: any) => s + d.gross_sales, 0),
    tax_collected: days.reduce((s: number, d: any) => s + d.tax_collected, 0),
    discounts: days.reduce((s: number, d: any) => s + d.discounts, 0),
    voids: days.reduce((s: number, d: any) => s + d.voids, 0),
    comps: days.reduce((s: number, d: any) => s + d.comps, 0),
    days_included: days.map((d: any) => d.date),
    flags_requiring_attention: days.flatMap((d: any) => (d.flags || []).map((f: any) => `${d.date}: ${f.note}`)),
  };
}

export function get_top_items(date: string, limit: number = 5) {
  const data = loadSalesWeek();
  const day = data.daily_summaries.find((d: any) => d.date === date);
  if (!day) return { error: `No data for date: ${date}` };
  return day.top_items.slice(0, limit);
}

export function get_sales_flags(date: string) {
  const data = loadSalesWeek();
  const day = data.daily_summaries.find((d: any) => d.date === date);
  if (!day) return { error: `No data for date: ${date}` };
  return {
    date,
    flags: day.flags || [],
    deposit_variance: day.deposit_variance,
    voids: day.voids,
    comps: day.comps,
    discounts: day.discounts,
  };
}

// ── MCP Server ────────────────────────────────────────────────────────────────
// MCP protocol: reads JSON-RPC from stdin, writes to stdout

const tools = {
  get_sales_summary: {
    description: 'Get full sales summary for a specific date (YYYY-MM-DD)',
    handler: (args: any) => get_sales_summary(args.date),
  },
  get_week_summary: {
    description: 'Get aggregated sales summary for a date range',
    handler: (args: any) => get_week_summary(args.start, args.end),
  },
  get_top_items: {
    description: 'Get top-selling items for a date, ordered by revenue',
    handler: (args: any) => get_top_items(args.date, args.limit),
  },
  get_sales_flags: {
    description: 'Get all flagged events for a date (voids, comps, discounts, deposit variances)',
    handler: (args: any) => get_sales_flags(args.date),
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
          serverInfo: { name: 'pos-adapter', version: '0.1.0' },
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
