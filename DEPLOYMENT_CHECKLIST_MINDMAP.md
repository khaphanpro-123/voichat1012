# ✅ Deployment Checklist: Knowledge Graph

## Pre-Deployment

### Backend (Railway) - ✅ DONE
- [x] Backend deployed: https://perceptive-charm-production-eb6c.up.railway.app
- [x] STAGE 11: Knowledge Graph implemented
- [x] STAGE 12: Flashcards implemented
- [x] API endpoint: `/api/knowledge-graph/{document_id}`
- [x] CORS configured for frontend

### Frontend (Local/Vercel) - 🔄 TODO

#### 1. Install Dependencies
- [ ] Run `INSTALL_DEPENDENCIES.bat` OR
- [ ] Run `npm install cytoscape cytoscape-dagre`
- [ ] Run `npm install --save-dev @types/cytoscape`

#### 2. Configure Environment
- [ ] Create/update `.env.local`:
  ```env
  NEXT_PUBLIC_BACKEND_URL=https://perceptive-charm-production-eb6c.up.railway.app
  ```

#### 3. Test Locally
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000/dashboard-new/vocabulary
- [ ] Upload a test document (English PDF/TXT)
- [ ] Wait for processing (30-60 seconds)
- [ ] Click "Sơ đồ tư duy" tab
- [ ] Verify graph loads and displays correctly
- [ ] Test interactions:
  - [ ] Zoom (scroll wheel)
  - [ ] Pan (drag)
  - [ ] Select node (click)
  - [ ] Change layout (dropdown)
  - [ ] Reset view (button)

#### 4. Deploy to Vercel
- [ ] Commit changes:
  ```bash
  git add .
  git commit -m "Add knowledge graph visualization with Cytoscape.js"
  git push origin main
  ```
- [ ] Verify Vercel auto-deploys
- [ ] Check deployment logs for errors
- [ ] Test on production URL

#### 5. Post-Deployment Testing
- [ ] Upload document on production
- [ ] Verify knowledge graph loads
- [ ] Test all interactions
- [ ] Check mobile responsiveness
- [ ] Verify backend connection

## Files Created/Modified

### Created (Documentation)
- [x] `INSTALL_DEPENDENCIES.bat` - Installation script
- [x] `KNOWLEDGE_GRAPH_SETUP.md` - Technical documentation
- [x] `HUONG_DAN_SO_DO_TU_DUY.md` - User guide (Vietnamese)
- [x] `SUMMARY_KNOWLEDGE_GRAPH.md` - Project summary
- [x] `QUICK_START_MINDMAP.md` - Quick reference
- [x] `DEPLOYMENT_CHECKLIST_MINDMAP.md` - This file
- [x] `.env.example` - Environment template

### Created (Code)
- [x] `components/knowledge-graph-viewer.tsx` - Cytoscape.js component (already existed)

### Modified (Code)
- [x] `app/dashboard-new/vocabulary/page.tsx` - Added mindmap tab and integration

### Backend (No changes needed)
- [x] `python-api/complete_pipeline_12_stages.py` - STAGE 11 & 12 already implemented
- [x] `python-api/main.py` - API endpoints already exist

## Verification Steps

### 1. Dependencies Check
```bash
npm list cytoscape
npm list cytoscape-dagre
npm list @types/cytoscape
```

Expected output:
```
├── cytoscape@3.x.x
├── cytoscape-dagre@2.x.x
└── @types/cytoscape@1.x.x
```

### 2. Environment Check
```bash
# Check .env.local exists
cat .env.local | grep NEXT_PUBLIC_BACKEND_URL
```

Expected output:
```
NEXT_PUBLIC_BACKEND_URL=https://perceptive-charm-production-eb6c.up.railway.app
```

### 3. Backend Health Check
```bash
curl https://perceptive-charm-production-eb6c.up.railway.app/health
```

Expected output:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "systems": {
    "phrase_extractor": true,
    "knowledge_graph": false,
    "rag_system": false
  }
}
```

### 4. Build Check (Local)
```bash
npm run build
```

Expected: No errors, successful build

### 5. Runtime Check (Local)
```bash
npm run dev
```

Expected: Server starts on http://localhost:3000

## Troubleshooting

### Issue: "Cannot find module 'cytoscape'"
**Solution:**
```bash
npm install cytoscape cytoscape-dagre
npm install --save-dev @types/cytoscape
```

### Issue: "process is not defined"
**Solution:** Already handled - using `process.env.NEXT_PUBLIC_BACKEND_URL` which is available in browser

### Issue: "Document not found"
**Solution:**
1. Upload a new document
2. Wait for pipeline to complete (check backend logs)
3. Refresh the vocabulary page

### Issue: Graph not displaying
**Solution:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify `data.nodes` and `data.edges` are not empty
4. Try refreshing the page

### Issue: CORS error
**Solution:** Backend already has CORS configured for all origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Success Criteria

- [x] Backend deployed and healthy
- [ ] Dependencies installed
- [ ] Environment configured
- [ ] Local testing passed
- [ ] Deployed to Vercel
- [ ] Production testing passed
- [ ] Documentation complete

## Next Steps (Optional Enhancements)

### Phase 2 Features
- [ ] Export graph to PNG/JSON
- [ ] Filter by cluster
- [ ] Search nodes
- [ ] Highlight path between nodes
- [ ] Animation on load
- [ ] Dark mode support
- [ ] Mobile optimization

### Phase 3 Features
- [ ] Real-time collaboration
- [ ] Graph editing
- [ ] Custom node styles
- [ ] Graph analytics
- [ ] Integration with flashcards

## Timeline

| Task | Estimated Time | Status |
|------|----------------|--------|
| Install dependencies | 1 minute | ⏳ Pending |
| Configure environment | 30 seconds | ⏳ Pending |
| Local testing | 5 minutes | ⏳ Pending |
| Deploy to Vercel | 2 minutes | ⏳ Pending |
| Production testing | 5 minutes | ⏳ Pending |
| **Total** | **~15 minutes** | ⏳ Pending |

## Contact

If you encounter any issues:
1. Check documentation files
2. Review backend logs: https://railway.app/project/...
3. Check Vercel deployment logs
4. Open browser console for frontend errors

---

**Ready to deploy!** Follow the checklist step by step. 🚀
