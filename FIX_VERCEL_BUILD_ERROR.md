# Fix Vercel Build Error - CSS Loader Issue

## Problem
Vercel build was failing with webpack CSS loader error:
```
Error: Command "npm run build" exited with 1
Generated code for css-loader/postcss-loader failed on app/globals.css
```

## Root Causes
1. **Duplicate autoprefixer** in both `dependencies` and `devDependencies`
2. **@layer directives** in globals.css causing PostCSS processing issues
3. **@apply directives** incompatible with production build pipeline

## Fixes Applied

### 1. package.json
- ✅ Removed duplicate `autoprefixer` from dependencies
- ✅ Updated `postcss` from `^8.5` to `^8.4.47` (more specific version)
- ✅ Updated `tailwindcss` from `^3.4.1` to `^3.4.15` (latest stable)

### 2. app/globals.css
- ✅ Removed `@layer base` wrappers
- ✅ Replaced `@apply border-border` with direct CSS: `border-color: hsl(var(--border))`
- ✅ Replaced `@apply bg-background text-foreground` with direct CSS
- ✅ Kept all CSS variables and custom styles intact

### 3. postcss.config.mjs
- ✅ Added semicolon after config object (minor syntax fix)

## Result
- Build should now complete successfully on Vercel
- All Tailwind utilities still work
- CSS variables preserved
- Custom styles (scrollbar, mark, flip cards) intact

## Next Steps
1. Push changes to Git
2. Vercel will auto-deploy
3. Test the /dashboard-new/documents page
4. Verify flashcards and knowledge graph display correctly

## Files Modified
- `package.json` - Fixed dependencies
- `app/globals.css` - Simplified CSS syntax
- `postcss.config.mjs` - Minor syntax fix
