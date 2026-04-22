# Step 8: Learned Final Scoring - Detailed Guide

## Overview
Step 8 in the document processing pipeline uses a trained regression model to predict final importance scores for all vocabulary items. It combines the four independent signals from Stage 6 (semantic, learning value, frequency, rarity) into a single final score using machine learning.

**File Location:** `python-api/new_pipeline_learned_scoring.py` (Lines 297-345)  
**Called From:** `python-api/complete_pipeline.py` (Lines 168-178)  
**Purpose:** Predict final importance scores using a trained regression model

---

## Architecture Overview

### Pipeline Stages 6-11:

```
Stage 6: Independent Scoring (4 signals computed)
    ↓
Stage 7: Merge (phrases + words combined)
    ↓
Stage 8: Learned Final Scoring ← YOU ARE HERE
    ↓
Stage 9: Topic Modeling
    ↓
Stage 10: Within-Topic Ranking
    ↓
Stage 11: Flashcard Generation
```

---

## Data Structures

### Input Format (from Stage 7)

```python
merged = [
    {
        'phrase': 'machine learning',
        'type': 'phrase',
        'semantic_score': 0.95,      # Signal 1
        'learning_value': 0.92,      # Signal 2
        'freq_score': 0.79,          # Signal 3
        'rarity_score': 0.42,        # Signal 4
        'embedding': [...],
        'sentences': [...]
    },
    {
        'word': 'algorithm',
        'type': 'word',
        'semantic_score': 0.94,
        'learning_value': 0.85,
        'freq_score': 0.79,
        'rarity_score': 0.12,
        'embedding': [...],
        'supporting_sentence': '...'
    },
    ...
]
```

### Output Format (after Stage 8)

```python
merged = [
    {
        'phrase': 'machine learning',
        'type': 'phrase',
        'semantic_score': 0.95,
        'learning_value': 0.92,
        'freq_score': 0.79,
        'rarity_score': 0.42,
        'final_score': 0.88,         # ← PREDICTED by model
        'embedding': [...],
        'sentences': [...]
    },
    {
        'word': 'algorithm',
        'type': 'word',
        'semantic_score': 0.94,
        'learning_value': 0.85,
        'freq_score': 0.79,
        'rarity_score': 0.12,
        'final_score': 0.82,         # ← PREDICTED by model
        'embedding': [...],
        'supporting_sentence': '...'
    },
    ...
]
```

---

## Main Algorithm: _learned_final_scoring()

**Location:** Lines 297-345

### Algorithm:

```python
def _learned_final_scoring(self, items: List[Dict]) -> List[Dict]:
    """
    STAGE 8: Learned Final Scoring
    
    Use regression model to predict final_score from:
    - semantic_score
    - learning_value
    - freq_score
    - rarity_score
    """
    if not items:
        return items
    
    # Prepare feature matrix
    X = []
    for item in items:
        features = [
            item.get('semantic_score', 0.5),
            item.get('learning_value', 0.5),
            item.get('freq_score', 0.5),
            item.get('rarity_score', 0.5)
        ]
        # Replace NaN with default value
        features = [0.5 if np.isnan(f) or f is None else f for f in features]
        X.append(features)
    
    X = np.array(X)
    
    # Additional NaN check
    if np.any(np.isnan(X)):
        print("  ⚠️  Found NaN values in features, replacing with 0.5")
        X = np.nan_to_num(X, nan=0.5)
    
    # Normalize features
    try:
        X_normalized = self.scaler.transform(X)
    except:
        # Scaler not fitted, fit now
        X_normalized = self.scaler.fit_transform(X)
    
    # Predict scores
    if self.regression_model is not None:
        scores = self.regression_model.predict(X_normalized)
    else:
        # Fallback: weighted average
        print("  ⚠️  No trained model, using default weights")
        weights = np.array([0.3, 0.4, 0.1, 0.2])  # Default weights
        scores = np.dot(X_normalized, weights)
    
    # Assign scores
    for i, item in enumerate(items):
        item['final_score'] = float(np.clip(scores[i], 0.0, 1.0))
    
    return items
```

