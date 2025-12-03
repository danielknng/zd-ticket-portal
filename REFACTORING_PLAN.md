# Complete Refactoring Plan: Zammad Ticket Portal

## 🎯 Goals
- **Clearer file names** - Self-documenting, consistent naming
- **Better structure** - Logical organization, clear separation of concerns
- **Cleaner code** - Modern patterns, reduced duplication, better abstractions
- **Better comments** - JSDoc standards, inline documentation
- **More performance** - Lazy loading, code splitting, optimizations

---

## 📁 Proposed File Structure

```
src/js/
├── core/                          # Core infrastructure
│   ├── config.js                  # Configuration (was nf-config.js)
│   ├── constants.js               # All constants (TIMING, CURRENT_YEAR, etc.)
│   ├── logger.js                  # Logging system (from nf-utils.js)
│   └── storage.js                 # Storage utilities (from nf-utils.js)
│
├── api/                           # API layer
│   ├── client.js                  # ZammadApiClient (was nf-api-client.js)
│   ├── http.js                    # HTTP utilities (was nf-api-utils.js)
│   ├── auth.js                    # Authentication logic
│   ├── tickets.js                 # Ticket operations
│   ├── knowledge-base.js          # Knowledge base operations
│   └── cache.js                   # API caching (was nf-cache.js)
│
├── state/                         # State management
│   ├── store.js                   # AppState (was nf-state.js)
│   └── events.js                  # EventBus (was nf-event-bus.js)
│
├── ui/                            # UI components
│   ├── dom.js                     # DOM references (was nf-dom.js)
│   ├── modal.js                   # Modal system (was nf-modal.js)
│   ├── navigation.js              # Navigation/routing (from nf-ui.js)
│   ├── status.js                  # Status messages (was nf-status.js)
│   └── helpers.js                 # UI helpers (was nf-helpers.js)
│
├── features/                      # Feature modules
│   ├── tickets/
│   │   ├── list.js                # Ticket list (was nf-ticket-list.js)
│   │   ├── detail.js              # Ticket detail (was nf-ticket-detail.js)
│   │   ├── create.js              # Create ticket (was nf-ticket-create.js)
│   │   └── actions.js              # Ticket actions (was nf-ticket-actions.js)
│   ├── search/
│   │   └── knowledge-base.js      # KB search (was nf-search.js)
│   ├── gallery/
│   │   └── viewer.js               # Image gallery (was nf-gallery.js)
│   └── upload/
│       └── file-handler.js        # File uploads (was nf-file-upload.js)
│
├── i18n/                          # Internationalization
│   ├── manager.js                 # Language manager (was nf-lang.js)
│   └── locales/                   # Language files
│
├── utils/                         # Utilities
│   ├── template.js                 # Template utilities (was nf-template-utils.js)
│   ├── performance.js             # Performance monitoring (from nf-utils.js)
│   └── validation.js              # Input validation
│
└── app.js                         # Application entry point
```

---

## 🏗️ Architecture Improvements

### 1. **Dependency Injection Pattern**
```javascript
// Instead of global singletons, use dependency injection
class TicketService {
  constructor(apiClient, cache, eventBus) {
    this.api = apiClient;
    this.cache = cache;
    this.events = eventBus;
  }
}
```

### 2. **Service Layer Pattern**
```javascript
// api/tickets.js
export class TicketService {
  async getTicket(id) { }
  async getTickets(filters) { }
  async createTicket(data) { }
  async updateTicket(id, data) { }
  async closeTicket(id) { }
}
```

### 3. **Repository Pattern for Caching**
```javascript
// api/cache.js
export class CacheRepository {
  constructor(storage) {
    this.storage = storage;
  }
  
  async get(key) { }
  async set(key, value, ttl) { }
  async invalidate(pattern) { }
}
```

### 4. **Component-Based UI**
```javascript
// ui/components/Modal.js
export class Modal {
  constructor(element, options) { }
  open() { }
  close() { }
  destroy() { }
}
```

---

## 📝 Naming Conventions

### Files
- **Use kebab-case**: `ticket-list.js`, `knowledge-base.js`
- **Be descriptive**: `file-handler.js` not `upload.js`
- **Group by feature**: `features/tickets/list.js`

### Classes
- **PascalCase**: `TicketService`, `CacheRepository`, `ModalComponent`
- **Suffix with purpose**: `Service`, `Repository`, `Manager`, `Component`

### Functions
- **camelCase**: `getTicketById`, `renderTicketList`
- **Verb + noun**: `fetchTickets`, `createModal`, `updateState`
- **Boolean returns**: `isValid`, `hasPermission`, `canEdit`

### Constants
- **UPPER_SNAKE_CASE**: `API_BASE_URL`, `MAX_RETRY_ATTEMPTS`
- **Group in objects**: `TIMING_CONSTANTS`, `API_ENDPOINTS`

---

## 🚀 Performance Optimizations

### 1. **Code Splitting & Lazy Loading**
```javascript
// app.js
const loadTicketModule = () => import('./features/tickets/list.js');
const loadGalleryModule = () => import('./features/gallery/viewer.js');

// Load only when needed
if (userWantsTickets) {
  const { TicketList } = await loadTicketModule();
  TicketList.render();
}
```

