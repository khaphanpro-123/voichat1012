@echo off
echo 🚀 Installing WebGPU Debate Mode Dependencies...
echo.

REM Install required packages
echo 📦 Installing @mlc-ai/web-llm...
call npm install @mlc-ai/web-llm

echo 📦 Installing @xenova/transformers...
call npm install @xenova/transformers

echo.
echo ✅ Installation complete!
echo.
echo 📋 Next steps:
echo 1. Enable WebGPU in Chrome: chrome://flags → 'Unsafe WebGPU'
echo 2. Restart your browser
echo 3. Run: npm run dev
echo 4. Navigate to: http://localhost:3000/dashboard-new/debate-webgpu
echo.
echo 📚 See WEBGPU_INSTALLATION.md for detailed instructions
pause
