# EventFlow Staging Environment

## 🎯 Overview
Staging environment for testing changes before production deployment.

## 📋 Single Project, Multiple Sites

### Production Site
- **Project ID:** `eventflow-exos`
- **URL:** https://eventflow-exos.web.app
- **Console:** https://console.firebase.google.com/project/eventflow-exos

### Staging Site
- **Project ID:** `eventflow-exos` (same project)
- **URL:** https://eventflow-stagingexos.web.app
- **Console:** https://console.firebase.google.com/project/eventflow-exos

## 🚀 Deployment Commands

### Deploy to Staging
```bash
npm run deploy:staging
# or
./scripts/deploy-staging.sh
```

### Deploy to Production
```bash
npm run deploy:production
# or
./scripts/deploy-production.sh
```

## 🔄 Workflow

1. **Development:** Test locally with `npm run dev`
2. **Staging:** Deploy to staging with `npm run deploy:staging`
3. **Testing:** Verify everything works in staging
4. **Production:** Deploy to production with `npm run deploy:production`

## ⚙️ Firebase Configuration

### Single Project Setup
Both staging and production use the same Firebase project (`eventflow-exos`).

### Hosting Targets
- **Production:** `hosting:production` → `eventflow-exos.web.app`
- **Staging:** `hosting:staging` → `eventflow-stagingexos.web.app`

## 🛡️ Benefits

- **Safe Testing:** Test changes without affecting production data
- **Same Authentication:** No need to set up auth twice
- **Same Database:** Test with real data
- **Simple Setup:** One Firebase project to manage
- **Team Collaboration:** Share staging with team members
- **Production Confidence:** Verify everything works before going live

## 📝 Notes

- Staging uses the same codebase as production
- Staging has its own Firebase project with separate data
- Staging is perfect for testing new features and fixes
- Always test in staging before deploying to production 