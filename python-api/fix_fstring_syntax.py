#!/usr/bin/env python3
"""
Fix broken f-strings in phrase_centric_extractor.py
"""

import re

# Read the file
with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove BOM if present
if content.startswith('\ufeff'):
    content = content[1:]
    print("✓ Removed BOM character")

# Fix broken f-strings
fixes = [
    # Fix line 105-106
    (r'print\(f"\n\{\'=\'\*80\}"\)', r'print(f"\n{\'=\'*80}")'),
    (r'print\(f"\{\{\'=\'\*80\}\}\n"\)', r'print(f"{\'=\'*80}\n")'),
    
    # Fix all broken print statements with newlines inside f-strings
    (r'print\(f"\n\[', r'print(f"\n['),
    (r'print\(f"\n  ', r'print(f"\n  '),
]

for pattern, replacement in fixes:
    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)
        print(f"✓ Fixed pattern: {pattern[:50]}...")

# Specific fixes for known broken lines
broken_patterns = [
    # Line 105-108
    (
        r'print\(f"\n\{\'=\'\*80\}"\)\s+print\(f"PHRASE-CENTRIC EXTRACTION"\)\s+print\(f"\{\'=\'\*80\}\n"\)',
        'print(f"\\n{\'=\'*80}")\n        print(f"PHRASE-CENTRIC EXTRACTION")\n        print(f"{\'=\'*80}\\n")'
    ),
]

for pattern, replacement in broken_patterns:
    if re.search(pattern, content, re.MULTILINE):
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
        print(f"✓ Fixed multiline pattern")

# Write back
with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ File fixed! Testing syntax...")

# Test syntax
try:
    compile(content, 'phrase_centric_extractor.py', 'exec')
    print("✅ Syntax is valid!")
except SyntaxError as e:
    print(f"❌ Still has syntax error at line {e.lineno}: {e.msg}")
    print(f"   Text: {e.text}")
