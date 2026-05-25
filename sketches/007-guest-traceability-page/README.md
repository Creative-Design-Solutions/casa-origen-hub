## Variant: Guest-Facing Traceability Page

### Design stance
A mobile-first public page — linked from a QR code on the menu or table — that shows exactly where today's ingredients came from. Quiet, honest, farm-to-table storytelling made visible.

### Key choices
- Cream background (#faf6ee), Cormorant serif headings, Syne sans body — matches the Origen brand palette.
- Gold "O" logo ring header: signals premium without weight.
- Farm cards: each farm gets an emoji badge, certification pills, a per-ingredient lot number list, and a distance bar (miles from St. Pete).
- Synthetic data powered by a JS array (`TODAY_SOURCES`) — designed to be swapped for a server-rendered payload from MarginEdge invoice data + lot tags.

### Key choices (technical)
- Five synthetic farms: Worden Farm, SunCoast Pastures, Gamble Creek Farm, Roser Community Farm, Sweetwater Organic.
- Lot numbers follow the invoice format (e.g., `WF-MG-0518`) to match the lot-level traceability system.
- Date renders live via JS — no server needed for the static demo.

### Trade-offs
- Strong at: making the traceability promise tangible to a guest in 10 seconds.
- Weak at: requires actual lot-level data to be production-worthy (the gap MarginEdge doesn't fill on its own).

### Best for
The guest-facing proof of the traceability system. Pair with the operator dashboard (sketch 006) for a full demo to the Casa Origen team.
