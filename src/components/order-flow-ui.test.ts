import { describe, expect, it } from "vitest";
import { isFlowStepUnlocked } from "@/components/order-flow-ui";

describe("FlowStepper helpers", () => {
  it("libera apenas a etapa atual e as anteriores", () => {
    expect(isFlowStepUnlocked("addons", "date")).toBe(true);
    expect(isFlowStepUnlocked("addons", "passports")).toBe(true);
    expect(isFlowStepUnlocked("addons", "addons")).toBe(true);
    expect(isFlowStepUnlocked("addons", "payment")).toBe(false);
  });
});
