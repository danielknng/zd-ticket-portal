# Contributing to Zammad Ticket Portal

Thank you for your interest in contributing to this project! This document provides guidelines for contributing to the Unofficial Zammad Ticket Portal.

## Getting Started

### Prerequisites
- Modern web browser with ES6 module support
- Web server for local development (can't run from file:// protocol)
- Basic understanding of JavaScript ES6 modules
- Familiarity with Zammad API (helpful but not required)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/DanielKng/zd-ticket-portal.git
   cd zd-ticket-portal
   ```

2. **Start a local web server**
   ```bash
   # Using npx serve (recommended)
   npx serve .
   
   # Or using Python
   python -m http.server 8000
   
   # Or using PHP
   php -S localhost:8000
   ```

3. **Open in browser**
   Navigate to `http://localhost:3000/src/html/nf_gui.html` (adjust port as needed)

4. **Configure for your Zammad instance**
   - Edit `src/js/nf-config.js`
   - Update API endpoints, language settings, and other configuration

## Code Style and Standards

### JavaScript
- Use ES6 modules with explicit imports/exports
- Follow existing naming conventions (nf prefix for functions/objects)
- Include comprehensive JSDoc comments
- Use async/await for asynchronous operations
- Implement proper error handling

### CSS
- Follow the existing modular structure in `src/css/`
- Use semantic class names
- Maintain responsive design principles
- Test across different screen sizes

### HTML
- Use semantic HTML5 elements
- Include proper ARIA labels for accessibility
- Follow existing template patterns

## Project Architecture

### Module Organization
- **Configuration**: `nf-config.js`, `nf-lang.js`
- **Data Layer**: `nf-api.js`, `nf-cache.js`, `nf-api-utils.js`
- **UI Layer**: `nf-dom.js`, `nf-ui.js`, `nf-events.js`, `nf-modal.js`
- **Features**: `nf-ticket-*.js`, `nf-search.js`, `nf-file-upload.js`
- **Utilities**: `nf-utils.js`, `nf-helpers.js`, `nf-status.js`

### Language System
- Language files are in `src/lang/{language}/`
- Separated by category: `ui.json`, `aria.json`, `system.json`, `messages.json`, `utils.json`
- Use the `NFLanguageManager` for dynamic loading

## Contributing Guidelines

### Before You Start
1. Check existing issues to avoid duplicate work
2. Create an issue to discuss major changes
3. Fork the repository for your changes

### Making Changes
1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow the module patterns**
   - Use existing modules as templates
   - Maintain clean import/export structure
   - Add appropriate error handling

3. **Update documentation**
   - Update relevant README files
   - Add/update JSDoc comments
   - Document any new configuration options

4. **Test your changes**
   - Test in multiple browsers
   - Verify responsive design
   - Test with different Zammad configurations
   - Enable debug logging to verify functionality

### Pull Request Process

1. **Prepare your PR**
   - Ensure your code follows existing patterns
   - Update documentation as needed
   - Test thoroughly

2. **Create the pull request**
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes

3. **Address feedback**
   - Respond to code review comments
   - Make necessary adjustments
   - Keep the conversation constructive

## Types of Contributions

### Bug Fixes
- Report bugs with detailed reproduction steps
- Include browser and Zammad version information
- Provide console logs if applicable

### Feature Enhancements
- Discuss major features in issues first
- Maintain backward compatibility when possible
- Follow existing architectural patterns

### Documentation
- Improve README files
- Add/update code comments
- Create examples and tutorials

### Translations
- Add new language files in `src/lang/{language}/`
- Follow existing JSON structure
- Update language configuration in `nf-config.js`

## Development Tips

### Debugging
- Enable debug mode in `nf-config.js`
- Use browser developer tools
- Check network tab for API issues
- Monitor console for errors

### Language System
- Use `NFLanguageManager` for translations
- Wait for `nfLanguageReady` event before UI initialization
- Test with different language configurations

### Caching
- Understand the TTL-based caching system
- Test cache invalidation scenarios
- Consider cache implications for new features

### API Integration
- Use existing API utility functions
- Implement proper retry mechanisms
- Handle authentication properly

## Code of Conduct

### Be Respectful
- Use inclusive language
- Be constructive in feedback
- Help others learn and grow

### Be Collaborative
- Share knowledge and resources
- Ask questions when unsure
- Help maintain project quality

## Getting Help

- **Issues**: Use GitHub issues for bug reports and feature requests
- **Documentation**: Check the README files in project directories
- **Code**: Look at existing modules for examples and patterns

## License

By contributing to this project, you agree that your contributions will be licensed under the same Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License that covers the project.

---

Thank you for helping make this project better! 🎉
