# LinkedIn Syndication: Replace Docker Desktop with Podman on Windows 11

When our engineering organization crossed the commercial threshold, Docker Desktop was going to cost us $60 to $288 per developer per year.

For a 12-engineer team, that meant spending over $1,200 annually just to run local containers in WSL2. 

Beyond the licensing invoice, Docker Desktop’s monolithic background daemon was eating almost 2GB of RAM at idle and freezing during laptop sleep cycles.

We migrated our entire local dev infrastructure to Podman on WSL2. 

The biggest blockers people hit on Reddit and how we solved them:

1. Named Pipe Socket for VS Code & Testcontainers:
Podman on Windows creates a Windows named pipe. Set your environment variable:
`[System.Environment]::SetEnvironmentVariable("DOCKER_HOST", "npipe:////./pipe/docker_engine", "User")`
In VS Code, point `"dev.containers.dockerPath": "podman"`.

2. The `host.docker.internal` DNS Trap:
Podman uses `host.containers.internal` by default. For legacy compose files, add:
`extra_hosts: ["host.docker.internal:host-gateway"]`.

3. Testcontainers Ryuk Crash:
Rootless containers block Ryuk cleanup containers from privileged socket commands. Set:
`TESTCONTAINERS_RYUK_DISABLED=true`.

Workbench results on our 32GB Windows 11 rigs:
- Idle RAM dropped from 1.84 GB to 0.42 GB (77% memory reduction).
- Cold startup time went from 14.8 seconds to 4.2 seconds (3.5x faster).
- Commercial license fees: $0.

Read our full dual-verified migration runbook: https://praveentechworld.com/blog/how-we-replaced-docker-desktop-with-podman-windows-11-wsl2

#Docker #Podman #Windows11 #DevOps #Containers #WSL2 #SoftwareEngineering
