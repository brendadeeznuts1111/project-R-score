# RBAC Dashboard Guide

## Roles Overview

| Role | Name | Permissions | Description |
|------|------|-------------|-------------|
| `admin` | Administrator | `view_metrics`, `generate_tasks`, `cleanup_storage`, `view_logs`, `manage_users` | Full system access and storage management. |
| `operator` | Task Operator | `view_metrics`, `generate_tasks`, `view_logs` | Can trigger RPA tasks and monitor progress. |
| `reviewer` | Metrics Reviewer | `view_metrics`, `view_logs` | Read-only access to system health and performance. |

## Dashboard Access

The dashboard uses token-based authentication. Append your unique token to the URL:

- **Admin Hub**: `http://localhost:3006/?token=admin-secret-2026`
- **Operator Console**: `http://localhost:3006/?token=op-secret-2026`
- **Reviewer View**: `http://localhost:3006/?token=rev-secret-2026`

## Management Features

### 1. Unified Metrics (`view_metrics`)

Visualizes real-time data from `BunR2AppleManager`:

- Total mirrored files in `/data/`
- Active Cloudflare R2 bucket connection status
- Zstd compression efficiency/cached presigned URLs

### 2. RPA Task Generation (`generate_tasks`)

Integrated with `DuoPlusSDK`:

- Trigger new registration/simulation tasks directly from the UI.
- Classifies R2 paths using high-speed `URLPattern` logic.

### 3. R2 Ops Kit Integration (`cleanup_storage`)

Admin-only tools for storage maintenance:

- Cleanup failed uploads.
- Synchronize local and remote metadata.
- Trigger bulk deletions if necessary.

## Developer Integration

The RBAC system is powered by `config/roles.json`. To add a new user or modify permissions:

1. Edit `config/roles.json`.
2. Map the user to a defined role.
3. Assign a secure access token.
