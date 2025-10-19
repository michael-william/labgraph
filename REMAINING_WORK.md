# Remaining Work for Redacted Map Styling

## Current State
- ✅ Backend working (redaction service, API endpoints, rate limiting)
- ✅ Frontend capture working (captures config when generating link)
- ✅ Anonymous links generate and load maps successfully
- ✅ Main app visualization config panel intact
- ⚠️ Button styling needs fix (missing `.share-create-btn {` selector)
- ❌ Redacted public page NOT applying captured config to visualization

## What Needs to Be Done

### 1. Fix Button Styling (Quick)
**File:** `public/custom.css` line ~2106

The button styles are there but missing the class selector. Add:
```css
.share-create-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
}
```

### 2. Apply Captured Config to Redacted Visualization (Main Task)
**Problem:** The config is captured and stored, but the redacted public page doesn't use it.

**Files to modify:** `server.js` lines ~1155-1220 (the `initPublicVisualization` function)

**What to do:**
1. The config is available in `currentMapData.config` (already passed from backend)
2. Use `config.nodeColors[nodeType]` instead of hardcoded colorScale
3. Apply `config.nodeBorderWidth`, `config.nodeBorderColor` to nodes
4. Apply `config.linkColor`, `config.linkWidth`, `config.linkOpacity` to links
5. Conditionally add glow filters based on `config.enableNodeGlow` and `config.enableLinkGlow`

**Key changes needed:**
- Replace hardcoded gradient creation with colors from `config.nodeColors`
- Update node `.attr('stroke', ...)` and `.attr('stroke-width', ...)` to use config
- Update link styling to use config values
- Add conditional logic for glow effects

### 3. Testing
After applying config:
1. Customize colors in main app
2. Generate anonymous link
3. Open link in incognito/private window
4. Verify colors match what you customized

## Branch
`feat/redacted-share-v2`

## Important Notes
- DO NOT modify files in `js/` directory directly - always work in `public/` directory
- The main app must stay fully functional
- Test visualization config panel after every change
