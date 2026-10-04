import type { ProductVisual } from "./schema";

/* Palette shared by product renders */
const ESP = "#2a160c";
const CREMA = "#b07a45";
const LATTE = "#b8875a";
const MILKY = "#d9b994";
const FOAM = "#efe3d0";
const MOCHA = "#4a2716";
const COLD = "#1d0e07";

export const CATEGORY_SEED = [
  { slug: "hot-coffee", name: "Hot Coffee", description: "Hand-pulled espresso and silky steamed milk — the classics, done with care.", sortOrder: 1 },
  { slug: "iced-coffee", name: "Iced Coffee", description: "Slow-steeped cold brew and chilled espresso, poured over clear ice.", sortOrder: 2 },
  { slug: "signature", name: "Signature", description: "Original All Ready creations you won't find anywhere else.", sortOrder: 3 },
  { slug: "bakery", name: "Bakery", description: "Laminated by hand each morning to pair with your cup.", sortOrder: 4 },
] as const;

export const OPTION_GROUP_SEED = [
  {
    key: "size", name: "Size", type: "single" as const, required: true, maxSelections: null, sortOrder: 1,
    options: [
      { name: "Small · 12 oz", priceDeltaCents: 0 },
      { name: "Medium · 16 oz", priceDeltaCents: 75, isDefault: true },
      { name: "Large · 20 oz", priceDeltaCents: 150 },
    ],
  },
  {
    key: "shots", name: "Shots", type: "single" as const, required: true, maxSelections: null, sortOrder: 2,
    options: [
      { name: "Doppio · 2 shots", priceDeltaCents: 0, isDefault: true },
      { name: "Triple · 3 shots", priceDeltaCents: 125 },
    ],
  },
  {
    key: "milk", name: "Milk", type: "single" as const, required: true, maxSelections: null, sortOrder: 3,
    options: [
      { name: "Whole", priceDeltaCents: 0, isDefault: true },
      { name: "2% reduced fat", priceDeltaCents: 0 },
      { name: "Oat", priceDeltaCents: 75 },
      { name: "Almond", priceDeltaCents: 75 },
      { name: "Macadamia", priceDeltaCents: 90 },
    ],
  },
  {
    key: "sweetness", name: "Sweetness", type: "single" as const, required: false, maxSelections: null, sortOrder: 4,
    options: [
      { name: "Unsweetened", priceDeltaCents: 0 },
      { name: "Half sweet", priceDeltaCents: 0 },
      { name: "Classic", priceDeltaCents: 0, isDefault: true },
      { name: "Extra sweet", priceDeltaCents: 0 },
    ],
  },
  {
    key: "extras", name: "Extras", type: "multi" as const, required: false, maxSelections: 5, sortOrder: 5,
    options: [
      { name: "Extra espresso shot", priceDeltaCents: 125 },
      { name: "Vanilla bean syrup", priceDeltaCents: 60 },
      { name: "Caramel syrup", priceDeltaCents: 60 },
      { name: "Hazelnut syrup", priceDeltaCents: 60 },
      { name: "Brown sugar syrup", priceDeltaCents: 60 },
      { name: "Whipped cream", priceDeltaCents: 75 },
      { name: "Vanilla cold foam", priceDeltaCents: 125 },
      { name: "Cinnamon dust", priceDeltaCents: 0 },
      { name: "Cocoa dust", priceDeltaCents: 0 },
    ],
  },
  {
    key: "serve", name: "Serve", type: "single" as const, required: true, maxSelections: null, sortOrder: 6,
    options: [
      { name: "As is", priceDeltaCents: 0, isDefault: true },
      { name: "Warmed", priceDeltaCents: 0 },
    ],
  },
];

type ProductSeed = {
  slug: string;
  category: (typeof CATEGORY_SEED)[number]["slug"];
  name: string;
  tagline: string;
  description: string;
  price: number; // cents
  visual: ProductVisual;
  notes: string[];
  calories?: number;
  caffeine?: number;
  featured?: boolean;
  seasonal?: boolean;
  groups: string[];
  stock?: number | null;
};

const MILK_DRINK = ["size", "milk", "sweetness", "extras"];
const BLACK_DRINK = ["size", "sweetness", "extras"];

