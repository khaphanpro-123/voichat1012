"""Fix line 237 syntax error"""

with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
print(f"\nLine 237 (index 236) BEFORE:")
print(repr(lines[236]))

# Fix line 237 (index 236)
if '\\n' in lines[236]:
    # Split by literal \n and create two separate lines
    parts = lines[236].split('\\n')
    if len(parts) == 2:
        lines[236] = parts[0] + '\n'
        lines.insert(237, parts[1])
        print(f"\n✅ FIXED!")
        print(f"Line 237 AFTER:")
        print(repr(lines[236]))
        print(f"Line 238 (new):")
        print(repr(lines[237]))
    else:
        print(f"\n❌ Unexpected format")
else:
    print(f"\n✅ No \\n found, already fixed")

# Write back
with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n✅ File updated!")
