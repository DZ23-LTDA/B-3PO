#!/usr/bin/env python
"""Guarda de integridade dos documentos markdown do projeto.

r71 do V5. A varredura da r70 encontrou **seis linhas de tabela com coluna faltando** em
`docs/b3po/v5/` — todas introduzidas por edicao programatica: eu escrevia a linha sem olhar o
cabecalho da tabela. Tambem um heading duplicado que sobreviveu 20 rodadas.

O defeito nao quebra o gate, nao quebra teste e nao aparece lendo o trecho que acabei de inserir.
Aparece ao renderizar. Este guarda e' a releitura que eu nao fazia.

Regras:
  - linha de tabela com numero de celulas diferente do cabecalho;
  - heading `## ... ## ...` (dois na mesma linha) ou repetido na linha seguinte.

Ignora `\\|` (pipe escapado) e pipes dentro de crase, que sao conteudo de celula.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
ALVOS = ["docs/b3po/v5"]

_PIPE = re.compile(r"(?<!\\)\|")
_HEADING = re.compile(r"^(#{1,6})\s")


def _celulas(linha: str) -> int:
    return len(_PIPE.findall(linha))


def _sem_crase(linha: str) -> str:
    return re.sub(r"`[^`]*`", "", linha)


def problemas_em(path: Path) -> list[str]:
    achados: list[str] = []
    linhas = path.read_text(encoding="utf-8-sig").split("\n")
    for i, linha in enumerate(linhas):
        n = i + 1
        if linha.count("## ") > 1 and linha.strip().startswith("##"):
            achados.append(f"{path.relative_to(REPO)}:{n}: dois headings na mesma linha")
        if (
            i > 0
            and linha.strip()
            and _HEADING.match(linha.strip())
            and linha.strip() == linhas[i - 1].strip()
        ):
            achados.append(f"{path.relative_to(REPO)}:{n}: heading repetido na linha anterior")

    bloco: list[tuple[int, str]] = []
    for i, linha in enumerate(linhas + [""]):
        if linha.strip().startswith("|"):
            bloco.append((i + 1, linha))
            continue
        if len(bloco) >= 3:
            contagens = {n: _celulas(_sem_crase(l)) for n, l in bloco}
            esperado = max(set(contagens.values()), key=list(contagens.values()).count)
            if esperado >= 3:
                for n, c in contagens.items():
                    if c != esperado:
                        achados.append(
                            f"{path.relative_to(REPO)}:{n}: tabela tem {c} celulas, "
                            f"o cabecalho tem {esperado}"
                        )
        bloco = []
    return achados


def main() -> int:
    achados: list[str] = []
    for alvo in ALVOS:
        for path in sorted((REPO / alvo).glob("*.md")):
            achados.extend(problemas_em(path))
    if achados:
        for a in achados:
            print(f"  {a}")
        print(f"\ndocs-tables: {len(achados)} problema(s) de renderizacao em markdown")
        return 1
    print("docs-tables: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
