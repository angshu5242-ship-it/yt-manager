import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  const session = await auth();
  const accessToken = (session as { accessToken?: string })?.accessToken;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated with YouTube" }, { status: 401 });
  }

  const body = await req.json();
  const { type, videoId, content } = body;

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  try {
    if (type === "title") {
      // Get current video to preserve other fields
      const current = await youtube.videos.list({
        part: ["snippet"],
        id: [videoId],
      });
      const snippet = current.data.items?.[0]?.snippet;
      if (!snippet) return NextResponse.json({ error: "Video not found" }, { status: 404 });

      await youtube.videos.update({
        part: ["snippet"],
        requestBody: {
          id: videoId,
          snippet: { ...snippet, title: content },
        },
      });
      return NextResponse.json({ success: true, message: "Title updated" });
    }

    if (type === "description") {
      const current = await youtube.videos.list({
        part: ["snippet"],
        id: [videoId],
      });
      const snippet = current.data.items?.[0]?.snippet;
      if (!snippet) return NextResponse.json({ error: "Video not found" }, { status: 404 });

      // Append chapters to description
      const existingDesc = snippet.description || "";
      const newDesc = `${existingDesc}\n\n${content}`.trim();

      await youtube.videos.update({
        part: ["snippet"],
        requestBody: {
          id: videoId,
          snippet: { ...snippet, description: newDesc },
        },
      });
      return NextResponse.json({ success: true, message: "Chapters added to description" });
    }

    if (type === "comment") {
      const { commentId, reply } = JSON.parse(content);
      await youtube.comments.insert({
        part: ["snippet"],
        requestBody: {
          snippet: {
            parentId: commentId,
            textOriginal: reply,
          },
        },
      });
      return NextResponse.json({ success: true, message: "Reply posted" });
    }

    return NextResponse.json({ error: "Unknown publish type" }, { status: 400 });
  } catch (err: unknown) {
    console.error("YouTube API error:", err);
    const message = err instanceof Error ? err.message : "YouTube API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
