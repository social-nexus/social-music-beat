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

    def test_background_worker_start_failure_marks_job_as_error(self):
        for kind, target, args in (
            ("runtime", ia_local._install_runtime_worker, ("windows-x64",)),
            ("model", ia_local._download_model_worker, ("qwen3-4b-q4km",)),
        ):
            with self.subTest(kind=kind):
                jid = ia_local._job(kind)
                with mock.patch.object(ia_local.threading, "Thread", side_effect=RuntimeError("thread startup failed")):
                    started = ia_local._start_background_job(jid, target, *args)
                self.assertFalse(started)
                self.assertEqual(ia_local.JOBS[jid]["status"], "error")
                self.assertIn("thread startup failed", ia_local.JOBS[jid]["message"])

    def test_runtime_replacement_preserves_previous_install_on_swap_failure(self):
        root = Path(TEMP_DATA) / "runtime-swap-failure"
        final = root / "runtime"
        staged = root / ".runtime.staging"
        final.mkdir(parents=True, exist_ok=True)
        staged.mkdir(parents=True, exist_ok=True)
        (final / "llama-server").write_text("working-old", encoding="utf-8")
        (staged / "llama-server").write_text("new-runtime", encoding="utf-8")
        real_replace = os.replace
        calls = 0

        def fail_staged_swap(source, destination):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError("simulated activation failure")
            return real_replace(source, destination)

        with mock.patch.object(ia_local.os, "replace", side_effect=fail_staged_swap):
            with self.assertRaisesRegex(OSError, "simulated activation failure"):
                ia_local._replace_runtime_directory(staged, final)

        self.assertEqual((final / "llama-server").read_text(encoding="utf-8"), "working-old")
        self.assertTrue(staged.exists())
        self.assertFalse(any(root.glob(".runtime.backup-*")))

    def test_runtime_replacement_activates_new_install_and_cleans_backup(self):
        root = Path(TEMP_DATA) / "runtime-swap-success"
        final = root / "runtime"
        staged = root / ".runtime.staging"
        final.mkdir(parents=True, exist_ok=True)
        staged.mkdir(parents=True, exist_ok=True)
        (final / "llama-server").write_text("old", encoding="utf-8")
        (staged / "llama-server").write_text("new", encoding="utf-8")

        ia_local._replace_runtime_directory(staged, final)

        self.assertEqual((final / "llama-server").read_text(encoding="utf-8"), "new")
        self.assertFalse(staged.exists())
        self.assertFalse(any(root.glob(".runtime.backup-*")))

    def test_model_download_hash_failure_preserves_existing_model(self):
        model_id = "qwen3-4b-q4km"
        meta = ia_local.MODEL_CATALOG[model_id]
        target_dir = Path(TEMP_DATA) / "qwen3-4b-q4km"
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / meta["filename"]
        target.write_bytes(b"previous-valid-model")
        digest = "a" * 64

        def fake_download(url, dest, size, jid):
            dest.write_bytes(b"new-but-invalid-model")

        with mock.patch.object(ia_local, "MODELS_DIR", target_dir.parent), \
             mock.patch.object(ia_local, "_hf_file_digest", return_value=(digest, 23)), \
             mock.patch.object(ia_local, "_download", side_effect=fake_download), \
             mock.patch.object(ia_local, "_update_job") as update:
            ia_local._download_model_worker("job-model-hash", model_id)

        self.assertEqual(target.read_bytes(), b"previous-valid-model")
        self.assertEqual(update.call_args.kwargs["status"], "error")
        self.assertIn("download temporário descartado", update.call_args.kwargs["message"])
        self.assertEqual(list(target_dir.glob("*.download")), [])
        self.assertEqual(list(target_dir.glob("*.download.part")), [])

    def test_model_download_transport_failure_preserves_existing_model(self):
        model_id = "gemma3-4b-it-q4km"
        meta = ia_local.MODEL_CATALOG[model_id]
        target_dir = Path(TEMP_DATA) / "gemma3-4b-it-q4km"
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / meta["filename"]
        target.write_bytes(b"previous-model")

        def fail_download(url, dest, size, jid):
            dest.with_suffix(dest.suffix + ".part").write_bytes(b"partial")
            raise OSError("connection interrupted")

        with mock.patch.object(ia_local, "MODELS_DIR", target_dir.parent), \
             mock.patch.object(ia_local, "_hf_file_digest", return_value=("b" * 64, 100)), \
             mock.patch.object(ia_local, "_download", side_effect=fail_download), \
             mock.patch.object(ia_local, "_update_job") as update:
            ia_local._download_model_worker("job-model-network", model_id)

        self.assertEqual(target.read_bytes(), b"previous-model")
        self.assertEqual(update.call_args.kwargs["status"], "error")
        self.assertEqual(list(target_dir.glob("*.download*")), [])

    def test_model_download_success_atomically_replaces_previous_file(self):
        model_id = "qwen3-4b-q4km"
        meta = ia_local.MODEL_CATALOG[model_id]
        target_dir = Path(TEMP_DATA) / "qwen3-4b-q4km"
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / meta["filename"]
        target.write_bytes(b"old-model")
        new_content = b"verified-new-model"
        import hashlib
        digest = hashlib.sha256(new_content).hexdigest()

        def fake_download(url, dest, size, jid):
            dest.write_bytes(new_content)

        with mock.patch.object(ia_local, "MODELS_DIR", target_dir.parent), \
             mock.patch.object(ia_local, "_hf_file_digest", return_value=(digest, len(new_content))), \
             mock.patch.object(ia_local, "_download", side_effect=fake_download), \
             mock.patch.object(ia_local, "_update_job") as update:
            ia_local._download_model_worker("job-model-success", model_id)

        self.assertEqual(target.read_bytes(), new_content)
        self.assertTrue((target_dir / "model.json").is_file())
        self.assertEqual(update.call_args.kwargs["status"], "done")
        self.assertEqual(list(target_dir.glob("*.download*")), [])

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

    def test_lyrics_header_rejects_unknown_language(self):
        with self.assertRaises(ValueError):
            ia_local._lyrics_header("francês")