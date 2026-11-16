import { RescueDashboard } from "@/components/rescue/rescue-dashboard";
import { RoleGate } from "@/components/layout/RoleGate";

export default function RescueDashboardPage() {
  return (
    <RoleGate allowedRoles={["rescue", "admin"]}>
      <RescueDashboard />
    </RoleGate>
  );
}
