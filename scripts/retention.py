#!/usr/bin/env python3
"""
retention.py — Retention curve analyzer from youtube-agent-skill
Reads a YouTube Studio retention export CSV and finds hook leaks,
drop-off cliffs, and the slide.
"""

import sys
import json
import csv
import argparse
from io import StringIO


def parse_timecode(tc: str) -> float:
    """Convert MM:SS or HH:MM:SS to seconds."""
    parts = tc.strip().split(":")
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    except ValueError:
        pass
    return 0.0


def format_time(seconds: float) -> str:
    """Format seconds as MM:SS."""
    m = int(seconds) // 60
    s = int(seconds) % 60
    return f"{m}:{s:02d}"


def analyze_retention(data: list[dict]) -> dict:
    """
    Analyze a retention curve.
    data: list of {"time": seconds_float, "retention": 0-100_float}
    """
    if not data:
        return {"error": "No data provided"}

    # Sort by time
    data = sorted(data, key=lambda x: x["time"])
    times = [d["time"] for d in data]
    retentions = [d["retention"] for d in data]

    # Hook analysis (0–30s)
    hook_data = [(t, r) for t, r in zip(times, retentions) if t <= 30]
    hook_start = hook_data[0][1] if hook_data else 100
    hook_end = hook_data[-1][1] if len(hook_data) > 1 else hook_start
    hook_loss = hook_start - hook_end
    hook_grade = (
        "Strong" if hook_loss < 5 else
        "OK" if hook_loss < 15 else
        "Weak" if hook_loss < 30 else
        "Critical"
    )

    # Find cliffs (drops >5% in a short window)
    cliffs = []
    window = max(1, len(data) // 50)  # ~2% of video length
    for i in range(window, len(data)):
        drop = retentions[i - window] - retentions[i]
        if drop >= 5:
            cliffs.append({
                "timecode": format_time(times[i]),
                "seconds": times[i],
                "drop_percent": round(drop, 1),
                "retention_before": round(retentions[i - window], 1),
                "retention_after": round(retentions[i], 1),
            })

    # Deduplicate cliffs (merge nearby ones)
    merged_cliffs = []
    for cliff in cliffs:
        if merged_cliffs and cliff["seconds"] - merged_cliffs[-1]["seconds"] < 15:
            if cliff["drop_percent"] > merged_cliffs[-1]["drop_percent"]:
                merged_cliffs[-1] = cliff
        else:
            merged_cliffs.append(cliff)

    # Top 3 cliffs by severity
    top_cliffs = sorted(merged_cliffs, key=lambda x: x["drop_percent"], reverse=True)[:3]

    # The slide (gradual loss in the middle 50-80% of video)
    mid_start_idx = int(len(data) * 0.3)
    mid_end_idx = int(len(data) * 0.8)
    if mid_start_idx < mid_end_idx and len(data) > 10:
        slide_start_ret = retentions[mid_start_idx]
        slide_end_ret = retentions[mid_end_idx]
        slide_loss = slide_start_ret - slide_end_ret
        slide_grade = (
            "Minimal" if slide_loss < 10 else
            "Normal" if slide_loss < 25 else
            "Heavy" if slide_loss < 40 else
            "Severe"
        )
    else:
        slide_loss = 0
        slide_grade = "Insufficient data"

    # Overall completion
    final_retention = retentions[-1] if retentions else 0
    avg_retention = sum(retentions) / len(retentions) if retentions else 0

    # Generate fixes
    fixes = []
    if hook_loss > 15:
        fixes.append(
            f"Hook is losing {hook_loss:.0f}% of viewers in the first 30s. "
            "Rewrite the first line — don't introduce yourself, don't preview, just start."
        )
    if top_cliffs:
        biggest = top_cliffs[0]
        fixes.append(
            f"Biggest cliff at {biggest['timecode']} ({biggest['drop_percent']}% drop). "
            "Check what you were saying there — likely a topic change or slow section."
        )
    if slide_grade in ("Heavy", "Severe"):
        fixes.append(
            f"The middle is bleeding viewers ({slide_loss:.0f}% loss). "
            "Add a pattern interrupt at the midpoint, or cut the slow section entirely."
        )
    if avg_retention < 30:
        fixes.append(
            "Overall retention is low. Shorten the video — "
            "the content is longer than the interest."
        )

    if not fixes:
        fixes.append("Retention looks healthy. Focus on growing the top of funnel.")

    return {
        "summary": {
            "total_data_points": len(data),
            "video_length": format_time(times[-1]) if times else "0:00",
            "average_retention": round(avg_retention, 1),
            "final_retention": round(final_retention, 1),
        },
        "hook_analysis": {
            "grade": hook_grade,
            "loss_in_30s": round(hook_loss, 1),
            "start_retention": round(hook_start, 1),
            "end_retention": round(hook_end, 1),
        },
        "cliffs": top_cliffs,
        "slide": {
            "grade": slide_grade,
            "loss_percent": round(slide_loss, 1),
        },
        "fixes": fixes,
    }


def parse_csv(csv_text: str) -> list[dict]:
    """Parse YouTube Studio retention CSV export."""
    reader = csv.DictReader(StringIO(csv_text))
    data = []
    for row in reader:
        # YouTube exports different column names by locale
        time_col = next(
            (k for k in row if any(x in k.lower() for x in ["time", "zeit", "temps", "tiempo"])),
            None
        )
        ret_col = next(
            (k for k in row if any(x in k.lower() for x in ["retention", "zuschauer", "spectateurs"])),
            None
        )
        if time_col and ret_col:
            tc = row[time_col].strip()
            try:
                ret = float(row[ret_col].strip().replace("%", ""))
                data.append({"time": parse_timecode(tc), "retention": ret})
            except ValueError:
                continue
    return data


def main():
    parser = argparse.ArgumentParser(description="Analyze YouTube Studio retention export")
    parser.add_argument("file", nargs="?", help="CSV file from YouTube Studio")
    parser.add_argument("--json-input", type=str, help="JSON array of {time, retention} objects")
    args = parser.parse_args()

    if args.json_input:
        data = json.loads(args.json_input)
    elif args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            data = parse_csv(f.read())
    elif not sys.stdin.isatty():
        data = parse_csv(sys.stdin.read())
    else:
        print("Usage: python retention.py retention.csv")
        sys.exit(1)

    result = analyze_retention(data)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
