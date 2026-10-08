# X (Twitter) Thread: Fix WSL2 error: externally-managed-environment on Ubuntu 24.04

1/6
Getting "error: externally-managed-environment" when running pip install in WSL2?

Whatever you do, DO NOT delete `/usr/lib/python3.12/EXTERNALLY-MANAGED` or pass `--break-system-packages`.

Here is why that bricks `apt` and how to set it up cleanly on Windows 11 🧵👇

2/6
Why does this happen?
Ubuntu 24.04 and Debian 12 enforce PEP 668.
In the past, `pip install` wrote directly into system libraries, eventually breaking OS services like `netplan` and `cloud-init`.

PEP 668 stops you from accidentally breaking your system Python.

3/6
The 20-Second Clean Fix:
Create a user-scoped development virtualenv in your home directory:

```bash
sudo apt update && sudo apt install -y python3-venv
python3 -m venv ~/.venv
source ~/.venv/bin/activate
pip install requests
```

Zero sudo needed. Zero system corruption.

4/6
Want automatic activation?
Add the source hook to your `.bashrc`:

`echo 'source ~/.venv/bin/activate' >> ~/.bashrc`

Every WSL terminal opens directly in your working virtual environment.

5/6
For global CLI tools (Ruff, Poetry, Black):
Use `pipx` instead of pip:

```bash
sudo apt install -y pipx
pipx ensurepath
pipx install ruff
```
Each tool is isolated in its own venv while staying accessible anywhere in your shell.

6/6
Full guide with VS Code Remote interpreter configuration and SACRIFICIAL test bench logs:
https://praveentechworld.com/blog/wsl-error-externally-managed-environment-pip-fix/
