from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


SHEET_CROPS = {
    "lino": {
        "base": (40, 22, 570, 390),
        "mood-happy": (18, 440, 400, 704),
        "mood-calm": (430, 440, 820, 704),
        "mood-shy": (845, 440, 1238, 704),
        "mood-sad": (18, 748, 400, 998),
        "mood-angry": (430, 748, 820, 998),
        "mood-excited": (845, 748, 1238, 998),
        "avatar-neutral": (30, 1080, 172, 1214),
        "avatar-happy": (202, 1080, 344, 1214),
        "avatar-calm": (374, 1080, 516, 1214),
        "avatar-shy": (548, 1080, 690, 1214),
        "avatar-sad": (720, 1080, 862, 1214),
        "avatar-angry": (894, 1080, 1036, 1214),
        "avatar-excited": (1066, 1080, 1218, 1214),
    },
    "momo": {
        "base": (42, 12, 570, 360),
        "mood-happy": (18, 402, 398, 692),
        "mood-calm": (430, 402, 820, 692),
        "mood-shy": (845, 402, 1238, 692),
        "mood-sad": (18, 730, 398, 1018),
        "mood-angry": (430, 730, 820, 1018),
        "mood-excited": (845, 730, 1238, 1018),
        "avatar-neutral": (28, 1094, 170, 1222),
        "avatar-happy": (204, 1094, 346, 1222),
        "avatar-calm": (379, 1094, 521, 1222),
        "avatar-shy": (554, 1094, 696, 1222),
        "avatar-sad": (729, 1094, 871, 1222),
        "avatar-angry": (907, 1094, 1049, 1222),
        "avatar-excited": (1080, 1094, 1222, 1222),
    },
    "piko": {
        "base": (28, 72, 414, 448),
        "mood-happy": (432, 118, 824, 452),
        "mood-calm": (842, 86, 1238, 452),
        "mood-shy": (20, 500, 410, 844),
        "mood-sad": (430, 500, 824, 844),
        "mood-angry": (842, 500, 1238, 844),
        "mood-excited": (20, 884, 410, 1204),
        "avatar-neutral": (440, 956, 664, 1182),
        "avatar-happy": (696, 956, 916, 1182),
        "avatar-sad": (960, 956, 1190, 1182),
    },
    "tutu": {
        "base": (18, 72, 416, 458),
        "mood-happy": (430, 72, 826, 458),
        "mood-calm": (842, 72, 1238, 458),
        "mood-shy": (18, 536, 414, 906),
        "mood-sad": (430, 536, 826, 906),
        "mood-angry": (842, 536, 1238, 906),
        "mood-excited": (20, 968, 412, 1238),
        "avatar-neutral": (458, 1024, 652, 1202),
        "avatar-happy": (704, 1024, 900, 1202),
        "avatar-sad": (958, 1024, 1160, 1202),
    },
    "nox": {
        "base": (24, 188, 410, 500),
        "mood-happy": (432, 188, 824, 500),
        "mood-calm": (842, 188, 1234, 500),
        "mood-shy": (20, 570, 410, 876),
        "mood-sad": (432, 570, 824, 876),
        "mood-angry": (842, 570, 1234, 876),
        "mood-excited": (20, 938, 410, 1208),
        "avatar-neutral": (460, 978, 658, 1182),
        "avatar-happy": (712, 978, 910, 1182),
        "avatar-sad": (964, 978, 1166, 1182),
    },
}

ALL_AVATAR_MOODS = ("neutral", "happy", "calm", "shy", "sad", "angry", "excited")
AVATAR_FALLBACKS = {
    "calm": "neutral",
    "shy": "neutral",
    "angry": "sad",
    "excited": "happy",
}


def border_color(pixels: np.ndarray) -> np.ndarray:
    border = np.concatenate(
        [
            pixels[:6].reshape(-1, 3),
            pixels[-6:].reshape(-1, 3),
            pixels[:, :6].reshape(-1, 3),
            pixels[:, -6:].reshape(-1, 3),
        ]
    )
    bright = border[np.min(border, axis=1) > 215]
    return np.median(bright if len(bright) else border, axis=0)


def remove_connected_background(image: Image.Image, threshold: float = 34.0) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    height, width, _ = rgb.shape
    color = border_color(rgb)
    distance = np.linalg.norm(rgb - color, axis=2)
    eligible = (distance < threshold) & (np.min(rgb, axis=2) > 205)
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

    opaque = Image.fromarray((~background * 255).astype(np.uint8), mode="L")
    opaque = opaque.filter(ImageFilter.GaussianBlur(0.55))
    rgba = image.convert("RGBA")
    rgba.putalpha(opaque)
    return rgba


