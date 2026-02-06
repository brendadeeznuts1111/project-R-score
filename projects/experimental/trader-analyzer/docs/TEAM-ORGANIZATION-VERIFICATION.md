# Team Organization Verification & Synchronization

**Metadata**: [[TECH][MODULE][INTEGRATION][META:{blueprint=BP-TEAM-ORGANIZATION@1.3.3;instance-id=TEAM-ORG-VERIFICATION-001;version=1.3.3}][PROPERTIES:{integration={value:"team-structure-verification";@root:"14.0.0.0.0.0.0";@chain:["BP-MLGS-DEBUGGING","BP-BUN-API"];@version:"1.3.3"}}][CLASS:TeamOrganizationVerification][#REF:v-1.3.3.BP.TEAM.ORGANIZATION.1.0.A.1.1.DOC.1.1]]

---

## Overview

The Team Organization Verification system ensures consistency across all team structure data sources in the Hyper-Bun platform. It verifies team leads, maintainers, package ownership, and team assignments across:

- **RSS Team Categories** (`src/utils/rss-constants.ts`)
- **Registry Team Access** (`src/api/registry-team-access.ts`)
- **Dashboard HTML** (`dashboard/team-organization.html`)
- **Package Detail Pages** (`apps/@registry-dashboard/src/pages/package/[name].ts`)

---

## Source of Truth

The verification script uses `dashboard/team-organization.html` as the **source of truth** for team structure, defined in `scripts/verify-team-organization.ts`:

### Teams

1. **Sports Correlation** (`sports`)
   - Team Lead: Alex Chen
   - Members: 3 (Alex Chen, Jordan Lee, Priya Patel)
   - Packages: `@graph/layer4`, `@graph/layer3`

2. **Market Analytics** (`markets`)
   - Team Lead: Sarah Kumar
   - Members: 3 (Sarah Kumar, Tom Wilson, Lisa Zhang)
   - Packages: `@graph/layer2`, `@graph/layer1`

3. **Platform & Tools** (`platform`)
   - Team Lead: Mike Rodriguez
   - Members: 4 (Mike Rodriguez, David Kim, Emma Brown, Ryan Gupta)
   - Packages: `@graph/algorithms`, `@graph/storage`, `@graph/streaming`, `@graph/utils`, `@bench/*`

---

## Usage

### Basic Verification

```bash
# Verify all team structures
bun run verify:team

# Generate detailed markdown report
bun run verify:team:report

# Verify specific team
bun run scripts/verify-team-organization.ts --team platform_tools
```

### Verification Checks

The script performs the following checks:

1. **RSS Team Categories Verification**
   - Verifies team IDs match source of truth
   - Checks team lead email format consistency
   - Validates package assignments match team structure

2. **Registry Team Access Verification**
   - Verifies `TEAM_PACKAGES` mapping includes all packages
   - Checks `PACKAGE_MAINTAINERS` mapping matches maintainers
   - Validates team lead email addresses

3. **Dashboard HTML Verification**
   - Ensures all team members are present in HTML
   - Verifies package references are correct
   - Checks team structure matches source of truth

---

## Verification Results

### Issue Types

- **🔴 Error**: Critical inconsistencies that must be fixed
- **🟡 Warning**: Potential inconsistencies that should be reviewed
- **ℹ️ Info**: Informational notes about extra or optional data

### Example Output

```text
📊 Team Organization Verification Results

Total Issues: 0
  🔴 Errors: 0
  🟡 Warnings: 0
  ℹ️  Info: 0

✅ All verifications passed!
```

---

## Integration Points

### RSS Feed System

Team verification integrates with RSS feeds via `RSS_TEAM_CATEGORIES`:
- Each team has a dedicated RSS feed URL
- Telegram topic mapping for team notifications
- Package-to-team mapping for feed filtering

### Registry Access Control

Team verification ensures `registry-team-access.ts` matches team structure:
- `TEAM_PACKAGES` mapping for package ownership
- `PACKAGE_MAINTAINERS` mapping for maintainer assignments
- `TEAM_LEADS` mapping for team lead verification

### Dashboard Integration

Team verification validates `team-organization.html`:
- JavaScript `teamData` object consistency
- Mermaid C4Component diagram accuracy
- Team member and package references

---

## Synchronization (Future)

The `--sync` flag is planned for automatic synchronization:
- Update RSS team categories from source of truth
- Sync registry team access mappings
- Update dashboard HTML team data
- Generate updated package detail pages

---

## Related Documentation

- `docs/TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md` - Complete team structure documentation
- `docs/MCP-AI-TEAM-INTEGRATION.md` - MCP AI team tools integration
- `dashboard/team-organization.html` - Interactive team dashboard
- `src/utils/rss-constants.ts` - RSS team categories definition

---

## Maintenance

Run verification before:
- Adding new team members
- Changing package ownership
- Updating team structure
- Modifying RSS feed configurations

Run verification after:
- Team structure changes
- Package reassignments
- Registry access updates
- Dashboard modifications

---

**Last Updated**: 2025-12-08  
**Version**: 1.3.3  
**Status**: ✅ Active



