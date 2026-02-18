@echo off
echo ========================================
echo   DEPLOY MINDMAP LINKS FEATURE
echo ========================================
echo.
echo Da them:
echo - Link Markmap (Interactive mindmap)
echo - Link Mermaid (Flowchart)
echo - Link Excalidraw (Draw/Sketch)
echo.
echo Khong con loi hydration!
echo User xem mindmap tren cac dich vu ben thu ba
echo.
echo ========================================
echo.

echo Step 1: Adding files...
git add app/dashboard-new/documents/page.tsx
git add MINDMAP_LINKS_FEATURE.md
git add DEPLOY_MINDMAP_LINKS.bat

echo.
echo Step 2: Committing...
git commit -m "feat: Add external mindmap links (Markmap, Mermaid, Excalidraw) - no hydration errors"

echo.
echo Step 3: Pushing...
git push origin main

echo.
echo ========================================
echo   DONE!
echo ========================================
echo.
echo Sau khi deploy:
echo 1. Upload file
echo 2. Thay 3 buttons: Markmap, Mermaid, Excalidraw
echo 3. Click button -> Mo tab moi
echo 4. Xem mindmap interactive
echo 5. Zoom, pan, export
echo.
echo Dich vu:
echo - Markmap: https://markmap.js.org
echo - Mermaid: https://mermaid.live
echo - Excalidraw: https://excalidraw.com
echo.
echo Press any key to exit...
pause > nul
