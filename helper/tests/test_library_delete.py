import os
import threading
import time
import tempfile
import unittest
import sys
import types
import json
from pathlib import Path
from unittest import mock

TEST_DATA = tempfile.mkdtemp(prefix="smb-library-delete-tests-")
os.environ["SOCIAL_MUSIC_BEAT_DATA"] = TEST_DATA

# The library route tests do not exercise subtitle generation; avoid importing its
# optional numpy/soundfile dependencies in the lightweight CI test environment.
stub_legenda = types.ModuleType("legenda")
from fastapi import APIRouter
stub_legenda.router = APIRouter()
sys.modules["legenda"] = stub_legenda

import server


class LibraryDeleteTransactionTests(unittest.TestCase):
    def setUp(self):
        self.data = Path(tempfile.mkdtemp(prefix="smb-library-case-"))
        self.library_file = self.data / "biblioteca.json"
        self.audio_file = self.data / "track.wav"
        self.audio_file.write_bytes(b"audio sample")
        server.DATA = self.data
        server.LIB_FILE = self.library_file
        server._lib_lock = __import__("threading").Lock()
        server.write_lib([{"id": "track-1", "file": "track.wav", "title": "Test track"}])

    def test_delete_removes_metadata_and_audio(self):
        result = server.delete_track("track-1")
        self.assertEqual(result, {"ok": True})
        self.assertEqual(server.read_lib(), [])
        self.assertFalse(self.audio_file.exists())

    def test_audio_stage_failure_keeps_metadata_and_audio(self):
        original_replace = server.os.replace

        def fail_audio_stage(src, dst):
            if Path(src) == self.audio_file:
                raise OSError("simulated file busy")
            return original_replace(src, dst)

        with mock.patch.object(server.os, "replace", side_effect=fail_audio_stage):
            with self.assertRaises(server.HTTPException):
                server.delete_track("track-1")
        self.assertEqual(len(server.read_lib()), 1)
        self.assertTrue(self.audio_file.exists())

    def test_metadata_write_failure_restores_audio(self):
        with mock.patch.object(server, "write_lib", side_effect=OSError("simulated disk write error")):
            with self.assertRaises(server.HTTPException):
                server.delete_track("track-1")
        self.assertEqual(len(server.read_lib()), 1)
        self.assertTrue(self.audio_file.exists())
        self.assertFalse(any(self.data.glob("*.deleting")))

    def test_separation_file_pair_commit_rolls_back_on_second_move_failure(self):
        staged_vocals = self.data / ".vocals.tmp.wav"
        staged_instrumental = self.data / ".instrumental.tmp.wav"
        final_vocals = self.data / "vocals.wav"
        final_instrumental = self.data / "instrumental.wav"
        staged_vocals.write_bytes(b"staged vocals")
        staged_instrumental.write_bytes(b"staged instrumental")
        final_vocals.write_bytes(b"previous vocals")
        final_instrumental.write_bytes(b"previous instrumental")
        original_replace = server.os.replace

        def fail_second_move(src, dst):
            if Path(src) == staged_instrumental and Path(dst) == final_instrumental:
                raise OSError("simulated promotion failure")
            return original_replace(src, dst)

        with mock.patch.object(server.os, "replace", side_effect=fail_second_move):
            with self.assertRaises(OSError):
                server._commit_separation_outputs(
                    [staged_vocals, staged_instrumental],
                    [final_vocals, final_instrumental],
                )
        self.assertEqual(final_vocals.read_bytes(), b"previous vocals")
        self.assertEqual(final_instrumental.read_bytes(), b"previous instrumental")
        self.assertFalse(staged_vocals.exists())
        self.assertFalse(staged_instrumental.exists())
        self.assertFalse(any(self.data.glob("*.backup")))

    def test_job_registry_prunes_expired_and_caps_completed_entries(self):
        server.jobs.clear()
        now = 500000.0
        server.jobs["old"] = {"status": "done", "finished_at": now - server._JOBS_TTL_SECONDS - 1}
        for i in range(server._JOBS_MAX_COMPLETED + 5):
            server.jobs[f"done-{i}"] = {"status": "done", "finished_at": now - i}
        server.jobs["active"] = {"status": "running", "created_at": now}
        server._prune_jobs(now)
        self.assertNotIn("old", server.jobs)
        self.assertIn("active", server.jobs)
        self.assertEqual(sum(1 for item in server.jobs.values() if item.get("finished_at")), server._JOBS_MAX_COMPLETED)

    def test_job_registry_concurrent_updates_and_pruning(self):
        server.jobs.clear()
        job_ids = [f"parallel-{i}" for i in range(6)]
        with server._jobs_registry_lock:
            for jid in job_ids:
                server.jobs[jid] = {"status": "running", "msg": "queued", "created_at": time.time()}
        failures = []
        def worker(jid):
            try:
                for i in range(80):
                    server._update_job(jid, progress=i)
                    snapshot = server.job_status(jid)
                    self.assertEqual(snapshot["status"], "running")
                    server._prune_jobs()
            except Exception as exc:
                failures.append(exc)
        threads = [threading.Thread(target=worker, args=(jid,)) for jid in job_ids]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=3)
            self.assertFalse(thread.is_alive())
        self.assertEqual(failures, [])
        for jid in job_ids:
            self.assertEqual(server.job_status(jid)["progress"], 79)

    def test_separation_rollback_failure_reports_backup_location(self):
        staged_vocals = self.data / ".vocals.tmp.wav"
        staged_instrumental = self.data / ".instrumental.tmp.wav"
        final_vocals = self.data / "vocals.wav"
        final_instrumental = self.data / "instrumental.wav"
        staged_vocals.write_bytes(b"staged vocals")
        staged_instrumental.write_bytes(b"staged instrumental")
        final_vocals.write_bytes(b"previous vocals")
        final_instrumental.write_bytes(b"previous instrumental")
        original_replace = server.os.replace

        def fail_promotion_and_restore(src, dst):
            if Path(src) == staged_instrumental and Path(dst) == final_instrumental:
                raise OSError("simulated promotion failure")
            if Path(src).name.endswith(".backup") and Path(dst) == final_instrumental:
                raise OSError("simulated restore failure")
            return original_replace(src, dst)

        with mock.patch.object(server.os, "replace", side_effect=fail_promotion_and_restore):
            with self.assertRaisesRegex(RuntimeError, "backup retained at"):
                server._commit_separation_outputs(
                    [staged_vocals, staged_instrumental],
                    [final_vocals, final_instrumental],
                )
        self.assertEqual(final_vocals.read_bytes(), b"previous vocals")
        self.assertFalse(final_instrumental.exists())
        retained = list(self.data.glob(".*instrumental.wav.*.backup"))
        self.assertEqual(len(retained), 1)
        self.assertEqual(retained[0].read_bytes(), b"previous instrumental")
        self.assertFalse(staged_vocals.exists())
        self.assertFalse(staged_instrumental.exists())

    def test_separation_job_ids_are_full_uuid_and_registered(self):
        server.jobs.clear()
        with mock.patch.object(server.threading, "Thread") as thread_factory:
            first = server.separate({"file": "track.wav"})
            second = server.separate({"file": "track.wav"})
        for response in (first, second):
            self.assertEqual(len(response["job"]), 32)
            self.assertRegex(response["job"], r"^[0-9a-f]{32}$")
            self.assertEqual(server.job_status(response["job"])["status"], "running")
        self.assertNotEqual(first["job"], second["job"])
        self.assertEqual(thread_factory.call_count, 2)

    def test_separation_workers_are_serialized(self):
        server.jobs.clear()
        active = 0
        maximum = 0
        counter_lock = threading.Lock()
        def mocked_separate(src, stem):
            nonlocal active, maximum
            with counter_lock:
                active += 1
                maximum = max(maximum, active)
            time.sleep(0.04)
            with counter_lock:
                active -= 1
            return {"voice": "v.wav", "instrumental": "i.wav"}
        server._separation_job_lock = threading.Lock()
        with mock.patch.object(server, "separate_file", side_effect=mocked_separate):
            threads = []
            for jid in ("job-a", "job-b"):
                server.jobs[jid] = {"status": "running", "msg": "Na fila..."}
                thread = threading.Thread(target=server.run_separation, args=(jid, self.audio_file))
                thread.start()
                threads.append(thread)
            for thread in threads:
                thread.join(timeout=2)
                self.assertFalse(thread.is_alive())
        self.assertEqual(maximum, 1)
        self.assertEqual(server.jobs["job-a"]["status"], "done")
        self.assertEqual(server.jobs["job-b"]["status"], "done")

    def test_audio_persist_publishes_complete_file(self):
        result = server._persist_audio_content(b"full-audio-payload", "wav")
        target = self.data / Path(result).name
        self.assertEqual(target.read_bytes(), b"full-audio-payload")
        self.assertFalse(any(self.data.glob("*.tmp")))

    def test_audio_persist_cleans_staging_file_when_promotion_fails(self):
        original_replace = server.os.replace
        def fail_audio_promote(src, dst):
            if Path(dst).suffix == ".wav" and Path(src).suffix == ".tmp":
                raise OSError("simulated promotion error")
            return original_replace(src, dst)
        existing_audio = set(self.data.glob("*.wav"))
        with mock.patch.object(server.os, "replace", side_effect=fail_audio_promote):
            with self.assertRaises(server.HTTPException) as raised:
                server._persist_audio_content(b"payload", "wav")
        self.assertEqual(raised.exception.status_code, 500)
        self.assertEqual(set(self.data.glob("*.wav")), existing_audio)
        self.assertFalse(any(self.data.glob("*.tmp")))

    def test_single_upsert_rejects_invalid_track_id(self):
        for invalid in (None, 7, {}, "", "   "):
            with self.subTest(invalid=invalid):
                with self.assertRaises(server.HTTPException) as raised:
                    server.upsert_track({"id": invalid, "file": "x.wav"})
                self.assertEqual(raised.exception.status_code, 400)
                self.assertEqual(len(server.read_lib()), 1)

    def test_library_write_cleanup_error_does_not_mask_commit(self):
        original_unlink = Path.unlink
        def fail_temp_cleanup(path, *args, **kwargs):
            if path.name.endswith(".tmp"):
                raise OSError("simulated temp cleanup permission error")
            return original_unlink(path, *args, **kwargs)
        replacement = [{"id": "replacement", "file": "replacement.wav"}]
        with mock.patch.object(Path, "unlink", fail_temp_cleanup):
            server.write_lib(replacement)
        self.assertEqual(server.read_lib(), replacement)

    def test_audio_persist_cleanup_failure_does_not_mask_save_error(self):
        original_replace = server.os.replace
        original_unlink = Path.unlink
        def fail_promotion(src, dst):
            if Path(dst).suffix == ".wav" and Path(src).suffix == ".tmp":
                raise OSError("simulated promotion error")
            return original_replace(src, dst)
        def fail_temp_cleanup(path, *args, **kwargs):
            if path.name.endswith(".tmp"):
                raise OSError("simulated cleanup error")
            return original_unlink(path, *args, **kwargs)
        with mock.patch.object(server.os, "replace", side_effect=fail_promotion):
            with mock.patch.object(Path, "unlink", fail_temp_cleanup):
                with self.assertRaises(server.HTTPException) as raised:
                    server._persist_audio_content(b"payload", "wav")
        self.assertEqual(raised.exception.status_code, 500)
        self.assertIn("salvar o áudio", raised.exception.detail)
        # Cleanup failure can leave a staging file, but never masks the save failure.
        self.assertEqual(len(list(self.data.glob("*.tmp"))), 0)
        self.assertEqual(len(list(self.data.glob(".*.tmp"))), 1)

    def test_batch_upsert_persists_all_tracks_atomically(self):
        items = [{"id": "voice", "file": "voice.wav"}, {"id": "inst", "file": "inst.wav"}]
        result = server.upsert_tracks_batch({"items": items})
        self.assertEqual(result, {"ok": True})
        self.assertEqual(server.read_lib()[:2], items)

    def test_read_library_missing_file_is_empty(self):
        server.LIB_FILE.unlink()
        self.assertEqual(server.read_lib(), [])

    def test_read_library_corruption_is_fail_closed(self):
        original = b'{"broken":'
        server.LIB_FILE.write_bytes(original)
        with self.assertRaises(RuntimeError):
            server.read_lib()
        self.assertEqual(server.LIB_FILE.read_bytes(), original)

    def test_read_library_rejects_non_list_and_non_object_entries(self):
        server.LIB_FILE.write_text(json.dumps({"unexpected": "object"}), encoding="utf-8")
        with self.assertRaises(RuntimeError):
            server.read_lib()
        server.LIB_FILE.write_text(json.dumps([{"id": "ok"}, "invalid-entry"]), encoding="utf-8")
        with self.assertRaises(RuntimeError):
            server.read_lib()

    def test_batch_upsert_rejects_non_string_ids(self):
        for invalid in ([], {}, 12, ""):
            with self.subTest(invalid=invalid):
                with self.assertRaises(server.HTTPException) as raised:
                    server.upsert_tracks_batch({"items": [{"id": invalid}]})
                self.assertEqual(raised.exception.status_code, 400)
                self.assertEqual(len(server.read_lib()), 1)

    def test_batch_upsert_rejects_duplicate_ids(self):
        with self.assertRaises(server.HTTPException) as raised:
            server.upsert_tracks_batch({"items": [{"id": "dup"}, {"id": "dup"}]})
        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(len(server.read_lib()), 1)

    def test_batch_upsert_invalid_input_keeps_library(self):
        with self.assertRaises(server.HTTPException):
            server.upsert_tracks_batch({"items": [{"file": "missing-id.wav"}]})
        self.assertEqual(len(server.read_lib()), 1)

    def test_cleanup_removes_unregistered_audio(self):
        server.write_lib([])
        result = server.cleanup_unregistered_audio({"file": str(self.audio_file)})
        self.assertEqual(result, {"ok": True})
        self.assertFalse(self.audio_file.exists())

    def test_cleanup_does_not_remove_library_audio(self):
        with self.assertRaises(server.HTTPException) as raised:
            server.cleanup_unregistered_audio({"file": str(self.audio_file)})
        self.assertEqual(raised.exception.status_code, 409)
        self.assertTrue(self.audio_file.exists())

    def test_delete_unknown_id_is_noop(self):
        result = server.delete_track("missing")
        self.assertEqual(result, {"ok": True})
        self.assertEqual(len(server.read_lib()), 1)
        self.assertTrue(self.audio_file.exists())


if __name__ == "__main__":
    unittest.main()
