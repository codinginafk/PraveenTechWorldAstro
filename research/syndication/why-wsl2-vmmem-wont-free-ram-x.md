# X (Twitter) Thread: Why WSL2 vmmem Won't Free RAM

1/5 Why is `vmmemWSL` still eating 24GB of your RAM an hour after your Docker build finishes?

Because Linux treats free RAM as file cache, and Hyper-V sees cached pages as actively committed physical memory.

Here are the 3 traps developers fall into (and the exact fix):

2/5 Trap 1: Setting `swap=0` in .wslconfig.
Developers do this to prevent SSD writes. But the moment a build spikes past your RAM limit, the Linux kernel terminates your process with exit code 137 (OOMKilled). Always keep a 4GB swap buffer.

3/5 Trap 2: Setting `autoMemoryReclaim=dropcache`.
While this shrinks vmmem immediately, it wipes hot cache files. In our workbench benchmarks, Rust compile times jumped from 1m 12s to 3m 18s. Use `autoMemoryReclaim=gradual` instead.

4/5 The drop-in `.wslconfig` fix for 32GB RAM machines:

```ini
[wsl2]
memory=16GB
swap=4GB
autoMemoryReclaim=gradual
pageReporting=true
sparseVhd=true

[experimental]
networkingMode=mirrored
dnsTunneling=true
```

Run `wsl --shutdown` in PowerShell to apply.

5/5 Full runbook across 16GB, 32GB, and 64GB test rigs + interactive config generator:

https://praveentechworld.com/blog/why-wsl2-vmmem-wont-free-ram-auto-memory-reclaim-fix
