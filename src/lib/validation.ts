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

const CANONICAL_READING_STATUSES = [
  "UNREAD",
  "BACKLOG",
  "IN_PROGRESS",
  "COMPLETED",
  "DROPPED",
] as const;

const LEGACY_READING_STATUS_MAP: Record<string, (typeof CANONICAL_READING_STATUSES)[number]> = {
  READING: "IN_PROGRESS",
  READ: "COMPLETED",
};

const readingStatusEnum = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  return LEGACY_READING_STATUS_MAP[value] ?? value;
}, z.enum(CANONICAL_READING_STATUSES));

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
  contentType: z.string().trim().min(1).default("OTHER"),
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
    .enum(["MANUAL", "SMART_ALERT"])
    .optional(),
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
    contentType: z.string().trim().min(1).optional(),
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

export const workspaceSessionCreateSchema = z
  .object({
    candidatePaperId: z.string().cuid().optional(),
    arxivUrl: z.string().trim().min(1).max(2048).optional(),
  })
  .refine((value) => Boolean(value.candidatePaperId || value.arxivUrl), {
    message: 'candidatePaperId or arxivUrl is required',
  })
  .strict();

export const workspaceSummaryRequestSchema = z
  .object({
    summaryType: z.enum(['overview', 'section']),
    sectionIndex: z.number().int().min(0).optional(),
    regenerate: z.boolean().optional(),
  })
  .strict();

export const workspaceAskSchema = z
  .object({
    question: z.string().trim().min(1, 'Question is required').max(500, 'Question must be 500 characters or fewer'),
  })
  .strict();

export const workspaceMessageListSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(50),
  })
  .strict();

export const workspaceSessionListSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(20).default(10),
  })
  .strict();

export const onboardingCompleteSchema = z
  .object({
    selectedInterests: z
      .array(z.string())
      .max(10, "Select at most 10 interests"),
    selectedFeedIds: z.array(z.string()).default([]),
  })
  .strict();

export const researchInterestsUpdateSchema = z
  .object({
    selectedInterests: z
      .array(z.string())
      .min(1, "Select at least 1 interest")
      .max(10, "Select at most 10 interests"),
  })
  .strict();
