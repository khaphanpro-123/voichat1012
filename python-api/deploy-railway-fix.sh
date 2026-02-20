#!/bin/bash

echo "=========================================="
echo "RAILWAY LOGGING FIX DEPLOYMENT"
echo "=========================================="
echo ""

echo "Step 1: Setting environment variables..."
railway variables set LOG_LEVEL=INFO
railway variables set DEBUG_MODE=false
echo "✅ Environment variables set"
echo ""

echo "Step 2: Redeploying service..."
railway up
echo "✅ Deployment triggered"
echo ""

echo "Step 3: Waiting for deployment (30 seconds)..."
sleep 30
echo ""

echo "Step 4: Checking logs for rate limit errors..."
railway logs --tail 50 | grep -i "rate limit" || echo "✅ No rate limit errors found!"
echo ""

echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Verification:"
echo "1. Check Railway dashboard for deployment status"
echo "2. Monitor logs: railway logs"
echo "3. Test API endpoint"
echo ""
echo "Expected result:"
echo "- No 'rate limit reached' errors"
echo "- 4-10 logs per document (not 92+)"
echo "- API responds normally"
echo ""
