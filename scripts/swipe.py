#!/usr/bin/env python3
"""
swipe.py — Viral outlier detector from youtube-agent-skill
Ranks videos by multiple over their own channel's median views.
"""

import sys
import json
import argparse
import statistics


def analyze_outliers(videos: list[dict], min_multiple: float = 2.0) -> dict:
    """
    Find videos that beat their channel's own median.
    Each video: {"title": str, "channel": str, "views": int, ...}
    """
    if not videos:
        return {"error": "No videos provided"}

    # Group by channel
    channels: dict[str, list] = {}
    for v in videos:
        ch = v.get("channel", "Unknown")
        channels.setdefault(ch, []).append(v)

    # Calculate median per channel
    channel_medians = {}
    for ch, ch_videos in channels.items():
        view_counts = [v.get("views", 0) for v in ch_videos]
        if view_counts:
            channel_medians[ch] = statistics.median(view_counts)
        else:
            channel_medians[ch] = 1

    # Score each video by multiple over channel median
    scored = []
    for v in videos:
        ch = v.get("channel", "Unknown")
        median = channel_medians.get(ch, 1) or 1
        views = v.get("views", 0)
        multiple = views / median
        scored.append({
            **v,
            "channel_median": int(median),
            "multiple": round(multiple, 2),
            "is_outlier": multiple >= min_multiple,
        })

    # Sort by multiple
    scored.sort(key=lambda x: x["multiple"], reverse=True)

    outliers = [v for v in scored if v["is_outlier"]]
    non_outliers = [v for v in scored if not v["is_outlier"]]

    return {
        "summary": {
            "total_videos": len(videos),
            "outliers_found": len(outliers),
            "channels_analyzed": len(channels),
            "min_multiple_threshold": min_multiple,
        },
        "channel_medians": {
            ch: int(med) for ch, med in channel_medians.items()
        },
        "outliers": outliers,
        "non_outliers": non_outliers,
        "all_videos": scored,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Find viral outliers by channel multiple"
    )
    parser.add_argument("file", nargs="?", help="JSON file with video data")
    parser.add_argument("--min", type=float, default=2.0,
                        help="Minimum multiple to count as outlier (default: 2.0)")
    args = parser.parse_args()

    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            videos = json.load(f)
    elif not sys.stdin.isatty():
        videos = json.load(sys.stdin)
    else:
        print("Usage: python swipe.py videos.json --min 2.0")
        sys.exit(1)

    result = analyze_outliers(videos, args.min)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
