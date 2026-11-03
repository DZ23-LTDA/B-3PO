"""`auth.adopt_external_logins` é opt-in: só um `true` literal liga o empréstimo de login externo.

Emprestar a credencial de outro programa (Codex CLI, Claude Code) tem dois custos: lê um arquivo
que não é nosso, e os refresh tokens são de uso único — quem renova primeiro derruba o login do
outro. Por isso o padrão é **false** e qualquer valor ambíguo também mantém desligado.
"""
from __future__ import annotations

import pytest

from agent import credential_sources


@pytest.fixture(autouse=True)
def _reset_notice(monkeypatch):
    monkeypatch.setattr(credential_sources, "_notice_logged", False, raising=False)


def _patch_config(monkeypatch, config):
    import hermes_cli.config as config_module

    monkeypatch.setattr(config_module, "load_config_readonly", lambda: config)


@pytest.mark.parametrize(
    ("label", "config"),
    [
        ("config vazio", {}),
        ("sem bloco auth", {"model": {"provider": "anthropic"}}),
        ("auth vazio", {"auth": {}}),
        ("auth nao-dict", {"auth": "adopt_external_logins: true"}),
        ("false explicito", {"auth": {"adopt_external_logins": False}}),
        ("string yes", {"auth": {"adopt_external_logins": "yes"}}),
        ("string true", {"auth": {"adopt_external_logins": "true"}}),
        ("inteiro 1", {"auth": {"adopt_external_logins": 1}}),
        ("null", {"auth": {"adopt_external_logins": None}}),
    ],
)
def test_only_literal_true_enables_borrowing(monkeypatch, label, config):
    _patch_config(monkeypatch, config)

    assert credential_sources.adopt_external_logins_enabled() is False, label


def test_explicit_true_enables_borrowing(monkeypatch):
    _patch_config(monkeypatch, {"auth": {"adopt_external_logins": True}})

    assert credential_sources.adopt_external_logins_enabled() is True


def test_unreadable_config_fails_closed(monkeypatch):
    import hermes_cli.config as config_module

    def boom():
        raise RuntimeError("config corrompido")

    monkeypatch.setattr(config_module, "load_config_readonly", boom)

    assert credential_sources.adopt_external_logins_enabled() is False


def test_invalid_value_logs_a_warning(monkeypatch, caplog):
    _patch_config(monkeypatch, {"auth": {"adopt_external_logins": "yes"}})

    with caplog.at_level("WARNING", logger="agent.credential_sources"):
        assert credential_sources.adopt_external_logins_enabled() is False

    assert any("adopt_external_logins must be true or false" in record.message for record in caplog.records)
