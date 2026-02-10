#!/usr/bin/env python3
"""
Fix ALL broken print statements in phrase_centric_extractor.py
"""

# Read file
with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove BOM from first line if present
if lines and lines[0].startswith('\ufeff'):
    lines[0] = lines[0][1:]
    print("✓ Removed BOM")

# Fix broken print statements
fixed_count = 0
i = 0
while i < len(lines):
    line = lines[i]
    
    # Check if this is a broken print(f" statement
    if line.strip().startswith('print(f"') and not line.strip().endswith('")') and not line.strip().endswith('")\n'):
        # This line is broken, need to merge with next line
        if i + 1 < len(lines):
            next_line = lines[i + 1]
            
            # Merge the lines
            merged = line.rstrip() + next_line.lstrip()
            lines[i] = merged
            lines.pop(i + 1)
            fixed_count += 1
            print(f"✓ Fixed line {i+1}: merged with next line")
            continue
    
    i += 1

print(f"\n✅ Fixed {fixed_count} broken print statements")

# Write back
with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✅ File saved!")

# Test syntax
content = ''.join(lines)
try:
    compile(content, 'phrase_centric_extractor.py', 'exec')
    print("✅ Syntax is VALID!")
except SyntaxError as e:
    print(f"❌ Still has syntax error at line {e.lineno}: {e.msg}")
    if e.lineno and e.lineno <= len(lines):
        print(f"   Line {e.lineno-1}: {repr(lines[e.lineno-2])}")
        print(f"   Line {e.lineno}: {repr(lines[e.lineno-1])}")
        if e.lineno < len(lines):
            print(f"   Line {e.lineno+1}: {repr(lines[e.lineno])}")
