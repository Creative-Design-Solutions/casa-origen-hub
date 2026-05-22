// Shared types used across all MCP servers

export interface SalesSummary {
  date: string;
  day: string;
  covers: number;
  gross_sales: number;
  net_sales: number;
  tax_collected: number;
  discounts: number;
  voids: number;
  comps: number;
  cash_deposit_expected: number;
  cash_deposit_actual: number;
  deposit_variance: number;
  breakdown_by_category: Record<string, number>;
  top_items: TopItem[];
  flags: SalesFlag[];
  payment_methods: Record<string, number>;
}

export interface TopItem {
  item_id: string;
  name: string;
  qty_sold: number;
  revenue: number;
}

export interface SalesFlag {
  type: 'void' | 'comp' | 'discount' | 'deposit_variance';
  amount: number;
  note: string;
}

export interface WeekSummary {
  covers: number;
  gross_sales: number;
  tax_collected: number;
  discounts: number;
  voids: number;
  comps: number;
  total_deposited: number;
  average_check: number;
  best_day: string;
  flags_requiring_attention: string[];
}

export interface Invoice {
  id: string;
  vendor_id: string;
  vendor_name: string;
  invoice_number: string;
  date: string;
  due_date: string;
  status: 'paid' | 'pending' | 'overdue';
  format: string;
  total: number;
  line_items: InvoiceLineItem[];
  price_alerts?: PriceAlert[];
  notes?: string;
}

export interface InvoiceLineItem {
  ingredient_id: string;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
  total: number;
  lot_number: string;
}

export interface PriceAlert {
  ingredient_id: string;
  note: string;
  previous_price: number;
  current_price: number;
  pct_change: number;
}

export interface Vendor {
  id: string;
  name: string;
  type: string;
  location: string;
  distance_miles: number;
  certifications: string[];
  contact: string;
  email: string;
  invoice_format: string;
  supplies: string[];
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  ingredients: MenuIngredient[];
  food_cost_target: number;
  allergens: string[];
  sku?: string;
}

export interface MenuIngredient {
  ingredient_id: string;
  name: string;
  quantity: number;
  unit: string;
  vendor_id: string;
}

export interface TraceabilityMap {
  date: string;
  dishes: DishTrace[];
}

export interface DishTrace {
  item_id: string;
  item_name: string;
  qty_sold: number;
  ingredients: IngredientTrace[];
}

export interface IngredientTrace {
  ingredient_id: string;
  name: string;
  vendor_id: string;
  vendor_name: string;
  lot_number: string;
  farm_location: string;
  certifications: string[];
}
