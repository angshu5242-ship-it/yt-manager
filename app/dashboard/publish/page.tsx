"use client";

import { useState } from "react";
import { Upload, CheckCircle, ExternalLink, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

interface PublishAction {
  type: "title" | "description" | "comment";
  videoId: string;
  content: string;
  label: string;
}

export default function PublishPage() {
  const { data: session } = useSession();
  const [videoId, setVideoId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [chaptersText, setChaptersText] = useState("");
  const [commentReply, setCommentReply] = useState({ commentId: "", reply: "" });
  const [publishing, setPublishing] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  const hasYouTubeToken = !!(session as { accessToken?: string })?.accessToken;

  const publish = async (action: PublishAction) => {
    if (!hasYouTubeToken) {
      toast.error("Sign in with Google to connect YouTube");
      return;
    }
    if (!action.videoId) { toast.error("Enter a video ID"); return; }

    setPublishing(action.type);
    try {
      const res = await fetch("/api/youtube/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`${action.label} published!`);
      setDone((prev) => [...prev, action.type]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-brand-red/10 flex items-center justify-center">
          <Upload size={18} className="text-brand-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Publish to YouTube</h1>
          <p className="text-brand-muted text-sm">
            Push AI-drafted content to your channel via the official YouTube API.
          </p>
        </div>
      </div>

      {/* Auth Status */}
      <div className={`card mb-6 ${hasYouTubeToken ? "border-green-800/50 bg-[#0a1a0a]" : "border-yellow-800/50 bg-[#1a1400]"}`}>
        <div className="flex items-center gap-3">
          {hasYouTubeToken ? (
            <>
              <CheckCircle size={18} className="text-green-400" />
              <div>
                <div className="text-sm font-medium text-green-400">YouTube connected</div>
                <div className="text-xs text-brand-muted">Signed in as {session?.user?.email}</div>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle size={18} className="text-yellow-400" />
              <div>
                <div className="text-sm font-medium text-yellow-400">YouTube not connected</div>
                <div className="text-xs text-brand-muted">
                  Sign in with Google on the login page to connect your channel.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Video ID Input */}
      <div className="card mb-6">
        <label className="label">
          YouTube Video ID
          <a
            href="https://studio.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-brand-red hover:underline inline-flex items-center gap-1 text-xs"
          >
            Open YouTube Studio <ExternalLink size={10} />
          </a>
        </label>
        <input
          className="input"
          placeholder="e.g. dQw4w9WgXcQ (from the video URL)"
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
        />
      </div>

      {/* Push Title */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title mb-0">Push Title</div>
          {done.includes("title") && <CheckCircle size={16} className="text-green-400" />}
        </div>
        <input
          className="input mb-3"
          placeholder="New title (max 100 chars)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          maxLength={100}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-brand-muted">{newTitle.length}/100 chars</span>
          <button
            onClick={() => publish({ type: "title", videoId, content: newTitle, label: "Title" })}
            disabled={!newTitle || publishing === "title" || !videoId}
            className="btn-primary text-sm py-1.5 px-4"
          >
            {publishing === "title" ? "Publishing..." : "Push Title"}
          </button>
        </div>
      </div>

      {/* Push Chapters */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title mb-0">Push Chapters to Description</div>
          {done.includes("description") && <CheckCircle size={16} className="text-green-400" />}
        </div>
        <textarea
          className="textarea mb-3"
          rows={6}
          placeholder={"0:00 Introduction\n1:30 Main Point\n5:00 Conclusion\n\n(Paste your AI-generated chapters here)"}
          value={chaptersText}
          onChange={(e) => setChaptersText(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            onClick={() =>
              publish({ type: "description", videoId, content: chaptersText, label: "Chapters" })
            }
            disabled={!chaptersText || publishing === "description" || !videoId}
            className="btn-primary text-sm py-1.5 px-4"
          >
            {publishing === "description" ? "Publishing..." : "Push Chapters"}
          </button>
        </div>
      </div>

      {/* Reply to Comment */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title mb-0">Reply to Comment</div>
          {done.includes("comment") && <CheckCircle size={16} className="text-green-400" />}
        </div>
        <input
          className="input mb-3"
          placeholder="Comment ID (from YouTube Studio)"
          value={commentReply.commentId}
          onChange={(e) => setCommentReply({ ...commentReply, commentId: e.target.value })}
        />
        <textarea
          className="textarea mb-3"
          rows={3}
          placeholder="Your reply text..."
          value={commentReply.reply}
          onChange={(e) => setCommentReply({ ...commentReply, reply: e.target.value })}
        />
        <div className="flex justify-end">
          <button
            onClick={() =>
              publish({
                type: "comment",
                videoId,
                content: JSON.stringify(commentReply),
                label: "Comment reply",
              })
            }
            disabled={!commentReply.reply || !commentReply.commentId || publishing === "comment"}
            className="btn-primary text-sm py-1.5 px-4"
          >
            {publishing === "comment" ? "Posting..." : "Post Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
