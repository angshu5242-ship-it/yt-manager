"use client";

import { BookOpen } from "lucide-react";
import { AIPage } from "@/components/AIPage";

export default function ChaptersPage() {
  return (
    <AIPage
      icon={BookOpen}
      iconColor="text-rose-400"
      iconBg="bg-rose-400/10"
      title="Chapters Generator"
      subtitle="Validated chapters from your transcript. Guaranteed to render on YouTube."
      skill="yt-chapters"
      inputLabel="Transcript or outline"
      inputPlaceholder="Paste your transcript or outline here. Include timecodes if you have them (e.g. 0:00, 2:30, 5:15)..."
      multiline
      rows={10}
      buttonText="Generate Chapters"
      buildPrompt={(input) =>
        `Generate YouTube chapter markers from this transcript/outline. Validate them against YouTube's rules.\n\n${input}`
      }
    />
  );
}
