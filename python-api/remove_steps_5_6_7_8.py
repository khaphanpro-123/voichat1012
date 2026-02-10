"""
Script to remove STEP 5, 6, 7, 8 from phrase_centric_extractor.py
"""

import re

# Read the file
with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line numbers for STEP 5
step5_start = None
step8_end = None

for i, line in enumerate(lines):
    if 'STEP 5: Contrastive Context Scoring' in line and step5_start is None:
        step5_start = i - 2  # Include the comment separator
    if 'return final_phrases' in line and step5_start is not None and step8_end is None:
        step8_end = i + 1
        break

if step5_start is None or step8_end is None:
    print(f"Could not find STEP 5-8 section. step5_start={step5_start}, step8_end={step8_end}")
    exit(1)

print(f"Found STEP 5-8 section from line {step5_start} to {step8_end}")

# Create replacement content
replacement = '''        
        # ====================================================================
        # STEP 5: Contrastive Context Scoring - REMOVED
        # ====================================================================
        print("[STEP 5] Contrastive Context Scoring - SKIPPED (disabled by user)")
        print(f"  ℹ️  Keeping all phrases without contrastive scoring")
        
        # ====================================================================
        # STEP 6: Frequency & Coverage Check - REMOVED
        # ====================================================================
        print("[STEP 6] Frequency & Coverage Check - SKIPPED (disabled by user)")
        print(f"  ℹ️  Keeping all phrases without frequency/coverage scoring")
        
        # ====================================================================
        # STEP 7: Final Ranking - REMOVED
        # ====================================================================
        print("[STEP 7] Final Ranking - SKIPPED (disabled by user)")
        print(f"  ℹ️  Using phrases directly without ranking")
        
        # Use semantic_filtered directly, limit to max_phrases
        final_phrases = semantic_filtered[:max_phrases]
        
        # Add basic importance_score and supporting_sentence for compatibility
        for phrase_dict in final_phrases:
            # Use frequency as importance score
            phrase_dict['importance_score'] = phrase_dict.get('frequency', 1) / 10.0
            
            # Get best supporting sentence
            if phrase_dict.get('occurrences'):
                phrase_dict['supporting_sentence'] = phrase_dict['occurrences'][0]['sentence_text']
            else:
                phrase_dict['supporting_sentence'] = ""
        
        print(f"  ✓ Final output: {len(final_phrases)} phrases")
        print(f"\\n  📋 DEBUG - FINAL PHRASES (All {len(final_phrases)} phrases):")
        for i, p in enumerate(final_phrases, 1):
            freq = p.get('frequency', 0)
            role = p.get('semantic_role', 'unknown')
            print(f"     {i}. '{p['phrase']}' (freq: {freq}, role: {role})")
        
        # ====================================================================
        # STEP 8: Validation Check - REMOVED
        # ====================================================================
        print("[STEP 8] Validation Check - SKIPPED (disabled by user)")
        print(f"  ℹ️  No validation performed")
        
        print(f"\\n{'='*80}")
        print(f"EXTRACTION COMPLETE")
        print(f"  Total phrases: {len(final_phrases)}")
        print(f"{'='*80}\\n")
        
        return final_phrases
'''

# Replace the section
new_lines = lines[:step5_start] + [replacement] + lines[step8_end:]

# Write back
with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ Successfully removed STEP 5, 6, 7, 8")
print(f"Replaced lines {step5_start} to {step8_end}")
