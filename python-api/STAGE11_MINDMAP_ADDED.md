# ✅ STAGE 11: Thêm Mindmap Export

## Tính Năng Mới

STAGE 11 (Knowledge Graph) bây giờ tự động tạo **mindmap** ở định dạng Markdown.

## Output Format

### JSON Response
```json
{
  "stages": {
    "stage11": {
      "entities": [...],
      "relations": [...],
      "mindmap_markdown": "# Vocabulary Mind Map\n## Topic 1...",
      "entities_created": 52,
      "relations_created": 68,
      "semantic_relations": 12,
      "clusters_count": 5,
      "vocabulary_terms": 47
    }
  }
}
```

### Mindmap Markdown Format

```markdown
# Vocabulary Mind Map

## Topic 1 (15 items)
- 🎯 **climate change** (core, rank: 1, score: 0.95)
- 🎯 **global warming** (core, rank: 2, score: 0.88)
- 🎯 **greenhouse gases** (core, rank: 3, score: 0.82)
- 📂 **environmental issues** (umbrella, rank: 4, score: 0.65)
- 📂 **climate crisis** (umbrella, rank: 5, score: 0.58)

## Topic 2 (12 items)
- 🎯 **renewable energy** (core, rank: 1, score: 0.89)
- 🎯 **solar power** (core, rank: 2, score: 0.85)
- 🎯 **wind energy** (core, rank: 3, score: 0.79)
- 📂 **clean energy** (umbrella, rank: 4, score: 0.62)

## Topic 3 (10 items)
- 🎯 **carbon emissions** (core, rank: 1, score: 0.87)
- 🎯 **fossil fuels** (core, rank: 2, score: 0.83)
- 📂 **pollution** (umbrella, rank: 3, score: 0.60)
```

## Icons

- 🎯 **Core phrase**: Specific, high-value vocabulary
- 📂 **Umbrella phrase**: Generic, broader terms
- 📄 **Unknown**: Role not determined

## Metadata Per Item

Each vocabulary item shows:
- **Phrase/Word**: The vocabulary term
- **Role**: core, umbrella, or unknown
- **Rank**: Position in cluster (1 = closest to centroid)
- **Score**: Importance score (0.0-1.0)

## Use Cases

### 1. Display in Frontend
```javascript
// Parse markdown and render as interactive mindmap
const mindmap = response.stages.stage11.mindmap_markdown;
renderMindmap(mindmap);
```

### 2. Export to File
```python
# Save mindmap to file
with open('vocabulary_mindmap.md', 'w', encoding='utf-8') as f:
    f.write(result['stages']['stage11']['mindmap_markdown'])
```

### 3. Convert to Other Formats
```python
# Convert to HTML, PDF, or interactive visualization
import markdown
html = markdown.markdown(mindmap_md)
```

## Example Output

For a document about "Climate Change":

```
# Vocabulary Mind Map

## Topic 1: Climate Science (20 items)
- 🎯 **climate change** (core, rank: 1, score: 0.95)
- 🎯 **global warming** (core, rank: 2, score: 0.88)
- 🎯 **greenhouse effect** (core, rank: 3, score: 0.85)
- 🎯 **carbon dioxide** (core, rank: 4, score: 0.82)
- 📂 **temperature rise** (umbrella, rank: 5, score: 0.65)

## Topic 2: Environmental Impact (15 items)
- 🎯 **sea level rise** (core, rank: 1, score: 0.89)
- 🎯 **extreme weather** (core, rank: 2, score: 0.86)
- 🎯 **biodiversity loss** (core, rank: 3, score: 0.83)
- 📂 **environmental damage** (umbrella, rank: 4, score: 0.62)

## Topic 3: Solutions (12 items)
- 🎯 **renewable energy** (core, rank: 1, score: 0.91)
- 🎯 **carbon reduction** (core, rank: 2, score: 0.87)
- 🎯 **sustainable practices** (core, rank: 3, score: 0.84)
- 📂 **green technology** (umbrella, rank: 4, score: 0.68)
```

## Visualization Ideas

### 1. Tree View
```
📚 Vocabulary (47 terms)
├─ 📁 Topic 1: Climate Science (20)
│  ├─ 🎯 climate change (0.95)
│  ├─ 🎯 global warming (0.88)
│  └─ ...
├─ 📁 Topic 2: Environmental Impact (15)
│  ├─ 🎯 sea level rise (0.89)
│  └─ ...
└─ 📁 Topic 3: Solutions (12)
   ├─ 🎯 renewable energy (0.91)
   └─ ...
```

### 2. Interactive Graph
- Nodes: Topics (large circles) + Phrases (small circles)
- Edges: "contains" (topic → phrase) + "similar_to" (phrase ↔ phrase)
- Colors: Different color per topic
- Size: Based on importance score

### 3. Hierarchical List
- Collapsible topics
- Click to expand/collapse
- Hover to see full metadata

## Benefits

✅ **Easy to understand**: Clear hierarchy (topics → phrases)  
✅ **Visual**: Icons and formatting make it scannable  
✅ **Exportable**: Markdown can be converted to many formats  
✅ **Metadata-rich**: Shows role, rank, and score for each item  
✅ **Automatic**: Generated automatically in STAGE 11

## Files Modified

- ✅ `python-api/complete_pipeline_12_stages.py` - Added `_generate_mindmap_markdown()` method

---

**Status**: ✅ COMPLETED  
**Date**: 2026-02-09  
**Feature**: Mindmap export in Markdown format
