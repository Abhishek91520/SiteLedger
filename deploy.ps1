# SiteLedger - Vercel Deployment Script (PowerShell)
# This script helps you deploy your app to Vercel

Write-Host "🚀 SiteLedger Vercel Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed!" -ForegroundColor Green
    Write-Host ""
}

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "✅ .env file created!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Please edit .env and add your Supabase credentials:" -ForegroundColor Cyan
        Write-Host "   - VITE_SUPABASE_URL"
        Write-Host "   - VITE_SUPABASE_ANON_KEY"
        Write-Host ""
        Read-Host "Press Enter when ready to continue"
    } else {
        Write-Host "❌ .env.example not found!" -ForegroundColor Red
        exit 1
    }
}

# Test build
Write-Host "🔨 Testing production build..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host "Please fix errors before deploying." -ForegroundColor Yellow
    exit 1
}

# Ask deployment type
Write-Host "Choose deployment type:" -ForegroundColor Cyan
Write-Host "1) Preview deployment (for testing)"
Write-Host "2) Production deployment"
Write-Host ""
$choice = Read-Host "Enter choice (1 or 2)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚀 Deploying to preview..." -ForegroundColor Cyan
        vercel
    }
    "2" {
        Write-Host ""
        Write-Host "⚠️  This will deploy to PRODUCTION!" -ForegroundColor Yellow
        $confirm = Read-Host "Are you sure? (yes/no)"
        if ($confirm -eq "yes") {
            Write-Host ""
            Write-Host "🚀 Deploying to production..." -ForegroundColor Cyan
            vercel --prod
        } else {
            Write-Host "❌ Deployment cancelled." -ForegroundColor Red
            exit 0
        }
    }
    default {
        Write-Host "❌ Invalid choice!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Check Vercel dashboard for deployment status"
Write-Host "2. Test your live site"
Write-Host "3. Ensure environment variables are set in Vercel"
Write-Host ""
Write-Host "Happy deploying! 🎉" -ForegroundColor Green
