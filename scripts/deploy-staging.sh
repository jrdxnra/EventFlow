#!/bin/bash

# EventFlow Staging Deployment Script

echo "🚀 Deploying EventFlow to Staging Environment..."

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Firebase Hosting Staging
echo "🚀 Deploying to Firebase Hosting Staging..."
firebase deploy --only hosting:staging

echo "✅ Staging deployment complete!"
echo "🌐 Staging URL: https://eventflow-stagingexos.web.app"
echo "📊 Firebase Console: https://console.firebase.google.com/project/eventflow-exos" 