def component_bounds(image: Image.Image, minimum_area: int = 20) -> list[tuple[int, int, int, int, int]]:
    alpha = np.asarray(image.getchannel("A")) > 40
    height, width = alpha.shape
    seen = np.zeros((height, width), dtype=bool)
    bounds: list[tuple[int, int, int, int, int]] = []

    for start_y, start_x in zip(*np.where(alpha)):
        if seen[start_y, start_x]:
            continue
        stack = [(start_y, start_x)]
        seen[start_y, start_x] = True
        count = 0
        min_x = max_x = start_x
        min_y = max_y = start_y
        while stack:
            y, x = stack.pop()
            count += 1
            min_x, max_x = min(min_x, x), max(max_x, x)
            min_y, max_y = min(min_y, y), max(max_y, y)
            for next_y, next_x in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if (
                    0 <= next_y < height
                    and 0 <= next_x < width
                    and alpha[next_y, next_x]
                    and not seen[next_y, next_x]
                ):
                    seen[next_y, next_x] = True
                    stack.append((next_y, next_x))
        if count >= minimum_area:
            bounds.append((min_x, min_y, max_x + 1, max_y + 1, count))
    return bounds


def normalize_main_asset(image: Image.Image, size: int = 512) -> Image.Image:
    components = component_bounds(image)
    if not components:
        return Image.new("RGBA", (size, size))
    subject = max(components, key=lambda item: item[4])
    subject_width = subject[2] - subject[0]
    subject_height = subject[3] - subject[1]
    scale = min(448 / subject_width, 424 / subject_height)
    scaled = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    scaled_subject = tuple(round(value * scale) for value in subject[:4])
    subject_center_x = (scaled_subject[0] + scaled_subject[2]) / 2
    subject_bottom = scaled_subject[3]
    offset_x = round(size / 2 - subject_center_x)
    offset_y = round(size - 26 - subject_bottom)
    canvas = Image.new("RGBA", (size, size))
    canvas.alpha_composite(scaled, (offset_x, offset_y))
    return canvas


def normalize_avatar(image: Image.Image, size: int = 256) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (size, size))
    content = image.crop(bbox)
    scale = min(232 / content.width, 232 / content.height)
    content = content.resize(
        (max(1, round(content.width * scale)), max(1, round(content.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size))
    canvas.alpha_composite(content, ((size - content.width) // 2, (size - content.height) // 2))
    return canvas


def retain_round_avatar(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    diameter = min(width, height) - 2
    left = (width - diameter) // 2
    top = (height - diameter) // 2
    mask = Image.new("L", (width, height))
    draw = ImageDraw.Draw(mask)
    draw.ellipse((left, top, left + diameter, top + diameter), fill=255)
    rgba.putalpha(mask.filter(ImageFilter.GaussianBlur(0.35)))
    return rgba


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    preview = Image.new("RGB", size, "#f8f7f3")
    draw = ImageDraw.Draw(preview)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill="#e8e6df")
    return preview


def save_asset(image: Image.Image, path: Path) -> None:
    image.save(path.with_suffix(".png"), optimize=True)
    image.save(path.with_suffix(".webp"), "WEBP", quality=92, method=6, exact=True)


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
    generated: dict[str, Image.Image] = {}
    for name, box in SHEET_CROPS[args.spirit].items():
        crop = source.crop(box)
        if name.startswith("avatar-"):
            normalized = normalize_avatar(retain_round_avatar(crop))
        else:
            normalized = normalize_main_asset(remove_connected_background(crop))
        save_asset(normalized, output / f"{args.spirit}-{name}")
        generated[name] = normalized
        results.append((name, normalized))

    for mood in ALL_AVATAR_MOODS:
        name = f"avatar-{mood}"
        if name in generated:
            continue
        fallback = f"avatar-{AVATAR_FALLBACKS[mood]}"
        copied = generated[fallback].copy()
        save_asset(copied, output / f"{args.spirit}-{name}")

    tile_width, tile_height = 300, 286
    rows = (len(results) + 3) // 4
    preview = checkerboard((tile_width * 4, tile_height * rows))
    draw = ImageDraw.Draw(preview)
    for index, (name, asset) in enumerate(results):
        column, row = index % 4, index // 4
        fitted = asset.copy()
        fitted.thumbnail((tile_width - 28, tile_height - 42), Image.Resampling.LANCZOS)
        x = column * tile_width + (tile_width - fitted.width) // 2
        y = row * tile_height + tile_height - fitted.height - 10
        preview.paste(fitted, (x, y), fitted)
        draw.text((column * tile_width + 8, row * tile_height + 7), name, fill="#25231f")
    preview.save(output / f"{args.spirit}-extraction-preview.png", optimize=True)


if __name__ == "__main__":
    main()
