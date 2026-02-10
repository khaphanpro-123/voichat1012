#!/usr/bin/env python3
"""
Fix backslashes in f-strings - final attempt
"""

with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix line 105 specifically
for i in range(len(lines)):
    if r"{\\'=\\'*80}" in lines[i] or r"{\'=\'*80}" in lines[i]:
        lines[i] = lines[i].replace(r"{\\'=\\'*80}", "{'='*80}")
        lines[i] = lines[i].replace(r"{\'=\'*80}", "{'='*80}")
        print(f"✓ Fixed line {i+1}")

with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✅ Fixed backslashes")

# Test
content = ''.join(lines)
try:
    compile(content, 'phrase_centric_extractor.py', 'exec')
    print("✅✅✅ SYNTAX IS COMPLETELY VALID! ✅✅✅")
except SyntaxError as e:
    print(f"❌ Error at line {e.lineno}: {e.msg}")
