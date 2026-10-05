#!/usr/bin/env python3
"""
title.py — Title and thumbnail linter from youtube-agent-skill
Lints a title + thumbnail pairing for truncation, duplication, and vagueness.
"""

import sys
import json
import re
import argparse


VAGUE_WORDS = {
    "amazing", "awesome", "incredible", "unbelievable", "insane", "crazy",
    "wild", "epic", "mind-blowing", "shocking", "surprising", "interesting",
    "great", "best ever", "worst ever", "must see", "you won't believe",
    "wait for it", "changed my life", "game changer", "this is everything",
}

DUPLICATION_STOP_WORDS = {
    "the", "a", "an", "i", "my", "this", "that", "is", "are", "was", "were",
    "in", "on", "at", "to", "for", "of", "and", "or", "but", "how", "why",
    "what", "when", "where", "with", "from", "it", "its",
}


def extract_keywords(text: str) -> set:
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    return {w for w in words if w not in DUPLICATION_STOP_WORDS}


def lint_title(title: str) -> dict:
    issues = []
    warnings = []

    # Length checks
    char_count = len(title)
    if char_count > 60:
        issues.append(f"Title is {char_count} chars — truncates on desktop (max 60)")
    elif char_count > 40:
        warnings.append(f"Title is {char_count} chars — may truncate on mobile (safe max: 40)")

    # Vague words
    title_lower = title.lower()
    found_vague = [w for w in VAGUE_WORDS if w in title_lower]
    if found_vague:
        warnings.append(f"Vague language detected: {', '.join(found_vague)}")

    # ALL CAPS words
    caps_words = re.findall(r'\b[A-Z]{3,}\b', title)
    if len(caps_words) > 2:
        warnings.append(f"Heavy ALL CAPS usage: {', '.join(caps_words)}")

    # Emojis (fine if <3)
    emoji_count = len(re.findall(r'[\U0001F300-\U0001FFFF]', title))
    if emoji_count > 2:
        warnings.append(f"{emoji_count} emojis — reduces professional signal")

    # Question mark fishing
    if title.count('?') > 1:
        warnings.append("Multiple question marks look low-effort")

    return {
        "text": title,
        "char_count": char_count,
        "issues": issues,
        "warnings": warnings,
        "pass": len(issues) == 0,
    }


def lint_thumbnail(thumb_text: str, thumb_concept: str = "") -> dict:
    issues = []
    warnings = []

    if thumb_text:
        word_count = len(thumb_text.split())
        if word_count > 4:
            issues.append(f"Thumbnail text is {word_count} words — max 4 for readability")
        char_count = len(thumb_text)
        if char_count > 25:
            warnings.append(f"Thumbnail text may be hard to read at small sizes ({char_count} chars)")

    return {
        "text": thumb_text,
        "concept": thumb_concept,
        "issues": issues,
        "warnings": warnings,
        "pass": len(issues) == 0,
    }


def check_duplication(title: str, thumb_text: str) -> dict:
    title_keywords = extract_keywords(title)
    thumb_keywords = extract_keywords(thumb_text)
    overlap = title_keywords & thumb_keywords

    issues = []
    if len(overlap) >= 3:
        issues.append(
            f"Title and thumbnail share {len(overlap)} keywords: {', '.join(sorted(overlap))}. "
            "They're saying the same thing — you're wasting click surface."
        )
    elif len(overlap) >= 2:
        pass  # Minor overlap is fine

    return {
        "overlap_keywords": sorted(overlap),
        "overlap_count": len(overlap),
        "issues": issues,
        "pass": len(issues) == 0,
    }


def lint_pairing(title: str, thumb_text: str, thumb_concept: str = "") -> dict:
    title_result = lint_title(title)
    thumb_result = lint_thumbnail(thumb_text, thumb_concept)
    dup_result = check_duplication(title, thumb_text)

    all_issues = title_result["issues"] + thumb_result["issues"] + dup_result["issues"]
    all_warnings = title_result["warnings"] + thumb_result["warnings"]

    overall_pass = len(all_issues) == 0

    return {
        "overall": {
            "pass": overall_pass,
            "grade": "PASS" if overall_pass else "FAIL",
            "total_issues": len(all_issues),
            "total_warnings": len(all_warnings),
        },
        "title": title_result,
        "thumbnail": thumb_result,
        "duplication": dup_result,
        "all_issues": all_issues,
        "all_warnings": all_warnings,
    }


def main():
    parser = argparse.ArgumentParser(description="Lint a YouTube title + thumbnail pairing")
    parser.add_argument("--title", type=str, required=True, help="Video title")
    parser.add_argument("--thumb", type=str, default="", help="Thumbnail text overlay")
    parser.add_argument("--concept", type=str, default="", help="Thumbnail visual concept")
    args = parser.parse_args()

    result = lint_pairing(args.title, args.thumb, args.concept)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
