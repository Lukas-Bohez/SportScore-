# Repository Setup Instructions

## Creating the Development Branch

This repository uses a two-branch strategy:
- `main` - Production/release branch
- `development` - Active development branch

### Automatic Setup via GitHub Actions (Recommended)

The repository includes a GitHub Actions workflow that automatically creates the `development` branch:

1. **Automatic trigger**: The workflow runs automatically when changes are pushed to the `main` branch
2. **Manual trigger**: You can also manually trigger the workflow from the Actions tab in GitHub:
   - Go to the "Actions" tab in your repository
   - Select "Setup Development Branch" workflow
   - Click "Run workflow"

### Automatic Setup via Script

Run the setup script to automatically create the development branch:

```bash
bash setup_branches.sh
```

**Note**: You need to have push access to the repository for this to work.

### Manual Setup

If you prefer to set up the branches manually:

1. **Ensure you have the latest main branch:**
   ```bash
   git fetch origin
   git checkout main
   git pull origin main
   ```

2. **Create the development branch from main:**
   ```bash
   git checkout -b development main
   git push -u origin development
   ```

3. **Verify both branches exist:**
   ```bash
   git branch -a
   ```

You should see:
- `main`
- `development`
- `remotes/origin/main`
- `remotes/origin/development`

### After Setup

Once the branches are created:
1. Set `main` as the default branch in GitHub repository settings (for production releases)
2. Configure branch protection rules (see CONTRIBUTING.md for recommendations)
3. Start developing on the `development` branch or create feature branches from it

For detailed workflow instructions, see [CONTRIBUTING.md](CONTRIBUTING.md).
