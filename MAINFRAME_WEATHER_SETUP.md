# Mainframe Weather Setup Guide

## Issue: Charts Not Loading

If the charts are not rendering on the Mainframe Weather page, it's likely due to CDN access being blocked by:
- Ad blockers
- Corporate firewalls
- Browser security policies
- Network restrictions

## Solution: Use Local Chart.js Library

Follow these steps to set up Chart.js locally:

### Step 1: Create lib Directory

```bash
mkdir -p lib
```

### Step 2: Download Chart.js

Download the Chart.js library file:

**Option A: Using curl (Linux/Mac/Git Bash)**
```bash
curl -L https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js -o lib/chart.umd.min.js
```

**Option B: Using PowerShell (Windows)**
```powershell
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" -OutFile "lib\chart.umd.min.js"
```

**Option C: Manual Download**
1. Open https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js in your browser
2. Save the file as `lib/chart.umd.min.js` in your project directory

### Step 3: Update mainframe-health.html

Edit `mainframe-health.html` and update the script tag around line 12-14:

**Find this:**
```html
<!-- Option 1: jsDelivr CDN (recommended) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

**Replace with this:**
```html
<!-- Option 4: Local file -->
<script src="lib/chart.umd.min.js"></script>
```

### Step 4: Test

Open `mainframe-health.html` in your browser. The charts should now load and animate with simulated data.

## Alternative CDNs

If you can't use jsDelivr, try these alternatives by uncommenting the appropriate line in mainframe-health.html:

- **unpkg**: `<script src="https://unpkg.com/chart.js@4.4.0/dist/chart.umd.js"></script>`
- **cdnjs**: `<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>`

## Technical Details

The updated implementation:
- ✅ Removed dependency on Luxon time adapter (Chart.js v4 requirement)
- ✅ Uses linear scale with custom timestamp formatting
- ✅ Works without external dependencies beyond Chart.js core
- ✅ Maintains all functionality (simulated data, export, zoom, etc.)

## Troubleshooting

### Charts still not showing?

1. **Check browser console** (F12 → Console tab)
   - Look for errors like "Chart is not defined"
   - Check for CORS or network errors

2. **Verify lib/chart.umd.min.js exists**
   - File should be ~220KB
   - Check file path is correct relative to mainframe-health.html

3. **Test with a simple HTTP server**
   ```bash
   python3 -m http.server 8000
   ```
   Then open http://localhost:8000/mainframe-health.html

4. **Disable ad blockers** temporarily to test if they're the cause

### Still need help?

The page works with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Make sure JavaScript is enabled in your browser.
