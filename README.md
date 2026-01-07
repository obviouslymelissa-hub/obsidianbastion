# Obsidian Bastian

A comprehensive spaceship management interface system for the Obsidian Bastian vessel. This project provides a web-based control panel for monitoring and managing various ship systems, crew operations, and navigation.

## Overview

Obsidian Bastian is a fictional spaceship management interface that simulates the operation of a deep-space vessel. The interface includes multiple subsystems for controlling and monitoring different aspects of the ship's operations.

## Features

### Core Systems

- **Main Interface** (`index.html`) - Central hub and dashboard for ship operations
- **Navigation Console** (`navigationconsole.html`) - Star system navigation and route planning
- **Communications** (`communications.html`) - Ship-to-ship and long-range communications
- **Defense Systems** (`defense.html`) - Weapons and shield management
- **Power Management** (`powermanagement.html`) - Energy distribution and reactor control

### Operations & Monitoring

- **Diagnostics** (`diagnostics.html`) - System health and troubleshooting
- **Mainframe Health** (`mainframe-health.html`) - Core computer system status
- **Mainframe Weather** (`mainframeweather.html`) - Environmental and atmospheric data visualization
- **Atmospheric Systems** (`atmos.js`) - Life support and atmosphere control
- **Onboard Computer** (`onboardcomputer.html`) - Central computer interface

### Crew & Resources

- **Crew Management** (`crew.html`) - Personnel roster and assignments
- **Parts Inventory** (`partsinventory.html`) - Ship components and supplies tracking
- **Achievements** (`achievements.html`) - Mission milestones and accomplishments

### Special Locations

- **Carter's Star** (`cartersstar.html`) - Special location interface

## Getting Started

### Prerequisites

- A modern web browser (Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+)
- JavaScript enabled
- For chart visualizations: Chart.js library (see setup below)

### Basic Setup

1. Clone or download this repository:
   ```bash
   git clone https://github.com/obviouslymelissa-hub/obsidianbastian.git
   cd obsidianbastian
   ```

2. Open `index.html` in your web browser:
   ```bash
   # Using Python's built-in server
   python3 -m http.server 8000
   # Then navigate to http://localhost:8000
   ```

   Or simply double-click `index.html` to open it directly in your browser.

### Chart.js Setup (Optional)

Some features, particularly the Mainframe Weather system, require Chart.js for data visualization. See [MAINFRAME_WEATHER_SETUP.md](MAINFRAME_WEATHER_SETUP.md) for detailed setup instructions.

**Quick setup:**
```bash
mkdir -p lib
curl -L https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js -o lib/chart.umd.min.js
```

## Project Structure

```
obsidianbastian/
├── index.html              # Main dashboard
├── app.js                  # Core application logic
├── app.css                 # Main stylesheet
├── atmos.js                # Atmospheric systems
├── crew.html               # Crew management
├── communications.html     # Communications systems
├── defense.html            # Defense systems
├── diagnostics.html        # System diagnostics
├── mainframe-health.html   # Mainframe monitoring
├── mainframeweather.html   # Weather/environmental data
├── navigationconsole.html  # Navigation interface
├── onboardcomputer.html    # Computer core
├── powermanagement.html    # Power systems
├── partsinventory.html     # Inventory management
├── achievements.html       # Achievements tracking
├── cartersstar.html        # Special location
├── images/                 # Image assets
│   ├── ship-*.jpg          # Ship images
│   ├── captain.jpg         # Crew portraits
│   └── ...
├── lib/                    # External libraries (gitignored)
│   └── chart.umd.min.js    # Chart.js (download separately)
└── MAINFRAME_WEATHER_SETUP.md  # Chart.js setup guide
```

## Technologies Used

- **HTML5** - Structure and content
- **CSS3** - Styling and animations
- **JavaScript** - Interactivity and system logic
- **Chart.js** - Data visualization (optional)
- **LocalStorage API** - Persistent data storage

## Design Philosophy

The interface follows a dark, sci-fi aesthetic with:
- Dark backgrounds (`#0f1318`, `#151821`)
- Teal/cyan accent colors (`#4fd1c5`, `#7ef0df`)
- Subtle gradients and glowing effects
- Clean, modern typography
- Responsive layout principles

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ Internet Explorer: Not supported

## Development

### Version History

Multiple versions of certain files are maintained for reference:
- `app_Version10.js` - Previous version of core app
- `app_Version9.css` - Previous version of stylesheet
- `navigationconsole_Version6.html` - Previous navigation version

### Local Development

For local development, it's recommended to use a local web server to avoid CORS issues:

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (with http-server)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

## Troubleshooting

### Charts Not Loading

If charts are not displaying on the Mainframe Weather page:
1. Check that Chart.js is properly loaded (see [MAINFRAME_WEATHER_SETUP.md](MAINFRAME_WEATHER_SETUP.md))
2. Verify JavaScript is enabled in your browser
3. Check browser console (F12) for errors
4. Try disabling ad blockers temporarily

### General Issues

- **Blank pages**: Ensure JavaScript is enabled
- **Missing styles**: Check that CSS files are loading properly
- **CORS errors**: Use a local web server instead of opening files directly

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

This project is provided as-is for educational and entertainment purposes.

## Credits

Developed for the Obsidian Bastian spaceship simulation project.

---

**Ship Status**: Operational ✨  
**Last Updated**: 2026
