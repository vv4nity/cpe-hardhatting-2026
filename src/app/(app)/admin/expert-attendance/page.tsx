import { PageHeader } from "@/components/app/page-header";
import { ExpertAttendanceCard } from "@/components/admin/expert-attendance-card";

export default function ExpertAttendancePage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="EXPERT ATTENDANCE"
        subtitle="A dedicated tab for the block-president briefing emails and test sends."
      />

      <ExpertAttendanceCard />
    </div>
  );
}