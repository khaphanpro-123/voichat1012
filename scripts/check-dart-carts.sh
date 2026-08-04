#!/usr/bin/env bash
# scripts/check-dart-carts.sh
# Smoke test for every endpoint added by the DART / CARTS implementation.
# Usage:
#   BASE=http://localhost:3000 VOCAB=<mongo_id> USER=<userId> bash scripts/check-dart-carts.sh
# Defaults: BASE=http://localhost:3000, USER=demo-user, VOCAB=(none — schedule tests skipped)

set -u
BASE=${BASE:-http://localhost:3000}
USER=${USER:-demo-user}
VOCAB=${VOCAB:-}
GREEN=$'\033[32m'; RED=$'\033[31m'; DIM=$'\033[2m'; RESET=$'\033[0m'

PASS=0; FAIL=0; SKIP=0

need_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "warning: jq not found — output shown raw" >&2
  fi
}
need_jq

hit() {
  local name=$1 method=$2 path=$3 body=${4:-}
  echo
  echo "── $name  ${DIM}$method $BASE$path${RESET}"
  local out
  if [[ -z "$body" ]]; then
    out=$(curl -sS -X "$method" "$BASE$path" -H 'content-type: application/json' 2>&1) || true
  else
    out=$(curl -sS -X "$method" "$BASE$path" -H 'content-type: application/json' -d "$body" 2>&1) || true
  fi
  if command -v jq >/dev/null 2>&1; then
    printf '%s\n' "$out" | jq . 2>/dev/null || printf '%s\n' "$out"
  else
    printf '%s\n' "$out"
  fi
  if echo "$out" | grep -q '"success": *true'; then
    echo "${GREEN}✓ pass${RESET}"; PASS=$((PASS+1))
  else
    echo "${RED}✗ fail${RESET}"; FAIL=$((FAIL+1))
  fi
}

skip() { echo; echo "── $1  ${DIM}(skipped: $2)${RESET}"; SKIP=$((SKIP+1)); }

# 1. DART weights
hit "GET  /api/dart/weights"                 GET  "/api/dart/weights"
hit "POST /api/dart/weights (reload)"        POST "/api/dart/weights"

# 2. Experiment assignment
hit "GET  /api/experiment/assign"            GET  "/api/experiment/assign?userId=$USER&stratum=B1"
hit "POST /api/experiment/assign"            POST "/api/experiment/assign" "{\"userId\":\"$USER\",\"stratum\":\"B1\"}"

# 3. DART / CARTS schedule (need a vocab id)
if [[ -n "$VOCAB" ]]; then
  hit "POST /api/dart/schedule"              POST "/api/dart/schedule" \
    "{\"vocabularyId\":\"$VOCAB\",\"userId\":\"$USER\",\"quality\":4,\"lastRetrievalType\":1}"
  hit "POST /api/carts/schedule"             POST "/api/carts/schedule" \
    "{\"vocabularyId\":\"$VOCAB\",\"userId\":\"$USER\",\"contextPool\":\"auto\"}"
else
  skip "POST /api/dart/schedule"  "set VOCAB=<mongo _id>"
  skip "POST /api/carts/schedule" "set VOCAB=<mongo _id>"
fi

# 4. LLM-as-a-Judge (needs at least one AI key configured)
hit "POST /api/context-transfer/judge"       POST "/api/context-transfer/judge" \
  "{\"word\":\"resilient\",\"learnerSentence\":\"The bridge is resilient to floods.\",\"userId\":\"$USER\"}"

echo
echo "───────────────────────────────"
echo " pass=$PASS  fail=$FAIL  skip=$SKIP"
echo "───────────────────────────────"
exit $((FAIL > 0 ? 1 : 0))
