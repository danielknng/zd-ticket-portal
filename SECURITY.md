# Security Policy

## Supported Versions

This project follows a rolling release model. Only the latest version on the `main` branch is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| Older   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

### For Security Issues
**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please:
1. Email the details to: [Contact via GitHub profile]
2. Include a detailed description of the vulnerability
3. Provide steps to reproduce if possible
4. Include any potential impact assessment

### What to Include
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)
- Your contact information

### Response Timeline
- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution**: Varies by severity, typically 30 days for non-critical issues

### Security Considerations

This project is a frontend application that integrates with Zammad. Key security considerations:

#### Authentication
- Uses Zammad's Basic Authentication
- No credentials are stored in the frontend
- All API calls are made directly to your Zammad instance

#### Data Handling
- No sensitive data is stored permanently in the browser
- Caching uses browser localStorage with TTL expiration
- All data transmission occurs between browser and your Zammad server

#### Common Security Best Practices
- Keep your Zammad instance updated
- Use HTTPS for all communications
- Review and configure API permissions appropriately
- Regularly review access logs

#### Client-Side Security
- ES6 modules prevent global namespace pollution
- Input validation and sanitization
- XSS protection through proper DOM manipulation
- No eval() or similar dangerous functions

### Scope
This security policy covers:
- The frontend JavaScript code
- Configuration handling
- Data caching and storage
- Integration patterns

This policy does NOT cover:
- Zammad server security (see Zammad's security documentation)
- Web server configuration
- Network security
- Third-party dependencies

### Disclosure Policy
After a security issue is resolved:
1. A security advisory will be published
2. Credit will be given to the reporter (if desired)
3. Details will be shared to help others secure their installations

Thank you for helping keep this project secure!
