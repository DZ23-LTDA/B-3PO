"""O instalador do produto instala o B-3PO, nunca o upstream em silêncio.

Estes testes executam a **resolução real** dos instaladores (``-PrintSource`` / ``--print-source``),
sem rede e sem tocar em nada: é o contrato que a instalação limpa usa. Se alguém voltar o padrão para
``NousResearch/hermes-agent``, o teste falha aqui — e não na máquina do usuário.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
PS1 = ROOT / "scripts" / "install.ps1"
SH = ROOT / "scripts" / "install.sh"

PRODUCT_REPO = "https://github.com/DZ23-LTDA/B-3PO.git"
PRODUCT_BRANCH = "b3po-brand"
UPSTREAM_REPO = "https://github.com/NousResearch/hermes-agent.git"


def _bash() -> str | None:
    r"""Bash de verdade, não o lançador do WSL.

    ``shutil.which("bash")`` no Windows devolve ``C:\WINDOWS\system32\bash.exe``, que só delega
    ao WSL e falha quando não há distro instalada. Git for Windows traz um bash real.
    """
    for candidate in (
        r"C:\Program Files\Git\bin\bash.exe",
        r"C:\Program Files\Git\usr\bin\bash.exe",
        r"C:\Program Files (x86)\Git\bin\bash.exe",
    ):
        if Path(candidate).exists():
            return candidate

    found = shutil.which("bash")
    if found and "system32" not in found.lower():
        return found
    return None


def _sh_path(path: Path) -> str:
    """Git bash wants /c/…-style paths for a Windows file."""
    drive = path.drive.rstrip(":").lower()
    rest = path.as_posix().split(":", 1)[1]
    return f"/{drive}{rest}"


def _clean_env(extra: dict[str, str] | None) -> dict[str, str]:
    """Herda o ambiente real (PATH, TEMP…) e limpa só o que o instalador lê."""
    env = os.environ.copy()
    for key in ("HERMES_INSTALL_UPSTREAM", "HERMES_REPO_URL", "HERMES_INSTALL_BRANCH"):
        env.pop(key, None)
    env.update(extra or {})
    return env


def _powershell_source(*extra: str, env: dict[str, str] | None = None) -> dict:
    pwsh = shutil.which("pwsh") or shutil.which("powershell")
    assert pwsh, "PowerShell is required to validate the installer contract"
    proc = subprocess.run(
        [pwsh, "-NoProfile", "-File", str(PS1), "-PrintSource", *extra],
        capture_output=True,
        check=False,
        text=True,
        timeout=180,
        env=_clean_env(env),
    )
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout.strip().splitlines()[-1])


def _shell_source(*extra: str, env: dict[str, str] | None = None) -> dict:
    bash = _bash()
    if not bash:
        pytest.skip("no bash available to exercise install.sh")
    proc = subprocess.run(
        [bash, _sh_path(SH), "--print-source", *extra],
        capture_output=True,
        check=False,
        text=True,
        timeout=180,
        env=_clean_env(env),
    )
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout.strip().splitlines()[-1])


def test_powershell_installer_defaults_to_the_product():
    source = _powershell_source()

    assert source["product"] == "B-3PO"
    assert source["repo_url"] == PRODUCT_REPO
    assert source["branch"] == PRODUCT_BRANCH
    assert source["upstream_mode"] is False


def test_powershell_upstream_needs_an_explicit_flag():
    source = _powershell_source("-Upstream")

    assert source["repo_url"] == UPSTREAM_REPO
    assert source["branch"] == "main"
    assert source["upstream_mode"] is True


def test_powershell_honors_explicit_overrides():
    source = _powershell_source(
        env={"HERMES_REPO_URL": "https://example.invalid/fork.git", "HERMES_INSTALL_BRANCH": "release-x"}
    )

    assert source["repo_url"] == "https://example.invalid/fork.git"
    assert source["branch"] == "release-x"


def test_shell_installer_defaults_to_the_product():
    source = _shell_source()

    assert source["product"] == "B-3PO"
    assert source["repo_url"] == PRODUCT_REPO
    assert source["branch"] == PRODUCT_BRANCH
    assert source["upstream_mode"] is False


def test_shell_upstream_needs_an_explicit_flag():
    source = _shell_source("--upstream")

    assert source["repo_url"] == UPSTREAM_REPO
    assert source["branch"] == "main"
    assert source["upstream_mode"] is True
