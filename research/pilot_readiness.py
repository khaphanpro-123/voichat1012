#!/usr/bin/env python3
"""
pilot_readiness.py — Pre-pilot go/no-go checklist for the DART RCT.

Run from the repo root BEFORE H7 (recruiting pilot participants).
All critical checks must pass. Warnings are informational.

Usage:
    MONGO_URI="..." RESEARCH_SALT="..." python research/pilot_readiness.py

Exit codes:
    0 — all critical checks pass
    1 — one or more critical checks FAIL
"""

import os
import sys
import hmac
import hashlib
import base64
import json
import time
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
RESEARCH_DIR = REPO_ROOT / "research"

# ── Counters ───────────────────────────────────────────────────────────────────
_passed = 0
_failed = 0
_warnings = 0

def ok(msg: str) -> None:
    global _passed
    _passed += 1
    print(f"  ✅  {msg}")

def fail(msg: str) -> None:
    global _failed
    _failed += 1
    print(f"  ❌  {msg}")

def warn(msg: str) -> None:
    global _warnings
    _warnings += 1
    print(f"  ⚠️   {msg}")

def section(title: str) -> None:
    print(f"\n{'─'*58}")
    print(f"  {title}")
    print(f"{'─'*58}")


# ══════════════════════════════════════════════════════════════════════════════
section("1. Environment Variables")

research_salt = os.environ.get("RESEARCH_SALT", "")
if len(research_salt) >= 32:
    ok(f"RESEARCH_SALT present ({len(research_salt)} chars)")
else:
    fail(f"RESEARCH_SALT missing or too short ({len(research_salt)} chars — need ≥32)")

mongo_uri = os.environ.get("MONGO_URI", "")
if mongo_uri.startswith("mongodb"):
    ok("MONGO_URI present")
else:
    fail("MONGO_URI missing or does not start with 'mongodb'")

for var in ["NEXTAUTH_SECRET", "JWT_SECRET"]:
    val = os.environ.get(var, "")
    if len(val) >= 16:
        ok(f"{var} present")
    else:
        warn(f"{var} missing or short — user auth may fail")

for var in ["OPENAI_API_KEY", "GROQ_API_KEY"]:
    val = os.environ.get(var, "")
    if val:
        ok(f"{var} present (LLM judge will use this provider)")
    else:
        warn(f"{var} missing — LLM judge will need at least one AI provider key")


# ══════════════════════════════════════════════════════════════════════════════
section("2. HMAC Participant Token (Round-Trip)")

if research_salt:
    try:
        # Simulate issueParticipantToken (mirrors lib/participantAuth.ts)
        payload = json.dumps({"p": "TEST001", "iat": int(time.time())})
        b64 = base64.urlsafe_b64encode(payload.encode()).rstrip(b"=").decode()
        sig = hmac.new(research_salt.encode(), b64.encode(), hashlib.sha256).hexdigest()
        token = f"{b64}.{sig}"

        # Simulate verifyParticipantToken
        parts = token.split(".", 1)
        if len(parts) == 2:
            expected = hmac.new(research_salt.encode(), parts[0].encode(), hashlib.sha256).hexdigest()
            if hmac.compare_digest(sig, expected):
                ok("HMAC token issue → verify round-trip OK")
            else:
                fail("HMAC token signature mismatch after round-trip")
        else:
            fail("Token format invalid (no '.' separator)")

        # Tamper test
        tampered = f"{b64}X.{sig}"
        parts2 = tampered.split(".", 1)
        expected2 = hmac.new(research_salt.encode(), parts2[0].encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected2):
            ok("Tampered token correctly rejected")
        else:
            fail("Tampered token was accepted — security issue!")
    except Exception as e:
        fail(f"HMAC test threw: {e}")
else:
    fail("Skipping HMAC test — RESEARCH_SALT missing")


# ══════════════════════════════════════════════════════════════════════════════
section("3. MongoDB Connection")

db = None
if mongo_uri:
    try:
        from pymongo import MongoClient  # type: ignore
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=6000)
        client.admin.command("ping")
        ok("MongoDB ping successful")
        db = client.get_database()
        collections = db.list_collection_names()
        ok(f"Database reachable ({len(collections)} existing collections)")

        required_colls = [
            ("participants", "Participant"),
            ("reviewlogs", "ReviewLog"),
            ("testresults", "TestResult"),
            ("judgescores", "JudgeScore"),
        ]
        for coll_name, model_name in required_colls:
            if coll_name in collections:
                count = db[coll_name].count_documents({})
                ok(f"Collection '{coll_name}' exists ({count} docs)")
            else:
                warn(f"Collection '{coll_name}' not yet created — auto-created on first write")

        n_real_participants = db.participants.count_documents({"status": {"$ne": "test"}})
        if n_real_participants == 0:
            ok("Participant collection clean (no enrolled participants yet)")
        else:
            warn(f"{n_real_participants} participant(s) already enrolled — verify these are expected")

    except ImportError:
        fail("pymongo not installed: pip install pymongo --break-system-packages")
    except Exception as e:
        fail(f"MongoDB connection failed: {e}")
else:
    fail("Skipping MongoDB check — MONGO_URI missing")


# ══════════════════════════════════════════════════════════════════════════════
section("4. Required Research Files")

