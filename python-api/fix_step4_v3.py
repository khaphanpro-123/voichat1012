"""
Fix STEP 4 newline issues
"""

# Read the file
with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix escaped newlines
content = content.replace('\\n', '\n')

# Write back
with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed newline characters")
