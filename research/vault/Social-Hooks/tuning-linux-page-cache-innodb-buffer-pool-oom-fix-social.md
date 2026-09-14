# Social Syndication Copy: Tuning Linux Page Cache & InnoDB: Stop Database OOM Kills

## 🔗 Target Canonical URL
`https://www.praveentechworld.com/blog/tuning-linux-page-cache-innodb-buffer-pool-oom-fix`

---

## 💼 LinkedIn Post (Database Architecture / DevOps / Linux Kernel Focus)

Why do 128GB and 256GB production database servers silently freeze or crash under heavy traffic?

The standard rule of thumb says: allocate 75% of host RAM to MySQL's `innodb_buffer_pool_size` (or PostgreSQL's `shared_buffers`).

Yet on our infrastructure workbench, we frequently diagnosed servers where the Linux Out-Of-Memory killer (`oom-killer`) terminated `mysqld` or `postgres` without warning—even when query loads were completely normal.

The culprit isn't the database engine. It’s an unmanaged memory war between the Linux kernel's file page cache and the database's user-space buffer pool.

Because Linux treats "free memory" as wasted memory, it eagerly fills all unused RAM with dirty file cache pages from table scans and binlog rotations. When a sudden connection burst demands transient query buffers, the kernel can't reclaim page cache fast enough.

The kernel calculates process "badness" scores, sees `mysqld` consuming 90GB of anonymous RSS memory, and fires `SIGKILL`.

Here are the 5 critical sysctl settings our team applies to eliminate database OOM kills:

1. **Set `vm.swappiness = 1`:**
Linux defaults to 60, which swaps out active transactional memory to keep file caches warm. Dropping swappiness to 1 prevents latency jitter while preserving emergency swap headroom.

2. **Switch from Ratios to Bytes (`vm.dirty_background_bytes = 268435456`):**
Default percentage ratios (`dirty_ratio = 20`) permit up to 25.6 GB of dirty pages on a 128GB host. When flusher threads finally wake, the I/O bus chokes. Capping dirty bytes to 256MB/1GB forces smooth, continuous writeback.

3. **Prioritize Inode Eviction (`vm.vfs_cache_pressure = 150`):**
Forces the kernel to aggressively reclaim cached directory entries and inodes rather than transactional query pages.

4. **Bypass OS Dual-Caching (`O_DIRECT`):**
Configure `innodb_flush_method = O_DIRECT` in MySQL or `wal_sync_method = fdatasync` in PostgreSQL so table blocks aren't stored twice in RAM.

5. **Protect the Daemon from OOM Execution:**
Add `OOMScoreAdjust = -900` to your systemd database unit override to guarantee the kernel terminates background cron jobs before touching your primary database process.

Read our complete kernel virtual memory architecture map, slab diagnostic runbook, and production tuning matrix:
👉 https://www.praveentechworld.com/blog/tuning-linux-page-cache-innodb-buffer-pool-oom-fix

#DevOps #Linux #Database #MySQL #PostgreSQL #SysAdmin #DatabaseAdministration #LinuxKernel #Infrastructure #SRE

---

## 🐦 X / Twitter Thread (Actionable Kernel Memory Runbook)

1/8 Why do 128GB database servers silently crash with OOM kills?

You gave 75% of RAM to `innodb_buffer_pool_size`, yet the Linux kernel terminates `mysqld` with SIGKILL.

Here is the root cause and the 5 sysctl tweaks that fix it 🧵👇

2/8 The Root Cause: Kernel Page Cache Greed
Linux treats free memory as wasted memory.
Table scans and binlog writes fill every spare GB with filesystem page cache.
When sudden query bursts need connection buffers, the kernel can't reclaim cache in time and panic-kills the biggest RSS process: your DB!

3/8 Fix 1: Stop Swapping Transactional Memory
Default `vm.swappiness = 60` swaps active InnoDB buffers to disk just to preserve filesystem cache!
Run:
`sysctl -w vm.swappiness=1`
(Never use 0—keep emergency swap available to prevent instant crashes).

4/8 Fix 2: Switch From Percentages to Explicit Bytes
Default `dirty_ratio=20` lets 25GB of unwritten disk pages pile up in RAM on a 128GB server.
When flusher threads kick in, disk I/O freezes.
Run:
`sysctl -w vm.dirty_background_bytes=268435456` (256MB)
`sysctl -w vm.dirty_bytes=1073741824` (1GB)

5/8 Fix 3: Reclaim Inode and Dentry Metadata
Set:
`sysctl -w vm.vfs_cache_pressure=150`
This tells the kernel to reclaim cached directory entries and inodes instead of paging out database process memory.

6/8 Fix 4: Eliminate Dual Caching with Direct I/O
Why cache data in the OS page cache AND the database buffer pool?
In `/etc/mysql/my.cnf`:
`innodb_flush_method = O_DIRECT`
`innodb_flush_neighbors = 0`
Bypasses OS page cache entirely for database writes.

7/8 Fix 5: Shield DB Service from OOM Killer
In `/etc/systemd/system/mysql.service.d/override.conf`:
[Service]
OOMScoreAdjust=-900
LimitMEMLOCK=infinity
Reload with `systemctl daemon-reload`. Your DB won't be picked as the first victim!

8/8 Full diagnostic commands (`/proc/meminfo`, `slabtop`), sysctl matrix, and runbook:
🔗 https://www.praveentechworld.com/blog/tuning-linux-page-cache-innodb-buffer-pool-oom-fix
