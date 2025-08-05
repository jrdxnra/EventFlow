#!/bin/bash

# EventFlow Production Deployment Script

echo "🚀 Deploying EventFlow to Production Environment..."

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Firebase Hosting Production
echo "🚀 Deploying to Firebase Hosting Production..."
firebase deploy --only hosting:production

echo "✅ Production deployment complete!"
echo "🌐 Production URL: https://eventflow-exos.web.app"
echo "📊 Firebase Console: https://console.firebase.google.com/project/eventflow-exos" 