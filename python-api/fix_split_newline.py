#!/usr/bin/env python3
"""
Fix the broken text.split('\n') statement
"""

with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken split statement
content = content.replace("text.split('\\n\n')", "text.split('\\n')")

with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed text.split() statement")

# Test syntax
try:
    compile(content, 'phrase_centric_extractor.py', 'exec')
    print("✅ Syntax is VALID!")
except SyntaxError as e:
    print(f"❌ Still has syntax error at line {e.lineno}: {e.msg}")
