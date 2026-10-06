# LinkedIn Syndication: Docker Volume Permission Denied? 5 Tested UID & WSL2 Fixes

Ever mounted a local project directory into a Docker container for hot reloading, only to watch it crash with `EACCES: permission denied`?

Or worse: your container created files as `root` (UID 0), locking you out of editing your own code in VS Code on your host workstation?

The common forum advice is running `chmod -R 777 .`. On our engineering workbench, that broke git status across our repo (making every file executable 100755) and caused PostgreSQL containers to crash on startup.

Here is what actually causes the issue and our team's tested fixes:

1. The Inode UID Trap:
Linux permissions evaluate numeric user IDs (UIDs), not string usernames. Official containers default to root (`UID 0`), while your host user is `UID 1000`.

2. The Docker Compose Solution:
In `docker-compose.yml`, align container execution with host ownership:
```yaml
services:
  web:
    image: node:20-alpine
    user: "${UID:-1000}:${GID:-1000}"
    volumes:
      - .:/app
      - /app/node_modules # Anonymous volume preserves build cache!
```
Export `export UID=$(id -u) GID=$(id -g)` before launching.

3. The Windows 11 / WSL2 Metadata Trap:
If you mount Windows drives (`/mnt/c/`), the 9P virtual filesystem ignores POSIX bits. Enable metadata in `/etc/wsl.conf`:
```ini
[automount]
options = "metadata,umask=022,fmask=011"
```
Then run `wsl --shutdown` in PowerShell.

We published our complete triage decision matrix, rootless Podman `--userns=keep-id` guide, and CI/CD entrypoint patterns:

Read the full guide: https://praveentechworld.com/blog/docker-volume-permission-denied-fixes

#Docker #WSL2 #Windows11 #DevOps #Linux #Sysadmin #Containers
