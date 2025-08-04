#!/bin/bash

# ✅ EventFlow Emergency On Switch ✅
# This script turns EventFlow back on after being turned off

echo "✅ Turning EventFlow back on..."

# Uncomment the GitHub Actions workflow (remove # from lines that start with # )
sed -i 's/^# name:/name:/' .github/workflows/firebase-deploy.yml
sed -i 's/^# on:/on:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#   workflow_dispatch:/  workflow_dispatch:/' .github/workflows/firebase-deploy.yml
sed -i 's/^# jobs:/jobs:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#   build_and_deploy:/  build_and_deploy:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#     runs-on:/    runs-on:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#     steps:/    steps:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#     - name:/    - name:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#       uses:/      uses:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#       with:/      with:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#         node-version:/        node-version:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#         cache:/        cache:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#     - name:/    - name:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#       run:/      run:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#     - name:/    - name:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#       run:/      run:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#     - name:/    - name:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#       uses:/      uses:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#       with:/      with:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#         repoToken:/        repoToken:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#         firebaseServiceAccount:/        firebaseServiceAccount:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#         channelId:/        channelId:/' .github/workflows/firebase-deploy.yml
sed -i 's/^#         projectId:/        projectId:/' .github/workflows/firebase-deploy.yml

# Deploy a "back on" page to Firebase
mkdir -p temp-on
echo '<html><body><h1>✅ EventFlow</h1><p>Back online and ready for development!</p></body></html>' > temp-on/index.html

# Deploy the on page
firebase deploy --only hosting --public temp-on

# Clean up
rm -rf temp-on

# Commit and push the changes
git add .github/workflows/firebase-deploy.yml
git commit -m "✅ Turn EventFlow back on"
git push origin main

echo "✅ EventFlow is now BACK ON!"
echo "🚀 Ready for development and manual deployments." 