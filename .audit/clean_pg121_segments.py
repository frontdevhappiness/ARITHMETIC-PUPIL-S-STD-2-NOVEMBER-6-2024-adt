from pathlib import Path

from PIL import Image


root = Path(__file__).resolve().parents[1]


def clean(source_name: str, target_name: str, *, clear_left: int = 0, clear_right: int | None = None) -> None:
    source = root / "images" / source_name
    target = root / "images" / target_name
    image = Image.open(source).convert("RGBA")
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(clear_left):
            pixels[x, y] = (255, 255, 255, 255)
        if clear_right is not None:
            for x in range(clear_right, width):
                pixels[x, y] = (255, 255, 255, 255)

    image.save(target, optimize=True)
    print({"source": source.name, "target": target.name})


# The cup crop contains a slice of the book at columns 126–141; the cup ends
# at column 95. The book crop contains a slice of the cup at its left edge;
# the book begins at column 31. Preserve the original canvas dimensions so
# the page spacing remains unchanged.
clean("pg121_im002_seg001_v1.png", "pg121_im002_seg001_v2.png", clear_right=96)
clean("pg121_im002_seg002_v1.png", "pg121_im002_seg002_v2.png", clear_left=31)
