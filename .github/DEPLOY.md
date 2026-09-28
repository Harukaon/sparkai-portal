# Push-to-deploy setup

`deploy-portal.yml` builds and verifies the portal on every push to `main`. Once the repository secret `DEPLOY_SSH_KEY` is configured, it uploads a new release to the web root and atomically switches `current`.

The server uses a dedicated unprivileged account, `sparkai-deploy`, which can write only to the portal's release directory. Do not use the server's root SSH key.

One-time setup:

1. Generate a dedicated Ed25519 key pair on a trusted computer (do not send the private key in chat):
   `ssh-keygen -t ed25519 -N '' -C sparkai-portal-deploy -f ~/.ssh/sparkai-portal-deploy`
2. Add the **public** key (`~/.ssh/sparkai-portal-deploy.pub`) to `/var/lib/sparkai-deploy/.ssh/authorized_keys` on the server, prefixed with `restrict `. The deploy account listens on SSH port `30680` and has no sudo access.
3. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret** and add `DEPLOY_SSH_KEY` with the contents of the private key file. Never commit either key.
4. Push a commit to `main` or run the workflow manually. The workflow verifies the build, uploads a release, validates referenced assets, and switches the site atomically.

Without the secret, CI still verifies/builds but warns that deployment was skipped.
