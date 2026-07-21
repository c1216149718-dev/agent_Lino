from pathlib import Path

from PIL import Image


SOURCE = Path(r"C:\Users\ASUS\.codex\generated_images\019ef7de-4086-7323-8953-1d1d35c48905\exec-5b7b0afa-ef66-4e08-89ad-e24404fedde8.png")
OUTPUT = Path(r"C:\Users\ASUS\agent-home\public\lumora-assets\envelopes")
CHARACTERS = Path(r"C:\Users\ASUS\agent-home\public\lumora-assets\characters")
NAMES = [
    "cherry-poem",
    "mountain-mist",
    "brocade-cloud",
    "vintage-collage",
    "starry-journal",
    "coffee-time",
    "unicorn-dream",
    "frog-eyes",
    "banana-nope",
]


def main():
    sheet = Image.open(SOURCE).convert("RGB")
    cell_width = sheet.width // 3
    cell_height = sheet.height // 3
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(NAMES):
        row, column = divmod(index, 3)
        crop = sheet.crop((
            column * cell_width,
            row * cell_height,
            (column + 1) * cell_width,
            (row + 1) * cell_height,
        ))
        crop.save(OUTPUT / f"{name}.webp", "WEBP", quality=88, method=6)
    for name in ("bamboo-breeze", "spring-letter", "pizza-mood"):
        source = OUTPUT / f"{name}.png"
        image = Image.open(source).convert("RGB")
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        image.save(OUTPUT / f"{name}.webp", "WEBP", quality=88, method=6)
    for source in CHARACTERS.glob("*/*.png"):
        if source.name.endswith("-extraction-preview.png"):
            continue
        image = Image.open(source).convert("RGBA")
        image.save(source.with_suffix(".webp"), "WEBP", lossless=True, method=6)


if __name__ == "__main__":
    main()
