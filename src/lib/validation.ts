import { z } from "zod";

const collapseSpaces = (s: string) => s.trim().replace(/\s+/g, " ");

export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(254, "Email too long")
  .transform((e) => e.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long");

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(
    /^[a-z0-9_]+$/,
    "Username can only contain lowercase letters, numbers, and underscores"
  );

export const urlSchema = z
  .string()
  .url("Invalid URL")
  .max(2048, "URL too long")
  .refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    "URL must start with http:// or https://"
  );

export const doiSchema = z
  .string()
  .regex(/^10\.\d{4,}[\/.].+$/, "Invalid DOI format")
  .max(255, "DOI too long");

export const searchQuerySchema = z
  .string()
  .min(2, "Search query too short")
  .max(500, "Search query too long")
  .trim();

export const textFieldSchema = (max: number) =>
  z
    .string()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .nullable();

const contentTypeEnum = z.enum([
  "PAPER",
  "BOOK",
  "ARTICLE",
  "BLOG",
  "ESSAY",
  "POLICY_REPORT",
  "OTHER",
]);

const readingStatusEnum = z.enum(["UNREAD", "READING", "READ", "DROPPED"]);

export const entryCreateSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(500, "Title too long")
    .transform(collapseSpaces),
  authors: z
    .array(
      z
        .string()
        .max(200)
        .transform((a) => collapseSpaces(a))
    )
    .max(100)
    .default([]),
  year: z.preprocess((v) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    const n = parseInt(String(v), 10);
    return Number.isNaN(n) ? null : n;
  }, z
    .number()
    .int()
    .min(1000)
    .max(new Date().getFullYear() + 5)
    .nullable()
    .optional()),
  contentType: contentTypeEnum.default("PAPER"),
  url: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    urlSchema.nullable().optional()
  ),
  doi: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    doiSchema.nullable().optional()
  ),
  isbn: z.string().max(20).nullable().optional(),
  source: z
    .union([z.string().max(500), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined) return undefined;
      return collapseSpaces(v);
    }),
  abstract: z
    .union([z.string().max(10000), z.null()])
    .optional()
    .transform((v) =>
      v === null || v === undefined ? null : collapseSpaces(v)
    ),
  summary: z
    .union([z.string().max(5000), z.null()])
    .optional()
    .transform((v) =>
      v === null || v === undefined ? null : collapseSpaces(v)
    ),
  notes: z.array(z.any()).default([]),
  readingStatus: readingStatusEnum.default("UNREAD"),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  /** Client hint only; never persisted */
  skipAI: z.boolean().optional(),
}).strict();

/** PATCH /api/entries/[id] — append a single note */
export const entryNoteAppendSchema = z
  .object({
    notes: z.object({
      text: z.string().min(1).max(50000),
    }),
  })
  .strict();

/** PATCH /api/entries/[id] — field updates (no mass assignment) */
export const entryPatchSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(500)
      .transform(collapseSpaces)
      .optional(),
    authors: z
      .array(z.string().max(200).transform((a) => collapseSpaces(a)))
      .optional(),
    year: z.preprocess((v) => {
      if (v === null || v === undefined || v === "") return null;
      if (typeof v === "number" && !Number.isNaN(v)) return v;
      const n = parseInt(String(v), 10);
      return Number.isNaN(n) ? null : n;
    }, z
      .number()
      .int()
      .min(1000)
      .max(new Date().getFullYear() + 5)
      .nullable()
      .optional()),
    source: z
      .enum(["MANUAL", "SMART_ALERT"])
      .nullable()
      .optional(),
    url: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      urlSchema.nullable().optional()
    ),
    doi: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      doiSchema.nullable().optional()
    ),
    abstract: z
      .union([z.string().max(10000), z.null()])
      .optional()
      .transform((v) =>
        v === null || v === undefined ? undefined : collapseSpaces(v)
      ),
    contentType: contentTypeEnum.optional(),
    readingStatus: readingStatusEnum.optional(),
  })
  .strict();

export const queueItemSchema = z.object({
  inputType: z.enum(["URL", "PAPER", "BOOK"]),
  input: z.string().min(1).max(2048),
  payload: z.record(z.string(), z.any()).nullable().optional(),
}).strict();

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: z.string().length(64),
  password: passwordSchema,
});

export const userProfilePatchSchema = z
  .object({
    username: usernameSchema,
    bio: z.string().max(160).optional().nullable(),
    name: z.string().max(100).optional().nullable(),
    showSignals: z.boolean().optional(),
  })
  .strict();

export const connectionCreateSchema = z.object({
  receiverId: z.string().cuid(),
});

export const referenceRequestCreateSchema = z.object({
  entryId: z.string().cuid(),
  ownerId: z.string().cuid(),
  message: textFieldSchema(280).optional().nullable(),
});
