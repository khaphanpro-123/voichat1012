#!/usr/bin/env python3
"""
Fix double backslashes in f-strings
"""

with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix double backslashes
content = content.replace('{\\\\\\'=\\\\\\'*80}', "{'='*80}")
content = content.replace('{\\\\'=\\\\'*80}', "{'='*80}")
content = content.replace('{\\'=\\'*80}', "{'='*80}")

with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed backslashes")

# Test
try:
    compile(content, 'phrase_centric_extractor.py', 'exec')
    print("✅✅✅ SYNTAX IS COMPLETELY VALID! ✅✅✅")
except SyntaxError as e:
    print(f"❌ Error at line {e.lineno}: {e.msg}")
    print(f"   Text: {repr(e.text)}")
