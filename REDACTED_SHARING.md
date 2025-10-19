# Redacted Sharing Configuration

## Overview
This feature allows users to create anonymous, publicly accessible versions of their system maps. All sensitive information (node names, descriptions, custom attributes) is removed and replaced with generic type-based labels.

## Nginx/Proxy Manager Configuration

To enable public access to redacted maps, configure your reverse proxy to allow unauthenticated access to these paths:

### Nginx Configuration
```nginx
# Allow public access to redacted API and pages
location ~* ^/api/redacted/ {
    proxy_pass http://system-mapper:3000;
    # Remove authentication requirements for this path
}

location ~* ^/redacted/ {
    proxy_pass http://system-mapper:3000;
    # Remove authentication requirements for this path  
}

# Keep all other paths protected by Authentik
location / {
    auth_request /outpost.goauthentik.io/auth/nginx;
    # ... existing auth configuration
    proxy_pass http://system-mapper:3000;
}
```

### Environment Variables
Add these to your `.env` file:

```bash
# Required: Base URL for generating public links
PUBLIC_BASE_URL=https://your-domain.com

# Optional: TTL for redacted maps (default: 7 days)
REDACTED_TTL_SECONDS=604800

# Optional: Rate limiting (default: 5 requests per minute)
REDACTED_LIMIT_WINDOW_MS=60000
REDACTED_LIMIT_MAX=5

# Optional: Enable reverse indexing for cleanup
ENABLE_REDACTED_INDEX=false
```

## Security Features
- All sensitive data stripped from public maps
- Node names replaced with type-based labels (e.g., "Database_1", "Storage_2")
- Rate limiting prevents abuse
- TTL auto-expires shared maps
- Security headers on public endpoints
- No reverse mapping from redacted to original IDs

## Usage
1. Open any system map
2. Click "Share Map" button
3. Click "Generate Anonymous Link" in the new section
4. Share the generated public URL - no authentication required
