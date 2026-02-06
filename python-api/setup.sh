#!/bin/bash

echo "=========================================="
echo "Setting up Python API with NLP Libraries"
echo "=========================================="

# Install Python dependencies
echo "📦 Installing Python packages..."
pip install -r requirements.txt

# Download spaCy English model
echo "📥 Downloading spaCy English model..."
python -m spacy download en_core_web_sm

# Download NLTK data
echo "📥 Downloading NLTK data..."
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"

echo ""
echo "✅ Setup completed!"
echo ""
echo "To start the server:"
echo "  python main.py"
echo ""
echo "Or with uvicorn:"
echo "  uvicorn main:app --reload --host 0.0.0.0 --port 8000"
