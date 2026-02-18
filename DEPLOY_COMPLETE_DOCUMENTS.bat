@echo off
echo ========================================
echo   DEPLOY COMPLETE DOCUMENTS PAGE
echo ========================================
echo.
echo Tinh nang:
echo - Hien thi TAT CA tu vung
echo - Layout dep mat (gradient, animations)
echo - Auto-save flashcards + graph vao database
echo - Mindmap graph (Canvas API)
echo - Synonyms + Context sentence
echo - Text-to-Speech
echo.
echo ========================================
echo.

echo Step 1: Adding files...
git add app/dashboard-new/documents/page.tsx
git add app/api/knowledge-graph/route.ts
git add DOCUMENTS_PAGE_HOAN_CHINH.md
git add DEPLOY_COMPLETE_DOCUMENTS.bat

echo.
echo Step 2: Committing...
git commit -m "feat: Complete documents page with all features - mindmap graph, TTS, auto-save, synonyms, context"

echo.
echo Step 3: Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo   DONE!
echo ========================================
echo.
echo Tinh nang da them:
echo [x] Hien thi TAT CA tu vung (khong gioi han)
echo [x] Layout dep mat (gradient background)
echo [x] Auto-save flashcards vao database
echo [x] Auto-save knowledge graph vao database
echo [x] Mindmap graph (cluster keyword o giua)
echo [x] Synonyms display (gradient tags)
echo [x] Context sentence (yellow box)
echo [x] Text-to-Speech cho tu va cau
echo [x] Responsive design
echo.
echo Next steps:
echo 1. Doi Vercel auto-deploy (2-3 phut)
echo 2. Test: https://voichat1012.vercel.app/dashboard-new/documents
echo 3. Upload file PDF/DOCX
echo 4. Kiem tra tat ca tinh nang
echo.
echo Press any key to exit...
pause > nul