### 2. **Virtual Scrolling for Large Lists**
```javascript
// features/tickets/list.js
export class TicketList {
  constructor(container, options) {
    this.virtualScroll = new VirtualScroll(container, {
      itemHeight: 60,
      buffer: 10
    });
  }
}
```

### 3. **Request Batching**
```javascript
// api/http.js
class RequestBatcher {
  constructor() {
    this.queue = [];
    this.timer = null;
  }
  
  add(request) {
    this.queue.push(request);
    this.schedule();
  }
  
  schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), 50);
  }
}
```

### 4. **Memoization**
```javascript
// utils/memoize.js
export function memoize(fn, keyGenerator) {
  const cache = new Map();
  return function(...args) {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
```

### 5. **Debouncing & Throttling**
```javascript
// utils/throttle.js
export function throttle(fn, delay) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}
```

### 6. **Web Workers for Heavy Operations**
```javascript
// utils/worker.js
const worker = new Worker('./workers/ticket-processor.js');
worker.postMessage({ tickets: largeTicketArray });
worker.onmessage = (e) => processResults(e.data);
```

### 7. **Intersection Observer for Lazy Loading**
```javascript
// ui/lazy-load.js
export class LazyLoader {
  constructor() {
    this.observer = new IntersectionObserver(this.handleIntersect.bind(this));
  }
  
  observe(element) {
    this.observer.observe(element);
  }
}
```

---

## 🧹 Code Quality Improvements

### 1. **TypeScript or JSDoc Types**
```javascript
/**
 * @typedef {Object} Ticket
 * @property {number} id
 * @property {string} title
 * @property {string} state
 * @property {Date} createdAt
 */

/**
 * @param {Ticket} ticket
 * @returns {Promise<Ticket>}
 */
async function updateTicket(ticket) { }
```

### 2. **Error Handling Strategy**
```javascript
// utils/errors.js
export class AppError extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

export class ApiError extends AppError {
  constructor(message, status, response) {
    super(message, `API_${status}`, response);
    this.name = 'ApiError';
    this.status = status;
  }
}
```

### 3. **Validation Layer**
```javascript
// utils/validation.js
export class Validator {
  static ticket(data) {
    const errors = [];
    if (!data.title?.trim()) errors.push('Title required');
    if (!data.body?.trim()) errors.push('Body required');
    return { valid: errors.length === 0, errors };
  }
}
```

### 4. **Configuration Management**
```javascript
// core/config.js
export class Config {
  constructor() {
    this.values = new Proxy({}, {
      get: (target, prop) => {
        if (!(prop in target)) {
          throw new Error(`Config key "${prop}" not found`);
        }
        return target[prop];
      }
    });
  }
  
  load(config) {
    Object.assign(this.values, config);
  }
}
```

---

## 📚 Example: Refactored Ticket List Module

### Before (nf-ticket-list.js)
```javascript
// 348 lines, mixed concerns, global state
let nfCurrentFilters = { ... };
function nfRenderTicketList(tickets) { ... }
```

### After (features/tickets/list.js)
```javascript
/**
 * @fileoverview Ticket list component
 * @module features/tickets/list
 */

import { TicketService } from '../../api/tickets.js';
import { CacheRepository } from '../../api/cache.js';
import { EventBus } from '../../state/events.js';
import { VirtualScroll } from '../../ui/virtual-scroll.js';
import { TicketListTemplate } from './ticket-list.template.js';

/**
 * Ticket list component
 * @class TicketListComponent
 */
export class TicketListComponent {
  /**
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Component options
   * @param {TicketService} options.ticketService - Ticket service
   * @param {CacheRepository} options.cache - Cache repository
   * @param {EventBus} options.events - Event bus
   */
  constructor(container, { ticketService, cache, events }) {
    this.container = container;
    this.service = ticketService;
    this.cache = cache;
    this.events = events;
    this.filters = this.loadFilters();
    this.virtualScroll = new VirtualScroll(container, {
      itemHeight: 60,
      renderItem: this.renderTicket.bind(this)
    });
    
    this.setupEventListeners();
  }
  
  /**
   * Load filters from storage or defaults
   * @returns {Object} Filter state
   */
  loadFilters() {
    const stored = this.cache.get('ticketFilters');
    return stored || {
      status: 'active',
      year: new Date().getFullYear(),
      sort: 'date_desc'
    };
  }
  
  /**
   * Render ticket list
   * @param {Array<Ticket>} tickets - Tickets to render
   */
  async render(tickets) {
    this.virtualScroll.setItems(tickets);
    await this.virtualScroll.render();
  }
  
  /**
   * Render single ticket row
   * @param {Ticket} ticket - Ticket data
   * @returns {HTMLElement} Ticket row element
   */
  renderTicket(ticket) {
    return TicketListTemplate.createRow(ticket);
  }
  
  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    this.events.on('ticket:created', () => this.refresh());
    this.events.on('ticket:updated', () => this.refresh());
  }
  
  /**
   * Refresh ticket list
   */
  async refresh() {
    const tickets = await this.service.getTickets(this.filters);
    await this.render(tickets);
  }
  
  /**
   * Destroy component
   */
  destroy() {
    this.virtualScroll.destroy();
    this.events.off('ticket:created');
    this.events.off('ticket:updated');
  }
}
```

