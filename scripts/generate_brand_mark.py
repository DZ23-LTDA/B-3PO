"""Gera a marca B-3PO usada no selo do app (squircle claro/escuro).

Substitui a arte antiga do Hermes (`nous-girl*.png`) no `BrandMark`. Reproduzível:
lê o ícone oficial de `brand/icons/` e escreve em `apps/desktop/public/`.

Uso: python scripts/generate_brand_mark.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "brand" / "icons" / "b3po-icon-512.png"
OUT = ROOT / "apps" / "desktop" / "public"

SIZE = 256
# Fundos oficiais da marca (brand/palette.json).
LIGHT_BG = "#FCFDFE"
DARK_BG = "#000105"
INSET = 0.10  # respiro do ícone dentro do squircle
RADIUS_RATIO = 0.235  # raio ~squircle do ícone do app


def squircle(size: int, color: str, radius_ratio: float = RADIUS_RATIO) -> Image.Image:
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tile)
    radius = int(size * radius_ratio)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=color)
    return tile


def compose(background: str, destination: Path) -> None:
    icon = Image.open(SOURCE).convert("RGBA")
    inner = int(SIZE * (1 - 2 * INSET))
    icon = icon.resize((inner, inner), Image.LANCZOS)

    tile = squircle(SIZE, background)
    offset = (SIZE - inner) // 2
    tile.alpha_composite(icon, (offset, offset))
    tile.save(destination)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    compose(LIGHT_BG, OUT / "b3po-mark.png")
    compose(DARK_BG, OUT / "b3po-mark-dark.png")
    print(f"escrito: {OUT / 'b3po-mark.png'}")
    print(f"escrito: {OUT / 'b3po-mark-dark.png'}")


if __name__ == "__main__":
    main()
