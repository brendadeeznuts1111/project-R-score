# Fantasy402.com Network Traffic Analysis

## Overview

This analysis examines the network requests captured from fantasy402.com,
revealing a comprehensive sports betting/gambling platform with agent management
capabilities.

## Authentication Flow

### Initial Challenge Response

- **URL**: `https://fantasy402.com/cdn-cgi/challenge-platform/h/b/jsd/r/...`
- **Method**: POST
- **Purpose**: Cloudflare challenge response to verify browser legitimacy
- **Status**: Part of DDoS protection and bot detection

### Customer Authentication

- **URL**: `https://fantasy402.com/cloud/api/System/authenticateCustomer`
- **Method**: POST
- **Credentials**:
  - customerID: `BILLY666`
  - password: `BACKDOOR69`
  - multiaccount: `1` (enabled)
- **Response**: Returns JWT token for subsequent API calls

## API Architecture

### Base URL

- Primary domain: `fantasy402.com`
- API endpoint: `https://fantasy402.com/cloud/api/`

### Authentication Token

JWT token received after successful login:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCSUxMWTY2NiIsInR5cGUiOjAsImFnIjoiIiwiaW1wIjoiIiwib2ZmIjoiTk9MQVJPU0UiLCJyYiI6bnVsbCwibmJmIjoxNzU2MzA5NjUzLCJleHAiOjE3NTYzMTA5MTN9.sPwAzmBPr8Jaz6HgBLoaGnD1G-GfiV1rRs3wD7zNuHg
```

## Client-Side Application Structure

### HTML Structure

- **Document Type**: HTML5
- **Language**: English (`en-US,en;q=0.9`)
- **Title**: "Manager"
- **Meta Tags**: Description and keywords related to "Robust admin" template,
  indicating a likely off-the-shelf or customized admin panel.
- **Favicons**: Multiple `apple-touch-icon` and `favicon` links.

### JavaScript Framework

- **Module Loader**: RequireJS (`https://cdn.fastassets.io/js/require.js`)
- **jQuery**: Version loaded from CDN (`https://cdn.fastassets.io/js/jquery.js`)
- **Architecture**: Modular AMD (Asynchronous Module Definition) pattern

### Key Application Files

1. **Main Manager**: `https://fantasy402.com/app/main-manager.js?bust=1.0.103`
2. **Manager Core**:
   `https://fantasy402.com/app/manager/manager.js?bust=1.0.103`
3. **Configuration**:
   `https://fantasy402.com/app/setting/config-manager.js?bust=1756309714672`

### Loading Sequence

Based on the stack trace:

1. RequireJS loads and initializes the module system
2. Configuration modules are loaded first
3. Manager core functionality is initialized
4. Account information is fetched via `getAccountInfo()` function
5. Main application initializes at line 53 of main-manager.js

### Frontend Libraries and Dependencies

- **CSS Framework**: Bootstrap (v4)
- **Icon Fonts**: Icomoon, Flag Icon CSS, Font Awesome, Glyphter, Material Icons
- **UI/UX Components**:
  - Sliders: Slick
  - Forms: Select2, Selectivity, iCheck, Switchery, Bootstrap Switch
  - Pickers: Daterangepicker, Bootstrap Datetimepicker, Pickadate, miniColors,
    Spectrum, Datedropper, Timedropper
  - Scrollbars: Perfect Scrollbar
  - Tree View: Bootstrap Treeview
  - Drag and Drop: Dragula
- **Utility Libraries**:
  - Moment.js (date/time manipulation)
  - Tether.js (positioning)
  - Unison.js (responsive breakpoints)
  - Screenfull.js (fullscreen API)
  - Pace.js (page load progress)
  - Mask.js (input masking)
  - Timer.js
  - Date-format.js
  - jQuery Numeric (numeric input validation)
  - Lobibox.js (notifications/dialogs)
  - Spliter.min.js
  - Lodash.js (utility belt)
  - Table-sort.js, jQuery Tablesorter (table sorting)
  - Print.js (printing)
  - Excel Export: xlsx.core.min.js, FileSaver.js, jhxlsx.js
  - DataTables.min.js (advanced tables)
  - jQuery ScrollTo (scrolling)
- **Mapping**: Google Maps API
- **LESS Compiler**: `less.js` (client-side LESS compilation)

## API Endpoints Discovered

### Manager Operations

