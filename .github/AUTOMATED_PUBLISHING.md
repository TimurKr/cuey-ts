# Automated Publishing Setup

This repository uses GitHub Actions to automatically publish to npm when the version in `package.json` is updated.

## How It Works

1. **Trigger**: The workflow runs when you push to `main` branch and the `package.json` file (or lock files) has changed.

2. **Version Check**: The workflow compares the version in `package.json` with the latest git tag:
   - If no tag exists, it will publish
   - If the version differs from the latest tag, it will publish
   - If the version matches the latest tag, it skips publishing

3. **Testing & Building**: Before publishing:
   - Runs `bun test`
   - Runs `bun run type-check`
   - Runs `bun run build`
   - Verifies the build output

4. **Publishing**: If tests pass:
   - Publishes to npm
   - Creates a git tag (`v<version>`)
   - Creates a GitHub release

## Setup Instructions

### 1. Create npm Access Token

1. Go to [npmjs.com](https://www.npmjs.com/) and log in
2. Click on your profile picture → **Access Tokens**
3. Click **Generate New Token** → **Automation**
4. Give it a name (e.g., "GitHub Actions Publishing")
5. Copy the token (you won't see it again!)

### 2. Add Secret to GitHub

1. Go to your GitHub repository: `https://github.com/timurkramar/cuey-ts`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click **Add secret**

### 3. Verify GitHub Token Permissions

The `GITHUB_TOKEN` is automatically provided by GitHub Actions, but make sure your workflow has write permissions:

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, ensure:
   - ✅ **Read and write permissions** is selected
   - ✅ **Allow GitHub Actions to create and approve pull requests** is checked (if you want)

## Usage

### Publishing a New Version

1. **Update the version** in `package.json`:

   ```json
   {
     "version": "0.1.1" // or 0.2.0, 1.0.0, etc.
   }
   ```

2. **Commit and push to main**:

   ```bash
   git add package.json
   git commit -m "Bump version to 0.1.1"
   git push origin main
   ```

3. **The workflow will automatically**:
   - Detect the version change
   - Run tests
   - Build the package
   - Publish to npm
   - Create a git tag
   - Create a GitHub release

### Checking Workflow Status

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. You'll see the workflow runs and their status

### Manual Version Bumping

You can also use npm version command:

```bash
npm version patch  # 0.1.0 -> 0.1.1
npm version minor   # 0.1.0 -> 0.2.0
npm version major   # 0.1.0 -> 1.0.0

# This will:
# 1. Update package.json version
# 2. Create a git commit
# 3. Create a git tag

# Then push:
git push origin main --follow-tags
```

## Troubleshooting

### Workflow doesn't run

- Make sure you're pushing to the `main` branch
- Make sure `package.json` was actually changed
- Check the **Actions** tab for any errors

### Publishing fails

- Verify `NPM_TOKEN` secret is set correctly
- Make sure the package name `cuey` is available on npm
- Check if you have publish permissions on npm

### Tests fail

- Check the workflow logs in the **Actions** tab
- Make sure `bun test` passes locally first

## Workflow Files

- `.github/workflows/publish.yml` - Main publishing workflow
- `.github/workflows/ci.yml` - CI workflow (runs on all pushes)
