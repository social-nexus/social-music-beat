import os
import tempfile
import unittest
from unittest import mock
from pathlib import Path

TEMP_DATA = tempfile.mkdtemp(prefix="smb-ai-tests-")
os.environ["SOCIAL_MUSIC_BEAT_DATA"] = TEMP_DATA

import ia_local


class RuntimeCatalogTests(unittest.TestCase):
    def test_local_request_guard_requires_exact_host_and_same_origin_for_mutations(self):
        from starlette.requests import Request

        def request(headers):
            return Request({"type": "http", "method": "POST", "headers": headers})

        with self.assertRaises(ia_local.HTTPException):
            ia_local._guard_local_request(request([(b"host", b"localhost:8002")]))
        with self.assertRaises(ia_local.HTTPException):
            ia_local._guard_local_request(request([
                (b"host", b"localhost:8002"),
                (b"origin", b"https://attacker.example"),
            ]))
        with self.assertRaises(ia_local.HTTPException):
            ia_local._guard_local_request(request([
                (b"host", b"localhost:8002"),
                (b"origin", b"http://localhost:8002"),
                (b"sec-fetch-site", b"cross-site"),
            ]))
        ia_local._guard_local_request(request([
            (b"host", b"localhost:8002"),
            (b"origin", b"http://localhost:8002"),
            (b"sec-fetch-site", b"same-origin"),
        ]))

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

    def test_sha256_normalization_accepts_prefixed_and_plain_values(self):
        digest = "a" * 64
        self.assertEqual(ia_local._normalize_sha256(digest), digest)
        self.assertEqual(ia_local._normalize_sha256("sha256:" + digest), digest)
        with self.assertRaises(ValueError):
            ia_local._normalize_sha256("not-a-sha")

    def test_download_stops_when_over_expected_size_and_cleans_partial(self):
        import io
        class FakeResponse:
            headers = {"Content-Length": "3"}
            def __init__(self): self.stream = io.BytesIO(b"ABCD")
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self, size=-1): return self.stream.read(size)
        dest = Path(TEMP_DATA) / "download-test.bin"
        partial = dest.with_suffix(dest.suffix + ".part")
        dest.unlink(missing_ok=True)
        partial.unlink(missing_ok=True)
        with mock.patch.object(ia_local, "urlopen", return_value=FakeResponse()), \
             mock.patch.object(ia_local, "_update_job"):
            with self.assertRaises(ValueError):
                ia_local._download("https://example.test/file", dest, 3, "job-test")
        self.assertFalse(dest.exists())
        self.assertFalse(partial.exists())

    def test_download_accepts_exact_expected_size(self):
        import io
        class FakeResponse:
            headers = {"Content-Length": "4"}
            def __init__(self): self.stream = io.BytesIO(b"DATA")
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self, size=-1): return self.stream.read(size)
        dest = Path(TEMP_DATA) / "download-exact.bin"
        dest.unlink(missing_ok=True)
        with mock.patch.object(ia_local, "urlopen", return_value=FakeResponse()), \
             mock.patch.object(ia_local, "_update_job"):
            ia_local._download("https://example.test/file", dest, 4, "job-test")
        self.assertEqual(dest.read_bytes(), b"DATA")
        dest.unlink(missing_ok=True)

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

    def test_shared_models_directory_override_is_respected(self):
        shared = Path(TEMP_DATA) / "shared" / "LLM"
        with mock.patch.dict(os.environ, {"SOCIAL_MUSIC_BEAT_MODELS_DIR": str(shared)}):
            self.assertEqual(ia_local.models_dir(), shared)

    def test_default_models_directory_remains_inside_user_data(self):
        with mock.patch.dict(os.environ):
            os.environ.pop("SOCIAL_MUSIC_BEAT_MODELS_DIR", None)
            self.assertEqual(ia_local.models_dir(), ia_local.ROOT / "models")

    def test_data_is_outside_source_music_folder(self):
        self.assertNotEqual(ia_local.ROOT, Path(ia_local.__file__).parent / "musicas")


if __name__ == "__main__":
    unittest.main()


class LocalRequestSecurityMiddlewareTests(unittest.IsolatedAsyncioTestCase):
    async def _run(self, headers, chunks, limit=8):
        import sys
        import types
        if "server" not in sys.modules:
            from fastapi import APIRouter
            fake_legenda = types.ModuleType("legenda")
            fake_legenda.router = APIRouter()
            with mock.patch.dict(sys.modules, {"legenda": fake_legenda}):
                import server
        else:
            import server
        messages = [{"type": "http.request", "body": chunk, "more_body": i < len(chunks)-1}
                    for i, chunk in enumerate(chunks)]
        async def receive():
            return messages.pop(0) if messages else {"type": "http.request", "body": b"", "more_body": False}
        sent = []
        async def send(message):
            sent.append(message)
        async def app(scope, receive, send):
            while True:
                msg = await receive()
                if not msg.get("more_body", False):
                    break
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b"ok"})
        middleware = server.LocalRequestSecurityMiddleware(app)
        scope = {"type": "http", "path": "/api/ai/models/import", "method": "POST", "headers": headers}
        with mock.patch.object(server, "MAX_MODEL_UPLOAD_BODY", limit):
            await middleware(scope, receive, send)
        return sent

    async def test_rejects_cross_origin_state_change(self):
        sent = await self._run([(b"host", b"localhost:8002"), (b"origin", b"https://evil.example")], [b"x"])
        self.assertEqual(sent[0]["status"], 403)

    async def test_rejects_body_exceeding_limit_without_content_length(self):
        sent = await self._run([(b"host", b"localhost:8002"), (b"origin", b"http://localhost:8002")], [b"1234", b"5678"], limit=6)
        self.assertEqual(sent[0]["status"], 413)

    async def test_accepts_body_at_limit(self):
        sent = await self._run([(b"host", b"localhost:8002"), (b"origin", b"http://localhost:8002")], [b"1234", b"5678"], limit=8)
        self.assertEqual(sent[0]["status"], 200)


class MultilingualLyricsTests(unittest.TestCase):
    def test_language_directive_covers_all_supported_song_languages(self):
        expected = {
            "português do Brasil": "português natural do Brasil",
            "inglês": "natural, idiomatic English",
            "espanhol": "español natural y fluido",
        }
        for language, phrase in expected.items():
            with self.subTest(language=language):
                self.assertIn(phrase, ia_local._language_directive(language))

    def test_language_directive_rejects_unknown_language(self):
        with self.assertRaises(ValueError):
            ia_local._language_directive("francês")

    def test_language_directive_keeps_structural_tags_in_english(self):
        expected = {
            "português do Brasil": "tags estruturais",
            "inglês": "song-structure tags",
            "espanhol": "etiquetas estructurales",
        }
        for language, phrase in expected.items():
            with self.subTest(language=language):
                self.assertIn(phrase, ia_local._language_directive(language))

    def test_lyrics_header_is_localized_for_each_supported_language(self):
        expected = {
            "português do Brasil": "TÍTULO:",
            "inglês": "TITLE:",
            "espanhol": "TÍTULO:",
        }
        for language, heading in expected.items():
            with self.subTest(language=language):
                header = ia_local._lyrics_header(language)
                self.assertIn(heading, header)
                self.assertIn("[Verse 1]", "[Verse 1]")  # Section tags remain English in generated examples.

    def test_lyrics_header_rejects_unknown_language(self):
        with self.assertRaises(ValueError):
            ia_local._lyrics_header("francês")