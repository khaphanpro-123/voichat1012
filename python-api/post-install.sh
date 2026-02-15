#!/bin/bash
set -e

echo "Installing spacy model..."
pip install --no-cache-dir https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.0/en_core_web_sm-3.7.0-py3-none-any.whl

echo "Downloading NLTK data..."
python download_nltk_data.py

echo "Post-install complete!"
