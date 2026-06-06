"""Офлайн-генерация графических артов за швом AssetGenerator (SPEC §10, §8).

Арты (портреты классов, фоны регионов) генерируются НЕ в горячем пути запроса, а
build-time скриптом → файлы + manifest.json в каталог фронтенда → коммит. В рантайме
отдаются статикой. Без ключа используется PlaceholderAdapter (детерминированный SVG),
с ключом — FluxAdapter (Replicate). Запуск: `uv run python -m app.assets`.
"""

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from app.catalog import Catalog, default_catalog

# Единый стиль промптов (тёмное фэнтези, олдскульная RPG).
STYLE = (
    "dark fantasy, old-school RPG concept art, painterly, dramatic lighting, "
    "muted gold and bronze palette, no text, no watermark"
)


@dataclass(frozen=True)
class AssetSpec:
    id: str
    category: str  # "classes" | "regions"
    prompt: str
    width: int = 512
    height: int = 512


@dataclass(frozen=True)
class AssetRef:
    id: str
    category: str
    path: str  # относительный путь, напр. "classes/model-mage.svg"


class AssetAdapter(Protocol):
    extension: str

    def generate(self, spec: AssetSpec) -> bytes: ...


class PlaceholderAdapter:
    """Детерминированный SVG-плейсхолдер (без сети, для тестов и работы без ключа)."""

    extension = "svg"

    def generate(self, spec: AssetSpec) -> bytes:
        hue = sum(spec.id.encode("utf-8")) % 360
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'width="{spec.width}" height="{spec.height}" '
            f'viewBox="0 0 {spec.width} {spec.height}">'
            f'<rect width="100%" height="100%" fill="hsl({hue} 30% 18%)"/>'
            f'<rect x="6" y="6" width="{spec.width - 12}" height="{spec.height - 12}" '
            f'fill="none" stroke="hsl({hue} 50% 45%)" stroke-width="6"/>'
            f'<text x="50%" y="50%" fill="hsl({hue} 40% 70%)" '
            f'font-family="serif" font-size="20" text-anchor="middle">'
            f"{spec.category}/{spec.id}</text>"
            f"</svg>"
        )
        return svg.encode("utf-8")


class FluxAdapter:
    """Генерация через Flux (Replicate). Только live — сетевой вызов."""

    extension = "png"

    def __init__(self, model: str = "black-forest-labs/flux-schnell") -> None:
        self.model = model

    def generate(self, spec: AssetSpec) -> bytes:  # pragma: no cover — live-only
        # Опциональные зависимости (только для живой генерации) — ленивый импорт.
        import httpx
        import replicate

        output = replicate.run(
            self.model,
            input={
                "prompt": spec.prompt,
                "width": spec.width,
                "height": spec.height,
            },
        )
        first = output[0] if isinstance(output, list) else output
        url = first.url if hasattr(first, "url") else str(first)
        return httpx.get(url, timeout=60).content


def build_specs(catalog: Catalog) -> list[AssetSpec]:
    """Промпты для портретов классов и фонов регионов из каталога."""
    specs: list[AssetSpec] = []
    for hero_class in catalog.classes:
        specs.append(
            AssetSpec(
                id=hero_class.id,
                category="classes",
                prompt=f"character portrait of {hero_class.title}, {STYLE}",
            )
        )
    for region in catalog.regions:
        specs.append(
            AssetSpec(
                id=region.id,
                category="regions",
                prompt=f"landscape of {region.title}, {STYLE}",
                width=768,
                height=512,
            )
        )
    return specs


def generate_assets(
    adapter: AssetAdapter,
    specs: list[AssetSpec],
    out_dir: Path,
    *,
    force: bool = False,
) -> list[AssetRef]:
    """Сгенерировать недостающие арты и записать manifest.json. Идемпотентно."""
    refs: list[AssetRef] = []
    for spec in specs:
        rel = f"{spec.category}/{spec.id}.{adapter.extension}"
        target = out_dir / rel
        if force or not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(adapter.generate(spec))
        refs.append(AssetRef(id=spec.id, category=spec.category, path=rel))

    manifest = {ref.id: ref.path for ref in refs}
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return refs


def _select_adapter() -> AssetAdapter:
    if os.environ.get("REPLICATE_API_TOKEN"):
        return FluxAdapter()
    return PlaceholderAdapter()


def main() -> None:  # pragma: no cover — CLI
    root = Path(__file__).resolve().parents[2]
    out_dir = root / "frontend" / "public" / "assets"
    adapter = _select_adapter()
    refs = generate_assets(adapter, build_specs(default_catalog()), out_dir)
    # Импортируемый фронтендом манифест (src/theme/assetManifest.json).
    manifest = {ref.id: ref.path for ref in refs}
    src_manifest = root / "frontend" / "src" / "theme" / "assetManifest.json"
    src_manifest.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Сгенерировано {len(refs)} ассетов ({adapter.extension}) в {out_dir}")


if __name__ == "__main__":  # pragma: no cover
    main()
