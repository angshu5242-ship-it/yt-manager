"use client";

import { MessageSquare } from "lucide-react";
import { AIPage } from "@/components/AIPage";

export default function CommentPage() {
  return (
    <AIPage
      icon={MessageSquare}
      iconColor="text-pink-400"
      iconBg="bg-pink-400/10"
      title="Comment Manager"
      subtitle="Triage your comments into 4 piles, get replies written in your voice."
      skill="yt-comment"
      inputLabel="Paste your comments"
      inputPlaceholder="Paste the comment section here (one comment per line, or copy-paste from YouTube)..."
      multiline
      rows={10}
      buttonText="Triage Comments"
    />
  );
}
