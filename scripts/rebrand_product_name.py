"""Rebrand sistemático: nome do produto em toda superfície visível.

Um remendo por tela sempre esquece a próxima. Este script aplica a decisão de marca de uma vez, lendo
o nome do produto de `brand/brand.json` (marca como dado) e trocando **apenas texto visível**:

- valores dos catálogos de locale (`locales/*.yaml`, `apps/desktop/src/i18n/*.ts`, `web/src/**`);
- títulos/descrições do instalador (`apps/bootstrap-installer/src/**`).

Nunca toca: identificadores, imports, variáveis `HERMES_*`, nomes de módulo, caminhos de arquivo,
`LICENSE`/`NOTICE`, nem a documentação de atribuição upstream.

Uso:
    python scripts/rebrand_product_name.py --check     # lista o que mudaria
    python scripts/rebrand_product_name.py --write     # aplica
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "brand" / "brand.json"

# Nome legado que aparece como MARCA na interface. O runtime continua chamado Hermes nos caminhos,
# nos módulos e nos comandos (`hermes`), e essa distinção é o que este script preserva.
LEGACY_NAMES = (
    ("Hermes Agent", "{product}"),
    ("HERMES AGENT", "{PRODUCT}"),
    ("Hermes Desktop", "{product} Desktop"),
    ("Hermes Cloud", "{product} Cloud"),
)

TARGET_GLOBS = (
    "locales/*.yaml",
    "apps/desktop/src/i18n/*.ts",
    "web/src/**/*.ts",
    "web/src/**/*.tsx",
    "apps/bootstrap-installer/src/**/*.ts",
    "apps/bootstrap-installer/src/**/*.tsx",
)

# Um literal de string em TS/TSX: 'x', "x", `x`.
STRING_LITERAL = re.compile(r"(['\"`])((?:\\.|(?!\1).)*)\1", re.DOTALL)
# Valor de YAML: `chave: "texto"` ou `chave: texto`.
YAML_VALUE = re.compile(r"^(\s*[A-Za-z0-9_.-]+\s*:\s*)(.+)$")


def product_names() -> tuple[str, str]:
    data = json.loads(BRAND.read_text(encoding="utf-8"))
    name = str(data.get("name") or "B-3PO")
    return name, name.upper()


def replace_visible(text: str, product: str, upper: str) -> tuple[str, int]:
    count = 0
    for legacy, template in LEGACY_NAMES:
        replacement = template.format(product=product, PRODUCT=upper)
        while legacy in text:
            text = text.replace(legacy, replacement)
            count += 1
    return text, count


def rebrand_ts(text: str, product: str, upper: str) -> tuple[str, int]:
    """Substitui o nome legado por linha, ignorando código que não é texto visível.

    Linha a linha (em vez de um regex de literal) porque os catálogos misturam template literals
    multilinha e comentários: o regex por literal deixava passar justamente as linhas curtas dentro
    de blocos maiores. Identificadores, imports e caminhos ficam de fora por filtro explícito.
    """
    total = 0
    lines: list[str] = []

    for line in text.splitlines(keepends=True):
        stripped = line.lstrip()
        code_only = (
            stripped.startswith(("import ", "export ", "//", "*", "/*", "const ", "function ", "type "))
            or "require(" in stripped
            or legacy_only_path(line)
        )
        if code_only:
            lines.append(line)
            continue

        new_line, count = replace_visible(line, product, upper)
        total += count
        lines.append(new_line)

    return "".join(lines), total


def legacy_only_path(body: str) -> bool:
    """Um literal que é caminho/comando (`hermes`, `/usr/bin/hermes`) não é marca."""
    return bool(re.fullmatch(r"[\w./@:-]*hermes[\w./@:-]*", body, re.IGNORECASE))


def rebrand_yaml(text: str, product: str, upper: str) -> tuple[str, int]:
    total = 0
    lines: list[str] = []

    for line in text.splitlines(keepends=True):
        match = YAML_VALUE.match(line.rstrip("\n"))
        if not match or line.lstrip().startswith("#"):
            lines.append(line)
            continue

        prefix, value = match.group(1), match.group(2)
        new_value, count = replace_visible(value, product, upper)
        total += count
        lines.append(prefix + new_value + ("\n" if line.endswith("\n") else ""))

    return "".join(lines), total


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="apenas listar")
    mode.add_argument("--write", action="store_true", help="aplicar as mudanças")
    args = parser.parse_args()

    product, upper = product_names()
    report: dict[str, int] = {}
    total = 0

    for pattern in TARGET_GLOBS:
        for path in sorted(ROOT.glob(pattern)):
            if not path.is_file():
                continue

            original = path.read_text(encoding="utf-8")
            if path.suffix in {".ts", ".tsx"}:
                updated, count = rebrand_ts(original, product, upper)
            else:
                updated, count = rebrand_yaml(original, product, upper)

            if count == 0:
                continue

            report[str(path.relative_to(ROOT))] = count
            total += count
            if args.write:
                path.write_text(updated, encoding="utf-8", newline="")

    print(json.dumps({"product": product, "total": total, "files": report}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
