---
task: packageModule()
responsavel: "@kaven-module-creator"
responsavel_type: agent
atomic_layer: task
Entrada:
  - module_name: string
  - version: string # optional: semver version override
Saida:
  - package_archive: file # .tar.gz or .zip
  - manifest: file # module.json (validated)
  - documentation: file # README.md
Checklist:
  - [ ] Validate module.json schema and completeness
  - [ ] Verify all files referenced in module.json exist
  - [ ] Verify markers are correctly formatted
  - [ ] Test install/uninstall cycle on clean project
  - [ ] Generate module documentation
  - [ ] Run module doctor checks
  - [ ] Create package archive
  - [ ] Verify package integrity (checksum)
  - [ ] Tag version in git (if applicable)
  - [ ] Prepare marketplace metadata
---

# packageModule()

Package a Kaven module for distribution via the Kaven marketplace, including validation, documentation generation, and archive creation.

## Usage

```
@kaven-module-creator *task packageModule --name "analytics" --version "1.0.0"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `module_name` | string | yes | Name of the module to package |
| `version` | string | no | Semver version. Default: read from module.json |

## Output Format

```
dist/modules/
  ├── analytics-1.0.0.tar.gz    # Package archive
  ├── analytics-1.0.0.sha256    # Checksum file
  └── analytics-1.0.0.json      # Marketplace metadata
```

## Implementation Steps

### Step 1: Validate module.json

Run comprehensive validation on the module manifest:

```typescript
interface ModuleManifest {
  name: string;           // Required: kebab-case
  version: string;        // Required: semver (1.0.0)
  description: string;    // Required: 10-200 chars
  author: string;         // Required
  license: string;        // Required: SPDX identifier
  dependencies: string[]; // Optional: other module names
  features: string[];     // Required: at least one feature
  featureFlags: Record<string, FeatureFlagDef>; // Required
  injections: Injection[]; // Required: at least one injection
  files: FileMap;         // Required: backend, frontend, prisma
}
```

Validation checks:
- JSON is valid and parseable.
- All required fields are present.
- Version follows semver.
- Dependencies reference existing modules.
- Feature flags map to valid plan tiers.
- Injection targets reference existing anchor points.

### Step 2: Verify File Integrity

For every file referenced in `module.json.files`:

```bash
# Check that every source file exists
for file in $(jq -r '.files.backend[].src, .files.frontend[].src, .files.prisma[].src' module.json); do
  if [ ! -f "modules/$module_name/$file" ]; then
    echo "MISSING: $file"
    exit 1
  fi
done
```

### Step 3: Validate Markers

Check that all code files use proper KAVEN markers:

```
// [KAVEN_MODULE:{module_name} BEGIN]
... module code ...
// [KAVEN_MODULE:{module_name} END]
```

Rules:
- Every injected file must have BEGIN and END markers.
- Markers must match the module name exactly.
- No nested markers from other modules.
- Markers must be on their own line.

### Step 4: Test Install/Uninstall Cycle

This is the most critical validation step:

```bash
# 1. Create a clean test environment
git stash  # Save current changes

# 2. Install the module
kaven module add $module_name

# 3. Verify installation
pnpm prisma generate        # Schema should include new models
pnpm run lint                # No lint errors
pnpm run typecheck           # No type errors
pnpm test                    # All tests pass

# 4. Uninstall the module
kaven module remove $module_name

# 5. Verify clean removal
pnpm run lint                # No lint errors
pnpm run typecheck           # No type errors
pnpm test                    # All tests still pass
git diff                     # No unintended changes

# 6. Restore
git stash pop
```

### Step 5: Generate Documentation

Auto-generate a README.md for the module if one does not exist:

```markdown
# {Module Name} Module

{description from module.json}

## Features
- {feature 1}
- {feature 2}

## Installation
\`\`\`bash
kaven module add {module_name}
\`\`\`

## Configuration
### Feature Flags
| Flag | Plans | Limit |
|------|-------|-------|
| {flag_name} | {plans} | {limit} |

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|

## Database Models
| Model | Table | Fields |

## Dependencies
- {dependency 1}
- {dependency 2}

## Uninstallation
\`\`\`bash
kaven module remove {module_name}
\`\`\`
```

### Step 6: Create Package Archive

```bash
# Create dist directory
mkdir -p dist/modules

# Create tar.gz archive
tar -czf dist/modules/${module_name}-${version}.tar.gz \
  -C modules/${module_name} \
  .

# Generate SHA-256 checksum
sha256sum dist/modules/${module_name}-${version}.tar.gz \
  > dist/modules/${module_name}-${version}.sha256
```

### Step 7: Generate Marketplace Metadata

Create `{module_name}-{version}.json` for the marketplace API:

```json
{
  "name": "analytics",
  "version": "1.0.0",
  "description": "Analytics module with dashboard, events, and reports",
  "author": "Kaven",
  "license": "MIT",
  "size": 45678,
  "checksum": "sha256:abc123...",
  "dependencies": ["auth", "billing"],
  "compatibility": {
    "kaven-framework": ">=1.0.0",
    "node": ">=18.0.0"
  },
  "features": ["dashboard", "events", "reports"],
  "pricing": {
    "tier": "complete",
    "included": true
  },
  "publishedAt": "2026-02-15T12:00:00Z"
}
```

### Step 8: Final Verification

Run `kaven module doctor` one final time:

```bash
kaven module doctor $module_name --strict
```

This performs all checks in strict mode, failing on any warning (not just errors).

### Step 9: Publish (if ready)

```bash
# Upload to marketplace
kaven module publish dist/modules/${module_name}-${version}.tar.gz
```

This uploads the package to the Kaven marketplace API, which validates the package server-side and makes it available for download.
