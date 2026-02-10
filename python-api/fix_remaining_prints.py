#!/usr/bin/env python3
"""
Fix remaining broken print statements
"""

with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixed = 0
i = 0
while i < len(lines) - 1:
    line = lines[i]
    next_line = lines[i + 1]
    
    # Check if current line ends with print(" and next line doesn't start with spaces
    if line.strip().endswith('print("') and not next_line.strip().startswith(')'):
        # Merge
        lines[i] = line.rstrip() + '\\n' + next_line.lstrip()
        lines.pop(i + 1)
        fixed += 1
        print(f"✓ Fixed line {i+1}")
        continue
    
    i += 1

print(f"\n✅ Fixed {fixed} statements")

with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Test
content = ''.join(lines)
try:
    compile(content, 'phrase_centric_extractor.py', 'exec')
    print("✅✅✅ SYNTAX IS COMPLETELY VALID! ✅✅✅")
except SyntaxError as e:
    print(f"❌ Error at line {e.lineno}: {e.msg}")
