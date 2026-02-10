#!/usr/bin/env python3
"""
Final fix for all syntax errors
"""

with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and fix the broken line
for i in range(len(lines)):
    if "text.split('" in lines[i] and not lines[i].strip().endswith("')"):
        # This line is broken
        if i + 1 < len(lines) and lines[i+1].strip() == "')":
            # Merge them
            lines[i] = lines[i].rstrip() + "\\n')\n"
            lines.pop(i + 1)
            print(f"✓ Fixed line {i+1}: text.split() statement")
            break

# Write back
with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✅ File saved!")

# Test syntax
content = ''.join(lines)
try:
    compile(content, 'phrase_centric_extractor.py', 'exec')
    print("✅✅✅ Syntax is COMPLETELY VALID! ✅✅✅")
except SyntaxError as e:
    print(f"❌ Still has syntax error at line {e.lineno}: {e.msg}")
    print(f"   Text: {repr(e.text)}")
