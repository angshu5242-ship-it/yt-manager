import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);
const SCRIPTS_DIR = path.join(process.cwd(), "scripts");

// Tool definitions: what args they take and how to invoke them
const TOOL_CONFIGS: Record<
  string,
  {
    script: string;
    buildArgs: (body: Record<string, unknown>, tempFile?: string) => string[];
    needsTempFile?: boolean;
    tempExt?: string;
  }
> = {
  hookscore: {
    script: "hookscore.py",
    buildArgs: (body) => ["--hook", body.hook as string],
  },
  title: {
    script: "title.py",
    buildArgs: (body) => {
      const args = ["--title", body.title as string];
      if (body.thumb) args.push("--thumb", body.thumb as string);
      if (body.concept) args.push("--concept", body.concept as string);
      return args;
    },
  },
  deadair: {
    script: "deadair.py",
    needsTempFile: true,
    tempExt: ".srt",
    buildArgs: (body, tempFile) =>
      tempFile ? [tempFile] : ["--text", body.text as string],
  },
  retention: {
    script: "retention.py",
    buildArgs: (body) => {
      if (body.data) {
        return ["--json-input", JSON.stringify(body.data)];
      }
      return [];
    },
    needsTempFile: true,
    tempExt: ".csv",
  },
  chapters: {
    script: "chapters.py",
    buildArgs: (body, tempFile) => {
      const args = tempFile ? [tempFile] : ["--text", body.text as string];
      if (body.duration) args.push("--duration", String(body.duration));
      return args;
    },
    needsTempFile: true,
    tempExt: ".txt",
  },
  swipe: {
    script: "swipe.py",
    needsTempFile: true,
    tempExt: ".json",
    buildArgs: (body, tempFile) => {
      const args = tempFile ? [tempFile] : [];
      if (body.min) args.push("--min", String(body.min));
      return args;
    },
  },
};

export async function POST(
  req: NextRequest,
  { params }: { params: { tool: string } }
) {
  const toolName = params.tool;
  const config = TOOL_CONFIGS[toolName];

  if (!config) {
    return NextResponse.json({ error: `Unknown tool: ${toolName}` }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // Handle file uploads (for retention CSV, SRT files)
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jsonData = formData.get("data");
    if (jsonData) body = JSON.parse(jsonData as string);
    if (file) {
      body._fileContent = await file.text();
      body._fileName = file.name;
    }
  } else {
    body = await req.json().catch(() => ({}));
  }

  let tempFilePath: string | undefined;

  try {
    const scriptPath = path.join(SCRIPTS_DIR, config.script);
    let args: string[];

    if (config.needsTempFile) {
      // Write content to a temp file
      const content =
        (body._fileContent as string) ||
        (toolName === "swipe" ? JSON.stringify(body.videos || body.data) : body.text as string || "");

      if (content) {
        tempFilePath = path.join(tmpdir(), `yt-${randomUUID()}${config.tempExt || ".tmp"}`);
        await writeFile(tempFilePath, content, "utf-8");
      }
    }

    args = config.buildArgs(body, tempFilePath);

    // Determine Python executable (py on Windows, python3 on Unix)
    const pythonBin = process.platform === "win32" ? "py" : "python3";

    const { stdout, stderr } = await execFileAsync(pythonBin, [scriptPath, ...args], {
      timeout: 15000, // 15 second timeout
      maxBuffer: 1024 * 1024, // 1MB output limit
    });

    if (stderr && !stdout) {
      return NextResponse.json({ error: stderr }, { status: 500 });
    }

    const result = JSON.parse(stdout);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Tool execution failed";
    console.error(`Tool ${toolName} failed:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => {});
    }
  }
}
