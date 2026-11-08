"""Empacota os 20 mascotes da marca como pets do runtime B-3PO.

O B-3PO não usa pets de terceiros: a página Configurações → Aparência → Mascote lê
`get_hermes_home()/pets/<slug>/`, então cada mascote oficial vira um pacote local
(`pet.json` + `spritesheet.png`). A folha segue a geometria que o renderizador espera
(8 colunas × 9 linhas de 192×208); como o mascote é estático, todos os quadros repetem a
mesma arte — a identidade é nossa, e a animação por estado continua sendo do renderizador.

Uso:
    python scripts/generate_brand_pets.py --brand ./brand
    python scripts/generate_brand_pets.py --brand ./brand --home <HERMES_HOME>
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FRAME_W, FRAME_H = 192, 208
COLUMNS, ROWS = 8, 9
PAD = 10


def mascots(brand_dir: Path) -> list[tuple[str, str, Path]]:
    """(id, nome, arquivo) do manifesto da marca."""
    manifest = brand_dir / "avatars" / "manifest.json"
    if manifest.is_file():
        entries = json.loads(manifest.read_text(encoding="utf-8-sig"))
        return [
            (str(entry["id"]), str(entry.get("name") or entry["id"]), brand_dir / "avatars" / Path(entry["file"]).name)
            for entry in entries
        ]

    # Sem manifesto: qualquer PNG em brand/avatars vira um mascote.
    return [(path.stem, path.stem.title(), path) for path in sorted((brand_dir / "avatars").glob("*.png"))]


def build_sheet(source: Path) -> Image.Image:
    art = Image.open(source).convert("RGBA")
    side = min(FRAME_W, FRAME_H) - 2 * PAD
    art = art.resize((side, side), Image.LANCZOS)
    sheet = Image.new("RGBA", (FRAME_W * COLUMNS, FRAME_H * ROWS), (0, 0, 0, 0))

    for row in range(ROWS):
        for column in range(COLUMNS):
            sheet.alpha_composite(art, (column * FRAME_W + (FRAME_W - side) // 2, row * FRAME_H + (FRAME_H - side) // 2))

    return sheet


def install(source: Path, slug: str, name: str, pets_root: Path, *, description: str) -> Path:
    directory = pets_root / slug
    directory.mkdir(parents=True, exist_ok=True)

    build_sheet(source).save(directory / "spritesheet.png")
    (directory / "pet.json").write_text(
        json.dumps(
            {
                "id": slug,
                "displayName": name,
                "description": description,
                "spritesheetPath": "spritesheet.png",
                "createdBy": "generator",
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    return directory


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--brand", type=Path, default=ROOT / "brand")
    parser.add_argument("--home", type=Path, default=None, help="HERMES_HOME alvo (default: $HERMES_HOME ou --out)")
    parser.add_argument("--out", type=Path, default=ROOT / "brand" / "pets", help="destino quando não há HERMES_HOME")
    args = parser.parse_args()

    pets_root = args.home / "pets" if args.home else (Path(os.environ["HERMES_HOME"]) / "pets" if os.environ.get("HERMES_HOME") else args.out)
    pets_root.mkdir(parents=True, exist_ok=True)

    installed = []
    for slug, name, source in mascots(args.brand):
        if not source.is_file():
            print(f"aviso: arte ausente para {slug}: {source}")
            continue

        install(source, slug, name, pets_root, description=f"{name} — mascote oficial do B-3PO.")
        installed.append(slug)

    print(json.dumps({"pets_root": str(pets_root), "installed": len(installed), "slugs": installed}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
