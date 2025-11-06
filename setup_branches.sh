#!/bin/bash

# Setup script for creating the development branch
# This script should be run by the repository owner/administrator

set -e

echo "=========================================="
echo "SportScore Repository Branch Setup"
echo "=========================================="
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Fetch latest changes
echo "Fetching latest changes from origin..."
git fetch origin

# Check if development branch already exists remotely
if git ls-remote --heads origin | grep -q "refs/heads/development"; then
    echo "✓ Development branch already exists remotely"
    
    # Check if it exists locally
    if git show-ref --verify --quiet refs/heads/development; then
        echo "✓ Development branch already exists locally"
        git checkout development
        git pull origin development
    else
        echo "Creating local development branch from remote..."
        git checkout -b development origin/development
    fi
else
    echo "Creating development branch..."
    
    # Ensure we're on main
    if git show-ref --verify --quiet refs/heads/main; then
        git checkout main
    else
        git checkout -b main origin/main
    fi
    
    git pull origin main
    
    # Create development branch from main
    git checkout -b development
    
    # Push development branch to origin
    echo "Pushing development branch to origin..."
    git push -u origin development
    
    echo "✓ Development branch created and pushed successfully"
fi

echo ""
echo "=========================================="
echo "Branch Setup Complete!"
echo "=========================================="
echo ""
echo "Current branches:"
git branch -a | grep -E "(main|development)"
echo ""
echo "Next steps:"
echo "1. Set branch protection rules in GitHub (see CONTRIBUTING.md)"
echo "2. Consider setting 'main' as the default branch for releases"
echo "3. Read CONTRIBUTING.md for workflow guidelines"
echo ""
