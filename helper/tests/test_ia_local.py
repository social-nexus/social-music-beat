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

    def test_stale_model_download_cleanup_removes_only_old_download_artifacts(self):
        root = Path(TEMP_DATA) / "stale-download-cleanup"
        root.mkdir(parents=True, exist_ok=True)
        stale_download = root / ".model.gguf.older.download"
        stale_part = root / ".other.gguf.download.part"
        recent = root / ".recent.gguf.download"
        backup = root / ".model.gguf.backup"
        nested = root / "nested"
        nested.mkdir(exist_ok=True)
        nested_stale = nested / ".nested.gguf.download"
        for path in (stale_download, stale_part, recent, backup, nested_stale):
            path.write_text("artifact", encoding="utf-8")
        old_time = 1
        os.utime(stale_download, (old_time, old_time))
        os.utime(stale_part, (old_time, old_time))
        os.utime(nested_stale, (old_time, old_time))
        removed = ia_local._cleanup_stale_model_downloads(root, older_than_seconds=3600)
        self.assertEqual(removed, 2)
        self.assertFalse(stale_download.exists())
        self.assertFalse(stale_part.exists())
        self.assertTrue(recent.exists())
        self.assertTrue(backup.exists())
        self.assertTrue(nested_stale.exists())

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


    def test_runtime_swap_rejects_staging_without_expected_binary_and_keeps_old(self):
        root = Path(TEMP_DATA) / "runtime-swap-invalid-stage"
        final = root / "runtime"
        staged = root / ".runtime.staging"
        final.mkdir(parents=True, exist_ok=True)
        staged.mkdir(parents=True, exist_ok=True)
        (final / "llama-server").write_text("old-install", encoding="utf-8")
        (staged / "wrong-file").write_text("bad", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "executável esperado"):
            ia_local._replace_runtime_directory(staged, final, expected_binary="llama-server")
        self.assertEqual((final / "llama-server").read_text(encoding="utf-8"), "old-install")
        self.assertTrue(staged.exists())

    def test_runtime_swap_validates_active_binary_before_backup_cleanup(self):
        root = Path(TEMP_DATA) / "runtime-swap-validation"
        final = root / "runtime"
        staged = root / ".runtime.staging"
        final.mkdir(parents=True, exist_ok=True)
        staged.mkdir(parents=True, exist_ok=True)
        (final / "llama-server").write_text("previous", encoding="utf-8")
        (staged / "llama-server").write_text("new", encoding="utf-8")
        real_replace = os.replace
        calls = 0
        def corrupt_activation(source, destination):
            nonlocal calls
            calls += 1
            result = real_replace(source, destination)
            if calls == 2:
                (Path(destination) / "llama-server").unlink()
            return result
        with mock.patch.object(ia_local.os, "replace", side_effect=corrupt_activation):
            with self.assertRaisesRegex(ValueError, "runtime ativado"):
                ia_local._replace_runtime_directory(staged, final, expected_binary="llama-server")
        self.assertEqual((final / "llama-server").read_text(encoding="utf-8"), "previous")
        self.assertTrue(staged.exists())
        self.assertFalse(any(root.glob(".runtime.backup-*")))


    def test_runtime_backup_recovery_ignores_unreadable_stat_candidates(self):
        root = Path(TEMP_DATA) / "runtime-backup-stat-error"
        root.mkdir(parents=True, exist_ok=True)
        final = root / "variant"
        bad = root / ".variant.backup-bad"
        good = root / ".variant.backup-good"
        bad.mkdir()
        good.mkdir()
        (good / "server").write_text("recoverable", encoding="utf-8")
        catalog = {"variant": {"binary": "server"}}
        real_stat = Path.stat
        def fail_bad_stat(path, *args, **kwargs):
            if path == bad:
                raise OSError("permission denied")
            return real_stat(path, *args, **kwargs)
        with mock.patch.object(Path, "stat", fail_bad_stat):
            restored = ia_local._recover_runtime_backups(root, catalog)
        self.assertEqual(restored, 1)
        self.assertEqual((final / "server").read_text(encoding="utf-8"), "recoverable")
        self.assertTrue(bad.exists())

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

    def test_model_download_metadata_publish_failure_restores_previous_pair(self):
        root = Path(TEMP_DATA) / "model-metadata-rollback"
        folder = root / "qwen3-4b-q4km"
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / ia_local.MODEL_CATALOG["qwen3-4b-q4km"]["filename"]
        metadata = folder / "model.json"
        target.write_bytes(b"previous-model")
        metadata.write_text("previous-metadata", encoding="utf-8")
        staged = folder / ".new-model.download"
        metadata_staged = folder / ".new-metadata.json.tmp"
        staged.write_bytes(b"verified-new-model")
        metadata_staged.write_text("new-metadata", encoding="utf-8")
        real_replace = ia_local.os.replace

        def fail_metadata_publish(source, destination):
            if Path(source) == metadata_staged and Path(destination) == metadata:
                raise OSError("metadata publish failed")
            return real_replace(source, destination)

        with mock.patch.object(ia_local.os, "replace", side_effect=fail_metadata_publish):
            with self.assertRaises(OSError):
                ia_local._publish_model_files(staged, target, metadata_staged, metadata)
        self.assertEqual(target.read_bytes(), b"previous-model")
        self.assertEqual(metadata.read_text(encoding="utf-8"), "previous-metadata")
        self.assertEqual(list(folder.glob("*.backup")), [])
        self.assertFalse(staged.exists())
        self.assertTrue(metadata_staged.exists())

    def test_backup_cleanup_failure_does_not_fail_successful_publish(self):
        root = Path(TEMP_DATA) / "model-backup-cleanup-failure"
        folder = root / "qwen3-4b-q4km"
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / ia_local.MODEL_CATALOG["qwen3-4b-q4km"]["filename"]
        metadata = folder / "model.json"
        target.write_bytes(b"old-model")
        metadata.write_text("old-metadata", encoding="utf-8")
        staged = folder / ".new-model.download"
        metadata_staged = folder / ".new-metadata.json.tmp"
        staged.write_bytes(b"new-model")
        metadata_staged.write_text("new-metadata", encoding="utf-8")
        real_unlink = Path.unlink

        def fail_backup_cleanup(path, missing_ok=False):
            if path.name.endswith(".backup"):
                raise OSError("backup cleanup unavailable")
            return real_unlink(path, missing_ok=missing_ok)

        with mock.patch.object(Path, "unlink", fail_backup_cleanup):
            ia_local._publish_model_files(staged, target, metadata_staged, metadata)
        self.assertEqual(target.read_bytes(), b"new-model")
        self.assertEqual(metadata.read_text(encoding="utf-8"), "new-metadata")
        self.assertEqual(len(list(folder.glob(".*.backup"))), 2)

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

