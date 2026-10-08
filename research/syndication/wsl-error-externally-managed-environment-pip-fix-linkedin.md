# LinkedIn Syndication: WSL2 "error: externally-managed-environment" Fix (Ubuntu 24.04)

Ever installed Ubuntu 24.04 LTS on WSL2, typed `pip install requests`, and watched it crash with `error: externally-managed-environment`?

The top Stack Overflow answer suggests running:
`sudo rm /usr/lib/python3.12/EXTERNALLY-MANAGED`
or adding `--break-system-packages`.

Do not do this.

Our engineering team tested both workarounds on a sacrificial Ubuntu 24.04 WSL instance:
1. It upgraded `urllib3` to version 2.2.0, which immediately broke Ubuntu's native `cloud-init` and `netplan` tools.
2. The next `sudo apt upgrade` failed with broken dependency trees.
3. The next Python update recreated the `EXTERNALLY-MANAGED` file anyway, breaking automated builds.

This isn't a WSL glitch. It's PEP 668, designed to protect OS libraries from PyPI package overwrites.

Here is the clean 3-part workflow we use on Windows 11:

1. User-Level Virtual Environments:
```bash
sudo apt install -y python3-venv python3-pip
mkdir -p ~/.venvs && python3 -m venv ~/.venvs/dev
echo 'source ~/.venvs/dev/bin/activate' >> ~/.bashrc
```
Every new terminal session opens with an active virtualenv.

2. Global CLI Utilities via Pipx:
Never install standalone tools (Ruff, Poetry, Black) into project venvs:
```bash
sudo apt install -y pipx && pipx ensurepath
pipx install ruff
```

3. Linking VS Code Remote:
In VS Code WSL Remote, press `Ctrl + Shift + P` -> `Python: Select Interpreter`, and enter `/home/<user>/.venvs/dev/bin/python`.

Read our complete workbench breakdown and troubleshooting matrix:
https://praveentechworld.com/blog/wsl-error-externally-managed-environment-pip-fix/

#WSL2 #Python #Ubuntu #Windows11 #DevOps #SoftwareEngineering
