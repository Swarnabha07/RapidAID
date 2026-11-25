import { AiCheckPanel } from "@/components/ai/ai-check-panel";
import { RoleGate } from "@/components/layout/RoleGate";

/**
 * T3 temporary diagnostics page. Admin only. It exists so App Check and
 * hybrid inference can be verified on localhost and production before the T4
 * report form exists. It never reads or writes Firestore.
 */
export default function AiCheckPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <AiCheckPanel />
    </RoleGate>
  );
}
