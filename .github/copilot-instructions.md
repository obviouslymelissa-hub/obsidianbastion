# Copilot Instructions for Obsidian Bastian

## Project Overview

Obsidian Bastian is a web-based spaceship navigation and management interface. It's a single-page application (SPA) designed to simulate various ship systems including navigation, communications, defense, diagnostics, power management, and crew management. The interface provides an immersive sci-fi experience with a dark theme and teal/cyan accents.

## Technology Stack

- **Frontend**: Pure HTML, CSS, and vanilla JavaScript (no frameworks)
- **Data Storage**: LocalStorage for persisting user data and preferences
- **Charts**: Chart.js library for data visualization (mainframe weather system)
- **Deployment**: GitHub Pages

## Project Structure

- `index.html` - Main landing page with ship overview
- `navigationconsole.html` - Navigation system interface
- `app.js` - Main navigation SPA logic
- `app.css` - Styling for the navigation console
- `communications.html`, `crew.html`, `defense.html`, `diagnostics.html`, `mainframe-health.html`, `mainframeweather.html`, `onboardcomputer.html`, `partsinventory.html`, `powermanagement.html` - Various ship system interfaces
- `images/` - Image assets directory
- `MAINFRAME_WEATHER_SETUP.md` - Setup guide for Chart.js library

## Coding Standards and Conventions

### HTML
- Use semantic HTML5 elements
- Maintain consistent indentation (2 spaces)
- Use lowercase for element names and attributes
- Include proper meta tags for viewport and charset
- Keep inline styles minimal; prefer external CSS

### CSS
- Use CSS custom properties (CSS variables) for theming
- Root variables are defined in `:root` selector
- Color scheme: dark backgrounds (`--bg-dark`, `--bg-panel`) with teal/cyan accents (`--accent`, `--accent-2`)
- Follow existing naming conventions for classes (kebab-case)
- Use flexbox and grid for layouts
- Animations should be subtle and performance-conscious
- Maintain responsive design principles

### JavaScript
- Use vanilla JavaScript (ES6+)
- No frameworks or build tools required
- Prefer `const` and `let` over `var`
- Use async/await for asynchronous operations
- Store data in localStorage with versioned keys (e.g., `'nav:loc:v1'`, `'nav:customs_v1'`)
- Use template literals for string interpolation
- Prefer arrow functions for callbacks
- Use consistent naming:
  - Functions: camelCase (e.g., `loadCatalog`, `saveLocation`)
  - Variables: camelCase
  - Constants: UPPER_SNAKE_CASE (e.g., `DATA_URL`, `STORAGE`)
- Helper function pattern: `function $(id){ return document.getElementById(id); }` for DOM selection

### File Naming
- HTML files: lowercase with hyphens (e.g., `mainframe-health.html`)
- JavaScript files: camelCase or kebab-case (e.g., `app.js`, `atmos.js`)
- CSS files: kebab-case (e.g., `app.css`)
- Version suffixes when applicable: `_Version[N]` (e.g., `app_Version10.js`)

## Development Guidelines

### Adding New Features
1. Maintain the existing dark sci-fi theme and design language
2. Use existing CSS custom properties for colors and spacing
3. Ensure features work without external dependencies when possible
4. Test in multiple browsers (Chrome, Firefox, Safari, Edge)
5. Preserve localStorage data structure and versioning

### UI/UX Guidelines
- Maintain consistent spacing and padding
- Use existing color scheme variables
- Animations should enhance UX, not distract
- Interactive elements should have hover states
- Maintain accessibility considerations

### Testing
- No automated test suite; manual testing is the current approach
- Test all localStorage interactions
- Verify functionality in different browsers
- Check responsive behavior at various screen sizes

### Build and Deployment
- No build process required - pure static files
- Deploy via GitHub Pages
- Ensure all asset paths are relative for GitHub Pages compatibility

### External Dependencies
- Chart.js: Can be loaded via CDN or local library (see `MAINFRAME_WEATHER_SETUP.md`)
- Prefer local copies when CDN access may be blocked (corporate networks, ad blockers)
- Store local dependencies in `lib/` directory (gitignored)

## Code Quality
- Keep functions focused and single-purpose
- Use meaningful variable and function names
- Add comments for complex logic only
- Avoid deep nesting; prefer early returns
- Handle errors gracefully with try-catch blocks
- Clean up event listeners and intervals when appropriate

## Security Considerations
- Sanitize user input before displaying or storing
- Be cautious with `innerHTML`; prefer `textContent` when possible
- Validate data retrieved from localStorage before use
- No server-side code or API keys in this project

## Pull Request Guidelines
- Keep changes focused and minimal
- Test all modified functionality manually
- Verify no console errors in browser dev tools
- Ensure changes work on GitHub Pages
- Update documentation if adding significant features
- Maintain existing code style and conventions
