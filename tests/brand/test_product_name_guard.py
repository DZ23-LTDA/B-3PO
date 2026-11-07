"""
A marca do produto não pode voltar como "Hermes Agent" na interface.

O rebrand sistemático (`scripts/rebrand_product_name.py`) troca o nome visível em catálogos de locale,
web e instalador. Este teste é a catraca: se alguém reintroduzir "Hermes Agent" como marca de produto
numa superfície visível, ele falha — e a divergência não chega ao app.

O runtime continua chamado Hermes nos módulos, nos caminhos, nos comandos (`hermes`) e nas variáveis
`HERMES_*`; isso NÃO é marca de interface e permanece intocado.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT / "brand" / "brand.json"

# Superfícies que o usuário final lê. Documentação de atribuição (LICENSE, NOTICE, docs upstream)
# fica de fora de propósito: aquela referência é legal, não é marca de interface.
VISIBLE_GLOBS = (
    "locales/*.yaml",
    "apps/desktop/src/i18n/*.ts",
    "web/src/**/*.tsx",
    "apps/bootstrap-installer/src/**/*.tsx",
)

LEGACY = re.compile(r"Hermes Agent|HERMES AGENT|Hermes Desktop|Hermes Cloud")


def product_name() -> str:
    return str(json.loads(BRAND.read_text(encoding="utf-8")).get("name") or "B-3PO")


def visible_files() -> list[Path]:
    files: list[Path] = []
    for pattern in VISIBLE_GLOBS:
        files.extend(sorted(ROOT.glob(pattern)))
    return [path for path in files if path.is_file()]


def test_catalogos_visiveis_nao_usam_o_nome_legado():
    offenders: list[str] = []

    for path in visible_files():
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if line.lstrip().startswith(("#", "//", "/*", "*")):
                continue
            if LEGACY.search(line):
                offenders.append(f"{path.relative_to(ROOT)}:{number}: {line.strip()[:100]}")

    assert offenders == [], "nome legado voltou na interface:\n" + "\n".join(offenders[:20])


def test_marca_declarada_e_a_usada_nos_catalogos():
    """O catálogo inglês (fonte das demais línguas) precisa falar o nome do produto."""
    english = ROOT / "locales" / "en.yaml"
    text = english.read_text(encoding="utf-8")

    assert product_name() in text


@pytest.mark.parametrize("relative", ["locales/pt.yaml", "apps/desktop/src/i18n/pt.ts"])
def test_pt_br_tambem_fala_o_produto(relative: str):
    path = ROOT / relative
    if not path.exists():
        pytest.skip(f"{relative} ausente")

    assert product_name() in path.read_text(encoding="utf-8")