### Process Flow:

```
Input: Merged items with 4 signals
    ↓
Step 1: Extract Features
    - semantic_score
    - learning_value
    - freq_score
    - rarity_score
    ↓
Step 2: Handle Missing Values
    - Replace NaN with 0.5
    ↓
Step 3: Normalize Features
    - Scale to [0, 1] using MinMaxScaler
    ↓
Step 4: Predict Scores
    - Use trained regression model
    - Or fallback to weighted average
    ↓
Step 5: Clamp Scores
    - Ensure scores in [0, 1]
    ↓
Output: Items with final_score
```

---

## Step-by-Step Breakdown

### Step 1: Extract Features

**Location:** Lines 310-320

```python
X = []
for item in items:
    features = [
        item.get('semantic_score', 0.5),
        item.get('learning_value', 0.5),
        item.get('freq_score', 0.5),
        item.get('rarity_score', 0.5)
    ]
    # Replace NaN with default value
    features = [0.5 if np.isnan(f) or f is None else f for f in features]
    X.append(features)

X = np.array(X)
```

**Purpose:** Create feature matrix for model input

**Format:**
```
X = [
    [0.95, 0.92, 0.79, 0.42],  # Item 1: machine learning
    [0.94, 0.85, 0.79, 0.12],  # Item 2: algorithm
    [0.92, 0.88, 0.50, 1.00],  # Item 3: neural networks
    ...
]

Shape: (n_items, 4)
```

### Step 2: Handle Missing Values

**Location:** Lines 322-327

```python
# Additional NaN check
if np.any(np.isnan(X)):
    print("  ⚠️  Found NaN values in features, replacing with 0.5")
    X = np.nan_to_num(X, nan=0.5)
```

**Purpose:** Ensure no NaN values that would break the model

**Default Value:** 0.5 (neutral/middle value)

### Step 3: Normalize Features

**Location:** Lines 329-335

```python
# Normalize features
try:
    X_normalized = self.scaler.transform(X)
except:
    # Scaler not fitted, fit now
    X_normalized = self.scaler.fit_transform(X)
```

**Purpose:** Scale features to [0, 1] range for model

**Scaler:** MinMaxScaler from scikit-learn

**Formula:**
```
X_normalized = (X - X_min) / (X_max - X_min)
```

**Example:**
```
Original:
  semantic_score: [0.90, 0.92, 0.95, 0.88]
  
After normalization:
  semantic_score: [0.33, 0.67, 1.00, 0.00]
```

### Step 4: Predict Scores

**Location:** Lines 337-343

```python
# Predict scores
if self.regression_model is not None:
    scores = self.regression_model.predict(X_normalized)
else:
    # Fallback: weighted average
    print("  ⚠️  No trained model, using default weights")
    weights = np.array([0.3, 0.4, 0.1, 0.2])  # Default weights
    scores = np.dot(X_normalized, weights)
```

**Purpose:** Predict final scores using trained model

**Two Paths:**

**Path A: With Trained Model**
```
scores = model.predict(X_normalized)
```
- Uses Ridge regression trained on labeled data
- Learns optimal weights from training data
- More accurate if training data is good

**Path B: Fallback (No Model)**
```
scores = X_normalized · [0.3, 0.4, 0.1, 0.2]
       = 0.3 × semantic_score 
       + 0.4 × learning_value 
       + 0.1 × freq_score 
       + 0.2 × rarity_score
```
- Uses fixed default weights
- Always available as fallback
- Reasonable default weights

### Step 5: Clamp Scores

**Location:** Lines 345-347

```python
# Assign scores
for i, item in enumerate(items):
    item['final_score'] = float(np.clip(scores[i], 0.0, 1.0))
```

**Purpose:** Ensure all scores are in valid [0, 1] range

**Formula:**
```
final_score = clip(predicted_score, 0.0, 1.0)
            = max(0.0, min(1.0, predicted_score))
```

**Example:**
```
Predicted: 1.15 → Clamped: 1.0
Predicted: 0.75 → Clamped: 0.75
Predicted: -0.05 → Clamped: 0.0
```

---