class ModelImportAtomicityTests(unittest.IsolatedAsyncioTestCase):
    async def _request(self):
        from starlette.requests import Request
        return Request({"type": "http", "method": "POST", "headers": [
            (b"host", b"localhost:8002"), (b"origin", b"http://localhost:8002")
        ]})

    async def _upload(self, filename="model.gguf", content=None):
        import io
        from starlette.datastructures import UploadFile
        payload = content if content is not None else b"GGUF" + (b"m" * (1024 * 1024))
        return UploadFile(filename=filename, file=io.BytesIO(payload))

    async def test_import_publishes_only_after_model_and_metadata_are_complete(self):
        root = Path(TEMP_DATA) / "model-import-success"
        root.mkdir(parents=True, exist_ok=True)
        with mock.patch.object(ia_local, "MODELS_DIR", root):
            result = await ia_local.import_model(await self._request(), await self._upload())
        folder = root / result["id"]
        self.assertTrue((folder / "model.gguf").is_file())
        self.assertEqual((folder / "model.gguf").read_bytes()[:4], b"GGUF")
        self.assertTrue((folder / "model.json").is_file())
        self.assertEqual(list(root.glob(".*.staging")), [])

    async def test_invalid_import_leaves_no_visible_or_staging_folder(self):
        root = Path(TEMP_DATA) / "model-import-invalid"
        root.mkdir(parents=True, exist_ok=True)
        with mock.patch.object(ia_local, "MODELS_DIR", root):
            with self.assertRaises(ia_local.HTTPException):
                await ia_local.import_model(await self._request(), await self._upload(content=b"NOPE" + b"x" * (1024 * 1024)))
        self.assertEqual(list(root.glob("imported-*")), [])
        self.assertEqual(list(root.glob(".*.staging")), [])

    async def test_import_swap_failure_cleans_staging_without_publishing_model(self):
        root = Path(TEMP_DATA) / "model-import-swap-failure"
        root.mkdir(parents=True, exist_ok=True)
        real_replace = os.replace
        calls = 0

        def fail_folder_publish(source, destination):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError("simulated publish failure")
            return real_replace(source, destination)

        with mock.patch.object(ia_local, "MODELS_DIR", root):
            with mock.patch.object(ia_local.os, "replace", side_effect=fail_folder_publish):
                with self.assertRaisesRegex(OSError, "simulated publish failure"):
                    await ia_local.import_model(await self._request(), await self._upload())
        self.assertEqual(calls, 2)
        self.assertEqual(list(root.glob("imported-*")), [])
        self.assertEqual(list(root.glob(".*.staging")), [])


