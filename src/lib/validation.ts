import { z } from "zod";
import { cleanMultiline, cleanText } from "@/lib/security/sanitize";

const text = (max: number) => z.string().transform((v) => cleanText(v, max));
const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? cleanText(v, max) : null))
    .transform((v) => (v === "" ? null : v));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Enter a valid email address.");

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

export const phoneSchema = z
  .string()
  .trim()
  .max(32)
  .refine((v) => v === "" || /^[+()\-.\s\d]{7,32}$/.test(v), "Enter a valid phone number.")
  .transform((v) => (v === "" ? null : v));

export const signUpSchema = z.object({
  name: text(80).pipe(z.string().min(2, "Tell us your name.")),
  email: emailSchema,
  password: z.string().min(1, "Choose a password.").max(128),
  marketing: z.boolean().default(false),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
});

export const addressSchema = z.object({
  label: text(30).pipe(z.string().min(1, "Give this address a label.")),
  recipient: text(80).pipe(z.string().min(2, "Who should we hand it to?")),
  line1: text(120).pipe(z.string().min(4, "Enter a street address.")),
  line2: optionalText(80),
  city: text(60).pipe(z.string().min(2, "Enter a city.")),
  state: z.enum(US_STATES, { errorMap: () => ({ message: "Choose a state." }) }),
  postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP code."),
  instructions: optionalText(200),
  isDefault: z.boolean().default(false),
});

export const profileSchema = z.object({
  name: text(80).pipe(z.string().min(2, "Tell us your name.")),
  phone: phoneSchema,
});

export const selectionsSchema = z.record(z.string().max(40), z.array(z.number().int().positive()).max(12)).refine((r) => Object.keys(r).length <= 10);

export const cartLineSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20),
  selections: selectionsSchema,
});

export const checkoutSchema = z.object({
  lines: z.array(cartLineSchema).min(1, "Your bag is empty.").max(30),
  addressId: z.string().uuid().optional().nullable(),
  address: addressSchema.omit({ label: true, isDefault: true }).optional().nullable(),
  saveAddress: z.boolean().default(false),
  phone: phoneSchema,
  notes: optionalText(280),
  tipCents: z.number().int().min(0).max(10000),
  discountCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(32)
    .optional()
    .nullable(),
  // Simulated payment: only non-sensitive descriptors ever reach the server.
  payment: z.object({
    brand: z.enum(["Visa", "Mastercard", "Amex", "Discover", "Card"]),
    last4: z.string().regex(/^\d{4}$/),
    expiryValid: z.literal(true),
    nameOnCard: text(80).pipe(z.string().min(2)),
  }),
});

export const productInputSchema = z.object({
  name: text(80).pipe(z.string().min(2, "Name is required.")),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes.")
    .max(80),
  categoryId: z.coerce.number().int().positive("Choose a category."),
  tagline: text(140),
  description: z.string().transform((v) => cleanMultiline(v, 1200)),
  price: z.coerce.number().min(0.5, "Price must be at least $0.50.").max(200),
  calories: z.coerce.number().int().min(0).max(5000).optional().nullable(),
  caffeineMg: z.coerce.number().int().min(0).max(1000).optional().nullable(),
  tastingNotes: z.string().transform((v) =>
    cleanText(v, 200)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 5),
  ),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
  isSeasonal: z.boolean(),
  groupIds: z.array(z.coerce.number().int().positive()).max(10),
  vessel: z.enum(["demitasse", "cup", "mug", "tall", "tumbler", "pastry"]),
  liquid: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  top: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ice: z.boolean(),
});

export const zoneInputSchema = z
  .object({
    name: text(80).pipe(z.string().min(2)),
    postalCodes: z.string().transform((v) =>
      v
        .split(/[\s,]+/)
        .map((x) => x.trim())
        .filter((x) => /^\d{5}$/.test(x))
        .slice(0, 40),
    ),
    fee: z.coerce.number().min(0).max(50),
    minOrder: z.coerce.number().min(0).max(500),
    freeOver: z.coerce.number().min(0).max(1000).optional().nullable(),
    etaMin: z.coerce.number().int().min(5).max(180),
    etaMax: z.coerce.number().int().min(5).max(240),
    isActive: z.boolean(),
  })
  .refine((v) => v.etaMax >= v.etaMin, { message: "Maximum estimate must be at least the minimum.", path: ["etaMax"] })
  .refine((v) => v.postalCodes.length > 0, { message: "Add at least one 5-digit ZIP code.", path: ["postalCodes"] });

export const discountInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,24}$/, "Use 3–24 letters or numbers."),
    description: text(140),
    type: z.enum(["percent", "fixed"]),
    value: z.coerce.number().positive(),
    minSubtotal: z.coerce.number().min(0).max(1000),
    maxRedemptions: z.coerce.number().int().min(1).max(1_000_000).optional().nullable(),
    startsAt: z.string().optional().nullable(),
    endsAt: z.string().optional().nullable(),
    isActive: z.boolean(),
  })
  .refine((v) => (v.type === "percent" ? v.value <= 100 : v.value <= 500), { message: "Percent must be ≤ 100, fixed ≤ $500.", path: ["value"] });

export type FieldErrors = Record<string, string>;

export function zodFieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
