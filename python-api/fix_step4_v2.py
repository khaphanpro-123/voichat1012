"""
Fix STEP 4 in phrase_centric_extractor.py - Version 2
"""

# Read the file
with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find STEP 4 start
step4_start = None
for i, line in enumerate(lines):
    if 'STEP 4: Heading-Guided Semantic Filtering' in line and 'REMOVED' not in line:
        step4_start = i - 1  # Include separator
        break

if step4_start is None:
    print("✅ STEP 4 already fixed or not found")
    exit(0)

print(f"Found STEP 4 at line {step4_start}")

# Find where STEP 5 starts
step5_start = None
for i in range(step4_start, len(lines)):
    if 'STEP 5: Contrastive Context Scoring' in lines[i]:
        step5_start = i - 1  # Include separator before STEP 5
        break

if step5_start is None:
    print("❌ Could not find STEP 5")
    exit(1)

print(f"Found STEP 5 at line {step5_start}")
print(f"Will replace lines {step4_start} to {step5_start-1}")

# New STEP 4 code
new_step4_lines = [
    "        # ====================================================================\\n",
    "        # STEP 4: Heading-Guided Semantic Filtering - REMOVED\\n",
    "        # ====================================================================\\n",
    '        print(f"\\n[STEP 4] Heading-Guided Semantic Filtering - SKIPPED (disabled by user)")\\n',
    '        print(f"  ℹ️  Keeping all {len(filtered_phrases)} phrases without semantic filtering")\\n',
    "        \\n",
    "        # Skip semantic filtering - use filtered_phrases directly\\n",
    "        semantic_filtered = filtered_phrases\\n",
    "        \\n"
]

# Replace
new_lines = lines[:step4_start] + new_step4_lines + lines[step5_start:]

# Write back
with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ Successfully fixed STEP 4")
print(f"Replaced {step5_start - step4_start} lines with {len(new_step4_lines)} lines")