## Regression Model Details

### Model Type: Ridge Regression

**Why Ridge?**
- Stable and interpretable
- Handles multicollinearity well
- Fast to train and predict
- Good generalization

### Training Process

**Location:** Lines 347-375 (train_model method)

```python
def train_model(
    self,
    training_data: List[Dict]
) -> None:
    """
    Train regression model from labeled data
    
    Args:
        training_data: List of dicts with features + human_importance
            [
                {
                    'semantic_score': 0.8,
                    'learning_value': 0.9,
                    'freq_score': 0.5,
                    'rarity_score': 0.7,
                    'human_importance': 0.85  # Label
                }
            ]
    """
    print(f"\n[TRAINING] Training regression model...")
    
    # Prepare data
    X = []
    y = []
    
    for item in training_data:
        features = [
            item.get('semantic_score', 0.5),
            item.get('learning_value', 0.5),
            item.get('freq_score', 0.5),
            item.get('rarity_score', 0.5)
        ]
        X.append(features)
        y.append(item.get('human_importance', 0.5))
    
    X = np.array(X)
    y = np.array(y)
    
    # Fit scaler
    X_normalized = self.scaler.fit_transform(X)
    
    # Train model
    self.regression_model = Ridge(alpha=1.0)  # Ridge for stability
    self.regression_model.fit(X_normalized, y)
    
    # Save model
    self._save_model()
    
    print(f"  ✓ Model trained with {len(training_data)} examples")
    print(f"  ✓ Coefficients: {self.regression_model.coef_}")
    print(f"  ✓ Intercept: {self.regression_model.intercept_}")
```

### Training Data Format

```python
training_data = [
    {
        'semantic_score': 0.95,
        'learning_value': 0.92,
        'freq_score': 0.79,
        'rarity_score': 0.42,
        'human_importance': 0.88  # ← Human-labeled score
    },
    {
        'semantic_score': 0.94,
        'learning_value': 0.85,
        'freq_score': 0.79,
        'rarity_score': 0.12,
        'human_importance': 0.82
    },
    ...
]
```

### Model Persistence

**Save Model:**
```python
def _save_model(self):
    """Save trained model"""
    try:
        with open(self.model_path, 'wb') as f:
            pickle.dump({
                'model': self.regression_model,
                'scaler': self.scaler
            }, f)
        print(f"  ✓ Model saved to {self.model_path}")
    except Exception as e:
        print(f"  ⚠️  Could not save model: {e}")
```

**Load Model:**
```python
def _load_model(self):
    """Load trained model"""
    if os.path.exists(self.model_path):
        try:
            with open(self.model_path, 'rb') as f:
                data = pickle.load(f)
                self.regression_model = data['model']
                self.scaler = data['scaler']
            print(f"  ✓ Model loaded from {self.model_path}")
        except Exception as e:
            print(f"  ⚠️  Could not load model: {e}")
```

---

## Example Walkthrough

### Input (from Stage 7):

```
Item 1: "machine learning"
  semantic_score: 0.95
  learning_value: 0.92
  freq_score: 0.79
  rarity_score: 0.42

Item 2: "algorithm"
  semantic_score: 0.94
  learning_value: 0.85
  freq_score: 0.79
  rarity_score: 0.12

Item 3: "neural networks"
  semantic_score: 0.92
  learning_value: 0.88
  freq_score: 0.50
  rarity_score: 1.00
```

### Step 1: Extract Features

```
X = [
    [0.95, 0.92, 0.79, 0.42],
    [0.94, 0.85, 0.79, 0.12],
    [0.92, 0.88, 0.50, 1.00]
]
```

### Step 2: Handle Missing Values

```
No NaN values found, X unchanged
```

### Step 3: Normalize Features

```
Scaler fit on X:
  semantic_score: min=0.92, max=0.95
  learning_value: min=0.85, max=0.92
  freq_score: min=0.50, max=0.79
  rarity_score: min=0.12, max=1.00

X_normalized = [
    [1.00, 1.00, 1.00, 0.33],  # machine learning
    [0.67, 0.00, 1.00, 0.00],  # algorithm
    [0.00, 0.43, 0.00, 1.00]   # neural networks
]
```

