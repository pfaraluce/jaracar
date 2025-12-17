# PWA Icons - Important Information

## Current Status

The PWA icons (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) are currently **placeholders** copied from the existing favicon.

## For Production Deployment

Before deploying to production, you should replace these placeholder icons with properly designed and sized icons.

### Recommended Tools

1. **RealFaviconGenerator** (Recommended)
   - URL: https://realfavicongenerator.net/
   - Upload your logo/design
   - Automatically generates all required sizes
   - Provides optimized icons for all platforms

2. **PWA Builder Image Generator**
   - URL: https://www.pwabuilder.com/imageGenerator
   - Upload a 512x512 source image
   - Generates all PWA icon sizes

### Required Icon Sizes

- `icon-192.png` - 192x192 pixels (minimum required for PWA)
- `icon-512.png` - 512x512 pixels (minimum required for PWA)
- `apple-touch-icon.png` - 180x180 pixels (for iOS devices)

### Design Guidelines

- Use a **solid background color** (not transparent) for better compatibility
- Keep the design **simple and recognizable** at small sizes
- Ensure the icon looks good on both **light and dark backgrounds**
- Use your brand colors (e.g., the blue #1e40af from your theme)
- Center the main symbol/logo with appropriate padding

### How to Replace

1. Generate your icons using one of the tools above
2. Download the generated icons
3. Replace the files in the `public/` directory:
   - `public/icon-192.png`
   - `public/icon-512.png`
   - `public/apple-touch-icon.png`
4. Rebuild the app: `npm run build`
5. Deploy to Netlify

## Quick Icon Generation Script

If you have a source image (e.g., `source-icon.png` at 512x512), you can use the included script:

```bash
npm run generate-icons
```

This will copy the favicon as placeholders. For production, use the tools mentioned above.
