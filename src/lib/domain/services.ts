import { AgentOrchestrationService } from "./agent-orchestration";
import { BrandComplianceEngine } from "./compliance-engine";
import { CompanyBrainService } from "./company-brain-service";
import { marketingStore } from "./in-memory-store";

export const companyBrainService = new CompanyBrainService(marketingStore);
export const complianceEngine = new BrandComplianceEngine(marketingStore);
export const agentOrchestrationService = new AgentOrchestrationService(marketingStore);
export { marketingStore };