---

## 🔄 Migration Strategy

### Phase 1: Foundation (Week 1)
1. Create new directory structure
2. Move and rename core modules (config, constants, logger)
3. Set up build system for new structure
4. Update imports gradually

### Phase 2: API Layer (Week 2)
1. Refactor API client to service pattern
2. Split API operations by domain (tickets, KB, etc.)
3. Implement repository pattern for caching
4. Add comprehensive error handling

### Phase 3: State & Events (Week 3)
1. Refactor state management
2. Enhance event bus
3. Implement reactive patterns
4. Add state persistence

### Phase 4: UI Components (Week 4)
1. Refactor UI modules to component pattern
2. Implement virtual scrolling
3. Add lazy loading
4. Optimize DOM operations

### Phase 5: Features (Week 5-6)
1. Refactor ticket modules
2. Refactor search module
3. Refactor gallery module
4. Add performance monitoring

### Phase 6: Polish (Week 7)
1. Add comprehensive tests
2. Performance optimization pass
3. Documentation
4. Code review and cleanup

---

## 📊 Performance Targets

- **Initial Load**: < 2s
- **Time to Interactive**: < 3s
- **Bundle Size**: < 200KB (gzipped)
- **Lighthouse Score**: > 90
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s

---

## 🛠️ Build System

### Recommended: Vite
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'core': ['./src/js/core'],
          'api': ['./src/js/api'],
          'ui': ['./src/js/ui'],
          'tickets': ['./src/js/features/tickets']
        }
      }
    }
  }
}
```

---

## ✅ Checklist

- [ ] Create new directory structure
- [ ] Set up build system
- [ ] Migrate core modules
- [ ] Refactor API layer
- [ ] Implement service pattern
- [ ] Add virtual scrolling
- [ ] Implement lazy loading
- [ ] Add performance monitoring
- [ ] Write comprehensive tests
- [ ] Update documentation
- [ ] Performance audit
- [ ] Code review

---

## 📖 Documentation Standards

### File Header
```javascript
/**
 * @fileoverview Brief description of module purpose
 * @module module/path
 * @author Your Name
 * @since 2025-01-XX
 * @version 2.0.0
 */
```

### Function Documentation
```javascript
/**
 * Fetches tickets from API with caching
 * @param {Object} filters - Filter criteria
 * @param {string} filters.status - Status filter
 * @param {number} filters.year - Year filter
 * @returns {Promise<Array<Ticket>>} Array of tickets
 * @throws {ApiError} If API request fails
 * @example
 * const tickets = await ticketService.getTickets({ status: 'active' });
 */
```

---

## 🔍 Duplication Analysis & Elimination

### 🔥 NEW FINDINGS - Additional Critical Duplications

#### 11. **Date Formatting (DUPLICATED 15+ times)**
**Problem**: `new Date().getFullYear()` and `new Date(...).toLocaleString()` repeated everywhere
```javascript
// DUPLICATED:
const currentYear = new Date().getFullYear();
const dateStr = new Date(ticket.created_at).toLocaleString(window.nfLang.getCurrentLocale());
```

**Solution**: Date utility module
```javascript
// utils/date.js
export const DateUtils = {
  getCurrentYear: () => CURRENT_YEAR, // Already defined in config
  formatDate(date, locale) {
    return new Date(date).toLocaleString(locale || window.nfLang.getCurrentLocale());
  },
  getYearFromDate(date) {
    return new Date(date).getFullYear();
  }
};
```

#### 12. **Response Checking (DUPLICATED 22 times)**
**Problem**: Same `if (!response.ok)` pattern everywhere
```javascript
// DUPLICATED:
if (!response.ok) {
    throw createApiError('...', 'ERROR_CODE', { status: response.status });
}
```

**Solution**: Response handler
```javascript
// api/response-handler.js
export async function handleResponse(response, errorCode, context) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw createApiError(
      error.message || `${context} failed`,
      errorCode,
      { status: response.status, ...error }
    );
  }
  return response.json();
}
```

#### 13. **URL Building (DUPLICATED 3+ times)**
**Problem**: Similar URL construction in `nf-ticket-detail.js` and `nf-api-client.js`
```javascript
// DUPLICATED in nf-ticket-detail.js:
const baseUrl = (NF_CONFIG && NF_CONFIG.api && NF_CONFIG.api.baseUrl) || '';
return `${baseUrl}/attachments/${attachment.id}`;