1. **getAccountInfoOwner** - Retrieves account information for owner
2. **getConfigWebReports** - Gets web reporting configuration
3. **getConfigWebReportsPending** - Gets pending web reports
4. **getSportsType** - Retrieves available sports types
5. **getAuthorizations** - Gets user permissions/authorizations
6. **getMessage** - Retrieves system messages
7. **getNewEmailsCount** - Gets count of new emails
8. **getWeeklyFigureByAgentLite** - Gets weekly financial figures
9. **getListAgenstByAgent** - Gets list of agents under management

### Logging Operations

- **write** - Writes activity logs to system

## Asset Loading

### CSS/LESS Files

- `https://cdn.fastassets.io/css/manager.less?v=103`
- `https://cdn.fastassets.io/css/manager-test.less?v=104`
- `https://cdn.fastassets.io/css/scores.less?v=100`
- `https://cdn.fastassets.io/css/setting.less?v=1521666264242`

### JavaScript Libraries

- **RequireJS**: Module loader and dependency management
- **jQuery**: DOM manipulation and AJAX requests
- **Google Maps API**: Location services integration

### Language Resources

- `https://fantasy402.com/app/language/ui.json?v=1756309715787&agentSite=1`

### External Services

- Google Maps API:
  `https://maps.googleapis.com/maps/api/mapsjs/gen_204?csp_test=true`

## Security Analysis

### Authentication

- Uses JWT tokens for API authentication
- Tokens include user ID, type, office, and expiration
- Token expiration: ~22 minutes (from 10:49:13 to 11:09:13)

### Session Management

- PHPSESSID cookie for session tracking
- Cloudflare clearance tokens for DDoS protection
- Bearer token authentication for API calls

### Request Patterns

- All API calls use POST method with form-urlencoded data
- Consistent header structure across requests
- Referer headers validate request origin

## Platform Features Identified

### Agent Management System

- Hierarchical agent structure (agents under agents)
- Multi-account support
- Permission-based access control
- Financial reporting and tracking

### Sports Betting Platform

- Multiple sports types supported
- Real-time scores and updates
- Betting management interface
- Financial reporting tools

### Communication System

- Email notifications
- System messages
- Activity logging

## Technical Stack

### Frontend

- **Framework**: RequireJS + jQuery
- **Styling**: LESS/CSS for styling
- **Architecture**: AMD module pattern
- **Real-time**: JavaScript for API interactions
- **Maps**: Google Maps integration
- **Versioning**: Cache busting with version parameters
- **UI/UX**: Robust admin template, Bootstrap, various third-party libraries

### Backend

- **Language**: PHP-based API (PHPSESSID cookie)
- **Authentication**: JWT token authentication
- **Protection**: Cloudflare protection
- **Design**: RESTful API design

### Infrastructure

- **CDN**: fastassets.io for static assets
- **Security**: Cloudflare for security and CDN
- **Services**: Google services integration

## Security Concerns

### Exposed Credentials

- Customer ID: `BILLY666`
- Password: `BACKDOOR69` (appears to be a backdoor/test account)

### Token Exposure

- JWT token visible in network requests
- Could be used for unauthorized API access until expiration

### API Structure

- Predictable API endpoints
- Form-based data submission
- Limited rate limiting apparent

### Client-Side Vulnerabilities

- **Module Loading**: All JavaScript loaded from external CDN
- **Version Exposure**: Version numbers exposed in URLs (potential for targeted
  attacks)
- **Cache Busting**: Predictable cache busting patterns
- **Third-Party Dependencies**: Reliance on numerous external libraries
  increases attack surface.
- **Client-Side LESS Compilation**: `less.js` in production can expose source
  code and increase client-side processing overhead.

## Recommendations

1. **Immediate Actions**:

   - Change exposed credentials
   - Implement token rotation
   - Add rate limiting

2. **Security Enhancements**:

   - Use HTTPS for all endpoints (already implemented)
   - Implement request signing
   - Add IP-based restrictions
   - Use shorter token expiration
   - Implement Subresource Integrity (SRI) for CDN assets

3. **Client-Side Security**:

   - Move critical JavaScript to same-origin
   - Implement Content Security Policy (CSP)
   - Add integrity checks for external resources
   - Obfuscate version numbers
   - Pre-compile LESS to CSS on the server-side to avoid client-side
     compilation.
   - Regularly audit third-party library dependencies for known vulnerabilities.

4. **Monitoring**:
   - Log all API access
   - Monitor for unusual patterns
   - Implement anomaly detection