### Step 4: Predict Scores

**With Trained Model:**
```
Model coefficients: [0.35, 0.40, 0.15, 0.10]
Model intercept: 0.05

scores = X_normalized · [0.35, 0.40, 0.15, 0.10] + 0.05

Item 1: 1.00×0.35 + 1.00×0.40 + 1.00×0.15 + 0.33×0.10 + 0.05 = 0.968
Item 2: 0.67×0.35 + 0.00×0.40 + 1.00×0.15 + 0.00×0.10 + 0.05 = 0.385
Item 3: 0.00×0.35 + 0.43×0.40 + 0.00×0.15 + 1.00×0.10 + 0.05 = 0.272
```

**Fallback (No Model):**
```
weights = [0.3, 0.4, 0.1, 0.2]

Item 1: 1.00×0.3 + 1.00×0.4 + 1.00×0.1 + 0.33×0.2 = 0.866
Item 2: 0.67×0.3 + 0.00×0.4 + 1.00×0.1 + 0.00×0.2 = 0.301
Item 3: 0.00×0.3 + 0.43×0.4 + 0.00×0.1 + 1.00×0.2 = 0.372
```

### Step 5: Clamp Scores

```
Item 1: 0.968 → 0.968 (already in range)
Item 2: 0.385 → 0.385 (already in range)
Item 3: 0.272 → 0.272 (already in range)
```

### Output (after Stage 8):

```python
merged = [
    {
        'phrase': 'machine learning',
        'semantic_score': 0.95,
        'learning_value': 0.92,
        'freq_score': 0.79,
        'rarity_score': 0.42,
        'final_score': 0.968  # ← PREDICTED
    },
    {
        'word': 'algorithm',
        'semantic_score': 0.94,
        'learning_value': 0.85,
        'freq_score': 0.79,
        'rarity_score': 0.12,
        'final_score': 0.385  # ← PREDICTED
    },
    {
        'phrase': 'neural networks',
        'semantic_score': 0.92,
        'learning_value': 0.88,
        'freq_score': 0.50,
        'rarity_score': 1.00,
        'final_score': 0.272  # ← PREDICTED
    }
]
```

---

## Integration in Complete Pipeline

**Location:** `python-api/new_pipeline_learned_scoring.py` (Lines 147-155)

### Execution:

```python
# STAGE 8: Learned Final Scoring
if 8 in enabled_stages:
    print(f"\n[STAGE 8] Learned Final Scoring...")
    
    merged = self._learned_final_scoring(merged)
    
    print(f"  ✓ Applied final scoring")
else:
    print(f"\n[STAGE 8] SKIPPED")
```

---

## Key Features

1. **Machine Learning:** Uses trained regression model
2. **Fallback:** Default weights if no model available
3. **Robust:** Handles NaN values gracefully
4. **Normalized:** Features scaled to [0, 1]
5. **Clamped:** Output guaranteed in [0, 1]
6. **Persistent:** Model saved and loaded from disk
7. **Trainable:** Can be trained on labeled data

---

## Performance Characteristics

- **Time Complexity:** O(n) where n = items
- **Space Complexity:** O(n) for feature matrix
- **Typical Performance:** Processes 100 items in 10-20ms
- **Model Size:** ~1KB (Ridge regression)
- **Prediction Speed:** ~0.1ms per item

---

## Testing Checklist

- [ ] Features extracted correctly
- [ ] NaN values handled
- [ ] Scaler transforms correctly
- [ ] Model predicts scores
- [ ] Fallback weights work
- [ ] Scores clamped to [0, 1]
- [ ] All items get final_score
- [ ] Model saves correctly
- [ ] Model loads correctly
- [ ] Training works with labeled data
- [ ] Coefficients printed correctly
- [ ] Works with empty item list
- [ ] Works with single item
- [ ] Works with large lists (1000+ items)
- [ ] Handles missing semantic_score
- [ ] Handles missing learning_value
- [ ] Handles missing freq_score
- [ ] Handles missing rarity_score
