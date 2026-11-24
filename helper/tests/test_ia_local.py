import os
import tempfile
import unittest
from pathlib import Path

TEMP_DATA = tempfile.mkdtemp(prefix="smb-ai-tests-")
os.environ["SOCIAL_MUSIC_BEAT_DATA"] = TEMP_DATA

import ia_local


class RuntimeCatalogTests(unittest.TestCase):
    def test_runtime_assets_are_pinned_and_https(self):
        self.assertTrue(ia_local.RUNTIME_CATALOG)
        for variant, item in ia_local.RUNTIME_CATALOG.items():
            with self.subTest(variant=variant):
                self.assertTrue(item["url"].startswith("https://github.com/ggml-org/llama.cpp/"))
                self.assertEqual(len(item["sha256"]), 64)
                self.assertEqual(item["size"], int(item["size"]))
                self.assertGreater(item["size"], 1_000_000)
                for extra in item.get("extras", []):
                    self.assertTrue(extra["url"].startswith("https://github.com/ggml-org/llama.cpp/"))
                    self.assertEqual(len(extra["sha256"]), 64)
                    self.assertGreater(extra["size"], 1_000_000)

    def test_archive_path_rejects_parent_traversal(self):
        root = Path(TEMP_DATA) / "extract"
        with self.assertRaises(ValueError):
            ia_local._safe_member_path(root, "../outside.txt")
        with self.assertRaises(ValueError):
            ia_local._safe_member_path(root, "/absolute/path.txt")

    def test_archive_path_accepts_normal_member(self):
        root = Path(TEMP_DATA) / "extract"
        target = ia_local._safe_member_path(root, "bin/llama-server.exe")
        self.assertEqual(target.name, "llama-server.exe")
        self.assertIn("bin", target.parts)

    def test_catalog_has_qwen_model_and_explicit_license(self):
        model = ia_local.MODEL_CATALOG["qwen3-4b-q4km"]
        self.assertEqual(model["repo"], "Qwen/Qwen3-4B-GGUF")
        self.assertEqual(model["license"], "Apache-2.0")
        self.assertFalse(model["requires_license_acceptance"])
        self.assertTrue(model["filename"].endswith(".gguf"))

    def test_gemma_requires_explicit_terms_acceptance(self):
        model = ia_local.MODEL_CATALOG["gemma3-4b-it-q4km"]
        self.assertEqual(model["repo"], "ggml-org/gemma-3-4b-it-GGUF")
        self.assertEqual(model["license"], "Gemma Terms of Use")
        self.assertTrue(model["requires_license_acceptance"])

    def test_data_is_outside_source_music_folder(self):
        self.assertNotEqual(ia_local.ROOT, Path(ia_local.__file__).parent / "musicas")


if __name__ == "__main__":
    unittest.main()
