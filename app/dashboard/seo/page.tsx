"use client";

import { Search } from "lucide-react";
import { AIPage } from "@/components/AIPage";

export default function SEOPage() {
  return (
    <AIPage
      icon={Search}
      iconColor="text-indigo-400"
      iconBg="bg-indigo-400/10"
      title="SEO + Description"
      subtitle="Description, tags worth having, and the 3 queries this video should win."
      skill="yt-seo"
      inputLabel="Video title and topic"
      inputPlaceholder="e.g. Title: 'I Built a $10K/Month Business in 6 Months' — Topic: dropshipping, e-commerce, side hustle"
      multiline
      rows={4}
      buttonText="Generate SEO"
      buildPrompt={(input) =>
        `Write SEO description and tags for this YouTube video:\n${input}`
      }
    />
  );
}
