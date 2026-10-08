# X (Twitter) Thread: Windows 11 Dev Drive Benchmarks (NTFS vs ReFS 24H2)

1/6
Microsoft claims Dev Drive is up to 25% faster for developers on Windows 11.

We benchmarked identical 100GB NTFS and ReFS partitions on a Samsung 990 Pro PCIe 4.0 SSD on 24H2.

Here are the real numbers 🧵👇

2/6
The Benchmark Results:
- `npm install` (1,450 packages): 48.2s -> 34.6s (28% faster)
- `git status` (55,000 files): 4.4s -> 2.6s (41% faster)
- `rm -rf node_modules`: 14.1s -> 3.8s (73% faster)
- Rust `cargo build`: 1m 52s -> 1m 31s (19% faster)

3/6
Why is it actually faster?
It's NOT just ReFS block cloning.
The real secret is Microsoft Defender **Performance Mode**.

Instead of synchronously intercepting every `.ts` and `.json` file write, Defender inspects files asynchronously in the background.

4/6
The #1 Gotcha:
If Windows Security does NOT mark your Dev Drive as "Trusted," Defender treats it like standard NTFS.

Check your status with:
`fsutil devdrv query D:`

If `Trusted: No`, toggle Performance Mode in Windows Security settings.

5/6
When is Dev Drive NOT worth it?
- Requires 50GB minimum partition floor
- 0% speedup for media editing or games (strictly benefits high-count metadata I/O)
- Third-party backup tools sometimes treat ReFS as raw partition data

6/6
Full side-by-side benchmark matrix and setup guide:
https://praveentechworld.com/blog/windows-11-dev-drive-benchmarks-refs-performance/
