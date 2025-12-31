import DashboardLayout from "@/components/DashboardLayout";
import ProfileHistory from "@/components/ProfileHistory";

export default function ProfileHistoryPage() {
  return (
    <DashboardLayout userLevel="Intermediate">
      <div className="p-6 md:p-8">
        <ProfileHistory userId="user123" />
      </div>
    </DashboardLayout>
  );
}
