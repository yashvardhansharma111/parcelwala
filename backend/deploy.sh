#!/bin/bash

# Hostinger VPS Deployment Script
# Run this script on your VPS after initial setup

echo "🚀 Starting deployment..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Pull latest changes (if using git)
# git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Build the project
echo "🔨 Building project..."
npm run build

# Restart PM2
echo "🔄 Restarting PM2..."
pm2 restart parcel-booking-api || pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo "✅ Deployment complete!"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs parcel-booking-api"

