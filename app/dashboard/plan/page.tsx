import { Calendar } from "lucide-react";
import { AIPage } from "@/components/AIPage";

export default function PlanPage() {
  return (
    <AIPage
      icon={Calendar}
      iconColor="text-teal-400"
      iconBg="bg-teal-400/10"
      title="Weekly Content Planner"
      subtitle="One anchor, one cheap video, three Shorts — built around your actual hours."
      skill="yt-plan"
      inputLabel="How many hours do you have this week?"
      inputPlaceholder='e.g. "5 hours total, my niche is personal finance, I post on Tuesdays and Thursdays"'
      multiline
      rows={4}
      buttonText="Build My Week"
      buildPrompt={(input) =>
        `Create a weekly content plan for a YouTube creator with these constraints:\n${input}`
      }
    />
  );
}
