import { MedicalDashboard } from "@/components/dashboard/medical-dashboard";
import { RoleGate } from "@/components/layout/RoleGate";

export default function MedicalDashboardPage() {
  return (
    <RoleGate allowedRoles={["medical", "admin"]}>
      <MedicalDashboard />
    </RoleGate>
  );
}