class ModelDeleteSafetyTests(unittest.TestCase):
    def _request(self):
        from starlette.requests import Request
        return Request({"type": "http", "method": "DELETE", "headers": [
            (b"host", b"localhost:8002"), (b"origin", b"http://localhost:8002")
        ]})

    def _model(self, root, model_id="imported-0123456789"):
        folder = root / model_id
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "model.gguf").write_bytes(b"GGUF" + b"x" * 32)
        return folder

    def test_invalid_model_id_does_not_stop_runtime(self):
        with mock.patch.object(ia_local, "_stop_runtime") as stop:
            with self.assertRaises(ia_local.HTTPException) as ctx:
                ia_local.delete_model("../outside", self._request())
        self.assertEqual(ctx.exception.status_code, 400)
        stop.assert_not_called()

    def test_missing_model_does_not_stop_runtime(self):
        root = Path(TEMP_DATA) / "model-delete-missing"
        root.mkdir(parents=True, exist_ok=True)
        with mock.patch.object(ia_local, "MODELS_DIR", root):
            with mock.patch.object(ia_local, "_stop_runtime") as stop:
                with self.assertRaises(ia_local.HTTPException) as ctx:
                    ia_local.delete_model("imported-0123456789", self._request())
        self.assertEqual(ctx.exception.status_code, 404)
        stop.assert_not_called()

    def test_delete_atomically_hides_then_removes_model(self):
        root = Path(TEMP_DATA) / "model-delete-success"
        root.mkdir(parents=True, exist_ok=True)
        folder = self._model(root)
        with mock.patch.object(ia_local, "MODELS_DIR", root):
            result = ia_local.delete_model(folder.name, self._request())
        self.assertEqual(result, {"ok": True})
        self.assertFalse(folder.exists())
        self.assertEqual(list(root.glob(".*.deleting-*")), [])

    def test_delete_rename_failure_preserves_installed_model(self):
        root = Path(TEMP_DATA) / "model-delete-rename-failure"
        root.mkdir(parents=True, exist_ok=True)
        folder = self._model(root)
        with mock.patch.object(ia_local, "MODELS_DIR", root):
            with mock.patch.object(ia_local.os, "replace", side_effect=OSError("rename failed")):
                with self.assertRaises(ia_local.HTTPException) as ctx:
                    ia_local.delete_model(folder.name, self._request())
        self.assertEqual(ctx.exception.status_code, 500)
        self.assertTrue((folder / "model.gguf").is_file())

    def test_delete_cleanup_failure_keeps_partial_folder_hidden(self):
        root = Path(TEMP_DATA) / "model-delete-cleanup-failure"
        root.mkdir(parents=True, exist_ok=True)
        folder = self._model(root)
        with mock.patch.object(ia_local, "MODELS_DIR", root):
            with mock.patch.object(ia_local.shutil, "rmtree", side_effect=OSError("cleanup failed")):
                with self.assertRaises(ia_local.HTTPException) as ctx:
                    ia_local.delete_model(folder.name, self._request())
        self.assertEqual(ctx.exception.status_code, 500)
        self.assertFalse(folder.exists())
        quarantined = list(root.glob(".*.deleting-*"))
        self.assertEqual(len(quarantined), 1)
        self.assertTrue((quarantined[0] / "model.gguf").is_file())

    def test_active_model_is_stopped_before_directory_isolation(self):
        root = Path(TEMP_DATA) / "model-delete-active"
        root.mkdir(parents=True, exist_ok=True)
        folder = self._model(root)
        with mock.patch.object(ia_local, "MODELS_DIR", root):
            with mock.patch.object(ia_local, "ACTIVE_MODEL", folder.name):
                with mock.patch.object(ia_local, "_stop_runtime") as stop:
                    result = ia_local.delete_model(folder.name, self._request())
        self.assertEqual(result, {"ok": True})
        stop.assert_called_once_with()
        self.assertFalse(folder.exists())

    def test_active_model_is_preserved_when_runtime_cannot_stop(self):
        root = Path(TEMP_DATA) / "model-delete-stop-failure"
        root.mkdir(parents=True, exist_ok=True)
        folder = self._model(root)
        with mock.patch.object(ia_local, "MODELS_DIR", root):
            with mock.patch.object(ia_local, "ACTIVE_MODEL", folder.name):
                with mock.patch.object(ia_local, "_stop_runtime", side_effect=RuntimeError("runtime busy")):
                    with self.assertRaises(ia_local.HTTPException) as ctx:
                        ia_local.delete_model(folder.name, self._request())
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertTrue((folder / "model.gguf").is_file())
        self.assertEqual(list(root.glob(".*.deleting-*")), [])


