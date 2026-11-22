from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "icon-192.png"
DIST = ROOT / "dist"

if not SOURCE.is_file():
    raise SystemExit(f"Missing source PWA icon: {SOURCE}")
if not DIST.is_dir():
    raise SystemExit("Vite dist directory does not exist; run the production build first")

with Image.open(SOURCE) as source:
    source.load()
    if source.width != source.height:
        raise SystemExit(f"PWA source icon must be square, got {source.size}")
    rgba = source.convert("RGBA")

    # Export real PNG resources with dimensions that exactly match the manifest.
    rgba.resize((192, 192), Image.Resampling.LANCZOS).save(
        DIST / "icon-192.png", format="PNG", optimize=True
    )
    rgba.resize((512, 512), Image.Resampling.LANCZOS).save(
        DIST / "icon-512.png", format="PNG", optimize=True
    )

    # Maskable icons need an opaque full-bleed background and artwork kept
    # inside the central safe zone (approximately 80% of the canvas).
    safe_art = rgba.resize((410, 410), Image.Resampling.LANCZOS)
    maskable = Image.new("RGBA", (512, 512), (2, 6, 17, 255))
    maskable.alpha_composite(safe_art, ((512 - 410) // 2, (512 - 410) // 2))
    maskable.convert("RGB").save(
        DIST / "icon-maskable-512.png", format="PNG", optimize=True
    )

for filename, expected in [
    ("icon-192.png", (192, 192)),
    ("icon-512.png", (512, 512)),
    ("icon-maskable-512.png", (512, 512)),
]:
    with Image.open(DIST / filename) as image:
        if image.size != expected:
            raise SystemExit(f"{filename}: expected {expected}, got {image.size}")
        print(f"Validated {filename}: {image.size[0]}x{image.size[1]}, {image.format}")
