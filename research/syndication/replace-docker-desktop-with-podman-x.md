# X (Twitter) Thread: Replace Docker Desktop with Podman on Windows 11

1/5 Ditching Docker Desktop for open-source Podman on Windows 11 saves serious money and cuts idle RAM usage by 77%.

Here is our team's tested runbook to avoid the 3 big gotchas that break Dev Containers and Compose:

2/5 Gotcha 1: The Named Pipe Socket
VS Code and Testcontainers expect the Docker socket. Configure the Windows named pipe:

[System.Environment]::SetEnvironmentVariable("DOCKER_HOST", "npipe:////./pipe/docker_engine", "User")

Inside VS Code settings, set "dev.containers.dockerPath": "podman".

3/5 Gotcha 2: Localhost DNS
In Podman, `host.docker.internal` doesn't work out of the box. Use `host.containers.internal`, or add this to your docker-compose.yml:

extra_hosts:
  - "host.docker.internal:host-gateway"

4/5 Gotcha 3: Testcontainers Ryuk Failures
Rootless Podman blocks the privileged Ryuk cleanup container. Fix it with one environment flag:

TESTCONTAINERS_RYUK_DISABLED=true

5/5 Workbench benchmarks on our 32GB Windows 11 rigs:
- Idle RAM: 1.84 GB -> 0.42 GB
- Cold boot: 14.8s -> 4.2s
- License fees: $0

Full step-by-step migration guide:
https://praveentechworld.com/blog/how-we-replaced-docker-desktop-with-podman-windows-11-wsl2
