"""Build an 8x8 Maple board from a ChessBase 8x4 screenshot.

Each source cell is cropped by index (no cumulative drift) and inset
so mixed boundary pixels never leak. All 64 squares share one scale.
"""

from __future__ import annotations

from pathlib import Path
import random

from PIL import Image, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(__file__).with_name("maple-src.png")
OUT = ROOT / "public" / "board" / "maple-check.jpg"
SIZE = 160
FILES = 8
RANKS_SRC = 4
INSET = 8


def is_light(col: int, row: int) -> bool:
    return (col + row) % 2 == 0


def cell_crop(src: Image.Image, col: int, row: int, cols: int, rows: int) -> Image.Image:
    width, height = src.size
    x0 = round(col * width / cols)
    x1 = round((col + 1) * width / cols)
    y0 = round(row * height / rows)
    y1 = round((row + 1) * height / rows)
    tile = src.crop((x0, y0, x1, y1))
    tw, th = tile.size
    if tw > INSET * 2 and th > INSET * 2:
        tile = tile.crop((INSET, INSET, tw - INSET, th - INSET))
    return tile.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def extract_tiles(src: Image.Image) -> tuple[list[Image.Image], list[Image.Image]]:
    lights: list[Image.Image] = []
    darks: list[Image.Image] = []
    for row in range(RANKS_SRC):
        for col in range(FILES):
            tile = cell_crop(src, col, row, FILES, RANKS_SRC)
            (lights if is_light(col, row) else darks).append(tile)
    return lights, darks


def variant(src: Image.Image, use: int) -> Image.Image:
    if use:
        return ImageOps.mirror(src)
    return src


def mean_hex(images: list[Image.Image]) -> str:
    rs = gs = bs = n = 0
    for im in images:
        stat = ImageStat.Stat(im)
        r, g, b = stat.mean
        rs += r
        gs += g
        bs += b
        n += 1
    return f"#{int(rs / n):02x}{int(gs / n):02x}{int(bs / n):02x}"


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    lights, darks = extract_tiles(src)
    rnd = random.Random(7)
    light_slots = [(i, 0) for i in range(len(lights))] + [
        (i, 1) for i in range(len(lights))
    ]
    dark_slots = [(i, 0) for i in range(len(darks))] + [
        (i, 1) for i in range(len(darks))
    ]
    rnd.shuffle(light_slots)
    rnd.shuffle(dark_slots)
    board = Image.new("RGB", (FILES * SIZE, FILES * SIZE))

    for row in range(FILES):
        for col in range(FILES):
            if is_light(col, row):
                pick, use = light_slots.pop()
                tile = variant(lights[pick], use)
            else:
                pick, use = dark_slots.pop()
                tile = variant(darks[pick], use)
            board.paste(tile, (col * SIZE, row * SIZE))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    board.save(OUT, "JPEG", quality=90, optimize=True, subsampling=1)
    print("wrote", OUT, board.size)
    print("light", mean_hex(lights), "dark", mean_hex(darks))


if __name__ == "__main__":
    main()
