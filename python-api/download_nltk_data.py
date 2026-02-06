"""
Download required NLTK data
"""

import nltk

print("Downloading NLTK data...")

# Download required packages
packages = [
    'punkt',
    'punkt_tab',
    'averaged_perceptron_tagger',
    'averaged_perceptron_tagger_eng',
    'stopwords',
    'wordnet',
    'omw-1.4'
]

for package in packages:
    try:
        print(f"Downloading {package}...")
        nltk.download(package, quiet=True)
        print(f"✅ {package} downloaded")
    except Exception as e:
        print(f"⚠️  {package}: {e}")

print("\n✅ All NLTK data downloaded!")
