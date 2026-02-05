# Configuration Directory

This directory contains all configuration files for the Quantum Terminal Dashboard.

## Files

- `config.yaml` - Main application configuration
- `config-fixed.yaml` - Fixed/staging configuration
- `quantum-config.yaml` - Quantum-specific settings

## Usage

Configurations are loaded by the config managers in `src/config/`. The system supports:

- YAML configuration files
- Environment variable overrides
- Hot reloading of configurations
- Validation and type checking

## Environment Variables

Common environment variables:
- `NODE_ENV` - Environment (development/staging/production)
- `HTTP_PORT` - HTTP server port
- `WS_PORT` - WebSocket server port
- `DATABASE_URL` - Database connection string