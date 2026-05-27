# Unofficial Zammad Ticket Portal

![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-blue.svg)
![JavaScript](https://img.shields.io/badge/javascript-ES6%2B-yellow.svg)
![Zammad](https://img.shields.io/badge/zammad-compatible-green.svg)
![Status](https://img.shields.io/badge/status-active-brightgreen.svg)
![Contributions](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)

A modular, internationalized frontend for Zammad-based ticket systems that provides a modern user interface for creating and managing support tickets.

> **Note:** This is an unofficial community project, not affiliated with or endorsed by the Zammad Foundation.

---

## Screenshots

<table>
  <tr>
    <td><img src="public/img/github/main.png" alt="Main Interface" width="350"/></td>
    <td><img src="public/img/github/login.png" alt="Login Modal" width="350"/></td>
  </tr>
  <tr>
    <td><img src="public/img/github/ticket-overview-filter.png" alt="Ticket Overview" width="350"/></td>
    <td><img src="public/img/github/ticket-detail.png" alt="Ticket Detail" width="350"/></td>
  </tr>
  <tr>
    <td><img src="public/img/github/new-ticket.png" alt="New Ticket" width="350"/></td>
    <td></td>
  </tr>
</table>

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Features](#features)
- [Installation](#installation)
- [Embedding in an Existing Site](#embedding-in-an-existing-site)
- [Configuration](#configuration)
- [Usage](#usage)
- [Technical Architecture](#technical-architecture)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This project is a modal frontend for Zammad tickets.
You host it on a web server, configure `src/js/core/config.js`, and users open it through the trigger button from `src/html/nf_gui.html`.

### Module Requirements

**This project uses ES6 modules and requires a web server** - it cannot be opened directly by double-clicking the HTML file.

---

## Quick Start

The standard setup is exactly this:

1. Edit `src/js/core/config.js`
2. Enable Basic Authentication in Zammad
3. Test locally:

```powershell
cd "C:\path\to\zd-ticket-portal"
npx serve .
# Open http://localhost:3000/src/html/nf_gui.html
```

If this works locally, head to [Installation](#installation).

---

## Features

### User Features

- **Authentication** - Secure login via Zammad API with Basic Authentication
- **Ticket Management** - View all tickets (open and closed) with filtering and sorting
- **Ticket Creation** - Create new tickets with subject, message, and optional request type selection (**NEW!**)
- **File Attachments** - Upload files via drag-and-drop or file picker with preview functionality
- **Ticket Replies** - Reply to existing tickets with file attachments in messenger-style threads
- **Image Gallery** - View ticket attachments in a full-screen gallery
- **Knowledge Base** - Integrated search functionality for Zammad knowledge base
- **Self-Service** - Users can close their own tickets
- **Responsive Design** - Optimized for mobile and desktop devices

### Technical Features

- **ES Module Architecture** - Modern JavaScript with clean imports/exports
- **Centralized Configuration** - Single configuration file for all settings
- **Smart Caching System** - Context-aware caching with different TTL strategies
- **Multi-language Support** - JSON-based language files with dynamic loading
- **Event-Driven UI** - Proper initialization timing and error handling
- **Advanced Error Handling** - Retry mechanisms and user-friendly messages
- **Performance Monitoring** - Built-in measurement and optimization tools
- **Accessibility Support** - Keyboard navigation and screen reader compatibility

---

## Installation

### Prerequisites

- A web server (cannot run via `file://` protocol due to ES6 module restrictions)
- Zammad instance with Basic Authentication enabled (See [Zammad Setup](#zammad-setup))
- Modern web browser with ES6 module support

### Production use

Upload all files to your web server and access via HTTP/HTTPS. This is the recommended approach for production use.

When the portal is embedded on a **different** domain/subdomain as your Zammad instance, reverse-proxy CORS handling is required.

<details>
<summary>Required reverse proxy config (Nginx)</summary>

Without this, your browser will likely not let you log in because we need to set the CORS header.
Add this block directly above(!) `location /ws {}` in `/etc/nginx/sites-available/zammad.conf` on your Zammad server:

```nginx
# API-Server CORS (for Intranet-Portal)
location ^~ /api/ {

  # remove upstream CORS Header
  proxy_hide_header Access-Control-Allow-Origin;
  proxy_hide_header Access-Control-Allow-Headers;
  proxy_hide_header Access-Control-Allow-Methods;
  proxy_hide_header Access-Control-Allow-Credentials;

  # only allow these origins
  set $cors_origin "";
  if ($http_origin = "http://localhost:3000") { set $cors_origin $http_origin; } # local testing (npx serve)
  if ($http_origin = "https://intranet.yourdomain.de") { set $cors_origin $http_origin; } # the domain where you've embedded the portal
  if ($http_origin = "https://helpdesk.yourdomain.de") { set $cors_origin $http_origin; } # URL of the zammad instance

  # CORS Header (also for 204)
  add_header Vary "Origin" always;
  add_header Access-Control-Allow-Origin $cors_origin always;
  add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
  add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept, Origin, X-Requested-With, X-CSRF-Token" always;
  add_header Access-Control-Max-Age "86400" always;

  # Preflight without Proxy
  if ($request_method = OPTIONS) {
    return 204;
  }

  proxy_http_version 1.1;
  proxy_set_header Host $http_host;
  proxy_set_header CLIENT_IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_read_timeout 180;
  proxy_pass http://zammad-railsserver;
}
```

Restart your nginx.
</details>

### Zammad Setup

#### Basic Authentication

**Required:** Ensure Basic Authentication is enabled in your Zammad instance. This is typically configured in your Zammad system settings or via API configuration.

#### Request Type Custom Object (**NEW**!)

To enable request type selection in the ticket creation form, you must configure a custom object attribute in Zammad:

1. **Log in to Zammad Admin Panel**

2. **Navigate to Object Manager**
   - Go to **Settings** > **Object Manager Attributes**
   - Or access directly via: `https://helpdesk.yourdomain.de/#system/object_manager`

3. **Create New Attribute**
   - Click **New Attribute**
   - Select **Ticket** as the object
   - Set the attribute name to: **`type`** (exactly, case-sensitive)
   - Choose **Single selection field** as the data type

4. **Configure Options**
   - Add your request type options (e.g., "General Request", "Incident", "Order")
   - Each option needs:
     - **Name**: Display label (e.g., "General Request")
     - **Value**: Database key (e.g., "general_request")
   - Set a default value if desired

5. **Example Configuration**
   ```
   Option 1:
   - Name: "General Request"
   - Value: "general_request"
   
   Option 2:
   - Name: "Incident"
   - Value: "problem"
   
   Option 3:
   - Name: "Order"
   - Value: "procurement"
   ```

6. **Verify API Access**
   - Test the API endpoint: `https://helpdesk.yourdomain.de/api/v1/object_manager_attributes?object=Ticket&name=type`
   - Should return the attribute configuration with all options

7. **Configure Frontend**
   - Set `allowRequestType: true` in `src/js/core/config.js`
   - Optionally filter allowed types in `filters.allowedRequestTypes`
   - The dropdown will automatically populate with available options

**Important Notes:**
- The attribute name must be exactly `type` (lowercase)
- The attribute must be a "Single selection field" type
- Values in `allowedRequestTypes` must match the `value` field from the API, not the display name
- Changes to request types in Zammad will be reflected after cache expiration

---

## Embedding in an Existing Site

You can integrate the portal into an intranet/CMS (tested with Contao).

### Required markup

The JavaScript expects the IDs and templates from `src/html/nf_gui.html` (especially `#nf-zammad-trigger` and all modal containers). 
Use the content from the HTML-File (mostly) *unchanged* (*see the Contao-example below!*).

<details>
<summary>Usage with Contao (example)</summary>

For Contao, the setup is as follows:
* Open up the "Article" that holds your site's content. 
* Edit it
* Add a blank HTML-Element to your article with the contents of nf_gui.html. 
* Remove 
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
```
from the top of the file. And remove 
```html
</body>
</html>
```
from the bottom of the file. 
* Change all paths accordingly (`stylesheet` and module `script` URLs) so they are reachable via HTTP(S), not local filesystem paths. 
* Preview your changes. 
</details>

### ES module and path requirements

Because this project uses `type="module"`:

- All CSS/JS/lang files must be reachable via HTTP(S)
- Keep folder structure intact (`src/css`, `src/js`, `src/lang`, `public/img`)
- If your CMS page lives at a different path depth, use absolute asset URLs or adjust relative paths
- Do not use `file://`

---

## Configuration

All configuration is managed in `src/js/core/config.js`. This file controls:

- **API Endpoints** - Your Zammad server URLs and authentication
- **Language Settings** - Supported languages and file paths
- **Cache Strategy** - TTL values for optimal performance
- **Debug Options** - Logging for development and troubleshooting
- **Request Type Settings** - Enable/disable and filter request types
- **Security Settings** - File upload restrictions and validation

### Basic Configuration

```javascript
api: {
    baseUrl: 'https://helpdesk.yourdomain.de/api/v1',
    knowledgeBase: {
        id: "1",
        locale: "de-de",
        flavor: "public"
    },
    timeout: 10000,
    retryAttempts: 3,
    allowRequestType: true  // Enable request type selection
}
```

### Request Type Configuration

To enable request type selection in the ticket creation form:

1. **Enable the feature** in `src/js/core/config.js`:
   ```javascript
   api: {
       allowRequestType: true
   }
   ```

2. **Configure allowed types** (optional - empty array shows all types):
   ```javascript
   ui: {
       filters: {
           allowedRequestTypes: ["incident", "general_request", "order"]
           // Empty array [] = show all available types
       }
   }
   ```

3. **Set cache TTL** for request types:
   ```javascript
   ui: {
       cache: {
           requestTypeTTL: 24 * 60 * 60 * 1000  // 24 hours
       }
   }
   ```

See [Zammad Setup](#zammad-setup) for instructions on configuring the custom object in Zammad.

### Cache Configuration

Intelligent caching with content-aware TTL values:

```javascript
ui: {
    cache: {
        searchResultsTTL: 2 * 60 * 1000,                    // 2 minutes
        currentYearActiveTicketListTTL: 15 * 60 * 1000,     // 15 minutes
        currentYearClosedTicketListTTL: 4 * 60 * 60 * 1000, // 4 hours
        archivedTicketListTTL: 30 * 24 * 60 * 60 * 1000,    // 30 days
        requestTypeTTL: 24 * 60 * 60 * 1000                 // 24 hours
    }
}
```

**Cache Behavior:**
- Active tickets: Short TTL with manual refresh option
- Closed tickets: Medium TTL (may receive updates)
- Archived tickets: Long TTL (stable content)
- Search results: Brief TTL with cross-session persistence
- Request types: Long TTL (rarely change)

### Debug Configuration

Enable comprehensive logging for development:

```javascript
debug: {
    enabled: true,
    logLevel: 'debug'  // 'debug', 'info', 'warn', or 'error'
}
```

**Debug Output Includes:**
- Cache hit/miss ratios and TTL details
- API request/response timing
- Search result sources (cache vs. fresh API)
- Authentication status and errors
- Modal state changes and events

---

## Usage

### Basic Workflow

1. **Open the Portal** - Click the trigger button to open the modal interface
2. **Login** - Enter your Zammad credentials (username/email and password)
3. **View Tickets** - Browse your tickets with filtering and sorting options
4. **Create Ticket** - Click "Create Ticket" and fill in the form
   - Select request type (if enabled)
   - Enter subject and message
   - Attach files if needed
5. **Reply to Tickets** - Open a ticket and use the reply interface
6. **Close Tickets** - Mark tickets as resolved when complete

### Keyboard Navigation

- **ESC** - Close current modal or return to previous view
- **Tab** - Navigate between form fields
- **Enter** - Submit forms or activate buttons
- **Arrow Keys** - Navigate image gallery

### File Upload

- **Drag and Drop** - Drag files directly onto the upload area
- **Click to Select** - Click the upload area to open file picker
- **Preview** - View selected files before submission
- **Remove** - Click the X button to remove files from selection

---

## Technical Architecture

### Project Structure

```
zd-ticket-portal/
├── .github/
│   └── ISSUE_TEMPLATE/         # Bug report and feature request templates
├── public/
│   └── img/                    # Screenshots and assets
├── src/
│   ├── css/                    # Stylesheets
│   │   ├── base/              # Typography, variables, utilities
│   │   ├── components/         # Buttons, forms, modals
│   │   ├── layout/            # Cards, sections
│   │   └── modules/           # Feature-specific styles
│   ├── js/
│   │   ├── app.js              # Main ES module entry point
│   │   ├── api/                # API, auth, HTTP and cache strategy
│   │   ├── core/               # Config, constants, logger, storage
│   │   ├── features/           # Tickets, upload, search, gallery
│   │   ├── i18n/               # Language manager
│   │   ├── state/              # Store and events
│   │   ├── ui/                 # Modal, DOM, status, init helpers
│   │   └── utils/              # Validation, templates, performance, etc.
│   ├── lang/                   # Language files
│   │   ├── en/                # English translations
│   │   └── de/                # German translations
│   └── html/
│       └── nf_gui.html        # Main interface
├── package.json                # Project metadata
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE.md                  # Project license
├── README.md                   # This file
└── SECURITY.md                 # Security policy
```

### Language Management

The language system uses JSON files organized by category:

```
src/lang/
├── en/
│   ├── ui.json         # Interface labels
│   ├── aria.json       # Accessibility text
│   ├── system.json     # Status messages
│   ├── messages.json   # User notifications
│   └── utils.json      # Utility text
└── de/
    └── (same structure)
```

Configuration in `src/js/core/config.js`:

```javascript
language: {
    default: 'en',
    current: 'en',
    basePath: '../lang',
    supported: {
        en: { locale: 'en-US', label: 'English' },
        de: { locale: 'de-DE', label: 'Deutsch' }
    },
    paths: {
        ui: '{lang}/ui.json',
        aria: '{lang}/aria.json',
        system: '{lang}/system.json',
        messages: '{lang}/messages.json',
        utils: '{lang}/utils.json'
    }
}
```

### Adding New Languages

1. Create new folder: `src/lang/[language-code]/`
2. Copy and translate all JSON files from an existing language
3. Add language configuration to `src/js/core/config.js`:
   ```javascript
   supported: {
       en: { locale: 'en-US', label: 'English' },
       de: { locale: 'de-DE', label: 'Deutsch' },
       fr: { locale: 'fr-FR', label: 'Français' }  // New language
   }
   ```
4. Update the current or default language setting if needed

**Language File Categories:**
- **ui.json** - Button labels, headers, form fields
- **aria.json** - Screen reader labels and descriptions
- **system.json** - Status messages, loading text
- **messages.json** - Success/error/warning messages
- **utils.json** - Date formats, validation messages

### Module System

The project uses ES6 modules with clear separation of concerns:

- **Core Modules** - Configuration, utilities, DOM management
- **Feature Modules** - Tickets, search, gallery, file upload
- **UI Modules** - Navigation, modals, status messages
- **API Modules** - Communication, authentication, caching

All modules follow consistent patterns for imports, exports, and error handling.

---

## Development

### Development Setup

1. Clone the repository
2. Install a local web server (or use `npx serve`)
3. Configure `src/js/core/config.js` with your Zammad instance
4. Enable debug logging for development
5. Open `src/html/nf_gui.html` in your browser

### Code Style

- Use ES6 modules for all JavaScript
- Follow existing naming conventions (`nf*` prefix for functions)
- Use centralized utilities (`nfShowStatus`, `nfLogger`, etc.)
- Maintain language file organization
- Include appropriate debug logging
- Update documentation for new features

### Testing

Test with various scenarios:
- Different ticket states (open, closed, archived)
- Cache scenarios (fresh, cached, expired)
- File uploads (images, documents, email files)
- Error conditions (network failures, invalid credentials)
- Different languages and locales

---

## Troubleshooting

### Common Issues

**Module Loading Errors**
- **Symptom:** Console errors about module imports
- **Solution:** Ensure files are served from a web server (not `file://` protocol)
- **Alternative:** Use the `legacy` branch for direct file access

**Cache Not Working**
- **Symptom:** Data not persisting between sessions
- **Solution:** Check localStorage availability in browser settings
- **Check:** Verify TTL configuration in `src/js/core/config.js`

**Login Issues**
- **Symptom:** Authentication fails or hangs
- **Solution:** Verify Basic Authentication is enabled in Zammad
- **Check:** Confirm API URL is correct in configuration
- **Debug:** Enable debug logging to see detailed error messages

**Language Not Loading**
- **Symptom:** Interface shows translation keys instead of text
- **Solution:** Check file paths in `src/js/core/config.js`
- **Check:** Verify language files exist and are valid JSON
- **Debug:** Check browser network tab for failed requests

**Request Types Not Showing**
- **Symptom:** Dropdown is empty or hidden
- **Solution:** Verify `allowRequestType: true` in configuration
- **Check:** Confirm custom object is configured in Zammad (see [Zammad Setup](#zammad-setup))
- **Verify:** Test API endpoint returns attribute data
- **Debug:** Check browser console for API errors

**File Upload Fails**
- **Symptom:** Files not attaching to tickets
- **Solution:** Check file size limits in `src/js/core/config.js`
- **Check:** Verify allowed file types in security configuration
- **Debug:** Enable debug logging to see validation errors

### Getting Help

- **Check Issues:** Search existing [GitHub Issues](https://github.com/danielknng/zd-ticket-portal/issues)
- **Report Bugs:** Use the [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)
- **Request Features:** Use the [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)
- **Security Issues:** Follow the [Security Policy](SECURITY.md)

---

## Contributing

I welcome contributions from the community! This project follows GitHub best practices with comprehensive templates and guidelines.

### Getting Started

Please read the [Contributing Guidelines](CONTRIBUTING.md) for detailed information about:
- Development setup and prerequisites
- Code style and conventions
- Testing requirements
- Pull request process

### Reporting Issues

- **Bug Reports**: Use the [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)
- **Feature Requests**: Use the [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)

### Security

For security-related issues, please review the [Security Policy](SECURITY.md) and follow the responsible disclosure process outlined there.

### Development Guidelines

When contributing code:

1. Follow the established ES6 module patterns
2. Use the centralized `nfShowStatus()` for user messaging
3. Maintain the language file organization
4. Include appropriate debug logging
5. Test with various ticket states and cache scenarios
6. Update documentation for new features

---

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.

See [LICENSE.md](LICENSE.md) for full details or visit: https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode
