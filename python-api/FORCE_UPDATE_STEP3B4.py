"""
FORCE UPDATE STEP 3B.4 - Replace old code with new code
This script will directly modify phrase_centric_extractor.py
"""

import re

print("=" * 80)
print("FORCE UPDATE STEP 3B.4")
print("=" * 80)

# Read the file
with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Check if old code exists
if '[3B.4] Selecting representative phrases per cluster' in content:
    print("\n❌ OLD CODE DETECTED!")
    print("   Found: '[3B.4] Selecting representative phrases per cluster'")
    
    # Replace the old print statements
    content = content.replace(
        'print(f"\\n  [3B.4] Selecting representative phrases per cluster...")',
        'print(f"\\n  [3B.4] Assigning cluster metadata to all phrases...")'
    )
    
    content = content.replace(
        'print(f"  ✓ Selected {len(filtered_phrases)} representative phrases")',
        'print(f"  ✓ Kept ALL {len(filtered_phrases)} phrases (no filtering)")\\n            print(f"  ℹ️  Each phrase has cluster_rank and centroid_similarity metadata")'
    )
    
    # Remove top_k_per_cluster parameter from call
    content = re.sub(
        r'self\._select_cluster_representatives\(\s*filtered_phrases,\s*embeddings,\s*top_k_per_cluster=\d+\s*\)',
        'self._select_cluster_representatives(\n                filtered_phrases,\n                embeddings\n            )',
        content
    )
    
    # Write back
    with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("\n✅ UPDATED print statements!")
    
else:
    print("\n✅ NEW CODE ALREADY EXISTS!")
    print("   Found: '[3B.4] Assigning cluster metadata to all phrases'")

# Verify the method signature
if 'top_k_per_cluster: int = 3' in content:
    print("\n⚠️  WARNING: Method still has old signature!")
    print("   Updating method signature...")
    
    content = content.replace(
        'top_k_per_cluster: int = 3',
        'top_k_per_cluster: int = None  # IGNORED - keep all phrases'
    )
    
    with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("   ✅ Updated method signature!")

# Verify the return statement
if 'return selected_phrases' in content and 'return all_phrases' not in content:
    print("\n⚠️  WARNING: Method still returns selected_phrases!")
    print("   Updating return statement...")
    
    # Find and replace in the method
    content = re.sub(
        r'(def _select_cluster_representatives.*?)(return selected_phrases)',
        r'\1return all_phrases',
        content,
        flags=re.DOTALL
    )
    
    # Also replace the variable name
    content = content.replace('selected_phrases = []', 'all_phrases = []')
    content = content.replace('selected_phrases.extend', 'all_phrases.extend')
    
    with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("   ✅ Updated return statement!")

print("\n" + "=" * 80)
print("UPDATE COMPLETE")
print("=" * 80)
print("\nNext steps:")
print("1. Stop the server (Ctrl+C)")
print("2. Clear cache: del /s /q *.pyc && for /d /r . %d in (__pycache__) do @if exist \"%d\" rd /s /q \"%d\"")
print("3. Restart server: python main.py")
print("4. Upload document again")
print("\n" + "=" * 80)