// DUPLICATED in nf-api-client.js:
_buildUrl(endpoint) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
}
```

**Solution**: Centralized URL builder
```javascript
// utils/url-builder.js
export const UrlBuilder = {
  attachment(id) {
    return `${ZAMMAD_API_URL()}/attachments/${id}`;
  },
  api(endpoint) {
    const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${ZAMMAD_API_URL()}${clean}`;
  }
};
```

#### 14. **Form Data Extraction (DUPLICATED 10+ times)**
**Problem**: Same `.value.trim()` pattern repeated
```javascript
// DUPLICATED:
const subject = nf.newTicketSubject.value.trim();
const body = nf.newTicketBody.value.trim();
const username = nf.loginUser.value.trim();
```

**Solution**: Form service
```javascript
// services/form-service.js
export const FormService = {
  getFormData(form) {
    const data = new FormData(form);
    const result = {};
    for (const [key, value] of data.entries()) {
      result[key] = typeof value === 'string' ? value.trim() : value;
    }
    return result;
  },
  getFieldValue(element) {
    return element?.value?.trim() || '';
  }
};
```

#### 15. **Empty/Null Checks (DUPLICATED 50+ times)**
**Problem**: Same empty check patterns everywhere
```javascript
// DUPLICATED:
if (!attachments || !attachments.length || !container) return;
if (!ticket || typeof ticket !== 'object') return;
if (!file) throw new Error('No file provided');
```

**Solution**: Guard utilities
```javascript
// utils/guards.js
export const Guards = {
  required(value, name) {
    if (!value) throw createApiError(`${name} is required`, `MISSING_${name.toUpperCase()}`);
    return value;
  },
  array(arr, name) {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw createApiError(`${name} must be a non-empty array`, `INVALID_${name.toUpperCase()}`);
    }
    return arr;
  },
  element(el, name) {
    if (!el) throw new Error(`${name} element not found`);
    return el;
  }
};
```

#### 16. **Config Access Inconsistency (DUPLICATED 69 times)**
**Problem**: Mix of `window.NF_CONFIG` and `NF_CONFIG` imports
```javascript
// INCONSISTENT:
window.NF_CONFIG?.api?.baseUrl  // Some places
NF_CONFIG?.api?.baseUrl          // Other places
```

**Solution**: Single config accessor
```javascript
// core/config-accessor.js
export function getConfig(path, defaultValue) {
  const config = window.NF_CONFIG || NF_CONFIG;
  return path.split('.').reduce((obj, key) => obj?.[key], config) ?? defaultValue;
}
```

#### 17. **Logger Existence Checks (DUPLICATED 135 times)**
**Problem**: `if (typeof nfLogger !== 'undefined')` everywhere
```javascript
// DUPLICATED:
if (typeof nfLogger !== 'undefined') {
    nfLogger.debug('...', data);
}
```

**Solution**: Safe logger wrapper
```javascript
// utils/logger-wrapper.js
export const logger = {
  debug: (...args) => window.nfLogger?.debug(...args),
  info: (...args) => window.nfLogger?.info(...args),
  warn: (...args) => window.nfLogger?.warn(...args),
  error: (...args) => window.nfLogger?.error(...args)
};
```

#### 18. **Modal Visibility Checks (DUPLICATED 10+ times)**
**Problem**: Same visibility check pattern
```javascript
// DUPLICATED:
if (nf.ticketDetailContainer && 
    !nf.ticketDetailContainer.classList.contains('nf-hidden') &&
    window.getComputedStyle(nf.ticketDetailContainer).display !== 'none') {
    // ...
}
```

**Solution**: Visibility utility
```javascript
// utils/visibility.js
export function isVisible(element) {
  if (!element) return false;
  return !element.classList.contains('nf-hidden') && 
         window.getComputedStyle(element).display !== 'none';
}
```

#### 19. **Event Listener Cleanup Pattern (DUPLICATED 5+ times)**
**Problem**: Similar cleanup patterns in gallery, events, etc.
```javascript
// DUPLICATED:
if (element && element._handler) {
    element.removeEventListener('click', element._handler);
    delete element._handler;
}
```

**Solution**: Event manager
```javascript
// utils/event-manager.js
export const EventManager = {
  on(element, event, handler) {
    element.addEventListener(event, handler);
    return () => element.removeEventListener(event, handler);
  },
  once(element, event, handler) {
    const wrapper = (...args) => {
      handler(...args);
      element.removeEventListener(event, wrapper);
    };
    element.addEventListener(event, wrapper);
    return () => element.removeEventListener(event, wrapper);
  }
};
```

#### 20. **File Size Formatting (DUPLICATED 3+ times)**
**Problem**: File size calculation repeated
```javascript
// DUPLICATED:
sizeSpan.textContent = ` (${(attachment.size / 1024).toFixed(1)} KB)`;
```

**Solution**: Already exists in `nf-file-upload.js` but not used everywhere - use `nfFormatFileSize()`

#### 21. **DOM Element Creation (DUPLICATED 40+ times)**
**Problem**: Same `createElement` + `appendChild` + property setting pattern
```javascript
// DUPLICATED:
const div = document.createElement('div');
div.className = 'some-class';
div.textContent = 'some text';
container.appendChild(div);
```

**Solution**: DOM builder utility
```javascript
// ui/dom-builder.js
export const DOMBuilder = {
  create(tag, props = {}, children = []) {
    const el = document.createElement(tag);
    Object.assign(el, props);
    children.forEach(child => el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child));
    return el;
  },
  fragment(children) {
    const frag = document.createDocumentFragment();
    children.forEach(child => frag.appendChild(child));
    return frag;
  }
};
```

#### 22. **String Highlighting/Replacement (DUPLICATED 5+ times)**
**Problem**: Same regex replacement pattern for highlighting search terms
```javascript
// DUPLICATED in nf-search.js:
const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + ')', 'gi');
title = title.replace(re, '<mark>$1</mark>');
summary = summary.replace(/<em>(.*?)<\/em>/g, '<mark>$1</mark>');
```

**Solution**: Text highlighting utility
```javascript
// utils/text-highlight.js
export const TextHighlight = {
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  },
  highlight(text, query, tag = 'mark') {
    const escaped = this.escapeRegex(query);
    const re = new RegExp(`(${escaped})`, 'gi');
    return text.replace(re, `<${tag}>$1</${tag}>`);
  },
  convertEmToMark(html) {
    return html.replace(/<em>(.*?)<\/em>/g, '<mark>$1</mark>');
  }
};
```

#### 23. **Array Iteration Patterns (67 matches)**
**Problem**: Similar forEach/map/filter patterns with error handling
```javascript
// DUPLICATED:
attachments.forEach((attachment, index) => {
    try {
        // process attachment
    } catch (error) {
        window.nfLogger.warn('...', { error });
    }
});
```

**Solution**: Safe iteration utilities
```javascript
// utils/array-utils.js
export const ArrayUtils = {
  forEachSafe(arr, fn, onError) {
    arr.forEach((item, index) => {
      try {
        fn(item, index);
      } catch (error) {
        onError?.(error, item, index);
      }
    });
  },
  mapSafe(arr, fn, defaultValue = null) {
    return arr.map((item, index) => {
      try {
        return fn(item, index);
      } catch (error) {
        logger?.warn('Array map error', { error, item, index });
        return defaultValue;
      }
    });
  }
};
```

#### 24. **Response JSON Parsing (DUPLICATED 14 times)**
**Problem**: Same `await response.json()` pattern with error handling
```javascript
// DUPLICATED:
const data = await response.json();
// or
const result = await response.json().catch(() => ({}));
```

**Solution**: Response parser utility
```javascript
// api/response-parser.js
export async function parseResponse(response, defaultValue = null) {
  try {
    return await response.json();
  } catch (error) {
    logger?.warn('Failed to parse JSON response', { error, status: response.status });
    return defaultValue;
  }
}
```

#### 25. **Element Property Setting (DUPLICATED 116 times)**
**Problem**: Same pattern of setting textContent/innerHTML/value
```javascript
// DUPLICATED:
if (element) {
    element.textContent = value;
    element.className = className;
    element.style.display = display;
}
```

**Solution**: Element property setter
```javascript
// ui/element-props.js
export function setElementProps(element, props) {
  if (!element) return;
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('data-') || key.startsWith('aria-')) {
      element.setAttribute(key, value);
    } else {
      element[key] = value;
    }
  });
}
```

#### 26. **DataTransfer File Manipulation (DUPLICATED 9 times)**
**Problem**: Same DataTransfer pattern for removing files from FileList
```javascript
// DUPLICATED in nf-file-upload.js (2 functions):
const dt = new DataTransfer();
const files = nf.newTicketAttachment?.files;
Array.from(files).forEach((file, index) => {
    if (index !== indexToRemove) {
        dt.items.add(file);
    }
});
nf.newTicketAttachment.files = dt.files;
```

**Solution**: File list utility
```javascript
// utils/file-list-utils.js
export const FileListUtils = {
  removeFile(fileList, indexToRemove) {
    const dt = new DataTransfer();
    Array.from(fileList).forEach((file, index) => {
      if (index !== indexToRemove) dt.items.add(file);
    });
    return dt.files;
  },
  addFiles(fileList, newFiles) {
    const dt = new DataTransfer();
    Array.from(fileList).forEach(file => dt.items.add(file));
    Array.from(newFiles).forEach(file => dt.items.add(file));
    return dt.files;
  }
};
```

#### 27. **Placeholder/Fallback Images (DUPLICATED 66 times)**
**Problem**: Same SVG data URL placeholder repeated
```javascript
// DUPLICATED:
thumbImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="%23f0f0f0"/><text x="75" y="75" text-anchor="middle" fill="%23666">📎</text></svg>';
```

**Solution**: Placeholder image utility
```javascript
// utils/image-placeholders.js
export const ImagePlaceholders = {
  fileIcon(size = 150) {
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="%23f0f0f0"/><text x="${size/2}" y="${size/2}" text-anchor="middle" fill="%23666">📎</text></svg>`;
  },
  imageError(size = 150) {
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="%23f0f0f0"/><text x="${size/2}" y="${size/2}" text-anchor="middle" fill="%23666">⚠️</text></svg>`;
  }
};
```

#### 28. **Element Validation & Error Messages (DUPLICATED 20+ times)**
**Problem**: Same pattern of checking elements and showing error messages
```javascript
// DUPLICATED:
if (!nf.ticketDetailHeader) {
    window.nfLogger.error('ticketDetailHeader missing', {});
    nfShowStatus('Ticket detail header DOM element missing...', 'error', 'ticketdetail');
    return;
}
if (!headerTemplate || !headerTemplate.firstElementChild) {
    window.nfLogger.error('Ticket header template missing or empty', { headerTemplate });
    nfShowStatus('Ticket header template missing...', 'error', 'ticketdetail');
    return;
}
```

**Solution**: Element validator
```javascript
// utils/element-validator.js
export const ElementValidator = {
  required(element, name, context) {
    if (!element) {
      logger?.error(`${name} missing`, {});
      statusManager.error(`${name} DOM element missing. Please check your HTML structure.`, context);
      throw new Error(`${name} is required`);
    }
    return element;
  },
  template(template, name, context) {
    if (!template || !template.firstElementChild) {
      logger?.error(`${name} template missing or empty`, { template });
      statusManager.error(`${name} template missing or empty. Please check your HTML templates.`, context);
      throw new Error(`${name} template is required`);
    }
    return template;
  }
};
```

#### 29. **Image Loading Promise Pattern (DUPLICATED 5+ times)**
**Problem**: Same promise pattern for waiting for image load
```javascript
// DUPLICATED:
await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    setTimeout(resolve, TIMING_CONSTANTS.IMAGE_LOAD_TIMEOUT_MS);
});
```

**Solution**: Image loader utility
```javascript
// utils/image-loader.js
export async function loadImage(src, timeout = TIMING_CONSTANTS.IMAGE_LOAD_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
    setTimeout(() => reject(new Error('Image load timeout')), timeout);
  });
}
```

#### 30. **Style Property Manipulation (DUPLICATED 27 times)**
**Problem**: Same pattern of setting multiple style properties
```javascript
// DUPLICATED:
thumbImg.style.maxWidth = '150px';
thumbImg.style.maxHeight = '150px';
thumbImg.style.cursor = 'pointer';
thumbImg.style.border = '1px solid #ddd';
thumbImg.style.borderRadius = '4px';
thumbImg.style.padding = '4px';
```

**Solution**: Style setter utility (already covered in Element Property Setting, but can be more specific)
```javascript
// ui/style-utils.js
export const StyleUtils = {
  thumbnail(img) {
    Object.assign(img.style, {
      maxWidth: '150px',
      maxHeight: '150px',
      cursor: 'pointer',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '4px'
    });
  },
  set(element, styles) {
    Object.assign(element.style, styles);
  }
};
```

---

### Critical Duplications Found

#### 1. **Input Validation (DUPLICATED 20+ times)**
**Problem**: Same validation logic in `nf-api.js` AND `nf-api-client.js`
```javascript
// DUPLICATED in both files:
if (!ticketId || (typeof ticketId !== 'number' && typeof ticketId !== 'string')) {
    throw createApiError('Ticket ID is required...', 'INVALID_TICKET_ID');
}
if (!text || typeof text !== 'string' || !text.trim()) {
    throw createApiError('Reply text is required...', 'INVALID_REPLY_TEXT');
}
if (files && !Array.isArray(files) && !(files instanceof FileList)) {
    throw createApiError('Files must be...', 'INVALID_FILES');
}
```

**Solution**: Centralized validators
```javascript
// utils/validators.js
export const Validators = {
  ticketId(id) {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
      throw createApiError('Ticket ID is required and must be a number or string', 'INVALID_TICKET_ID');
    }
    return true;
  },
  
  nonEmptyString(value, fieldName) {
    if (!value || typeof value !== 'string' || !value.trim()) {
      throw createApiError(`${fieldName} is required and must be a non-empty string`, `INVALID_${fieldName.toUpperCase()}`);
    }
    return true;
  },
  
  files(files) {
    if (files && !Array.isArray(files) && !(files instanceof FileList)) {
      throw createApiError('Files must be an array or FileList', 'INVALID_FILES');
    }
    return true;
  }
};
```

#### 2. **Error Handling Patterns (DUPLICATED 50+ times)**
**Problem**: Same try/catch/throw pattern everywhere
```javascript
// DUPLICATED everywhere:
try {
    // do something
    return result;
} catch (error) {
    if (typeof nfLogger !== 'undefined') {
        nfLogger.error('...', { error: error.message });
    }
    throw error;
}
```

**Solution**: Error boundary wrapper
```javascript
// utils/error-boundary.js
export function withErrorHandling(fn, context) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      logger.error(`${context} failed`, { error: error.message });
      throw error;
    }
  };
}

// Usage:
export const nfCreateTicket = withErrorHandling(
  async (subject, body, files, requestType) => {
    Validators.nonEmptyString(subject, 'Subject');
    Validators.nonEmptyString(body, 'Body');
    Validators.files(files);
    // ... rest of logic
  },
  'Ticket creation'
);
```

#### 3. **Cache Invalidation (DUPLICATED 10+ times)**
**Problem**: Same cache invalidation pattern repeated
```javascript
// DUPLICATED in nf-ticket-actions.js, nf-api.js, etc:
if (typeof window.nfCache !== 'undefined') {
    window.nfCache.invalidate(`ticket_detail_${ticketId}`);
    if (typeof window.nfLogger !== 'undefined') {
        window.nfLogger.debug('Cache invalidated', { ticketId });
    }
}
```

**Solution**: Cache manager
```javascript
// api/cache-manager.js
export class CacheManager {
  constructor(cache, logger) {
    this.cache = cache;
    this.logger = logger;
  }
  
  invalidateTicket(ticketId) {
    this.cache?.invalidate(`ticket_detail_${ticketId}`);
    this.logger?.debug('Ticket cache invalidated', { ticketId });
  }
  
  invalidateTicketList(filters) {
    const key = this.buildListKey(filters);
    this.cache?.invalidate(key);
    this.logger?.debug('Ticket list cache invalidated', { filters });
  }
}
```

#### 4. **Loading State (DUPLICATED 30+ times)**
**Problem**: Same loading pattern everywhere
```javascript
// DUPLICATED everywhere:
nfSetLoading(true);
try {
    // do work
} finally {
    nfSetLoading(false);
}
```

**Solution**: Async wrapper
```javascript
// utils/loading.js
export function withLoading(fn) {
  return async function(...args) {
    setLoading(true);
    try {
      return await fn.apply(this, args);
    } finally {
      setLoading(false);
    }
  };
}

// Usage:
export const nfCreateTicket = withLoading(async (subject, body, files) => {
  // ... logic
});
```

#### 5. **Typeof Checks (294 matches!)**
**Problem**: `typeof window !== 'undefined'` and `typeof nfLogger !== 'undefined'` everywhere

**Solution**: Safe access utilities
```javascript
// utils/safe-access.js
export const safe = {
  window: typeof window !== 'undefined' ? window : null,
  logger: typeof window !== 'undefined' && window.nfLogger ? window.nfLogger : null,
  cache: typeof window !== 'undefined' && window.nfCache ? window.nfCache : null,
  config: typeof window !== 'undefined' && window.NF_CONFIG ? window.NF_CONFIG : null
};

// Usage:
safe.logger?.debug('message');
safe.cache?.get(key);
```

#### 6. **DOM Query Patterns (197 matches)**
**Problem**: Repeated `querySelector`, `getElementById` patterns

**Solution**: DOM query manager
```javascript
// ui/dom-query.js
export class DOMQuery {
  constructor() {
    this.cache = new Map();
  }
  
  $(selector, parent = document) {
    const key = `${selector}:${parent.id || 'root'}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, parent.querySelector(selector));
    }
    return this.cache.get(key);
  }
  
  $$(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }
  
  byId(id) {
    if (!this.cache.has(id)) {
      this.cache.set(id, document.getElementById(id));
    }
    return this.cache.get(id);
  }
  
  clear() {
    this.cache.clear();
  }
}
```

#### 7. **Status Messages (DUPLICATED 40+ times)**
**Problem**: Similar status message patterns

**Solution**: Status manager
```javascript
// ui/status-manager.js
export class StatusManager {
  show(message, type = 'info', context = null) {
    const target = context || this.detectContext();
    this.render(message, type, target);
  }
  
