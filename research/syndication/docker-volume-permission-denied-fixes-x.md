# X (Twitter) Thread: Docker Volume Permission Denied Fixes

1/5 Docker volume mount throwing `EACCES: permission denied`?

Or did container root write files to your project that you can't edit on your host machine?

Don't run `chmod -R 777 .`. Here is what's really happening and how to fix it:

2/5 Why permissions break:
Linux checks numeric UIDs stored in inodes, not usernames. Official images run as `root` (UID 0), but your host developer account is `UID 1000`.

When root creates build caches or logs, your host user gets locked out.

3/5 The Compose Fix:
Pass host credentials directly in `docker-compose.yml`:

```yaml
services:
  web:
    image: node:20-alpine
    user: "${UID:-1000}:${GID:-1000}"
    volumes:
      - .:/app
      - /app/node_modules # Anonymous volume preserves internal cache
```

4/5 The Windows 11 / WSL2 Fix:
When mounting Windows paths (`/mnt/c/`), the 9P filesystem ignores Linux permissions. Add `options = "metadata"` under `[automount]` in `/etc/wsl.conf` and run `wsl --shutdown`.

5/5 Full decision matrix across Linux, WSL2, rootless Podman, and CI/CD:

https://praveentechworld.com/blog/docker-volume-permission-denied-fixes
