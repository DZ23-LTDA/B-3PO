"""``auth.adopt_external_logins`` é opt-in: emprestar o login do Claude Code exige ``true``.

O refresh token do Claude Code é de uso único: quando o Hermes empresta e renova, os dois programas
passam a dividir a mesma família de tokens e quem renovar primeiro derruba o login do outro. Por isso
o padrão é **false** — sem a chave, com ``false`` explícito ou com um valor inválido, o Hermes não lê
nem renova ``~/.claude/.credentials.json``; só um ``true`` literal liga o empréstimo.
"""
from __future__ import annotations

import io
import json
import time
from contextlib import redirect_stdout
from types import SimpleNamespace
from unittest import mock

import urllib.request

from agent import anthropic_credentials as ac
from agent import credential_sources
from agent.credential_pool import load_pool
from hermes_cli.auth_commands import auth_list_command


def _write_config(hermes_home, adopt):
    """``adopt``: True/False escrevem o literal, string é escrita crua, None omite a chave."""
    body = "model:\n  provider: anthropic\n  model: claude-sonnet-4-5\n"
    if adopt is not None:
        value = ("true" if adopt else "false") if isinstance(adopt, bool) else str(adopt)
        body += f"auth:\n  adopt_external_logins: {value}\n# arm {adopt}\n"
    (hermes_home / "config.yaml").write_text(body)


def test_borrowing_needs_an_explicit_true(tmp_path, monkeypatch):
    hermes_home, claude_dir = tmp_path / "hermes", tmp_path / "claude"
    hermes_home.mkdir()
    claude_dir.mkdir()
    (hermes_home / ".env").write_text("")
    monkeypatch.setenv("HERMES_HOME", str(hermes_home))
    monkeypatch.setenv("CLAUDE_CONFIG_DIR", str(claude_dir))
    monkeypatch.setattr(credential_sources, "_notice_logged", False, raising=False)
    cred_file = claude_dir / ".credentials.json"
    cred_file.write_text(json.dumps({"claudeAiOauth": {
        "accessToken": "sk-ant-oat01-expired", "refreshToken": "sk-ant-ort01-cc",
        "expiresAt": int(time.time() * 1000) - 3_600_000, "scopes": ["user:inference"]}}))
    original_bytes = cred_file.read_bytes()

    posts: list = []

    def fake_urlopen(req, timeout=None):
        if "oauth/token" in req.full_url:  # the Anthropic token endpoint; other seeders probe other hosts
            posts.append(req.full_url)
        body = json.dumps({"access_token": "sk-ant-oat01-fresh", "refresh_token": "sk-ant-ort01-fresh",
                           "expires_in": 3600}).encode()
        resp = mock.MagicMock()
        resp.read.return_value = body
        resp.__enter__.return_value = resp
        return resp

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)

    # Padrão (sem a chave): NÃO empresta — nada de leitura, nada de refresh, arquivo intacto.
    _write_config(hermes_home, adopt=None)
    assert credential_sources.adopt_external_logins_enabled() is False
    assert ac.resolve_anthropic_token() is None
    assert posts == []
    assert cred_file.read_bytes() == original_bytes
    assert [e.source for e in load_pool("anthropic").entries()] == []
    out = io.StringIO()
    with redirect_stdout(out):
        auth_list_command(SimpleNamespace(provider=None))
    assert credential_sources.EXTERNAL_LOGINS_NOT_ADOPTED_NOTICE in out.getvalue()

    # ``false`` explícito: mesmo comportamento.
    _write_config(hermes_home, adopt=False)
    assert ac.resolve_anthropic_token() is None
    assert posts == []
    assert cred_file.read_bytes() == original_bytes

    # Valor inválido (string que o YAML mantém como texto): não é consentimento — continua desligado.
    _write_config(hermes_home, adopt="maybe")
    assert credential_sources.adopt_external_logins_enabled() is False
    assert ac.resolve_anthropic_token() is None
    assert posts == []
    assert cred_file.read_bytes() == original_bytes

    # ``true`` explícito: opt-in empresta e renova.
    _write_config(hermes_home, adopt=True)
    assert credential_sources.adopt_external_logins_enabled() is True
    assert ac.resolve_anthropic_token() == "sk-ant-oat01-fresh"
    assert len(posts) == 1
    out = io.StringIO()
    with redirect_stdout(out):
        auth_list_command(SimpleNamespace(provider=None))
    assert credential_sources.EXTERNAL_LOGINS_NOT_ADOPTED_NOTICE not in out.getvalue()
