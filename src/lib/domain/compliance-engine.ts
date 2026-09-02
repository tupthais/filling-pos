import { InMemoryMarketingStore } from "./in-memory-store";
import { complianceRequestSchema } from "./schemas";
import { assertWorkspaceContext } from "./tenant-context";
import { ComplianceCheck, ComplianceStatus, TenantContext } from "./types";

export class BrandComplianceEngine {
  constructor(private readonly store: InMemoryMarketingStore) {}

  check(context: TenantContext, input: unknown): ComplianceCheck {
    assertWorkspaceContext(context);
    const request = complianceRequestSchema.parse(input);
    const rules = this.store.list(this.store.brandRules, context).filter((rule) => rule.isActive);
    const identity = this.store.list(this.store.brandIdentities, context)[0];
    const tones = this.store.list(this.store.toneOfVoices, context);
    const reasons: string[] = [];
    const evidence: Record<string, unknown> = { matchedRules: [], checkedColors: request.metadata.colors, checkedFonts: request.metadata.fonts };

    for (const rule of rules) {
      const normalizedText = request.text.toLowerCase();
      const normalizedRule = rule.rule.toLowerCase();
      if (rule.type === "forbidden_word" && normalizedText.includes(normalizedRule)) {
        reasons.push(`Forbidden word or phrase matched: ${rule.rule}`);
        (evidence.matchedRules as unknown[]).push({ ruleId: rule.id, rule: rule.rule, severity: rule.severity });
      }
      if (rule.type === "color" && request.metadata.colors.includes(rule.rule)) {
        reasons.push(`Forbidden color used: ${rule.rule}`);
        (evidence.matchedRules as unknown[]).push({ ruleId: rule.id, rule: rule.rule, severity: rule.severity });
      }
      if (rule.type === "font" && request.metadata.fonts.includes(rule.rule)) {
        reasons.push(`Forbidden font used: ${rule.rule}`);
        (evidence.matchedRules as unknown[]).push({ ruleId: rule.id, rule: rule.rule, severity: rule.severity });
      }
    }

    for (const tone of tones) {
      for (const phrase of tone.bannedPhrases) {
        if (request.text.toLowerCase().includes(phrase.toLowerCase())) {
          reasons.push(`Tone banned phrase matched: ${phrase}`);
          (evidence.matchedRules as unknown[]).push({ toneId: tone.id, phrase });
        }
      }
    }

    if (identity) {
      const allowedColors = Object.values(identity.colorSystem).filter(Boolean);
      const offBrandColors = request.metadata.colors.filter((color) => !allowedColors.includes(color));
      if (offBrandColors.length > 0) {
        reasons.push(`Color metadata includes non-CI colors: ${offBrandColors.join(", ")}`);
      }
      if (request.metadata.logoAssetId && identity.logoAssetId && request.metadata.logoAssetId !== identity.logoAssetId) {
        reasons.push("Logo metadata does not match the active brand identity.");
      }
    }

    const hasHardFail = (evidence.matchedRules as Array<{ severity?: ComplianceStatus }>).some((match) => match.severity === "fail");
    const status: ComplianceStatus = hasHardFail ? "fail" : reasons.length > 0 ? "warning" : "pass";
    const check: ComplianceCheck = {
      id: this.store.id("compliance"),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      subjectType: request.subjectType,
      subjectId: request.subjectId,
      status,
      reasons,
      evidence,
      createdAt: this.store.now(),
    };
    this.store.put(this.store.complianceChecks, context, check);
    this.store.audit(context, { action: "compliance_check", entityType: "ComplianceCheck", entityId: check.id, after: check });
    return check;
  }

  canPublish(check: ComplianceCheck) {
    return check.status !== "fail";
  }
}
