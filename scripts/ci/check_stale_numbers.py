#!/usr/bin/env python
"""Guarda: numero que ja' foi REFUTADO nao volta para documento nenhum.

r80 do V5. Na r79 eu descobri que um numero errado sobrevive porque e' **copiado**: "27 falhas" aparecia em
cinco documentos, "axe 0 em 27 rotas" em quatro. Eu corrigia o documento que estava olhando e criava
quatro mentiras com validade longa.

Cada entrada aqui e' um valor que **medi como falso** e o que o substitui. Se ele reaparecer em
`docs/b3po/v5/`, este guarda falha e diz onde estava a medicao que o derrubou.

Adicionar uma entrada so' depois de estar no documento de evidencia; remover so' quando a medicao mudar
(e ai' a entrada muda, nao desaparece).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
ALVOS = ["docs/b3po/v5"]

# valor refutado -> (onde a medicao está, o que é verdade)
REFUTADOS: dict[str, tuple[str, str]] = {
    "axe 0 em 27 rotas": (
        "PLATFORM_MATRIX.md (r63)",
        "5 de 39 rotas com violacao persistente; o numero do V4 nao era reproduzivel",
    ),
    "27 falhas desktop": (
        "TEST_EVIDENCE.md (r49/r73)",
        "30 sob carga e 17 isoladas; depois das correcoes, 23 com zero arquivo novo",
    ),
    "27 falhas históricas": (
        "TEST_EVIDENCE.md (r49/r73)",
        "30 sob carga e 17 isoladas; depois das correcoes, 23 com zero arquivo novo",
    ),
    "nada a executa": (
        "SOFIA_INTEGRATION.md (r45/r78)",
        "o ciclo funciona e o pedido chega ao composer desde a r78",
    ),
    "gate 14/14": (
        "HANDOFF.md",
        "o gate tem 16 checks desde a r72 (docs-tables e single-main)",
    ),
}


# Uma linha que CITA o valor para corrigi-lo nao e' uma afirmacao dele. Sem isto o guarda acusa os
# proprios documentos de retratacao (medido na r80: 6 de 6 achados eram citacoes de correcao).
MARCADORES_DE_CORRECAO = (
    "refutad",
    "corrigid",
    "correcao",
    "correção",
    "nao era reproduzivel",
    "não era reproduzível",
    "estava desatualizado",
    "desmentid",
    "retratac",
    "retrataç",
    "ver `TEST_EVIDENCE",
    "ver `PLATFORM_MATRIX",
    "o correto",
)


# Documentos que CITAM o valor antigo de proposito, cada um com o motivo. Sao os que registram historia ou
# correcao: o guarda protege os OUTROS, que e' onde as copias obsoletas moraram (r79 achou 4).
PERMITIDOS_A_CITAR: dict[str, str] = {
    "PROGRESS.md": "diario: cada rodada cita o valor antigo ao lado do medido",
    "TEST_EVIDENCE.md": "cita o goal e o valor corrigido, com a medicao ao lado",
    "PLATFORM_MATRIX.md": "cita o valor do V4 para refuta-lo com o censo da r63",
    "RETRATATIONS.md": "registro de retratacoes: cita a afirmacao errada para corrigi-la",
}


def _e_citacao(linha: str) -> bool:
    baixa = linha.lower()
    return any(m in baixa for m in MARCADORES_DE_CORRECAO)


def main() -> int:
    achados: list[str] = []
    for alvo in ALVOS:
        for path in sorted((REPO / alvo).glob("*.md")):
            texto = path.read_text(encoding="utf-8-sig")
            nome = path.name
            if nome in PERMITIDOS_A_CITAR:
                continue
            for linha_n, linha in enumerate(texto.split("\n"), start=1):
                if _e_citacao(linha):
                    continue
                for valor, (onde, verdade) in REFUTADOS.items():
                    if valor in linha:
                        achados.append(
                            f"{path.relative_to(REPO)}:{linha_n}: \"{valor}\" foi refutado — "
                            f"ver {onde}. O correto: {verdade}"
                        )
    if achados:
        for a in achados:
            print(f"  {a}")
        print(f"\nstale-numbers: {len(achados)} afirmacao(oes) refutada(s) de volta na documentacao")
        return 1
    print(
        f"stale-numbers: ok ({len(REFUTADOS)} valores refutados vigiados · "
        f"{len(PERMITIDOS_A_CITAR)} documento(s) autorizado(s) a cita-los)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
