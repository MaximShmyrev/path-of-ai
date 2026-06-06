"""E9: офлайн-генерация артов за швом AssetGenerator (SPEC §10, §8).

PlaceholderAdapter (детерминированный SVG, без сети) тестируется полностью;
FluxAdapter — только live (помечен live_flux, вне обычного прогона).
"""

import json
import os
from pathlib import Path

import pytest

from app.assets import (
    AssetSpec,
    FluxAdapter,
    PlaceholderAdapter,
    _select_adapter,
    build_specs,
    generate_assets,
)
from app.catalog import default_catalog


class TestPlaceholderAdapter:
    def test_deterministic_svg_with_id(self) -> None:
        adapter = PlaceholderAdapter()
        spec = AssetSpec(id="model-mage", category="classes", prompt="x")
        first = adapter.generate(spec)
        second = adapter.generate(spec)
        assert first == second  # детерминированно
        assert first.lstrip().startswith(b"<svg")
        assert b"model-mage" in first
        assert adapter.extension == "svg"


class TestBuildSpecs:
    def test_covers_classes_and_regions(self) -> None:
        specs = build_specs(default_catalog())
        categories = {spec.category for spec in specs}
        assert "classes" in categories
        assert "regions" in categories
        assert all(spec.prompt for spec in specs)


class _CountingAdapter(PlaceholderAdapter):
    def __init__(self) -> None:
        self.calls = 0

    def generate(self, spec: AssetSpec) -> bytes:
        self.calls += 1
        return super().generate(spec)


SPECS = [
    AssetSpec(id="model-mage", category="classes", prompt="p"),
    AssetSpec(id="ml", category="regions", prompt="p"),
]


class TestGenerateAssets:
    def test_writes_files_and_manifest(self, tmp_path: Path) -> None:
        refs = generate_assets(PlaceholderAdapter(), SPECS, tmp_path)
        assert (tmp_path / "classes" / "model-mage.svg").exists()
        manifest = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
        assert manifest["model-mage"] == "classes/model-mage.svg"
        assert len(refs) == 2

    def test_idempotent_skips_existing(self, tmp_path: Path) -> None:
        spy = _CountingAdapter()
        generate_assets(spy, SPECS, tmp_path)
        generate_assets(spy, SPECS, tmp_path)
        assert spy.calls == len(SPECS)  # второй прогон пропустил существующие

    def test_force_regenerates(self, tmp_path: Path) -> None:
        spy = _CountingAdapter()
        generate_assets(spy, SPECS, tmp_path)
        generate_assets(spy, SPECS, tmp_path, force=True)
        assert spy.calls == 2 * len(SPECS)


class TestSelectAdapter:
    def test_placeholder_without_token(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("REPLICATE_API_TOKEN", raising=False)
        assert isinstance(_select_adapter(), PlaceholderAdapter)

    def test_flux_with_token(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("REPLICATE_API_TOKEN", "test-token")
        assert isinstance(_select_adapter(), FluxAdapter)


@pytest.mark.live_flux
def test_flux_live_generates_image(tmp_path: Path) -> None:
    token = os.environ.get("REPLICATE_API_TOKEN")
    if not token:
        pytest.skip("REPLICATE_API_TOKEN не задан")
    data = FluxAdapter().generate(
        AssetSpec(id="t", category="classes", prompt="a dark fantasy knight portrait")
    )
    assert len(data) > 1000
