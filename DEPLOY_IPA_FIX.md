# 🚀 DEPLOY IPA & MINDMAP FIX

## ✅ CHANGES MADE

### Backend Changes:
1. **`python-api/complete_pipeline_12_stages.py`**
   - Added IPA generation to Stage 10 (Synonym Collapse)
   - Now ALL vocabulary items get IPA phonetics

2. **`python-api/requirements-railway.txt`**
   - Added `eng-to-ipa>=0.0.2` library
   - Required for IPA phonetic transcription

### Frontend Changes:
1. **`app/dashboard-new/documents-simple/page.tsx`**
   - Enhanced IPA display (blue color, mono font)
   - Added detailed mindmap debug logging
   - Better fallback handling for missing data

---

## 📋 DEPLOYMENT STEPS

### Step 1: Deploy Backend (Railway)

```bash
cd python-api

# Commit changes
git add .
git commit -m "fix: Add IPA phonetics to vocabulary items"
git push origin main

# Deploy to Railway (auto-deploy enabled)
# OR manually:
railway up
```

**Railway will:**
1. Install `eng-to-ipa` library (20MB)
2. Rebuild Python API
3. Restart service

**Expected logs:**
```
Installing eng-to-ipa>=0.0.2
✅ Successfully installed eng-to-ipa-0.0.2
```

---

### Step 2: Deploy Frontend (Vercel)

```bash
# Already committed in Step 1
# Vercel auto-deploys from main branch

# OR manually trigger:
vercel --prod
```

**Vercel will:**
1. Build Next.js app
2. Deploy to production
3. Update live site

---

### Step 3: Verify Deployment

#### 3.1: Check Railway Logs
```bash
railway logs

# Should see:
"Adding IPA phonetics to vocabulary items..."
"✓ All 50 items have phonetic field"
```

#### 3.2: Test API Endpoint
```bash
# Upload test document
curl -X POST https://your-railway-url.railway.app/api/upload-document-complete \
  -F "file=@test.pdf" \
  -F "max_phrases=40"

# Check response:
{
  "vocabulary": [
    {
      "phrase": "machine learning",
      "phonetic": "/məˈʃiːn ˈlɜːnɪŋ/",  // ← Should exist
      ...
    }
  ]
}
```

#### 3.3: Test Frontend
1. Open production URL: `https://your-app.vercel.app`
2. Go to `/dashboard-new/documents-simple`
3. Upload test document
4. Check Console logs:
   ```javascript
   🔍 Markmap Debug: {
     hasGraph: true,
     hasEntities: true,
     entitiesLength: 50,
     ...
   }
   ```
5. Verify IPA display:
   - Each word should show: `/phonetic/` in blue

---

## 🔍 TROUBLESHOOTING

### Issue 1: IPA Not Showing

**Symptom:** Vocabulary items don't have IPA

**Check:**
```bash
# Railway logs
railway logs | grep "IPA"

# Should see:
"Adding IPA phonetics to vocabulary items..."
```

**Solutions:**
1. Check if `eng-to-ipa` installed:
   ```bash
   railway run pip list | grep eng-to-ipa
   ```
2. If not installed, redeploy:
   ```bash
   railway up --force
   ```
3. Check Python import:
   ```python
   import eng_to_ipa as ipa
   print(ipa.convert("hello"))  # Should print: həˈloʊ
   ```

---

### Issue 2: Mindmap Links Not Working

**Symptom:** Click mindmap → blank page

**Check Console:**
```javascript
// Should see:
🔍 Markmap Debug: {
  hasGraph: true,
  hasEntities: true,
  entitiesLength: 50,
  hasRelations: true,
  relationsLength: 120
}
```

**If `hasEntities: false`:**
- Problem: Stage 11 (Knowledge Graph) not generating data
- Solution: Check backend logs for Stage 11 errors

**If `hasEntities: true` but link fails:**
- Problem: External service (markmap.js.org) issue
- Solution: Try different mindmap tool (Mermaid/Excalidraw)

**If link works but shows blank:**
- Problem: Markdown format issue
- Solution: Check markdown generation in console logs

---

### Issue 3: Railway Build Fails

**Symptom:** Railway deployment fails

**Check:**
```bash
railway logs --deployment

# Look for:
ERROR: Could not find a version that satisfies the requirement eng-to-ipa
```

**Solutions:**
1. Check requirements file:
   ```bash
   cat python-api/requirements-railway.txt | grep eng-to-ipa
   ```
2. Try different version:
   ```
   eng-to-ipa==0.0.2
   ```
3. Install manually:
   ```bash
   railway run pip install eng-to-ipa
   ```

---

## 📊 EXPECTED RESULTS

### Before Fix:
```
Vocabulary Item:
- phrase: "machine learning"
- phonetic: undefined  ❌
- Display: "machine learning" (no IPA)
```

### After Fix:
```
Vocabulary Item:
- phrase: "machine learning"
- phonetic: "/məˈʃiːn ˈlɜːnɪŋ/"  ✅
- Display: "machine learning /məˈʃiːn ˈlɜːnɪŋ/" (blue, mono font)
```

---

## 🎯 VALIDATION CHECKLIST

### Backend (Railway):
- [ ] `eng-to-ipa` installed successfully
- [ ] Logs show "Adding IPA phonetics to vocabulary items"
- [ ] API response includes `phonetic` field for each vocabulary item
- [ ] No import errors in logs

### Frontend (Vercel):
- [ ] Build successful
- [ ] No TypeScript errors
- [ ] Console shows mindmap debug logs
- [ ] IPA displays in blue, mono font
- [ ] Mindmap buttons disabled when no data

### User Experience:
- [ ] Upload document → see IPA for each word
- [ ] IPA format: `/phonetic/` in blue
- [ ] Mindmap buttons work or disabled appropriately
- [ ] Console logs help debug issues

---

## 📝 ROLLBACK PLAN

If deployment fails:

### Rollback Backend:
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# OR redeploy previous version
railway rollback
```

### Rollback Frontend:
```bash
# Vercel dashboard → Deployments → Previous deployment → Promote to Production
```

### Quick Fix:
If only IPA fails, can comment out in code:
```python
# Temporary disable IPA
# ipa = self._get_ipa_phonetics(word)
ipa = ""  # Fallback to empty string
```

---

## 🚀 POST-DEPLOYMENT

### Monitor:
1. Railway logs for errors
2. Vercel analytics for crashes
3. User feedback on IPA display
4. Mindmap link success rate

### Next Steps:
1. ✅ IPA working → Implement Document History
2. ⚠️ Mindmap not working → Investigate Stage 11
3. 🔄 Gather user feedback → Iterate

---

**Status:** ✅ READY TO DEPLOY

**Risk Level:** 🟡 MEDIUM
- Backend: Low risk (only adds IPA field)
- Frontend: Low risk (only display changes)
- Library: Medium risk (new dependency)

**Estimated Downtime:** 0 minutes (rolling deployment)

**Estimated Deploy Time:** 5-10 minutes
