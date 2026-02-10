#!/usr/bin/env python3
"""
Fix escaped quotes in f-strings
"""

with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix escaped quotes in f-strings
content = content.replace("{\'=\'*80}", "{'='*80}")
content = content.replace("{\'=\'*80}", "{'='*80}")  # In case there are variations

with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed escaped quotes")

# Test
try:
    compile(content, 'phrase_centric_extractor.py', 'exec')
    print("✅✅✅ SYNTAX IS COMPLETELY VALID! ✅✅✅")
except SyntaxError as e:
    print(f"❌ Error at line {e.lineno}: {e.msg}")
