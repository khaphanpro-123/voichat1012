import DashboardLayout from "@/components/DashboardLayout";
import PronunciationPractice from "@/components/PronunciationPractice";

export default function PronunciationPage() {
  return (
    <DashboardLayout userLevel="Intermediate">
      <PronunciationPractice />
    </DashboardLayout>
  );
}
