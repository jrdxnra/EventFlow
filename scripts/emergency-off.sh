#!/bin/bash

# 🚨 EventFlow Emergency Off Switch 🚨
# This script completely disables EventFlow to prevent any Firebase usage

echo "🚨 Turning off EventFlow completely..."

# Comment out the entire GitHub Actions workflow
sed -i 's/^/# /' .github/workflows/firebase-deploy.yml

# Deploy a "turned off" page to Firebase
mkdir -p temp-off
echo '<html><body><h1>🚫 EventFlow</h1><p>Currently turned off for maintenance.</p><p>Check back later!</p></body></html>' > temp-off/index.html

# Deploy the off page
firebase deploy --only hosting --public temp-off

# Clean up
rm -rf temp-off

# Commit and push the changes
git add .github/workflows/firebase-deploy.yml
git commit -m "🚨 EMERGENCY: Turn off EventFlow completely"
git push origin main

echo "✅ EventFlow is now COMPLETELY OFF!"
echo "🌙 You can sleep peacefully knowing nothing will consume Firebase resources."
echo ""
echo "To turn it back on later:"
echo "1. Run: ./scripts/emergency-on.sh"
echo "2. Or manually uncomment the workflow file" 