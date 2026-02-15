@echo off
echo ========================================
echo Installing Cytoscape.js Dependencies
echo ========================================
echo.

echo Installing cytoscape and cytoscape-dagre...
npm install cytoscape cytoscape-dagre

echo.
echo Installing TypeScript types...
npm install --save-dev @types/cytoscape

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. The dependencies are now installed
echo 2. The KnowledgeGraphViewer component is ready
echo 3. Update app/dashboard-new/vocabulary/page.tsx to use it
echo.
pause
