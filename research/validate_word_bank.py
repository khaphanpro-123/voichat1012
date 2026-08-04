#!/usr/bin/env python3
"""
research/validate_word_bank.py — Word bank integrity checker (Ngày 23).

Reads lib/wordBank.ts, extracts the word entries via regex, and runs
8 structural checks to catch authoring errors before the study starts.

Usage:
    python research/validate_word_bank.py
    python research/validate_word_bank.py --fix-report  # write issues.json

Exit codes:
    0 — all checks passed
    1 — one or more 🚨 errors
"""

import re
import sys
import json
import argparse
from pathlib import Path
from collections import Counter

# ── Load raw text ────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).parent.parent
WORD_BANK_PATH = REPO_ROOT / "lib" / "wordBank.ts"

text = WORD_BANK_PATH.read_text(encoding="utf-8")

# ── Parse entries with a regex ───────────────────────────────────────────────
# Each entry is wrapped in { id: "w_XXX", ... } — parse key fields.
entry_pattern = re.compile(
    r'\{\s*'
    r'id:\s*"(w_\d+)".*?'
    r'word:\s*"([^"]+)".*?'
    r'cefrBand:\s*"(B1|B2)".*?'
    r'partOfSpeech:\s*"([nvadj]+)".*?'
    r'definition:\s*"([^"]+)".*?'
    r'distractors:\s*\[([^\]]+)\].*?'
    r'sentences:\s*\[([^\]]+)\]',
    re.DOTALL,
)

entries = []
for m in entry_pattern.finditer(text):
    wid, word, band, pos, defn, dist_raw, sents_raw = m.groups()

    # Parse distractors (quoted strings)
    distractors = re.findall(r'"([^"]+)"', dist_raw)

    # Parse sentences
    sentences = re.findall(r'"([^"]+)"', sents_raw)

    entries.append({
        "id": wid,
        "word": word,
        "band": band,
        "pos": pos,
        "definition": defn,
        "distractors": distractors,
        "sentences": sentences,
    })

print(f"Parsed {len(entries)} word entries from {WORD_BANK_PATH.relative_to(REPO_ROOT)}\n")

issues = []
ok_count = 0
error_count = 0

def check(condition: bool, level: str, entry_id: str, msg: str):
    global ok_count, error_count
    if condition:
        ok_count += 1
    else:
        issues.append({"level": level, "id": entry_id, "message": msg})
        if level == "🚨":
            error_count += 1
        print(f"  {level} {entry_id}: {msg}")

# ── Check 1: Total count ─────────────────────────────────────────────────────
print("Check 1: Total count")
expected = 60
ok = len(entries) == expected
check(ok, "🚨" if not ok else "✅", "GLOBAL",
      f"Expected {expected} entries, found {len(entries)}")

# ── Check 2: Unique IDs ───────────────────────────────────────────────────────
print("Check 2: Unique IDs")
ids = [e["id"] for e in entries]
dup_ids = [i for i, c in Counter(ids).items() if c > 1]
check(not dup_ids, "🚨" if dup_ids else "✅", "GLOBAL",
      f"Duplicate IDs: {dup_ids}" if dup_ids else "All IDs unique")

# ── Check 3: Unique words ─────────────────────────────────────────────────────
print("Check 3: Unique words")
words = [e["word"].lower() for e in entries]
dup_words = [w for w, c in Counter(words).items() if c > 1]
check(not dup_words, "🚨" if dup_words else "✅", "GLOBAL",
      f"Duplicate words: {dup_words}" if dup_words else "All words unique")

# ── Check 4: Exactly 3 distractors per entry ─────────────────────────────────
print("Check 4: 3 distractors each")
for e in entries:
    n = len(e["distractors"])
    check(n == 3, "🚨" if n != 3 else "✅", e["id"],
          f"Expected 3 distractors, found {n}")

# ── Check 5: Definition not repeated in distractors ──────────────────────────
print("Check 5: Definition not in distractors")
for e in entries:
    defn_lower = e["definition"].lower().strip()
    dups = [d for d in e["distractors"] if d.lower().strip() == defn_lower]
    check(not dups, "🚨" if dups else "✅", e["id"],
          f"Correct definition duplicated in distractors: {dups}" if dups else "ok")

# ── Check 6: Each sentence contains the target word (or lemma) ───────────────
print("Check 6: Sentences contain the target word")
for e in entries:
    word_lower = e["word"].lower()
    for i, sent in enumerate(e["sentences"]):
        sent_lower = sent.lower()
        # Accept the word or common inflections (startswith lemma)
        found = word_lower in sent_lower or any(
            token.startswith(word_lower[:5]) for token in re.findall(r"\b\w+\b", sent_lower)
        )
        check(found, "⚠️" if not found else "✅", e["id"],
              f"sentences[{i}] may not contain '{e['word']}': {sent[:60]}…" if not found else "ok")

# ── Check 7: At least 2 sentences per entry ───────────────────────────────────
print("Check 7: ≥2 sentences per entry")
for e in entries:
    n = len(e["sentences"])
    check(n >= 2, "🚨" if n < 2 else "✅", e["id"],
          f"Only {n} sentence(s) — need ≥2" if n < 2 else "ok")

# ── Check 8: B1/B2 balance ───────────────────────────────────────────────────
print("Check 8: B1/B2 balance (30 each)")
b1 = sum(1 for e in entries if e["band"] == "B1")
b2 = sum(1 for e in entries if e["band"] == "B2")
check(b1 == 30, "🚨" if b1 != 30 else "✅", "GLOBAL", f"B1 count = {b1} (expected 30)")
check(b2 == 30, "🚨" if b2 != 30 else "✅", "GLOBAL", f"B2 count = {b2} (expected 30)")

# ── Summary ──────────────────────────────────────────────────────────────────
print(f"\n{'─' * 50}")
print(f"Checks passed: {ok_count}")
print(f"Issues found:  {len(issues)} ({error_count} 🚨 errors, {len(issues)-error_count} ⚠️ warnings)")

if "--fix-report" in sys.argv or "--out" in sys.argv:
    out_path = REPO_ROOT / "research" / "word_bank_issues.json"
    out_path.write_text(json.dumps(issues, indent=2, ensure_ascii=False))
    print(f"Report written to {out_path.relative_to(REPO_ROOT)}")

if error_count > 0:
    print("\n🚨 Word bank has errors — fix before pre-registration (H4).")
    sys.exit(1)
else:
    print("\n✅ Word bank passes all checks.")
    sys.exit(0)