export const PRODUCT_SEED: ProductSeed[] = [
  // ── Hot ──────────────────────────────────────────────
  {
    slug: "espresso", category: "hot-coffee", name: "Espresso", tagline: "Two ounces of everything we believe in.",
    description: "A double shot of our Ready Blend — Colombian Huila and Ethiopian Guji — pulled for 28 seconds into a warm demitasse. Thick hazelnut crema, a body like dark syrup and a clean cocoa finish.",
    price: 375, visual: { vessel: "demitasse", liquid: ESP, top: CREMA }, notes: ["Dark cocoa", "Toasted hazelnut", "Brown sugar"], calories: 5, caffeine: 150, groups: ["shots", "extras"],
  },
  {
    slug: "americano", category: "hot-coffee", name: "Americano", tagline: "Espresso, opened up.",
    description: "Two shots of espresso poured over hot filtered water, keeping the crema intact so every sip carries the full aromatics of the blend. Long, bright and quietly bold.",
    price: 425, visual: { vessel: "mug", liquid: ESP, top: "#6b3b1c" }, notes: ["Cacao nib", "Red apple", "Clean finish"], calories: 10, caffeine: 150, groups: BLACK_DRINK,
  },
  {
    slug: "cappuccino", category: "hot-coffee", name: "Cappuccino", tagline: "Equal parts espresso, milk and air.",
    description: "Espresso crowned with a deep cap of velvety microfoam, finished with a dusting of cocoa on request. Lighter than a latte, more expressive than a flat white.",
    price: 525, visual: { vessel: "cup", liquid: LATTE, top: FOAM, art: "heart" }, notes: ["Milk chocolate", "Velvet foam", "Toffee"], calories: 120, caffeine: 150, groups: MILK_DRINK, featured: true,
  },
  {
    slug: "latte", category: "hot-coffee", name: "Latte", tagline: "Silk-textured and endlessly drinkable.",
    description: "Our house espresso folded into steamed milk textured to 140°F — sweet, round and finished with a hand-poured rosetta.",
    price: 550, visual: { vessel: "mug", liquid: LATTE, top: FOAM, art: "rosetta" }, notes: ["Caramelized milk", "Hazelnut", "Soft cocoa"], calories: 190, caffeine: 150, groups: MILK_DRINK,
  },
  {
    slug: "mocha", category: "hot-coffee", name: "Mocha", tagline: "Dark chocolate, meet espresso.",
    description: "70% single-origin dark chocolate melted into espresso and steamed milk. Rich without being heavy, finished with shaved chocolate.",
    price: 625, visual: { vessel: "mug", liquid: MOCHA, top: "#d8c0a2", toppings: ["chocolate"] }, notes: ["Dark chocolate", "Espresso", "Cream"], calories: 290, caffeine: 175, groups: MILK_DRINK,
  },
  {
    slug: "macchiato", category: "hot-coffee", name: "Espresso Macchiato", tagline: "Espresso, marked with foam.",
    description: "A double shot 'stained' with a spoonful of dense microfoam — the Italian way. Intense, sweet-edged and gone in four sips.",
    price: 450, visual: { vessel: "demitasse", liquid: ESP, top: FOAM, art: "heart" }, notes: ["Molasses", "Sweet cream", "Cocoa"], calories: 25, caffeine: 150, groups: ["shots", "milk", "extras"],
  },
  {
    slug: "flat-white", category: "hot-coffee", name: "Flat White", tagline: "The barista's latte.",
    description: "A ristretto double with a thin, glossy layer of microfoam, served smaller and stronger than a latte so the coffee leads.",
    price: 550, visual: { vessel: "cup", liquid: LATTE, top: "#e6d3b8", art: "tulip" }, notes: ["Ristretto sweetness", "Silk", "Praline"], calories: 140, caffeine: 150, groups: MILK_DRINK,
  },
  {
    slug: "caramel-latte", category: "hot-coffee", name: "Caramel Latte", tagline: "Slow-cooked caramel, real butter.",
    description: "We cook our caramel in small batches with cultured butter and a pinch of sea salt, then fold it into espresso and steamed milk. Finished with a caramel lattice.",
    price: 625, visual: { vessel: "mug", liquid: MILKY, top: FOAM, toppings: ["caramel"] }, notes: ["Burnt sugar", "Butter", "Espresso"], calories: 250, caffeine: 150, groups: MILK_DRINK, featured: true,
  },
  {
    slug: "vanilla-latte", category: "hot-coffee", name: "Vanilla Latte", tagline: "Madagascar vanilla, steeped in-house.",
    description: "Whole Madagascar vanilla beans steeped into our house syrup, with espresso and steamed milk. Floral, warm and unmistakably real.",
    price: 600, visual: { vessel: "mug", liquid: MILKY, top: FOAM, art: "rosetta" }, notes: ["Vanilla bean", "Cream", "Honey"], calories: 230, caffeine: 150, groups: MILK_DRINK,
  },

  // ── Iced ─────────────────────────────────────────────
  {
    slug: "iced-latte", category: "iced-coffee", name: "Iced Latte", tagline: "Espresso over ice and cold milk.",
    description: "Fresh espresso poured over clear, slow-frozen ice and cold whole milk for those beautiful layers. Stir, sip, repeat.",
    price: 595, visual: { vessel: "tall", liquid: MILKY, top: "#5c3018", layers: [MILKY, "#a36d40", "#4a240f"], ice: true }, notes: ["Cold milk", "Cocoa", "Caramel"], calories: 150, caffeine: 150, groups: MILK_DRINK, featured: true,
  },
  {
    slug: "iced-americano", category: "iced-coffee", name: "Iced Americano", tagline: "Bright, cold and clean.",
    description: "Two shots of espresso over cold filtered water and ice. Crisp, refreshing and full of character.",
    price: 475, visual: { vessel: "tall", liquid: "#3a1a0b", top: "#5a2c12", ice: true }, notes: ["Cacao", "Citrus peel", "Clean"], calories: 10, caffeine: 150, groups: BLACK_DRINK,
  },
  {
    slug: "iced-mocha", category: "iced-coffee", name: "Iced Mocha", tagline: "Chocolate milk, all grown up.",
    description: "Dark chocolate ganache, espresso and cold milk over ice, finished with whipped cream and cocoa.",
    price: 650, visual: { vessel: "tall", liquid: MOCHA, top: "#f3e9da", layers: ["#7a4a2c", MOCHA], ice: true, toppings: ["whip", "cocoa"] }, notes: ["Ganache", "Espresso", "Whipped cream"], calories: 330, caffeine: 175, groups: MILK_DRINK,
  },
  {
    slug: "cold-brew", category: "iced-coffee", name: "Cold Brew", tagline: "Steeped for eighteen hours.",
    description: "Coarse-ground single-origin Brazil steeped cold for 18 hours, then filtered twice. Naturally sweet, low in acidity and remarkably smooth.",
    price: 525, visual: { vessel: "tumbler", liquid: COLD, top: "#3b1b0c", ice: true }, notes: ["Dark chocolate", "Molasses", "Smooth"], calories: 5, caffeine: 205, groups: BLACK_DRINK, featured: true,
  },
  {
    slug: "caramel-cold-brew", category: "iced-coffee", name: "Caramel Cold Brew", tagline: "Cold brew with a caramel heart.",
    description: "Our 18-hour cold brew sweetened with house caramel and finished with a float of cream that cascades as you sip.",
    price: 625, visual: { vessel: "tumbler", liquid: COLD, top: "#d7b48a", layers: [COLD, "#5a2d14"], ice: true, toppings: ["caramel"] }, notes: ["Caramel", "Cream", "Cocoa"], calories: 140, caffeine: 205, groups: ["size", "sweetness", "extras"],
  },
  {
    slug: "vanilla-cold-brew", category: "iced-coffee", name: "Vanilla Cold Brew", tagline: "Smooth, floral, quietly sweet.",
    description: "Cold brew with a measure of Madagascar vanilla syrup and a splash of cream. The easiest coffee you'll ever love.",
    price: 600, visual: { vessel: "tumbler", liquid: COLD, top: "#e9dcc6", layers: [COLD, "#6b3a1d"], ice: true }, notes: ["Vanilla bean", "Cream", "Chocolate"], calories: 110, caffeine: 205, groups: ["size", "sweetness", "extras"],
  },

  // ── Signature ────────────────────────────────────────
  {
    slug: "all-ready-signature-latte", category: "signature", name: "All Ready Signature Latte", tagline: "The one we're known for.",
    description: "Espresso, wildflower honey and oat milk steamed with a whisper of sea salt and orange zest, finished with a cinnamon quill. Warm, bright and deeply comforting — our house in a cup.",
    price: 695, visual: { vessel: "tall", liquid: MILKY, top: FOAM, layers: [MILKY, "#b07c4c", "#6d3a17"], toppings: ["cinnamon", "caramel"], ice: true }, notes: ["Wildflower honey", "Orange zest", "Sea salt"], calories: 210, caffeine: 150, groups: MILK_DRINK, featured: true,
  },
  {
    slug: "brown-sugar-espresso", category: "signature", name: "Brown Sugar Shaken Espresso", tagline: "Shaken hard, poured cold.",
    description: "Three shots of espresso shaken with dark brown sugar and Ceylon cinnamon until frothy, then poured over ice and topped with oat milk.",
    price: 675, visual: { vessel: "tall", liquid: "#c9a37a", top: "#8a5228", layers: ["#d8bc98", "#9a6235", "#5a2c12"], ice: true, toppings: ["cinnamon"] }, notes: ["Muscovado", "Cinnamon", "Oat"], calories: 160, caffeine: 225, groups: ["size", "milk", "extras"], featured: true,
  },
  {
    slug: "salted-caramel-cream-cold-brew", category: "signature", name: "Salted Caramel Cream Coffee", tagline: "Cold brew under a caramel cloud.",
    description: "18-hour cold brew topped with salted caramel cold foam and a crunch of flaky Oregon sea salt. Sweet, salty, smooth — impossible to put down.",
    price: 695, visual: { vessel: "tumbler", liquid: COLD, top: "#e2c49c", layers: [COLD, "#4a230f"], ice: true, toppings: ["caramel", "salt"] }, notes: ["Salted caramel", "Cold foam", "Cocoa"], calories: 220, caffeine: 205, groups: ["size", "sweetness", "extras"], featured: true,
  },
  {
    slug: "chocolate-espresso", category: "signature", name: "Midnight Chocolate Espresso", tagline: "Ganache and espresso, nothing else.",
    description: "A double ristretto poured over warm 72% Peruvian chocolate ganache. Dense, glossy and decadent — dessert that keeps you awake.",
    price: 650, visual: { vessel: "demitasse", liquid: "#24110a", top: "#6a3a20", toppings: ["chocolate"] }, notes: ["72% cacao", "Black cherry", "Espresso"], calories: 180, caffeine: 150, groups: ["shots", "extras"],
  },
  {
    slug: "maple-pecan-latte", category: "signature", name: "Maple Pecan Latte", tagline: "Autumn, steamed.",
    description: "Grade A Vermont maple, toasted pecan praline and espresso with steamed milk, topped with candied pecan crumble. Available through November.",
    price: 725, visual: { vessel: "mug", liquid: "#b88559", top: FOAM, toppings: ["caramel", "cinnamon"], art: "tulip" }, notes: ["Maple", "Toasted pecan", "Brown butter"], calories: 280, caffeine: 150, groups: MILK_DRINK, seasonal: true, featured: true,
  },
  {
    slug: "cardamom-cream-cortado", category: "signature", name: "Cardamom Cream Cortado", tagline: "Small, spiced, perfectly balanced.",
    description: "A cortado cut with cardamom-infused cream and a touch of raw sugar. Fragrant and short — a four-ounce reset.",
    price: 625, visual: { vessel: "cup", liquid: "#9a6a42", top: "#eadbc4", art: "heart", toppings: ["cinnamon"] }, notes: ["Green cardamom", "Raw sugar", "Cream"], calories: 90, caffeine: 150, groups: ["milk", "extras"],
  },

  // ── Bakery ───────────────────────────────────────────
  {
    slug: "butter-croissant", category: "bakery", name: "Butter Croissant", tagline: "Eighty-one layers of cultured butter.",
    description: "Laminated over three days with cultured Normandy-style butter. Shattering outside, honeycombed and tender within.",
    price: 425, visual: { vessel: "pastry", liquid: "#c98a3e", top: "#e8b46a", pastry: "croissant" }, notes: ["Cultured butter", "Honeycomb crumb"], calories: 290, groups: ["serve"], stock: 36,
  },
  {
    slug: "chocolate-croissant", category: "bakery", name: "Chocolate Croissant", tagline: "Two batons of dark chocolate.",
    description: "Our croissant dough wrapped around two batons of 64% dark chocolate. Best enjoyed warm, when the chocolate is just melting.",
    price: 495, visual: { vessel: "pastry", liquid: "#c07f36", top: "#3a1c0e", pastry: "pain-au-chocolat" }, notes: ["64% chocolate", "Butter"], calories: 340, groups: ["serve"], stock: 30, featured: true,
  },
  {
    slug: "almond-croissant", category: "bakery", name: "Almond Croissant", tagline: "Twice-baked, frangipane-filled.",
    description: "Yesterday's croissant reborn: soaked in vanilla syrup, filled with almond frangipane, crowned with toasted almonds and powdered sugar.",
    price: 525, visual: { vessel: "pastry", liquid: "#c48a46", top: "#f1e6d6", pastry: "almond-croissant", toppings: ["almond", "sugar"] }, notes: ["Frangipane", "Toasted almond"], calories: 420, groups: ["serve"], stock: 18,
  },
  {
    slug: "banana-walnut-bread", category: "bakery", name: "Banana Walnut Bread", tagline: "Brown butter, toasted walnuts.",
    description: "Very ripe bananas, brown butter and toasted Oregon walnuts baked into a dense, tender loaf. Served by the thick slice.",
    price: 450, visual: { vessel: "pastry", liquid: "#8a5326", top: "#5e3417", pastry: "banana-bread" }, notes: ["Brown butter", "Walnut", "Banana"], calories: 380, groups: ["serve"], stock: 24,
  },
];

