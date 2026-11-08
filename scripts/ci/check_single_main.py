#!/usr/bin/env python
"""Guarda: um unico `<main>` por documento renderizado.

r72 do V5. O projeto **decidiu** isto duas vezes — `controller.tsx` r289 ("o conteudo de trabalho vira
`<main>`") e `overlay-split-layout.tsx` r82 ("`<div>`, nao `<main>`: o shell ja tem o"). Mesmo assim
`master-detail.tsx` e `mcp-editor.tsx` renderizavam `<main>` **dentro** do `<main>` do shell: HTML
invalido, e o `axe` acusava `landmark-main-is-top-level`, `landmark-no-duplicate-main` e
`landmark-unique` em `/messaging`.

A decisao estava escrita nos arquivos vizinhos e mesmo assim derivou — porque nada a verificava.

Este guarda le o JSX e exige que `<main`, `role="main"` e `<Main` aparecam **apenas** nos arquivos da
lista, cada um com o motivo. Um arquivo novo que renderize `<main>` tem de entrar na lista de propósito.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
RAIZES = ["apps/desktop/src"]

# Caminho -> por que ELE pode renderizar <main>.
PERMITIDOS = {
    # O shell: o `<main>` unico do documento (controller.tsx r289 documenta a escolha).
    "apps/desktop/src/components/pane-shell/tree/renderer/index.tsx":
        "o <main> do documento: hospeda o pane do workspace",
    # Janela SEPARADA (wake indicator): documento proprio, com `aria-hidden`. Nao coexiste com o shell.
    "apps/desktop/src/app/wake-indicator/wake-indicator-app.tsx":
        "renderiza em janela propria, nao dentro do shell",
    # Componente do shadcn, hoje EXPORTADO E NAO USADO. Fica: se um dia for usado, ele SUBSTITUI o
    # `<main>` do shell, nao soma. O guarda nao pode distinguir os dois casos sozinho.
    "apps/desktop/src/components/ui/sidebar.tsx":
        "SidebarInset do shadcn: substituiria o main do shell, nunca somaria",
}

_PADRAO = re.compile(r"<(main|Main)\b|role=[\"']main[\"']")


def _jsx_util(path: Path) -> list[str]:
    """Linhas que declaram o landmark `main`, ignorando comentarios e strings de texto."""
    achados: list[str] = []
    dentro_de_comentario = False
    for n, linha in enumerate(path.read_text(encoding="utf-8-sig").split("\n"), start=1):
        s = linha.strip()
        if dentro_de_comentario:
            if "*/" in s:
                dentro_de_comentario = False
            continue
        if s.startswith("/*") and "*/" not in s:
            dentro_de_comentario = True
            continue
        if s.startswith("//"):
            continue
        # remove comentarios de bloco INLINE (`/* ... */` na mesma linha), comentarios de linha e o
        # que esta em crase (mensagem, i18n) — nenhum dos tres e' JSX renderizado
        sem_comentario = re.sub(r"/\*.*?\*/", "", s)
        sem_crase = re.sub(r"`[^`]*`", "", sem_comentario)
        if _PADRAO.search(sem_crase):
            achados.append(f"{n}: {s[:90]}")
    return achados


def main() -> int:
    problemas: list[str] = []
    for raiz in RAIZES:
        for path in sorted((REPO / raiz).rglob("*.tsx")):
            rel = path.relative_to(REPO).as_posix()
            if rel.endswith(".test.tsx"):
                continue
            achados = _jsx_util(path)
            if achados and rel not in PERMITIDOS:
                for a in achados:
                    problemas.append(f"{rel}:{a}")
    if problemas:
        for p in problemas:
            print(f"  {p}")
        print(
            "\nsingle-main: um `<main>` a mais. O shell ja tem o dele "
            "(controller.tsx r289, overlay-split-layout.tsx r82). Use `<div>` ou `<section>`; "
            "se este arquivo PRECISA ser o main, adicione-o a PERMITIDOS com o motivo."
        )
        return 1
    permitidos_achados = sum(
        1 for rel in PERMITIDOS
        if _jsx_util(REPO / rel)
    )
    if permitidos_achados != len(PERMITIDOS):
        print("  single-main: arquivo da lista de PERMITIDOS nao renderiza mais <main> — atualize a lista")
        return 1
    print(f"single-main: ok ({len(PERMITIDOS)} arquivo(s) autorizado(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
