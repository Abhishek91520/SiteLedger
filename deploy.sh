#!/bin/bash

# SiteLedger - Vercel Deployment Script
# This script helps you deploy your app to Vercel

echo "🚀 SiteLedger Vercel Deployment"
echo "================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI not found!"
    echo ""
    echo "Installing Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI installed!"
    echo ""
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo ""
    echo "Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created!"
        echo ""
        echo "📝 Please edit .env and add your Supabase credentials:"
        echo "   - VITE_SUPABASE_URL"
        echo "   - VITE_SUPABASE_ANON_KEY"
        echo ""
        read -p "Press Enter when ready to continue..."
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
fi

# Test build
echo "🔨 Testing production build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
else
    echo "❌ Build failed!"
    echo "Please fix errors before deploying."
    exit 1
fi

# Ask deployment type
echo "Choose deployment type:"
echo "1) Preview deployment (for testing)"
echo "2) Production deployment"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying to preview..."
        vercel
        ;;
    2)
        echo ""
        echo "⚠️  This will deploy to PRODUCTION!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo ""
            echo "🚀 Deploying to production..."
            vercel --prod
        else
            echo "❌ Deployment cancelled."
            exit 0
        fi
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Check Vercel dashboard for deployment status"
echo "2. Test your live site"
echo "3. Ensure environment variables are set in Vercel"
echo ""
echo "Happy deploying! 🎉"
