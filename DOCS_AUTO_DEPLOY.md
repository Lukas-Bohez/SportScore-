Auto-deploy and local access notes

1) Quick automatic deploy helper

- `scripts/auto_deploy.sh` builds the frontend, deploys to `/var/www/sportscore` and reloads Apache.
- Use it manually: `./scripts/auto_deploy.sh` (you will be prompted for sudo for deploy/reload steps).

2) Git hook auto-deploy

- A sample hook is included at `.githooks/post-merge` that runs the helper script on `post-merge`.
- To enable it:
  - `git config core.hooksPath .githooks`
  - `chmod +x .githooks/post-merge`
- The hook only auto-deploys on the `Main` or `development` branches by default. Adjust branch logic in the hook if needed.

3) Local access / domain name

- The Apache virtual host for this project uses `ServerName sportscore.local` and `DocumentRoot /var/www/sportscore`.
- Add `127.0.0.1 sportscore.local` to your `/etc/hosts` to access the site at `http://sportscore.local/`.

4) If site still shows the old version

- Confirm you are visiting the correct host (if you visit `http://localhost` you may get Apache's default DocumentRoot instead).
- Re-run `./scripts/auto_deploy.sh` and reload Apache: `sudo systemctl reload apache2`.
