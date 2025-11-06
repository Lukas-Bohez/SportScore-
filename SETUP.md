# Repository Setup Instructions

## Creating the Development Branch

This repository uses a two-branch strategy:
- `main` - Production/release branch
- `development` - Active development branch

### Automatic Setup (Recommended)

Run the setup script to automatically create the development branch:

```bash
bash setup_branches.sh
```

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
