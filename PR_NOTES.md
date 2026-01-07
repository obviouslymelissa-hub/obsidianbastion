# PR Notes: Unified Site Header and Theme

## Overview

This PR implements a unified site header and theme across all pages of the Obsidian Bastian site, improving consistency, accessibility, and user experience.

## Changes Made

### 1. Centralized Theme Variables (`app.css`)

**Added comprehensive CSS custom properties** extracted from `index.html` to create a canonical theme:

- **Core colors**: `--bg-dark`, `--bg-panel`, `--accent`, `--accent-2`, `--text-main`, `--text-muted`, `--border`
- **Layout variables**: `--tile-radius`, `--font-family`, `--header-height`, `--sidebar-width`, `--content-max`
- **Legacy aliases**: Maintained for backward compatibility with existing page-specific styles

### 2. Shared Header Component

**Created a consistent, reusable header** that appears on all pages except `index.html`:

- **Left section**: Emblem/logo + site title ("Obsidian Bastian") + page-specific subtitle
- **Right section**: "Return to Command Hub" button linking back to index.html
- **Styling**: Matches index.html aesthetic with gradient backgrounds, glow effects, and smooth animations
- **Responsive**: Adapts gracefully to mobile and tablet viewports

### 3. Accessible Dropdown Improvements

**Enhanced dropdown/select elements** for better legibility and accessibility:

- Dark background (`--bg-panel`) with light text (`--text-main`)
- Increased padding (10px 12px) and font size (14px)
- Clear hover and focus states with accent color highlights
- High contrast ratios meeting WCAG AA standards
- Applied specifically to navigation console travel speed dropdown

### 4. Updated Pages

**All pages now include the shared header** (except index.html):

- ✅ `navigationconsole.html` - Navigation Console
- ✅ `communications.html` - Ship Communications
- ✅ `crew.html` - Crew Roster
- ✅ `defense.html` - Defense Console
- ✅ `diagnostics.html` - Diagnostics
- ✅ `mainframe-health.html` - System Health
- ✅ `mainframeweather.html` - Planetary Atmospherics
- ✅ `onboardcomputer.html` - Mission Control UI
- ✅ `partsinventory.html` - Parts Inventory & Orders
- ✅ `powermanagement.html` - Power Management
- ✅ `achievements.html` - Achievements (new scaffold)

**Note**: `index.html` retains its unique header design without the "Return to Command Hub" link, as it IS the command hub.

### 5. New Pages

#### Carter's Star Page (`carters-star.html`)

A dedicated page for Captain Carter's star dedication featuring:

- **Star Profile Section**: Large star image placeholder with title and subtitle
- **Coordinates Card**: Right ascension, declination, constellation, distance, spectral type, magnitude
- **Dedication Section**: Personalized dedication text with metadata (dedicator, date, registry ID)
- **Certificate Area**: Placeholder for official certificate with download/print actions
- **Additional Notes**: Background information about the star
- **Consistent Theme**: Uses unified header and matches index.html design language

#### Achievements Page (`achievements.html`)

A scaffold page for tracking mission accomplishments:

- **Achievement Cards**: Grid layout with icon, title, and description
- **Locked State**: Visual distinction for achievements not yet unlocked
- **Responsive Grid**: Adapts to various screen sizes
- **Placeholder Content**: Sample achievements ready for future implementation

## Technical Details

### Header HTML Structure

```html
<header class="site-header">
  <div class="header-inner">
    <div class="header-left">
      <div class="site-emblem">
        <img src="..." alt="Strategic Operations Board">
      </div>
      <div class="header-text">
        <h1>Obsidian Bastian</h1>
        <h2>[Page Name]</h2>
      </div>
    </div>
    <div class="header-right">
      <a href="index.html" class="return-command-hub">← Return to Command Hub</a>
    </div>
  </div>
</header>
```

### CSS Variables Usage

Pages can now reference centralized theme variables:

```css
background: var(--bg-dark);
color: var(--text-main);
border: 1px solid var(--border);
```

### Responsive Considerations

- Header collapses gracefully on mobile (< 768px)
- Emblem scales down appropriately
- "Return to Command Hub" button remains accessible
- Font sizes adjust for readability

## Benefits

1. **Consistency**: All pages now share the same visual identity
2. **Maintainability**: Theme changes can be made once in `app.css`
3. **Accessibility**: Improved contrast and keyboard navigation
4. **User Experience**: Easy navigation back to command hub from any page
5. **Scalability**: New pages can easily adopt the shared header

## Testing Performed

- ✅ Verified header appears consistently across all pages
- ✅ Tested "Return to Command Hub" links work correctly
- ✅ Confirmed dropdown legibility on navigationconsole.html
- ✅ Checked responsive behavior on mobile, tablet, and desktop
- ✅ Validated no JavaScript console errors
- ✅ Ensured index.html header remains unchanged

## Future Enhancements

- Consider JavaScript helper function to inject header dynamically (optional)
- Add more achievements to achievements.html
- Populate Carter's Star page with actual star data and images
- Implement certificate generation functionality

## Files Changed

### Modified Files (11):
- `app.css` - Added theme variables and shared header styles
- `navigationconsole.html` - Updated header and dropdown styles
- `communications.html` - Updated header
- `crew.html` - Updated header
- `defense.html` - Updated header
- `diagnostics.html` - Updated header
- `mainframe-health.html` - Updated header
- `mainframeweather.html` - Updated header
- `onboardcomputer.html` - Updated header
- `partsinventory.html` - Updated header
- `powermanagement.html` - Updated header

### New Files (3):
- `carters-star.html` - Carter's star dedication page
- `achievements.html` - Achievements tracking page
- `PR_NOTES.md` - This documentation file

### Unchanged:
- `index.html` - Intentionally left unchanged (command hub home page)
- All JavaScript files - No changes required
- All image assets - No changes required

## Notes for Content Editors

### Updating Carter's Star Page

To customize the Carter's Star page:

1. **Star Image**: Replace the placeholder `<div class="star-image-placeholder">⭐</div>` with:
   ```html
   <img src="images/carters-star.jpg" alt="Carter's Star" />
   ```

2. **Coordinates**: Update the values in the info-grid section

3. **Dedication Text**: Edit the text in the `.dedication-text` div

4. **Metadata**: Update dedicator name, date, and registry ID

5. **Notes**: Customize the "About This Star" section

### Adding New Pages

To add a new page with the unified header:

1. Start with this template:
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="utf-8" />
     <meta name="viewport" content="width=device-width,initial-scale=1" />
     <title>[Page Title] — Obsidian Bastian</title>
     <link rel="stylesheet" href="app.css">
     <!-- Page-specific styles here -->
   </head>
   <body>
     <!-- Copy shared header from any existing page -->
     <header class="site-header">
       <!-- ... header content ... -->
     </header>
     
     <!-- Your page content here -->
   </body>
   </html>
   ```

2. Update the `<h2>` in the header with your page name

3. Add page-specific content below the header

## Deployment Notes

This PR contains only frontend changes (HTML/CSS). No server-side changes or build process updates required. Safe to deploy to GitHub Pages immediately.

---

**Author**: GitHub Copilot  
**Branch**: `copilot/unify-site-header-theme`  
**Target**: `main`
