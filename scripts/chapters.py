#!/usr/bin/env python3
"""
chapters.py — Chapter generator and validator from youtube-agent-skill
Creates YouTube chapter markers from transcripts, validated against YouTube rules.
"""

import sys
import re
import json
import argparse


def parse_timecode(tc: str) -> float:
    parts = tc.strip().split(":")
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    except ValueError:
        pass
    return 0.0


def format_timecode(seconds: float) -> str:
    h = int(seconds) // 3600
    m = (int(seconds) % 3600) // 60
    s = int(seconds) % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def validate_chapters(chapters: list[dict], video_duration: float = None) -> dict:
    """
    Validate chapters against YouTube's rules.
    Each chapter: {"time": seconds, "title": str}
    """
    issues = []
    warnings = []

    if len(chapters) < 3:
        issues.append(f"YouTube requires at least 3 chapters (you have {len(chapters)})")

    if chapters and chapters[0]["time"] != 0:
        issues.append("First chapter MUST start at 0:00")

    for i, ch in enumerate(chapters):
        if len(ch["title"]) > 100:
            issues.append(f"Chapter {i+1} title too long: {len(ch['title'])} chars (max 100)")

        if i > 0:
            gap = ch["time"] - chapters[i-1]["time"]
            if gap < 10:
                issues.append(
                    f"Gap between chapter {i} and {i+1} is only {gap:.0f}s (min 10s)"
                )

    if video_duration and chapters:
        last_time = chapters[-1]["time"]
        if last_time >= video_duration:
            issues.append("Last chapter starts after video ends")

    validated = []
    for ch in chapters:
        validated.append({
            "timecode": format_timecode(ch["time"]),
            "seconds": ch["time"],
            "title": ch["title"],
        })

    return {
        "validation": {
            "pass": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "chapter_count": len(chapters),
        },
        "chapters": validated,
        "youtube_format": "\n".join(
            f"{format_timecode(ch['time'])} {ch['title']}" for ch in chapters
        ),
    }


def extract_chapters_from_text(text: str) -> list[dict]:
    """Try to extract chapters from text that has timecodes."""
    chapters = []
    lines = text.strip().split('\n')
    for line in lines:
        # Match patterns like "0:00 Title" or "1:23:45 Title"
        m = re.match(r'^(\d+:\d+(?::\d+)?)\s+(.+)$', line.strip())
        if m:
            tc_str, title = m.group(1), m.group(2).strip()
            seconds = parse_timecode(tc_str)
            chapters.append({"time": seconds, "title": title})
    return chapters


def main():
    parser = argparse.ArgumentParser(description="Generate and validate YouTube chapters")
    parser.add_argument("file", nargs="?", help="Transcript or chapters text file")
    parser.add_argument("--text", type=str, help="Chapter text directly")
    parser.add_argument("--duration", type=float, help="Video duration in seconds", default=None)
    args = parser.parse_args()

    if args.text:
        content = args.text
    elif args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            content = f.read()
    elif not sys.stdin.isatty():
        content = sys.stdin.read()
    else:
        print("Usage: python chapters.py chapters.txt")
        sys.exit(1)

    chapters = extract_chapters_from_text(content)
    result = validate_chapters(chapters, args.duration)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
