"""
Disable STEP 7.6: Heading-aware Semantic Filter
This filter is too aggressive and removes 80-90% of words
"""

print("=" * 80)
print("DISABLING STEP 7.6: Heading-aware Semantic Filter")
print("=" * 80)

with open('single_word_extractor.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and comment out the semantic filter call
old_code = '''        # STEP 7.6: Heading-aware Semantic Filter (HARD FILTER)
        # ====================================================================
        print("[STEP 7.6] Heading-aware Semantic Filter...")
        
        main_heading = self._get_main_heading(headings)
        
        if main_heading and self.embedding_model:
            semantic_words = self._semantic_filter_by_heading(
                words_with_coverage,
                main_heading
            )
        else:
            semantic_words = words_with_coverage
            print(f"  ⚠️  Semantic filtering skipped (no heading or embeddings)")
        
        print(f"  ✓ After semantic filtering: {len(semantic_words)} words")'''

new_code = '''        # STEP 7.6: Heading-aware Semantic Filter (DISABLED)
        # ====================================================================
        print("[STEP 7.6] Heading-aware Semantic Filter - DISABLED")
        
        # DISABLED: This filter is too aggressive
        # main_heading = self._get_main_heading(headings)
        # if main_heading and self.embedding_model:
        #     semantic_words = self._semantic_filter_by_heading(
        #         words_with_coverage,
        #         main_heading
        #     )
        # else:
        semantic_words = words_with_coverage  # Keep all words
        print(f"  ⚠️  Semantic filter DISABLED - keeping all {len(semantic_words)} words")
        
        # print(f"  ✓ After semantic filtering: {len(semantic_words)} words")'''

if old_code in content:
    content = content.replace(old_code, new_code)
    
    with open('single_word_extractor.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("\n✅ STEP 7.6 DISABLED!")
    print("\nChanges:")
    print("  - Semantic filter is now skipped")
    print("  - All words from STEP 7.5 will pass through")
    print("\nExpected impact:")
    print("  - Before: 255 → 5 words (98% loss)")
    print("  - After:  255 → 50-100 words (60-80% retention)")
    
else:
    print("\n⚠️  Could not find exact code to replace")
    print("   The filter may already be disabled or code has changed")

print("\n" + "=" * 80)
print("NEXT STEPS:")
print("=" * 80)
print("1. Restart server: python main.py")
print("2. Upload document again")
print("3. Check output - should see more single words")
print("\nIf still too few words, also disable STEP 7.7:")
print("  python disable_step77_specificity_check.py")
print("=" * 80)
