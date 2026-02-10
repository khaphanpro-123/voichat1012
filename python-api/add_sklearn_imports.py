"""Add sklearn imports to phrase_centric_extractor.py"""

with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with "from sentence_transformers import SentenceTransformer"
new_lines = []
added = False

for line in lines:
    new_lines.append(line)
    if 'from sentence_transformers import SentenceTransformer' in line and not added:
        # Add sklearn imports after this line
        new_lines.append('from sklearn.feature_extraction.text import TfidfVectorizer\n')
        new_lines.append('from sklearn.cluster import KMeans\n')
        new_lines.append('from sklearn.metrics.pairwise import cosine_similarity\n')
        added = True

if added:
    with open('phrase_centric_extractor.py', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("✅ Added sklearn imports")
else:
    print("❌ Could not find insertion point")
