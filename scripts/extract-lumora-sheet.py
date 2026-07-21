from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


SHEET_CROPS = {
    "lino": {
        "base": (24, 42, 458, 466),
        "mood-happy": (14, 538, 338, 814),
        "mood-calm": (346, 538, 670, 814),
        "mood-shy": (680, 538, 1004, 814),
        "mood-sad": (14, 892, 338, 1160),
        "mood-angry": (346, 892, 670, 1160),
        "mood-excited": (680, 892, 1004, 1160),
        "avatar-neutral": (146, 1278, 386, 1458),
        "avatar-happy": (392, 1278, 632, 1458),
        "avatar-sad": (638, 1278, 878, 1458),
    },
    "momo": {
        "base": (14, 132, 458, 566),
        "mood-happy": (28, 708, 345, 970),
        "mood-calm": (352, 708, 670, 970),
        "mood-shy": (678, 708, 997, 970),
        "mood-sad": (28, 1068, 345, 1351),
        "mood-angry": (352, 1068, 670, 1351),
        "mood-excited": (678, 1068, 997, 1351),
        "avatar-neutral": (466, 262, 640, 469),
        "avatar-happy": (634, 262, 810, 469),
        "avatar-sad": (802, 262, 982, 469),
    },
    "piko": {
        "base": (34, 38, 414, 359),
        "mood-happy": (20, 482, 344, 760),
        "mood-calm": (350, 482, 674, 760),
        "mood-shy": (680, 482, 1006, 760),
        "mood-sad": (20, 850, 344, 1125),
        "mood-angry": (350, 850, 674, 1125),
        "mood-excited": (680, 850, 1006, 1125),
        "avatar-neutral": (146, 1282, 386, 1458),
        "avatar-happy": (392, 1282, 632, 1458),
        "avatar-sad": (638, 1282, 878, 1458),
    },
    "tutu": {
        "base": (25, 32, 526, 476),
        "mood-happy": (38, 552, 345, 816),
        "mood-calm": (352, 552, 670, 816),
        "mood-shy": (678, 552, 992, 816),
        "mood-sad": (38, 884, 345, 1161),
        "mood-angry": (352, 884, 670, 1161),
        "mood-excited": (678, 884, 992, 1161),
        "avatar-neutral": (146, 1284, 386, 1450),
        "avatar-happy": (392, 1284, 632, 1450),
        "avatar-sad": (638, 1284, 878, 1450),
    },
    "nox": {
        "base": (18, 140, 454, 451),
        "mood-happy": (24, 610, 338, 864),
        "mood-calm": (346, 610, 670, 864),
        "mood-shy": (678, 610, 1004, 864),
        "mood-sad": (24, 958, 338, 1216),
        "mood-angry": (346, 958, 670, 1216),
        "mood-excited": (678, 958, 1004, 1216),
        "avatar-neutral": (146, 1350, 386, 1480),
        "avatar-happy": (392, 1350, 632, 1480),
        "avatar-sad": (638, 1350, 878, 1480),
    },
}


def border_color(pixels: np.ndarray) -> np.ndarray:
    border = np.concatenate(
        [pixels[:8].reshape(-1, 3), pixels[-8:].reshape(-1, 3), pixels[:, :8].reshape(-1, 3), pixels[:, -8:].reshape(-1, 3)]
    )
    return np.median(border, axis=0)


def remove_connected_background(image: Image.Image, threshold: float = 36.0) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    height, width, _ = rgb.shape
    color = border_color(rgb)
    distance = np.linalg.norm(rgb - color, axis=2)
    eligible = distance < threshold
    background = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        if eligible[0, x]:
            queue.append((0, x))
        if eligible[height - 1, x]:
            queue.append((height - 1, x))
    for y in range(height):
        if eligible[y, 0]:
            queue.append((y, 0))
        if eligible[y, width - 1]:
            queue.append((y, width - 1))

    while queue:
        y, x = queue.popleft()
        if background[y, x] or not eligible[y, x]:
            continue
        background[y, x] = True
        if y:
            queue.append((y - 1, x))
        if y + 1 < height:
            queue.append((y + 1, x))
        if x:
            queue.append((y, x - 1))
        if x + 1 < width:
            queue.append((y, x + 1))

    alpha = Image.fromarray((~background * 255).astype(np.uint8), mode="L")
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.65))
    rgba = image.convert("RGBA")
    rgba.putalpha(alpha)
    return rgba


def retain_primary_subject(image: Image.Image) -> Image.Image:
    alpha = np.asarray(image.getchannel("A")) > 32
    height, width = alpha.shape
    seen = np.zeros((height, width), dtype=bool)
    components: list[list[tuple[int, int]]] = []

    for y, x in zip(*np.where(alpha)):
        if seen[y, x]:
            continue
        stack = [(y, x)]
        seen[y, x] = True
        component: list[tuple[int, int]] = []
        while stack:
            current_y, current_x = stack.pop()
            component.append((current_y, current_x))
            for next_y, next_x in (
                (current_y - 1, current_x),
                (current_y + 1, current_x),
                (current_y, current_x - 1),
                (current_y, current_x + 1),
            ):
                if (
                    0 <= next_y < height
                    and 0 <= next_x < width
                    and alpha[next_y, next_x]
                    and not seen[next_y, next_x]
                ):
                    seen[next_y, next_x] = True
                    stack.append((next_y, next_x))
        components.append(component)

    if not components:
        return image
    keep = max(components, key=len)
    mask = np.zeros((height, width), dtype=np.uint8)
    for y, x in keep:
        mask[y, x] = 255
    cleaned = image.copy()
    cleaned.putalpha(Image.fromarray(mask, mode="L").filter(ImageFilter.GaussianBlur(0.35)))
    return cleaned


def normalize_canvas(image: Image.Image, size: int, padding: int) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (size, size))
    subject = image.crop(bbox)
    scale = min((size - padding * 2) / subject.width, (size - padding * 2) / subject.height)
    subject = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size))
    x = (size - subject.width) // 2
    y = size - padding - subject.height
    canvas.alpha_composite(subject, (x, y))
    return canvas


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    preview = Image.new("RGB", size, "#f8f7f3")
    draw = ImageDraw.Draw(preview)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill="#e8e6df")
    return preview


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--spirit", choices=sorted(SHEET_CROPS), required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGB")
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    results: list[tuple[str, Image.Image]] = []
    for name, box in SHEET_CROPS[args.spirit].items():
        cleaned = remove_connected_background(source.crop(box))
        is_avatar = name.startswith("avatar-")
        if name == "base":
            cleaned = retain_primary_subject(cleaned)
        normalized = normalize_canvas(cleaned, 256 if is_avatar else 512, 12 if is_avatar else 22)
        normalized.save(output / f"{args.spirit}-{name}.png", optimize=True)
        results.append((name, normalized))

    tile_width, tile_height = 340, 330
    preview = checkerboard((tile_width * 4, tile_height * 3))
    draw = ImageDraw.Draw(preview)
    for index, (name, asset) in enumerate(results):
        column, row = index % 4, index // 4
        fitted = asset.copy()
        fitted.thumbnail((tile_width - 34, tile_height - 48), Image.Resampling.LANCZOS)
        x = column * tile_width + (tile_width - fitted.width) // 2
        y = row * tile_height + tile_height - fitted.height - 20
        preview.paste(fitted, (x, y), fitted)
        draw.text((column * tile_width + 10, row * tile_height + 8), name, fill="#25231f")
    preview.save(output / f"{args.spirit}-extraction-preview.png", optimize=True)


if __name__ == "__main__":
    main()
