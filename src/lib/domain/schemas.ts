import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

export const companyProfileSchema = z.object({
  companyName: z.string().min(2),
  businessType: z.string().min(2),
  brandStory: z.string().optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
  coreValues: z.array(z.string()).default([]),
});

export const brandIdentitySchema = z.object({
  logoAssetId: z.string().optional(),
  colorSystem: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    text: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
  typography: z.object({
    thaiFont: z.string().min(1),
    englishFont: z.string().min(1),
    heading: z.string().min(1),
    body: z.string().min(1),
  }),
  designRules: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const toneOfVoiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  examples: z.array(z.string()).default([]),
  bannedPhrases: z.array(z.string()).default([]),
});

export const forbiddenRuleSchema = z.object({
  type: z.enum(["forbidden_word", "color", "font", "logo", "tone"]).default("forbidden_word"),
  severity: z.enum(["pass", "warning", "fail"]).default("fail"),
  rule: z.string().min(1),
  evidenceHint: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const assetSchema = z.object({
  kind: z.enum(["logo", "font", "image", "video", "document", "audio"]),
  name: z.string().min(1),
  provider: z.string().default("local-metadata-only"),
  objectKey: z.string().min(1),
  mimeType: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const promptTemplateSchema = z.object({
  name: z.string().min(1),
  channel: z.string().min(1),
  template: z.string().min(1),
  variables: z.array(z.string()).default([]),
});

export const complianceRequestSchema = z.object({
  subjectType: z.string().min(1),
  subjectId: z.string().optional(),
  text: z.string().default(""),
  metadata: z
    .object({
      colors: z.array(z.string()).default([]),
      fonts: z.array(z.string()).default([]),
      logoAssetId: z.string().optional(),
    })
    .default({ colors: [], fonts: [] }),
});

export const agentRunRequestSchema = z.object({
  agentKey: z.string().min(1),
  input: z.record(z.string(), z.unknown()).default({}),
});
