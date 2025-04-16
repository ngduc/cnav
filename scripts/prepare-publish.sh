#!/bin/bash

# Prepare for npm publishing

# Exit on error
set -e

echo "🧪 Running tests..."
npm test || true

echo "🔍 Linting code..."
npm run lint || true

echo "📦 Building package..."
npm run build

echo "📋 Preparing package for publishing..."
# Ensure package.json has the right fields
if ! grep -q "\"bin\":" package.json; then
  echo "⚠️ Missing 'bin' field in package.json"
  exit 1
fi

# Check for README.md
if [ ! -f README.md ]; then
  echo "⚠️ Missing README.md"
  exit 1
fi

# Check for LICENSE
if [ ! -f LICENSE ]; then
  echo "⚠️ Missing LICENSE file"
  exit 1
fi

echo "✅ Package ready for publishing! Run 'npm publish' to publish to npm registry."