class ModelOperationLockTests(unittest.TestCase):
    def test_same_model_operations_are_serialized_and_registry_is_cleaned(self):
        import threading
        entered = threading.Event()
        release = threading.Event()
        second_entered = threading.Event()

        def first():
            with ia_local._model_operation_lock("imported-aaaaaaaaaa"):
                entered.set()
                self.assertTrue(release.wait(3))

        def second():
            self.assertTrue(entered.wait(3))
            with ia_local._model_operation_lock("imported-aaaaaaaaaa"):
                second_entered.set()

        one = threading.Thread(target=first)
        two = threading.Thread(target=second)
        one.start()
        two.start()
        self.assertTrue(entered.wait(3))
        self.assertFalse(second_entered.wait(0.05))
        release.set()
        one.join(3)
        two.join(3)
        self.assertFalse(one.is_alive())
        self.assertFalse(two.is_alive())
        self.assertTrue(second_entered.is_set())
        self.assertNotIn("imported-aaaaaaaaaa", ia_local._MODEL_LOCKS)

    def test_different_models_can_operate_independently(self):
        import threading
        both_entered = threading.Barrier(2)
        errors = []

        def worker(model_id):
            try:
                with ia_local._model_operation_lock(model_id):
                    both_entered.wait(timeout=2)
            except Exception as exc:
                errors.append(exc)

        one = threading.Thread(target=worker, args=("qwen3-4b-q4km",))
        two = threading.Thread(target=worker, args=("gemma3-4b-it-q4km",))
        one.start()
        two.start()
        one.join(3)
        two.join(3)
        self.assertFalse(one.is_alive())
        self.assertFalse(two.is_alive())
        self.assertEqual(errors, [])
        self.assertNotIn("qwen3-4b-q4km", ia_local._MODEL_LOCKS)
        self.assertNotIn("gemma3-4b-it-q4km", ia_local._MODEL_LOCKS)


class InterruptedInstallRecoveryTests(unittest.TestCase):
    def test_runtime_backup_restored_only_when_final_missing_and_binary_valid(self):
        root = Path(TEMP_DATA) / "runtime-recovery"
        root.mkdir(parents=True, exist_ok=True)
        backup = root / ".variant.backup-test"
        (backup / "bin").mkdir(parents=True)
        (backup / "bin" / "llama-server").write_bytes(b"runtime")
        restored = ia_local._recover_runtime_backups(root, {"variant": {"binary": "llama-server"}})
        self.assertEqual(restored, 1)
        self.assertTrue((root / "variant" / "bin" / "llama-server").is_file())
        self.assertFalse(backup.exists())

    def test_runtime_backup_is_preserved_if_final_exists_or_backup_invalid(self):
        root = Path(TEMP_DATA) / "runtime-recovery-preserve"
        root.mkdir(parents=True, exist_ok=True)
        final = root / "variant"
        final.mkdir()
        backup = root / ".variant.backup-test"
        backup.mkdir()
        (backup / "llama-server").write_bytes(b"runtime")
        restored = ia_local._recover_runtime_backups(root, {"variant": {"binary": "llama-server"}})
        self.assertEqual(restored, 0)
        self.assertTrue(backup.exists())
        final.rmdir()
        (backup / "llama-server").unlink()
        restored = ia_local._recover_runtime_backups(root, {"variant": {"binary": "llama-server"}})
        self.assertEqual(restored, 0)
        self.assertTrue(backup.exists())

    def test_stale_import_staging_cleanup_is_age_gated_and_scope_limited(self):
        root = Path(TEMP_DATA) / "import-staging-cleanup"
        root.mkdir(parents=True, exist_ok=True)
        stale = root / ".imported-abcdef1234.staging"
        recent = root / ".imported-ffff000000.staging"
        published = root / "imported-abcdef1234"
        stale.mkdir()
        recent.mkdir()
        published.mkdir()
        old = time.time() - 72 * 60 * 60
        os.utime(stale, (old, old))
        self.assertEqual(ia_local._cleanup_stale_model_import_staging(root), 1)
        self.assertFalse(stale.exists())
        self.assertTrue(recent.exists())
        self.assertTrue(published.exists())