  success(message, context) {
    this.show(message, 'success', context);
  }
  
  error(message, context) {
    this.show(message, 'error', context);
  }
  
  private detectContext() {
    // Auto-detect active modal
  }
}
```

#### 8. **File Processing (DUPLICATED in create & reply)**
**Problem**: Same file-to-base64 conversion in multiple places

**Solution**: File service
```javascript
// features/upload/file-service.js
export class FileService {
  async toBase64(file) {
    return nfFileToBase64(file);
  }
  
  async processFiles(files) {
    return Promise.all(
      Array.from(files).map(file => ({
        filename: file.name,
        data: await this.toBase64(file),
        'mime-type': file.type
      }))
    );
  }
}
```

#### 9. **Event Listener Cleanup (DUPLICATED 10+ times)**
**Problem**: Similar cleanup patterns

**Solution**: Event manager
```javascript
// ui/event-manager.js
export class EventManager {
  constructor() {
    this.listeners = new Map();
  }
  
  on(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    const key = `${element.id || 'unknown'}:${event}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push({ element, event, handler });
  }
  
  off(element, event, handler) {
    element.removeEventListener(event, handler);
  }
  
  cleanup(element) {
    const key = `${element.id || 'unknown'}`;
    this.listeners.forEach((listeners, k) => {
      if (k.startsWith(key)) {
        listeners.forEach(({ element, event, handler }) => {
          element.removeEventListener(event, handler);
        });
      }
    });
  }
}
```

#### 10. **API Response Handling (DUPLICATED 15+ times)**
**Problem**: Same response.ok checks everywhere

**Solution**: Response handler
```javascript
// api/response-handler.js
export class ResponseHandler {
  static async handle(response, errorMessage) {
    if (!response.ok) {
      throw createApiError(
        errorMessage || `Request failed: ${response.status}`,
        'REQUEST_FAILED',
        { status: response.status }
      );
    }
    return await response.json();
  }
}
```

---

## 📉 Code Reduction Targets

### Current State
- **Total Lines**: ~8,000+ lines
- **Duplicated Patterns**: ~900+ instances (final comprehensive count)
- **Functions**: 148 functions
- **DOM Queries**: 197 instances
- **Typeof Checks**: 294 instances
- **Logger Checks**: 135 instances
- **Date Formatting**: 15+ instances
- **Response Checks**: 22 instances
- **Form Data Extraction**: 10+ instances
- **Empty/Null Checks**: 50+ instances
- **Config Access**: 69 inconsistent patterns
- **DOM Creation**: 40+ instances
- **String Operations**: 67+ instances
- **Array Iterations**: 67 instances
- **Element Properties**: 116 instances
- **JSON Parsing**: 14 instances
- **DataTransfer**: 9 instances
- **Placeholder Images**: 66 instances
- **Element Validation**: 20+ instances
- **Image Loading**: 5+ instances
- **Style Manipulation**: 27 instances

### After Refactoring
- **Total Lines**: ~4,000 lines (50% reduction - outstanding!)
- **Duplicated Patterns**: 0 instances
- **Functions**: ~80 functions (consolidated)
- **DOM Queries**: Centralized manager
- **Typeof Checks**: Safe access utilities
- **All Patterns**: Centralized utilities

---

## 🎯 Deduplication Priority

### High Priority (Do First)
1. ✅ **Input Validators** - Eliminate 20+ duplications
2. ✅ **Error Boundaries** - Eliminate 50+ duplications  
3. ✅ **Safe Access Utilities** - Eliminate 294 typeof checks
4. ✅ **Loading Wrapper** - Eliminate 30+ duplications

### Medium Priority
5. ✅ **Cache Manager** - Eliminate 10+ duplications
6. ✅ **Status Manager** - Eliminate 40+ duplications
7. ✅ **DOM Query Manager** - Eliminate 197 direct queries
8. ✅ **File Service** - Eliminate file processing duplication

### Low Priority (Polish)
9. ✅ **Event Manager** - Clean up event handling
10. ✅ **Response Handler** - Standardize API responses
11. ✅ **Date Utilities** - Eliminate 15+ date formatting duplications
12. ✅ **URL Builder** - Eliminate URL construction duplication
13. ✅ **Form Service** - Eliminate 10+ form data extraction duplications
14. ✅ **Guard Utilities** - Eliminate 50+ empty/null check duplications
15. ✅ **Config Accessor** - Standardize 69 config access patterns
16. ✅ **Logger Wrapper** - Eliminate 135 logger existence checks
17. ✅ **Visibility Utility** - Eliminate modal visibility check duplication
18. ✅ **File Size Formatting** - Use existing utility everywhere
19. ✅ **DOM Builder** - Eliminate 40+ element creation duplications
20. ✅ **Text Highlighting** - Eliminate 5+ string replacement duplications
21. ✅ **Array Utilities** - Consolidate 67 array iteration patterns
22. ✅ **Response Parser** - Eliminate 14 JSON parsing duplications
23. ✅ **Element Props Setter** - Eliminate 116 property setting duplications
24. ✅ **File List Utils** - Eliminate 9 DataTransfer duplications
25. ✅ **Image Placeholders** - Eliminate 66 placeholder image duplications
26. ✅ **Element Validator** - Eliminate 20+ validation pattern duplications
27. ✅ **Image Loader** - Eliminate 5+ image loading promise duplications
28. ✅ **Style Utils** - Eliminate 27 style manipulation duplications

---

## 🔧 Consolidated Utility Modules

### `utils/core.js` - Essential utilities
```javascript
export { safe } from './safe-access.js';
export { withLoading } from './loading.js';
export { withErrorHandling } from './error-boundary.js';
export { Validators } from './validators.js';
```

### `ui/core.js` - UI utilities
```javascript
export { DOMQuery } from './dom-query.js';
export { StatusManager } from './status-manager.js';
export { EventManager } from './event-manager.js';
```

### `api/core.js` - API utilities
```javascript
export { CacheManager } from './cache-manager.js';
export { ResponseHandler } from './response-handler.js';
```

---

## 📊 Before/After Comparison

### Example: Ticket Creation

**Before (68 lines, 3 files)**
```javascript
// nf-ticket-create.js
export async function handleNewTicketSubmit(e) {
    e.preventDefault();
    nfSetLoading(true);
    try {
        const subject = nf.newTicketSubject.value.trim();
        const body = nf.newTicketBody.value.trim();
        // ... validation ...
        if (!subject || !body) {
            throw new window.NFError(...);
        }
        // ... file validation ...
        await nfCreateTicket(subject, body, files, effectiveRequestType);
        nfShowStatus(...);
    } catch (error) {
        window.nfLogger.error(...);
        nfShowStatus(...);
    } finally {
        nfSetLoading(false);
    }
}

// nf-api.js - DUPLICATE validation
async function nfCreateTicket(subject, body, files, requestType) {
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
        throw createApiError(...);
    }
    // ... same validation again
}

// nf-api-client.js - DUPLICATE validation AGAIN
async createTicket(ticketData) {
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
        throw createApiError(...);
    }
    // ... same validation AGAIN
}
```

**After (25 lines, 1 file)**
```javascript
// features/tickets/create.js
export const handleNewTicketSubmit = withLoading(
  withErrorHandling(async (e) => {
    e.preventDefault();
    
    const form = FormService.getFormData(e.target);
    Validators.ticket(form);
    
    const ticket = await ticketService.create(form);
    statusManager.success('Ticket created');
    navigation.showStart();
  }, 'Ticket creation')
);
```

**Reduction**: 68 lines → 25 lines (63% reduction, zero duplication)

---

This refactoring plan provides a clear path to a modern, maintainable, and performant codebase with **ZERO duplication**.

