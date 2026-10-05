"use client";

import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/Sidebar";
import { useState } from "react";
import { ModelId } from "@/lib/ai/router";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedModel, setSelectedModel] = useState<ModelId>("gemini-1.5-flash");

  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar selectedModel={selectedModel} onModelChange={setSelectedModel} />
        <main className="flex-1 overflow-y-auto">
          {/* Inject model as a data attribute so child pages can read it */}
          <div data-model={selectedModel} className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}
