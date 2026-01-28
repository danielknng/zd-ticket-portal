# JavaScript Module Documentation

This directory contains the modular JavaScript architecture for the Zammad Ticket Portal. Each module has a specific responsibility and clean interfaces for maintainability and extensibility.

---

## Architecture Overview

The application follows a modern ES6 module pattern with clear separation of concerns:

- **Configuration Layer** - Centralized settings and initialization
- **Data Layer** - API communication, caching, and data management  
- **UI Layer** - DOM manipulation, event handling, and user interactions
- **Utility Layer** - Shared functions, logging, and helper utilities

---

## Core Modules

### Configuration & Initialization

**`nf-config.js`** - Central Configuration Hub
- Exports the main `NF_CONFIG` object with all application settings
- Handles API endpoints, language settings, cache TTL values, and debug options
- Initializes the language system on application startup
- Used by all other modules for consistent configuration

**`nf-lang.js`** - Modern Language Management
- Provides the `NFLanguageManager` class for dynamic language loading
- Loads JSON-based language files organized by category
- Fires `nfLanguageReady` event when initialization is complete
- Supports proper locale detection for date formatting

**`nf-ui-init.js`** - UI Initialization Controller
- Applies configuration values to the HTML interface
- Sets up initial UI state, asset paths, and language-dependent content
- Should be called after language system is ready

### Data Management

**`nf-api.js`** - Zammad API Integration
- Handles all communication with the Zammad REST API
- Manages authentication, ticket operations, and knowledge base queries
- Implements intelligent caching strategies based on content type
- Provides error handling and retry mechanisms

**`nf-api-utils.js`** - API Utility Functions
- Centralized HTTP request utilities (`nfApiFetch`, `nfApiGet`, `nfApiPost`)
- Implements retry logic with exponential backoff
- Standardizes error handling across all API calls
- Used by all modules requiring API communication

**`nf-cache.js`** - Intelligent Caching System
- Provides the `NFCache` class with TTL-based expiration
- Supports different cache strategies for various content types
- Implements cross-session persistence via localStorage
- Includes cache invalidation and manual refresh capabilities

### User Interface

**`nf-dom.js`** - DOM Reference Manager
- Defines the global `nf` object containing all DOM element references
- Centralizes UI state management and element access
- Provides consistent interface for DOM manipulation across modules

**`nf-ui.js`** - Navigation & View Controller
- Manages navigation between different application views
- Handles modal opening/closing and view transitions
- Controls the main application flow and user journey

**`nf-events.js`** - Event Handling System
- Extends the `nf` object with comprehensive event handlers
- Manages user interactions, keyboard navigation, and accessibility
- Implements event delegation for efficient event management
- Handles ESC key navigation and modal close interactions

**`nf-modal.js`** - Modal Management
- Centralized modal dialog functionality
- Handles focus trapping, background blur, and accessibility
- Provides consistent modal behavior across the application

### Feature Modules

**`nf-ticket-list.js`** - Ticket Overview Management
- Loads and displays the ticket list with filtering capabilities
- Implements search, sorting, and pagination
- Manages filter state and user preferences
- Integrates with the caching system for performance

**`nf-ticket-detail.js`** - Individual Ticket Display
- Renders complete ticket information and message history
- Handles attachment display and gallery integration
- Manages the ticket detail view and user interactions
- Processes email content and formatting

**`nf-ticket-create.js`** - New Ticket Creation
- Handles the ticket creation form and validation
- Manages file uploads and form submission
- Implements business logic for new ticket workflow
- Provides user feedback and error handling

**`nf-ticket-actions.js`** - Ticket Operations
- Manages ticket replies, updates, and state changes
- Handles ticket closure and user actions
- Integrates with the caching system for state updates
- Provides real-time feedback on ticket operations

### Specialized Components

**`nf-search.js`** - Knowledge Base Search
- Implements intelligent search with autocomplete
- Provides dropdown interface with result highlighting
- Integrates with Zammad's knowledge base API
- Includes debounced input for performance optimization

**`nf-file-upload.js`** - File Management
- Handles drag-and-drop file uploads
- Provides file preview and validation
- Manages upload progress and error states
- Supports multiple file types with appropriate previews

**`nf-gallery.js`** - Attachment Viewer
- Provides image gallery functionality for ticket attachments
- Handles navigation between multiple images
- Includes fallback display for non-image files
- Supports keyboard navigation and accessibility

### Utility & Support

**`nf-utils.js`** - Core Utilities
- Provides the `NFLogger` system for comprehensive debugging
- Includes localStorage wrapper and data validation functions
- Offers performance monitoring and measurement tools
- Contains shared utility functions used across modules

**`nf-helpers.js`** - UI Helper Functions
- Provides common UI manipulation functions
- Handles loading states and visual feedback
- Includes element show/hide utilities with proper accessibility
- Offers consistent interface patterns

**`nf-status.js`** - Status & Messaging
- Centralized status message display system
- Provides `nfShowStatus` for consistent user feedback
- Handles success, error, warning, and info messages
- Ensures messages appear in appropriate modal contexts

**`nf-template-utils.js`** - Template Management
- Provides safe HTML template cloning utilities
- Handles dynamic UI element creation from templates
- Ensures proper template instantiation and cleanup

---

## Module Dependencies

### Import/Export Pattern
All modules use modern ES6 import/export syntax for clean dependency management:

```javascript
// Typical import pattern
import { nf } from './nf-dom.js';
import { nfShowStatus } from './nf-status.js';

// Export pattern
export { functionName, className };
```

### Dependency Flow
```
nf-config.js (configuration root)
    ↓
nf-lang.js (language system)
    ↓
nf-ui-init.js (UI initialization)
    ↓
nf-dom.js → nf-ui.js → nf-events.js (UI foundation)
    ↓
Feature modules (tickets, search, etc.)
    ↓
Utility modules (helpers, status, templates)
```

---

## Adding New Features

### Step-by-Step Process

1. **Configuration**: Add any new settings to `nf-config.js`
2. **Language**: Add new language keys to appropriate JSON files
3. **DOM References**: Add new element references to `nf-dom.js` if needed
4. **Core Logic**: Implement feature logic in appropriate module
5. **UI Integration**: Add UI updates and event handlers
6. **Testing**: Verify functionality and error handling

### Best Practices

- **Follow Module Patterns**: Use existing modules as templates for structure
- **Centralize Configuration**: Always read settings from `NF_CONFIG`
- **Use Existing Utilities**: Leverage `nf-utils.js`, `nf-helpers.js`, and `nf-status.js`
- **Handle Errors Gracefully**: Implement proper error handling and user feedback
- **Document Changes**: Update this README when adding new modules

---

## Development Guidelines

### Code Organization
- Keep modules focused on single responsibilities
- Use descriptive function and variable names
- Include comprehensive JSDoc comments
- Follow consistent code formatting

### Error Handling
- Use the centralized `nfShowStatus` for user messages
- Implement proper try-catch blocks for async operations
- Log errors using the `NFLogger` system
- Provide meaningful feedback to users

### Performance Considerations
- Leverage the caching system for API calls
- Use event delegation for dynamic content
- Implement debouncing for user input
- Monitor performance using built-in measurement tools

---

This architecture provides a solid foundation for building and extending the ticket portal while maintaining code quality and user experience.
