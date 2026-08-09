#!/usr/bin/env bash
# run_full_type1_laptop.sh — chạy full 200-rep Type-I + power positive trên laptop.
#
# Chia thành các chunk 20 reps để nếu crash giữa chừng vẫn có thể resume mà không mất
# việc đã chạy. Mỗi chunk lưu vào file riêng; script aggregator sẽ nối lại ở cuối.
#
# Cách chạy:
#   cd research
#   bash run_full_type1_laptop.sh
#
# Ước tính thời gian: 30–60 phút Type-I + 40–70 phút power positive.
# An toàn dừng: Ctrl+C giữa chunk sẽ giữ nguyên file chunk đã hoàn thành.

set -euo pipefail

cd "$(dirname "$0")"

CHUNKS_DIR="reports/full_type1_chunks"
mkdir -p "$CHUNKS_DIR"

echo "==> Type-I error @ weeks=8, N=60, alpha_true=0, 200 reps (10 chunks x 20)"
for i in 1 2 3 4 5 6 7 8 9 10; do
    OUT="$CHUNKS_DIR/type1_full_weeks8_chunk${i}.json"
    if [[ -f "$OUT" ]]; then
        echo "  chunk $i: đã có ($OUT) — bỏ qua"
        continue
    fi
    SEED=$((10000 + i * 100))
    echo "  chunk $i: seed=$SEED → $OUT"
    python power_analysis.py \
        --grid 60 \
        --alpha-true 0 \
        --reps 20 \
        --weeks 8 \
        --seed0 "$SEED" \
        --out "$OUT"
done

echo ""
echo "==> Type-I @ weeks=8, N=180 (2 chunks x 20 = 40 reps để check cỡ mẫu lớn)"
for i in 1 2; do
    OUT="$CHUNKS_DIR/type1_full_weeks8_n180_chunk${i}.json"
    if [[ -f "$OUT" ]]; then
        echo "  chunk $i: đã có — bỏ qua"
        continue
    fi
    SEED=$((20000 + i * 100))
    echo "  chunk $i: seed=$SEED → $OUT"
    python power_analysis.py \
        --grid 180 \
        --alpha-true 0 \
        --reps 20 \
        --weeks 8 \
        --seed0 "$SEED" \
        --out "$OUT"
done

echo ""
echo "==> Power positive @ alpha_true=default, weeks=8, grid 30..240, 100 reps mỗi mức"
POWER_OUT="reports/power_positive.json"
if [[ -f "$POWER_OUT" ]]; then
    echo "  đã có $POWER_OUT — bỏ qua (xoá tay nếu muốn chạy lại)"
else
    python power_analysis.py \
        --grid 30,60,90,120,180,240 \
        --weeks 8 \
        --reps 100 \
        --out "$POWER_OUT"
fi

echo ""
echo "==> Hoàn tất. Bước tiếp:"
echo "  1. python aggregate_type1_weeks8_v2.py  # nối các chunk full_type1_chunks/*.json"
echo "  2. Xem reports/type1_weeks8_aggregated_v2.json và reports/power_positive.json"
echo "  3. Báo lại agent kết quả để cập nhật RESEARCH_PROGRESS.md"
