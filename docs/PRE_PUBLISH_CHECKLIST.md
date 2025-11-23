# Pre-Publish Checklist

This document lists all additional checks possible before publishing a new version to NPM.

## ✅ Basic Checks (Already Done)

- [x] Tests passing (145 tests, 100% coverage)
- [x] Exports working correctly
- [x] Essential files present (index.js, README.md, LICENSE)
- [x] Valid package.json
- [x] CHANGELOG.md created

## 🔍 Additional Recommended Checks

### 1. NPM Package Verification

```bash
# Simulate what will be published
npm pack --dry-run

# Check package size
npm pack
tar -tzf *.tgz | wc -l  # Count files
du -h *.tgz             # Tarball size
rm *.tgz                # Clean up
```

**What to check:**
- ✅ Only necessary files are included
- ✅ `node_modules` is not included
- ✅ Build/test files are not included
- ✅ `.git` is not included
- ✅ Reasonable package size

### 2. Dependencies Verification

```bash
# Check installed dependencies
yarn list --depth=0

# Check vulnerabilities
npm audit
# or
yarn audit

# Check outdated dependencies
npm outdated
# or
yarn outdated
```

**What to check:**
- ✅ No known vulnerabilities
- ✅ Dependencies are at correct versions
- ✅ Peer dependencies documented (if any)

### 3. Code Verification

```bash
# Check syntax (if using linter)
npm run lint  # if configured

# Check types (if using TypeScript)
npm run type-check  # if configured

# Check formatting
npm run format:check  # if configured
```

**What to check:**
- ✅ No syntax errors
- ✅ No critical warnings
- ✅ Code consistently formatted

### 4. Test Verification

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:coverage

# Check if coverage is above threshold
# (if configured in jest.config.js)
```

**What to check:**
- ✅ All tests passing
- ✅ Adequate coverage (100% in our case)
- ✅ Integration tests passing
- ✅ Tests on different Node.js versions (if applicable)

### 5. Compatibility Verification

```bash
# Test on different Node.js versions
nvm use 18
yarn test

nvm use 20
yarn test

# Check engines in package.json
node -e "console.log(require('./package.json').engines)"
```

**What to check:**
- ✅ Compatible with Node.js >= 18.0.0 (as per package.json)
- ✅ Tested on minimum supported version
- ✅ Tested on current LTS version

### 6. Documentation Verification

```bash
# Check if README is updated
# Check if CHANGELOG is updated
# Check if examples work
node examples/printTest.js  # (without connecting real hardware)
```

**What to check:**
- ✅ README.md complete and updated
- ✅ CHANGELOG.md with all changes
- ✅ Code examples work
- ✅ API documentation is correct
- ✅ Links working

### 7. Git Verification

```bash
# Check git status
git status

# Check for uncommitted changes
git diff

# Check existing tags
git tag -l

# Check last commit
git log -1
```

**What to check:**
- ✅ All changes committed (or intentionally uncommitted)
- ✅ Correct branch (usually `main` or `master`)
- ✅ No sensitive files (tokens, passwords, etc.)
- ✅ `.gitignore` properly configured

### 8. Build Verification (if applicable)

```bash
# If there's a build step
npm run build

# Check if build files were generated
ls -la dist/  # or build folder
```

**What to check:**
- ✅ Build completes without errors
- ✅ Build files generated correctly
- ✅ Build files included in package (if necessary)

### 9. Local Publication Verification

```bash
# Install package locally to test
npm link
# or
cd /tmp
npm install /path/to/escpos

# Test import
node -e "const { USB, Serial, Printer } = require('@risleylima/escpos'); console.log('OK')"
```

**What to check:**
- ✅ Package can be installed
- ✅ Exports work after installation
- ✅ Dependencies are installed correctly

### 10. Versioning Verification

```bash
# Check current version
node -e "console.log(require('./package.json').version)"

# Check if version follows semantic versioning
# MAJOR.MINOR.PATCH
# 0.0.14 -> 0.1.0 (minor update)
```

**What to check:**
- ✅ Version follows Semantic Versioning
- ✅ Version in package.json is correct
- ✅ Version in CHANGELOG is correct
- ✅ Breaking changes documented (if any)

### 11. Package Metadata Verification

```bash
# Check package.json
node -e "const pkg = require('./package.json'); console.log(JSON.stringify({
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  main: pkg.main,
  keywords: pkg.keywords,
  author: pkg.author,
  license: pkg.license,
  repository: pkg.repository,
  bugs: pkg.bugs,
  homepage: pkg.homepage
}, null, 2))"
```

**What to check:**
- ✅ Package name correct
- ✅ Clear and updated description
- ✅ Relevant keywords
- ✅ Correct author and license
- ✅ Repository, bugs, and homepage links working

### 12. Security Verification

```bash
# Check vulnerabilities
npm audit
yarn audit

# Check for sensitive files
grep -r "password\|secret\|token\|api_key" --exclude-dir=node_modules .
```

**What to check:**
- ✅ No known vulnerabilities
- ✅ No hardcoded credentials
- ✅ No tokens or API keys in code

### 13. Performance Verification (Optional)

```bash
# Test load time
time node -e "require('./index.js')"

# Check bundle size (if applicable)
npm run build:analyze  # if configured
```

**What to check:**
- ✅ Reasonable load time
- ✅ Optimized package size
- ✅ No unnecessary dependencies

### 14. Accessibility Verification (Optional)

```bash
# Check if README is readable
# Check if examples are clear
# Check if documentation is complete
```

**What to check:**
- ✅ README well formatted
- ✅ Clear and functional examples
- ✅ Complete documentation

## 🚀 `np` Commands

The `np` tool automatically performs many of these checks:

```bash
npx np minor
```

**What `np` automatically checks:**
- ✅ Git status (uncommitted changes)
- ✅ Correct branch
- ✅ Tests (if configured)
- ✅ Build (if configured)
- ✅ Versioning
- ✅ Git tag
- ✅ NPM publication

## 📋 Final Checklist Before Publishing

- [ ] All tests passing
- [ ] Adequate test coverage
- [ ] CHANGELOG.md updated
- [ ] README.md updated
- [ ] No known vulnerabilities
- [ ] Dependencies updated
- [ ] Code reviewed
- [ ] Git status clean (or intentional changes)
- [ ] Correct version in package.json
- [ ] Correct version in CHANGELOG
- [ ] Package metadata correct
- [ ] Examples tested (if possible)
- [ ] Compatibility verified

## 🎯 Specific Recommendations for This Version

For v0.1.0, check especially:

1. **Major Dependency Updates:**
   - [x] `usb@^2.16.0` - Promise-based API working
   - [x] `serialport@^13.0.0` - Promise-based API working
   - [x] Tests updated for new APIs

2. **Documentation:**
   - [x] Complete README
   - [x] CHANGELOG created
   - [x] Complete JSDoc

3. **Tests:**
   - [x] 100% coverage
   - [x] All tests passing

4. **Compatibility:**
   - [x] Public API maintained (no breaking changes)
   - [x] Exports working

## ⚠️ Important Notes

- **Internal Breaking Changes**: The `usb` and `serialport` updates are major, but the library's public API has not changed. It's safe to publish as a minor update.

- **Hardware Testing**: If possible, test with real hardware before publishing, especially after the `usb` and `serialport` updates.

- **Rollback Plan**: Have a rollback plan in case something goes wrong after publication.
