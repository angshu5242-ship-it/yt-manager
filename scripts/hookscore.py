#!/usr/bin/env python3
"""
hookscore.py — Hook scoring tool from youtube-agent-skill
Scores the first 15 seconds of a YouTube hook on 5 properties.
Calibrated against 74 real short-form hooks.
"""

import sys
import json
import re
import argparse

# --- Scoring weights and thresholds ---
FILLER_WORDS = {
    "um", "uh", "like", "you know", "so", "basically", "literally",
    "actually", "honestly", "right", "okay", "alright", "well", "now",
    "today", "hey", "guys", "everyone", "welcome", "back", "channel",
    "video", "gonna", "going to talk"
}

POWER_OPENERS = [
    r"\bif you\b", r"\bstop\b", r"\bwait\b", r"\bmost people\b",
    r"\bnobody\b", r"\beveryone\b", r"\byou're\b", r"\bi (made|lost|found|discovered|quit)\b",
    r"\bthe truth\b", r"\bthe real\b", r"\bwhy\b.{0,20}\?", r"\bwhat if\b",
    r"\bhow (i|to|long|much)\b", r"\bdon't\b", r"\bnever\b", r"\balways\b",
    r"\b\d+\b.{0,10}(years?|months?|days?|hours?|minutes?|dollars?|%)",
    r"\bsecret\b", r"\bwarning\b", r"\bproblem\b", r"\bmistake\b",
]

CURIOSITY_PATTERNS = [
    r"\?", r"\bbut\b", r"\bexcept\b", r"\bunless\b", r"\buntil\b",
    r"\bhere's\b", r"\bthis is\b", r"\bthat's\b", r"\band it\b",
]


def count_words(text: str) -> int:
    return len(text.split())


def count_filler(text: str) -> int:
    text_lower = text.lower()
    count = 0
    for word in FILLER_WORDS:
        count += len(re.findall(r'\b' + re.escape(word) + r'\b', text_lower))
    return count


def score_hook(hook: str) -> dict:
    hook = hook.strip()
    hook_lower = hook.lower()
    words = count_words(hook)

    # 1. SPECIFICITY (0-20): Numbers, names, concrete claims score higher
    specificity = 0
    if re.search(r'\b\d+[\.,]?\d*\b', hook):  # has numbers
        specificity += 10
    if re.search(r'\b[A-Z][a-z]+\b', hook):  # has proper nouns
        specificity += 5
    if re.search(r'\$|%|x\b|X\b', hook):  # has units
        specificity += 5
    specificity = min(specificity, 20)

    # 2. CURIOSITY GAP (0-20): Implies something unresolved
    curiosity = 0
    for pattern in CURIOSITY_PATTERNS:
        if re.search(pattern, hook_lower):
            curiosity += 4
            if curiosity >= 20:
                break
    curiosity = min(curiosity, 20)

    # 3. POWER OPENER (0-20): Uses a known high-performing formula
    power = 0
    for pattern in POWER_OPENERS:
        if re.search(pattern, hook_lower):
            power = 20
            break
    # Partial credit for near-misses
    if power == 0:
        first_word = hook_lower.split()[0] if hook_lower.split() else ""
        if first_word in {"i", "you", "this", "here", "what", "how", "why", "when"}:
            power = 10

    # 4. BREVITY (0-20): < 30 words for a 15-second hook
    if words <= 20:
        brevity = 20
    elif words <= 30:
        brevity = 15
    elif words <= 40:
        brevity = 10
    elif words <= 50:
        brevity = 5
    else:
        brevity = 0

    # 5. FILLER-FREE (0-20): Penalise filler words
    filler_count = count_filler(hook)
    if filler_count == 0:
        filler_free = 20
    elif filler_count == 1:
        filler_free = 12
    elif filler_count == 2:
        filler_free = 6
    else:
        filler_free = 0

    total = specificity + curiosity + power + brevity + filler_free
    grade = (
        "A" if total >= 80 else
        "B" if total >= 60 else
        "C" if total >= 40 else
        "D"
    )

    verdict = (
        "Strong hook. Ready to film." if total >= 80 else
        "Decent. Tighten it and try again." if total >= 60 else
        "Weak. Rethink the opener." if total >= 40 else
        "Low score. This will lose viewers fast."
    )

    return {
        "hook": hook,
        "total": total,
        "grade": grade,
        "verdict": verdict,
        "breakdown": {
            "specificity": {"score": specificity, "max": 20, "label": "Specificity"},
            "curiosity": {"score": curiosity, "max": 20, "label": "Curiosity Gap"},
            "power_opener": {"score": power, "max": 20, "label": "Power Opener"},
            "brevity": {"score": brevity, "max": 20, "label": "Brevity"},
            "filler_free": {"score": filler_free, "max": 20, "label": "Filler-Free"},
        },
        "word_count": words,
        "filler_words_found": filler_count,
    }


def main():
    parser = argparse.ArgumentParser(description="Score a YouTube hook (first 15 seconds)")
    parser.add_argument("--hook", type=str, help="The hook text to score")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    hook_text = args.hook or (sys.stdin.read().strip() if not sys.stdin.isatty() else "")

    if not hook_text:
        print("Usage: python hookscore.py --hook \"your hook text here\"")
        sys.exit(1)

    result = score_hook(hook_text)

    if args.json or True:  # Always output JSON for API use
        print(json.dumps(result, indent=2))
    else:
        print(f"\nHook Score: {result['total']}/100 ({result['grade']})")
        print(f"Verdict: {result['verdict']}\n")
        for key, val in result['breakdown'].items():
            bar = "█" * val['score'] + "░" * (val['max'] - val['score'])
            print(f"  {val['label']:<20} {bar} {val['score']}/{val['max']}")


if __name__ == "__main__":
    main()