required_files = [
    ("research/DESIGN_FREEZE.md",                 "Design freeze document"),
    ("research/PREREGISTRATION.md",               "Pre-registration draft (OSF)"),
    ("research/CALIBRATION_GUIDE.md",             "Human rater calibration guide"),
    ("research/calibration_practice_items.json",  "5 calibration practice items"),
    ("research/IRB_SUBMISSION_CHECKLIST.md",       "IRB submission checklist"),
    ("research/PILOT_CHECKLIST.md",               "Pilot go/no-go checklist"),
    ("lib/wordBank.ts",                            "Target word bank (60 words)"),
    ("lib/posttestBuilder.ts",                     "Posttest builder (FORM_VERSION frozen)"),
    ("lib/participantAuth.ts",                     "Participant HMAC auth"),
    ("lib/judgeRubric.ts",                         "LLM judge rubric"),
    ("lib/llmJudge.ts",                            "LLM judge runner"),
]

for rel_path, desc in required_files:
    full = REPO_ROOT / rel_path
    if full.exists():
        ok(f"{desc}")
    else:
        fail(f"MISSING: {desc} ({rel_path})")


# ══════════════════════════════════════════════════════════════════════════════
section("5. DESIGN_FREEZE.md — Signature Check")

design_freeze = RESEARCH_DIR / "DESIGN_FREEZE.md"
if design_freeze.exists():
    content = design_freeze.read_text(encoding="utf-8")
    if "______" in content:
        warn("DESIGN_FREEZE.md contains unfilled signature fields — H2 not complete")
    else:
        ok("DESIGN_FREEZE.md signature fields filled")

    if "FORM_VERSION" in content and "posttest_v1.0" in content:
        ok("FORM_VERSION = 'posttest_v1.0' recorded in DESIGN_FREEZE.md")
    else:
        fail("FORM_VERSION not found in DESIGN_FREEZE.md — constants section incomplete")

    if "PARAPHRASE_OVERLAP_MAX" in content:
        ok("PARAPHRASE_OVERLAP_MAX recorded in DESIGN_FREEZE.md")
    else:
        warn("PARAPHRASE_OVERLAP_MAX not found in DESIGN_FREEZE.md")


# ══════════════════════════════════════════════════════════════════════════════
section("6. H5 — Word Familiarity Screening")

fam_results = RESEARCH_DIR / "familiarity_results.json"
if db is not None:
    try:
        n_screens = db.familiarityresponses.count_documents({})
        if n_screens >= 20:
            ok(f"Familiarity screening: {n_screens} responses collected (≥20 ✅)")
            if fam_results.exists():
                with open(fam_results) as f:
                    fam_data = json.load(f)
                flagged = fam_data.get("flaggedCount", 0)
                if flagged == 0:
                    ok("No words flagged for removal (all < 70% already known)")
                else:
                    warn(f"{flagged} word(s) flagged — review with supervisor before removing from wordBank.ts")
            else:
                warn("familiarity_results.json missing — run: python research/analyze_familiarity.py")
        elif n_screens > 0:
            warn(f"Familiarity screening in progress: {n_screens}/20 — recruit {20 - n_screens} more screeners")
        else:
            fail("Familiarity screening (H5) not started — needed before pilot")
    except Exception as e:
        warn(f"Could not check familiarity collection: {e}")
elif fam_results.exists():
    with open(fam_results) as f:
        fam_data = json.load(f)
    flagged = fam_data.get("flaggedCount", 0)
    n_screens = fam_data.get("nScreeners", 0)
    if n_screens >= 20:
        ok(f"familiarity_results.json: {n_screens} screeners, {flagged} flagged")
    else:
        warn(f"familiarity_results.json: only {n_screens} screeners — need 20")
else:
    fail("H5 familiarity screening not done (no DB connection + no familiarity_results.json)")


# ══════════════════════════════════════════════════════════════════════════════
section("7. Jest Tests")

import subprocess
test_result = subprocess.run(
    ["npx", "jest", "--passWithNoTests", "--silent"],
    capture_output=True, text=True, timeout=60, cwd=str(REPO_ROOT)
)
if test_result.returncode == 0:
    ok("Jest test suite passes")
else:
    stderr = test_result.stderr[-600:].strip()
    fail(f"Jest tests failing:\n    {stderr}")


# ══════════════════════════════════════════════════════════════════════════════
section("8. TypeScript Check")

ts_result = subprocess.run(
    ["npx", "tsc", "--noEmit"],
    capture_output=True, text=True, timeout=60, cwd=str(REPO_ROOT)
)
if ts_result.returncode == 0:
    ok("TypeScript compilation clean (no type errors)")
else:
    stderr_lines = ts_result.stdout.strip().split("\n")[:8]
    fail(f"TypeScript errors found:\n    " + "\n    ".join(stderr_lines))


# ══════════════════════════════════════════════════════════════════════════════
section("SUMMARY")

total = _passed + _failed
print(f"\n  {'─'*40}")
print(f"  ✅ Passed  : {_passed}")
print(f"  ❌ Failed  : {_failed}")
print(f"  ⚠️  Warnings: {_warnings}")
print(f"  Total     : {total} checks")
print(f"  Time      : {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
print()

if _failed == 0:
    print("  🟢  ALL CRITICAL CHECKS PASSED")
    if _warnings > 0:
        print(f"  ⚠️   {_warnings} warning(s) — review above before proceeding")
    print("\n  Ready to begin H7: recruit pilot participants ✅")
    sys.exit(0)
else:
    print(f"  🔴  {_failed} CRITICAL CHECK(S) FAILED — resolve before recruiting pilots")
    sys.exit(1)
