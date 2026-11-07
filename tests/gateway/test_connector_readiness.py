"""T-06 — prontidão de conector: o que falta, e prova de que segredo não vaza.

Os testes usam um `PlatformEntry` de mentira para não depender de nenhum adapter real nem da máquina:
o que está sob teste é a REGRA (nome de variável, não valor; ausência nomeada, não palpite).
"""

from __future__ import annotations

import pytest

from gateway import connector_readiness as cr
from gateway.platform_registry import PlatformEntry, platform_registry

SEGREDO = "token-super-secreto-123456"


class _Entry:
    """Forma mínima que `connector_readiness` consome."""

    def __init__(self, name="fake", required_env=None, deps_ok=True, connected=True, hint=""):
        self.name = name
        self.label = name
        self.required_env = required_env or []
        self.install_hint = hint
        self._deps_ok = deps_ok
        self._connected = connected

    def check_fn(self):
        return self._deps_ok

    def is_connected(self, _config):
        return self._connected


@pytest.fixture
def registry_fake(monkeypatch):
    entradas: dict[str, _Entry] = {}

    def _get(nome):
        return entradas.get(nome)

    def _all():
        return list(entradas.values())

    monkeypatch.setattr(platform_registry, "get", _get)
    monkeypatch.setattr(platform_registry, "all_entries", _all)

    return entradas


def test_plataforma_desconhecida_nao_vira_palpite(registry_fake):
    r = cr.connector_readiness("nao-existe", env={})

    assert r["status"] == cr.UNKNOWN_PLATFORM
    assert r["required_env"] == []
    assert r["next_action"]


def test_credencial_ausente_e_nomeada_pelo_NOME(registry_fake):
    registry_fake["telegram"] = _Entry(required_env=["TELEGRAM_BOT_TOKEN"])

    r = cr.connector_readiness("telegram", env={})

    assert r["status"] == cr.MISSING_CREDENTIAL
    assert r["missing_env"] == ["TELEGRAM_BOT_TOKEN"]
    assert "TELEGRAM_BOT_TOKEN" in r["next_action"]


def test_credencial_presente_nao_aparece_como_faltando(registry_fake):
    registry_fake["telegram"] = _Entry(required_env=["TELEGRAM_BOT_TOKEN"])

    r = cr.connector_readiness("telegram", env={"TELEGRAM_BOT_TOKEN": SEGREDO})

    assert r["status"] == cr.READY
    assert r["missing_env"] == []


def test_valor_em_branco_conta_como_ausente(registry_fake):
    registry_fake["telegram"] = _Entry(required_env=["TELEGRAM_BOT_TOKEN"])

    assert cr.connector_readiness("telegram", env={"TELEGRAM_BOT_TOKEN": "   "})["status"] == cr.MISSING_CREDENTIAL


def test_o_valor_do_segredo_nunca_aparece_na_saida(registry_fake):
    """A garantia central: a função compara nomes e devolve nomes."""
    registry_fake["telegram"] = _Entry(required_env=["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"])

    resultado = cr.connector_readiness("telegram", env={"TELEGRAM_BOT_TOKEN": SEGREDO})
    texto = repr(resultado)

    assert SEGREDO not in texto
    # e o que falta é só o nome da OUTRA variável
    assert resultado["missing_env"] == ["TELEGRAM_CHAT_ID"]


def test_dependencia_ausente_manda_instalar(registry_fake):
    registry_fake["discord"] = _Entry(deps_ok=False, hint="pip install discord.py")

    r = cr.connector_readiness("discord", env={})

    assert r["status"] == cr.DEPS_MISSING
    assert "discord.py" in r["next_action"]


def test_credencial_vem_antes_de_dependencia(registry_fake):
    """Sem token, instalar dependência não adianta: o operador precisa do nome do token primeiro."""
    registry_fake["discord"] = _Entry(deps_ok=False, required_env=["DISCORD_BOT_TOKEN"])

    assert cr.connector_readiness("discord", env={})["status"] == cr.MISSING_CREDENTIAL


def test_plataforma_nao_escolhida_e_reportada(registry_fake):
    registry_fake["slack"] = _Entry(connected=False)

    assert cr.connector_readiness("slack", env={})["status"] == cr.NOT_CONFIGURED


def test_probe_que_exige_config_real_nao_inventa_not_configured(registry_fake):
    """Um `is_connected` que levanta não decide prontidão de credencial — fica READY, não adivinha."""

    class _Explode(_Entry):
        def is_connected(self, _config):
            raise TypeError("precisa de PlatformConfig")

    registry_fake["x"] = _Explode()

    assert cr.connector_readiness("x", env={})["status"] == cr.READY


def test_all_connectors_ordena_e_nao_vaza(registry_fake):
    registry_fake["b"] = _Entry(name="b", required_env=["B_TOKEN"])
    registry_fake["a"] = _Entry(name="a")
    registry_fake["a"].required_env = []

    linhas = cr.all_connectors(env={"B_TOKEN": SEGREDO})

    assert [linha["platform"] for linha in linhas] == ["a", "b"]
    assert SEGREDO not in repr(linhas)


def test_summary_conta_por_estado_e_lista_so_nomes(registry_fake):
    registry_fake["a"] = _Entry(name="a")
    registry_fake["b"] = _Entry(name="b", required_env=["B_TOKEN"])
    registry_fake["c"] = _Entry(name="c", required_env=["C_TOKEN"])

    s = cr.summary(env={})

    assert s["total"] == 3
    assert s["prontos"] == 1
    assert s["por_status"][cr.MISSING_CREDENTIAL] == 2
    assert s["credenciais_faltando"] == ["B_TOKEN", "C_TOKEN"]


def test_PlatformEntry_real_tem_required_env():
    """Se o registry mudar e perder `required_env`, esta suíte deixa de provar qualquer coisa."""
    campos = PlatformEntry.__dataclass_fields__

    assert "required_env" in campos
    assert "check_fn" in campos
