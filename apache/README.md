This folder contains the built frontend ready to be served by Apache.

What I added:
- `.htaccess` – SPA fallback so client-side routing works with Apache
- `deploy_to_var_www.sh` – convenient script to copy `frontend/dist` to `/var/www/sportscore` (requires sudo)

How to use:
1. Build the frontend: `cd frontend && npm run build` (already done by the helper script if you run it here)
2. Deploy: `sudo ./apache/deploy_to_var_www.sh`

Apache tip (alternative to `.htaccess`):
Add a site config with `DocumentRoot /var/www/sportscore` and enable `mod_rewrite`:

<IfModule mod_alias.c>
  DocumentRoot /var/www/sportscore
</IfModule>

Enable rewrite and reload apache if needed:
- `sudo a2enmod rewrite`
- Ensure the site config allows `.htaccess` or has `AllowOverride All` for the document root
- `sudo systemctl reload apache2`

Notes:
- The repo's `frontend/dist` was copied into this folder as site content for convenience.
- Make sure `www-data` user owns files when deploying.