export const ZONE_SEED = [
  { name: "Pearl District & Old Town", postalCodes: ["97209", "97208"], feeCents: 299, minOrderCents: 1200, freeOverCents: 4000, etaMinMinutes: 20, etaMaxMinutes: 30, sortOrder: 1 },
  { name: "Downtown & Goose Hollow", postalCodes: ["97201", "97204", "97205"], feeCents: 349, minOrderCents: 1200, freeOverCents: 4000, etaMinMinutes: 25, etaMaxMinutes: 35, sortOrder: 2 },
  { name: "Northwest & Slabtown", postalCodes: ["97210"], feeCents: 399, minOrderCents: 1500, freeOverCents: 4500, etaMinMinutes: 25, etaMaxMinutes: 40, sortOrder: 3 },
  { name: "Central Eastside & Buckman", postalCodes: ["97214", "97232"], feeCents: 449, minOrderCents: 1500, freeOverCents: 5000, etaMinMinutes: 30, etaMaxMinutes: 45, sortOrder: 4 },
  { name: "North & Mississippi", postalCodes: ["97227", "97217"], feeCents: 549, minOrderCents: 2000, freeOverCents: 6000, etaMinMinutes: 35, etaMaxMinutes: 50, sortOrder: 5 },
];

export const DISCOUNT_SEED = [
  { code: "WELCOME15", description: "15% off your first order over $15", type: "percent" as const, value: 15, minSubtotalCents: 1500, maxRedemptions: 1000, isActive: true },
  { code: "READY5", description: "$5 off orders over $30", type: "fixed" as const, value: 500, minSubtotalCents: 3000, maxRedemptions: null, isActive: true },
  { code: "MORNINGRITUAL", description: "10% off weekday breakfast orders", type: "percent" as const, value: 10, minSubtotalCents: 1000, maxRedemptions: null, isActive: false },
];

export const SETTINGS_SEED: Record<string, unknown> = {
  tax_rate_bps: 0, // Oregon has no state sales tax
  prep_minutes: 8,
  delivery_paused: false,
  delivery_notice: "Estimates are based on live kitchen volume and traffic — we'll keep you posted at every step.",
};
