from pathlib import Path

from PIL import Image


root = Path(__file__).resolve().parents[1]


def white_out(source_name: str, target_name: str, rectangles: list[tuple[int, int, int, int]]) -> None:
    source = root / "images" / source_name
    target = root / "images" / target_name
    image = Image.open(source).convert("RGBA")
    pixels = image.load()
    width, height = image.size
    for left, top, right, bottom in rectangles:
        for y in range(max(0, top), min(height, bottom)):
            for x in range(max(0, left), min(width, right)):
                pixels[x, y] = (255, 255, 255, 255)
    image.save(target, optimize=True)
    print({"source": source.name, "target": target.name})


# Page 21: the five-pencil crop retained the source table's header and left
# rule; the single-pencil crop retained the answer rule/text below it.
white_out(
    "pg021_im007_seg003_v1.png",
    "pg021_im007_seg003_v2.png",
    [(0, 0, 220, 44), (0, 0, 7, 250)],
)
white_out(
    "pg021_im008_seg003_v1.png",
    "pg021_im008_seg003_v2.png",
    [(0, 258, 130, 325)],
)

# Page 111: reciprocal page-segmentation overlap left part of the other orange
# at the opposite edge of each crop. The descriptions make the intended split
# explicit: two-thirds in the first image and one-third in the second.
white_out(
    "pg111_im003_seg001_v1.png",
    "pg111_im003_seg001_v2.png",
    [(0, 121, 159, 147)],
)
white_out(
    "pg111_im003_seg002_v1.png",
    "pg111_im003_seg002_v2.png",
    [(0, 0, 159, 31)],
)
