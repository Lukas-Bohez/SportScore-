# SportScore-
The repository for development for our SportScore! team project.

## Repository Structure

This repository is organized for production-ready development:

- **`main`** - Production/release branch for customers (stable code only)
- **`development`** - Active development branch for developers (work in progress)

## Initial Setup (For Repository Owner)

The `development` branch will be automatically created when changes are pushed to the `main` branch (via GitHub Actions workflow).

If you need to create it manually, you can either:

1. **Run the setup script:**
   ```bash
   bash setup_branches.sh
   ```

2. **Manually trigger the GitHub Actions workflow** in the repository Actions tab (workflow: "Setup Development Branch")

3. **Follow manual instructions** in [SETUP.md](SETUP.md)

## Getting Started (For Developers)

1. Clone the repository
2. Check out the `development` branch to start contributing
3. Read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed workflow and guidelines

For development workflow and branching strategy, please see [CONTRIBUTING.md](CONTRIBUTING.md).
