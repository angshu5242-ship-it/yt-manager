#!/usr/bin/env python3
"""
deadair.py — Edit decision list generator from youtube-agent-skill
Reads SRT/VTT transcripts and flags dead air, filler cues, and retakes.
"""

import sys
import re
import json
import argparse


FILLER_WORDS = [
    r'\bum+\b', r'\buh+\b', r'\blike\b', r'\byou know\b', r'\bso\b',
    r'\bbasically\b', r'\bliterally\b', r'\bactually\b', r'\bhonestly\b',
    r'\bright\b', r'\bokay so\b', r'\balright so\b', r'\bkind of\b',
    r'\bsort of\b', r'\bi mean\b', r'\byou see\b', r'\bthe thing is\b',
]

DEAD_AIR_THRESHOLD = 1.5  # seconds


def parse_timecode_srt(tc: str) -> float:
    """Convert SRT timecode HH:MM:SS,mmm to seconds."""
    tc = tc.strip().replace(',', '.')
    parts = tc.split(':')
    try:
        h, m, s = parts
        return float(h) * 3600 + float(m) * 60 + float(s)
    except (ValueError, IndexError):
        return 0.0


def format_timecode(seconds: float) -> str:
    h = int(seconds) // 3600
    m = (int(seconds) % 3600) // 60
    s = int(seconds) % 60
    return f"{h}:{m:02d}:{s:02d}"


def parse_srt(content: str) -> list[dict]:
    """Parse SRT subtitle file into segments."""
    segments = []
    blocks = re.split(r'\n\n+', content.strip())
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
        # Line 0: index, Line 1: timecode, Line 2+: text
        tc_line = lines[1] if len(lines) > 1 else ""
        tc_match = re.match(
            r'(\d+:\d+:\d+[,\.]\d+)\s*-->\s*(\d+:\d+:\d+[,\.]\d+)',
            tc_line
        )
        if not tc_match:
            continue
        start = parse_timecode_srt(tc_match.group(1))
        end = parse_timecode_srt(tc_match.group(2))
        text = ' '.join(lines[2:]).strip()
        if text:
            segments.append({"start": start, "end": end, "text": text})
    return segments


def parse_plain_text(content: str) -> list[dict]:
    """Parse plain text (no timecodes) into fake segments for analysis."""
    sentences = re.split(r'(?<=[.!?])\s+', content.strip())
    segments = []
    t = 0.0
    for sent in sentences:
        words = len(sent.split())
        duration = max(words * 0.4, 0.5)  # ~150 wpm estimate
        segments.append({"start": t, "end": t + duration, "text": sent})
        t += duration + 0.3
    return segments


def analyze_transcript(segments: list[dict]) -> dict:
    edl = []  # Edit Decision List

    for i, seg in enumerate(segments):
        text = seg["text"]
        text_lower = text.lower()
        tc = format_timecode(seg["start"])

        # Dead air: gap between segments
        if i > 0:
            gap = seg["start"] - segments[i - 1]["end"]
            if gap >= DEAD_AIR_THRESHOLD:
                edl.append({
                    "timecode": format_timecode(segments[i - 1]["end"]),
                    "type": "DEAD_AIR",
                    "description": f"{gap:.1f}s pause — cut here",
                    "severity": "HIGH" if gap > 3 else "MEDIUM",
                })

        # Filler words
        for pattern in FILLER_WORDS:
            matches = re.findall(pattern, text_lower)
            if matches:
                for match in matches:
                    edl.append({
                        "timecode": tc,
                        "type": "FILLER",
                        "description": f'"{match}" — cut word',
                        "severity": "LOW",
                    })

        # Retake detection (repeated sentence start)
        if i > 0:
            prev_words = segments[i - 1]["text"].lower().split()[:5]
            curr_words = text_lower.split()[:5]
            common = sum(1 for a, b in zip(prev_words, curr_words) if a == b)
            if common >= 4:
                edl.append({
                    "timecode": format_timecode(segments[i - 1]["start"]),
                    "type": "RETAKE",
                    "description": "Repeated sentence — use second take",
                    "severity": "HIGH",
                })

    # Summary stats
    dead_air_count = sum(1 for e in edl if e["type"] == "DEAD_AIR")
    filler_count = sum(1 for e in edl if e["type"] == "FILLER")
    retake_count = sum(1 for e in edl if e["type"] == "RETAKE")

    return {
        "summary": {
            "total_flags": len(edl),
            "dead_air": dead_air_count,
            "filler_words": filler_count,
            "retakes": retake_count,
            "segments_analyzed": len(segments),
        },
        "edl": edl,
    }


def main():
    parser = argparse.ArgumentParser(description="Generate edit decision list from transcript")
    parser.add_argument("file", nargs="?", help="SRT file or plain text transcript")
    parser.add_argument("--text", type=str, help="Transcript text directly")
    args = parser.parse_args()

    if args.text:
        content = args.text
        segments = parse_plain_text(content)
    elif args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            content = f.read()
        if args.file.endswith(".srt") or "-->" in content:
            segments = parse_srt(content)
        else:
            segments = parse_plain_text(content)
    elif not sys.stdin.isatty():
        content = sys.stdin.read()
        segments = parse_srt(content) if "-->" in content else parse_plain_text(content)
    else:
        print("Usage: python deadair.py transcript.srt")
        sys.exit(1)

    result = analyze_transcript(segments)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
