"""
Fix STEP 4 in phrase_centric_extractor.py
"""

# Read the file
with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Old STEP 4 code
old_step4 = '''        # STEP 4: Heading-Guided Semantic Filtering
        # ====================================================================
        print(f"\\n[STEP 4] Heading-Guided Semantic Filtering...")
        before_semantic = len(filtered_phrases)

        main_heading = document_title or self._get_main_heading(headings)

        semantic_filtered = self._semantic_filter(
            filtered_phrases,
            main_heading,
            threshold=0.1
        )

        print(f"  ✓ After semantic filtering: {len(semantic_filtered)} phrases")
        removed = before_semantic - len(semantic_filtered)
        if removed > 0:
            print(f"  ❌ Removed {removed} phrases (low heading similarity)")
            print(f"  📋 DEBUG - AFTER SEMANTIC FILTER (All {len(semantic_filtered)} phrases):")
            for i, p in enumerate(semantic_filtered, 1):
                sim = p.get('heading_similarity', 0)
                print(f"     {i}. '{p['phrase']}' (freq: {p['frequency']}, heading_sim: {sim:.2f})")'''

# New STEP 4 code (SKIPPED)
new_step4 = '''        # STEP 4: Heading-Guided Semantic Filtering - REMOVED
        # ====================================================================
        print(f"\\n[STEP 4] Heading-Guided Semantic Filtering - SKIPPED (disabled by user)")
        print(f"  ℹ️  Keeping all {len(filtered_phrases)} phrases without semantic filtering")
        
        # Skip semantic filtering - use filtered_phrases directly
        semantic_filtered = filtered_phrases'''

# Replace
if old_step4 in content:
    content = content.replace(old_step4, new_step4)
    print("✅ Found and replaced STEP 4")
else:
    print("❌ Could not find STEP 4 code to replace")
    print("Trying alternative search...")
    
    # Try finding just the key part
    if "semantic_filtered = self._semantic_filter(" in content:
        print("⚠️  Found semantic_filter call, but full pattern didn't match")
        print("Manual replacement needed")
    else:
        print("✅ semantic_filter call not found - might already be fixed")

# Write back
with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
