# Contributing to SportScore

## Branch Strategy

This repository follows a production-ready branching model with two main branches:

### Main Branch (`main`)
- **Purpose**: Production/Release branch for customers
- **Protection**: This branch contains stable, production-ready code
- **Usage**: 
  - Only merge tested and approved code from `development`
  - Use for creating releases and deploying to production
  - Direct commits are discouraged; use pull requests from `development`

### Development Branch (`development`)
- **Purpose**: Active development branch for developers
- **Usage**:
  - All new features and bug fixes should be developed here or in feature branches
  - Create feature branches from `development`: `git checkout -b feature/your-feature-name development`
  - Merge feature branches back to `development` via pull requests
  - When ready for release, create a pull request from `development` to `main`

## Workflow

### For New Features or Bug Fixes:

1. **Create a feature branch from development:**
   ```bash
   git checkout development
   git pull origin development
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

3. **Push your feature branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request:**
   - Open a PR from your feature branch to `development`
   - Request code review from team members
   - Address any feedback

5. **After PR approval:**
   - Merge into `development`
   - Delete the feature branch

### For Releases:

1. **When development is stable and ready for release:**
   - Create a PR from `development` to `main`
   - Perform thorough testing
   - Get approval from team leads

2. **After merging to main:**
   - Tag the release: `git tag -a v1.0.0 -m "Release version 1.0.0"`
   - Push tags: `git push origin --tags`

## Branch Protection Recommendations

To maintain code quality, consider enabling these protections on GitHub:

### For `main` branch:
- Require pull request reviews before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Include administrators in restrictions
- Restrict who can push to the branch

### For `development` branch:
- Require pull request reviews before merging (recommended)
- Require status checks to pass before merging

## Getting Started

### First-time setup:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Lukas-Bohez/SportScore-.git
   cd SportScore-
   ```

2. **Set up development branch:**
   ```bash
   git checkout development
   git pull origin development
   ```

3. **You're ready to start developing!**

## Questions?

If you have any questions about the development workflow, please reach out to the team leads or open an issue for discussion.
