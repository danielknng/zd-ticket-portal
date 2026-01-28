# JavaScript Directory Overview

This directory contains all JavaScript modules for the Ticket Frontend. Each file is modular, focused, and documented. Below is an overview of each file, its purpose, main classes/functions, what it imports/exports, and its output or effect on the application.

---

## File Index

- **nf-api.js**: API communication and authentication with Zammad. Handles all API calls (tickets, users, knowledge base), authentication, error handling, and caching. Uses: `nfCache`, `window.NF_CONFIG`, outputs data to UI modules.
- **nf-cache.js**: In-memory cache with TTL. Provides the `NFCache` class and a global `nfCache` instance for caching API responses. Used by: `nf-api.js`, `nf-ticket-actions.js`, etc.
- **nf-config.js**: Central configuration. Exports the `NF_CONFIG` object to `window.NF_CONFIG`. All modules read config from here (API URLs, UI labels, filters, security, etc.).
- **nf-dom.js**: DOM selectors and UI references. Defines the global `nf` object, which holds references to all main DOM elements and UI state. Used by all UI modules.
- **nf-events.js**: Event handlers and DOM initialization. Extends the `nf` object with event handling methods for modals, navigation, and user actions. Imports: `nf`, uses: `nfShowTicketList`, `nfShowStart`, etc.
- **nf-gallery.js**: Internal gallery view for attachments. Manages image previews, navigation, and fallback for non-image files. Uses: `nfIsImageFile`, modifies DOM.
- **nf-helpers.js**: Helper functions for UI manipulation and data processing. Provides utility functions for showing/hiding elements, loading spinners, and status messages. Used throughout the UI.
- **nf-search.js**: Smart search for the Zammad knowledge base. Implements search, autocomplete, highlighting, and dropdown UI. Uses: `window.NF_CONFIG`, `nfShowSearchDropdown`, fetches from API.
- **nf-ticket-actions.js**: Ticket actions and interactions. Handles replying to tickets, closing tickets, and managing the reply interface. Uses: `nfCache`, `nfShowStatus`, modifies ticket state.
- **nf-ticket-detail.js**: Ticket detail view and message display. Loads and displays ticket details, message history, attachments, and reply UI. Uses: `nfFetchTicketDetail`, `nfRenderAttachments`, `nfExtractEmailContent`.
- **nf-ticket-list.js**: Ticket list management and display. Loads, filters, and displays the ticket overview. Uses: `nfFetchTicketsFiltered`, `nfSetLoading`, manages filter UI.
- **nf-ui-init.js**: UI initialization with config values. Sets all UI texts, asset paths, and other values from `nf-config.js` into the HTML. Should be called after page load.
- **nf-ui.js**: UI control and navigation. Manages navigation between views (main menu, ticket list, detail, login, new ticket) and modal overlays. Uses: `nfShow`, `nfHide`, `nfOpenModal`.
- **nf-utils.js**: Central utility functions and classes. Provides reusable helpers, logger system (`NFLogger`), error handling, localStorage wrapper, file validation, and more. Used by all modules.

---

## How the Modules Work Together
- All modules use the global `nf` object (from `nf-dom.js`) for DOM references and UI state.
- Configuration is always read from `window.NF_CONFIG` (from `nf-config.js`).
- API calls and caching are handled by `nf-api.js` and `nf-cache.js`.
- UI logic is split into: initialization (`nf-ui-init.js`), navigation (`nf-ui.js`), event handling (`nf-events.js`), and helpers (`nf-helpers.js`).
- Utility functions and logging are provided by `nf-utils.js`.

---

## Example: Adding a New Feature
- Add new config to `nf-config.js` if needed.
- Add DOM references to `nf-dom.js`.
- Add UI logic to the appropriate module (e.g., `nf-ticket-list.js` for ticket list features).
- Use helpers from `nf-helpers.js` and utilities from `nf-utils.js` as needed.

---

For detailed documentation, see the top of each file and inline comments. All modules are designed to be readable and maintainable.
