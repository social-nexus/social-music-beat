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
        # Each test starts with an isolated task registry; otherwise a running
        # job created by another test can incorrectly block deletion here.
        with server._jobs_registry_lock:
            server.jobs.clear()
        server.write_lib([{"id": "track-1", "file": "track.wav", "title": "Test track"}])

    def test_recovery_marks_running_separation_as_interrupted(self):
        jid = "a" * 32
        server.jobs.clear()
        server.jobs[jid] = {
            "status": "running",
            "msg": "Separando voz e instrumental...",
            "created_at": time.time() - 30,
            "source_file": "track.wav",
        }
        with server._jobs_registry_lock:
            server._persist_jobs_locked()
        server.jobs.clear()

        server.recover_separation_jobs()

        recovered = server.job_status(jid)
        self.assertEqual(recovered["status"], "error")
        self.assertIn("interrompida", recovered["msg"].lower())
        self.assertIsNotNone(recovered.get("finished_at"))
        self.assertEqual(recovered["source_file"], "track.wav")

    def test_recovery_preserves_completed_separation_results(self):
        jid = "b" * 32
        vocals = self.data / "result_voz.wav"
        instrumental = self.data / "result_instrumental.wav"
        vocals.write_bytes(b"vocals")
        instrumental.write_bytes(b"instrumental")
        server.jobs.clear()
        server.jobs[jid] = {
            "status": "done",
            "msg": "Concluído",
            "created_at": time.time() - 10,
            "finished_at": time.time(),
            "result": {
                "voz": f"/musicas/{vocals.name}",
                "instrumental": f"/musicas/{instrumental.name}",
            },
        }
        with server._jobs_registry_lock:
            server._persist_jobs_locked()
        server.jobs.clear()

        server.recover_separation_jobs()

        recovered = server.job_status(jid)
        self.assertEqual(recovered["status"], "done")
        self.assertEqual(recovered["result"]["voz"], f"/musicas/{vocals.name}")
        self.assertTrue(vocals.exists())
        self.assertTrue(instrumental.exists())

    def test_recovery_normalizes_invalid_job_timestamps(self):
        jobs_file = self.data / server._JOBS_FILE_NAME
        jobs_file.write_text(json.dumps({
            "c" * 32: {
                "status": "error",
                "msg": "previous error",
                "created_at": "not-a-timestamp",
                "finished_at": "yesterday",
            },
            "d" * 32: {
                "status": "error",
                "msg": "oversized integer",
                "created_at": 10 ** 400,
                "finished_at": True,
            },
        }), encoding="utf-8")

        server.recover_separation_jobs()

        for jid in ("c" * 32, "d" * 32):
            with self.subTest(job_id=jid):
                recovered = server.job_status(jid)
                self.assertEqual(recovered["status"], "error")
                self.assertIsInstance(recovered["created_at"], (int, float))
                self.assertIsInstance(recovered["finished_at"], (int, float))
                self.assertFalse(isinstance(recovered["created_at"], bool))
                self.assertFalse(isinstance(recovered["finished_at"], bool))

    def test_startup_recovery_removes_only_stale_app_staging_files(self):
        old_stem = self.data / (".1234567890_abcdef_voz." + "a" * 32 + ".tmp.wav")
        old_library = self.data / (".biblioteca.json." + "b" * 32 + ".tmp")
        fresh_stem = self.data / (".1234567890_abcdef_instrumental." + "c" * 32 + ".tmp.wav")
        unrelated = self.data / ".user-data.tmp.wav"
        for path in (old_stem, old_library, fresh_stem, unrelated):
            path.write_bytes(b"temporary")
        old_time = time.time() - server._STALE_STAGING_SECONDS - 10
        os.utime(old_stem, (old_time, old_time))
        os.utime(old_library, (old_time, old_time))

        removed = server.cleanup_stale_staging_files()

        self.assertCountEqual(removed, [old_stem.name, old_library.name])
        self.assertFalse(old_stem.exists())
        self.assertFalse(old_library.exists())
        self.assertTrue(fresh_stem.exists())
        self.assertTrue(unrelated.exists())
        self.assertTrue(self.audio_file.exists())

    def test_startup_recovers_audio_when_delete_was_interrupted_before_metadata_commit(self):
        staged = self.data / (".track.wav." + "e" * 32 + ".deleting")
        self.audio_file.rename(staged)

        recovered = server.recover_staged_deletions()

        self.assertIn(("restored", "track.wav"), recovered)
        self.assertTrue(self.audio_file.exists())
        self.assertFalse(staged.exists())
        self.assertEqual(len(server.read_lib()), 1)

    def test_startup_finishes_delete_when_metadata_commit_already_happened(self):
        staged = self.data / (".track.wav." + "f" * 32 + ".deleting")
        self.audio_file.rename(staged)
        server.write_lib([])

        recovered = server.recover_staged_deletions()

        self.assertIn(("discarded", staged.name), recovered)
        self.assertFalse(staged.exists())
        self.assertFalse(self.audio_file.exists())

    def test_startup_preserves_staged_audio_when_library_is_corrupt(self):
        staged = self.data / (".track.wav." + "1" * 32 + ".deleting")
        self.audio_file.rename(staged)
        self.library_file.write_text("{corrupt", encoding="utf-8")

        recovered = server.recover_staged_deletions()

        self.assertEqual(recovered, [])
        self.assertTrue(staged.exists())
        self.assertFalse(self.audio_file.exists())

    def test_delete_removes_metadata_and_audio(self):
        result = server.delete_track("track-1")
        self.assertEqual(result, {"ok": True})
        self.assertEqual(server.read_lib(), [])
        self.assertFalse(self.audio_file.exists())

    def test_delete_preserves_audio_shared_with_remaining_track(self):
        server.write_lib([
            {"id": "track-1", "file": "track.wav"},
            {"id": "track-2", "file": "track.wav"},
        ])
        result = server.delete_track("track-1")
        self.assertEqual(result, {"ok": True})
        self.assertEqual(server.read_lib(), [{"id": "track-2", "file": "track.wav"}])
        self.assertTrue(self.audio_file.exists())
    
    def test_delete_preserves_audio_when_reference_differs_only_by_case(self):
        server.write_lib([
            {"id": "track-1", "file": "track.wav"},
            {"id": "track-2", "file": "TRACK.WAV"},
        ])
        result = server.delete_track("track-1")
        self.assertEqual(result, {"ok": True})
        self.assertEqual(server.read_lib(), [{"id": "track-2", "file": "TRACK.WAV"}])
        self.assertTrue(self.audio_file.exists())

    def test_delete_duplicate_records_stages_audio_only_once(self):
        server.write_lib([
            {"id": "dup-id", "file": "track.wav"},
            {"id": "dup-id", "file": "track.wav"},
        ])
        result = server.delete_track("dup-id")
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

    def test_delete_staging_second_file_failure_restores_first(self):
        second_audio = self.data / "second.wav"
        second_audio.write_bytes(b"second audio")
        server.write_lib([
            {"id": "dup-id", "file": "track.wav"},
            {"id": "dup-id", "file": "second.wav"},
        ])
        original_replace = server.os.replace
        def fail_second_stage(src, dst):
            if Path(src) == second_audio:
                raise OSError("simulated second staging failure")
            return original_replace(src, dst)
        with mock.patch.object(server.os, "replace", side_effect=fail_second_stage):
            with self.assertRaises(server.HTTPException) as raised:
                server.delete_track("dup-id")
        self.assertEqual(raised.exception.status_code, 500)
        self.assertIn("preparar a exclusão", raised.exception.detail)
        self.assertTrue(self.audio_file.exists())
        self.assertTrue(second_audio.exists())
        self.assertEqual(len(server.read_lib()), 2)
        self.assertFalse(any(self.data.glob("*.deleting")))

    def test_delete_staging_rollback_failure_reports_retained_file(self):
        second_audio = self.data / "second.wav"
        second_audio.write_bytes(b"second audio")
        server.write_lib([
            {"id": "dup-id", "file": "track.wav"},
            {"id": "dup-id", "file": "second.wav"},
        ])
        original_replace = server.os.replace
        def fail_second_stage_and_first_restore(src, dst):
            if Path(src) == second_audio:
                raise OSError("simulated second staging failure")
            if Path(src).name.endswith(".deleting") and Path(dst) == self.audio_file:
                raise OSError("simulated restore failure")
            return original_replace(src, dst)
        with mock.patch.object(server.os, "replace", side_effect=fail_second_stage_and_first_restore):
            with self.assertRaises(server.HTTPException) as raised:
                server.delete_track("dup-id")
        self.assertIn(".deleting", raised.exception.detail)
        retained = list(self.data.glob(".*.deleting"))
        self.assertEqual(len(retained), 1)
        self.assertEqual(retained[0].read_bytes(), b"audio sample")
        self.assertTrue(second_audio.exists())
        self.assertEqual(len(server.read_lib()), 2)

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

    def test_separation_staging_failure_cleans_partial_stems(self):
        writes = []

        def fake_writer(path, tensor, samplerate):
            path.write_bytes(b"partial output")
            writes.append(path)
            if len(writes) == 2:
                raise OSError("simulated instrumental write failure")

        with self.assertRaisesRegex(OSError, "instrumental write failure"):
            server._stage_separation_outputs(
                "batch-1",
                (("voz", object()), ("instrumental", object())),
                44100,
                fake_writer,
            )
        self.assertEqual(len(writes), 2)
        self.assertTrue(all(not path.exists() for path in writes))
        self.assertFalse(any(self.data.glob("*.tmp.wav")))

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
        # Cleanup failure can leave one staging file, but never masks the save failure.
        self.assertEqual(len(list(self.data.glob("*.tmp"))), 1)

    def test_batch_upsert_persists_all_tracks_atomically(self):
        items = [{"id": "voice", "file": "voice.wav"}, {"id": "inst", "file": "inst.wav"}]
        result = server.upsert_tracks_batch({"items": items})
        self.assertEqual(result, {"ok": True})
        self.assertEqual(server.read_lib()[:2], items)

    def test_batch_upsert_is_idempotent_for_retried_recovery_commit(self):
        # This case starts from an empty library; setUp normally seeds one track.
        server.write_lib([])
        first = [
            {"id": "stable-voice", "file": "voice.wav", "kind": "voz"},
            {"id": "stable-inst", "file": "inst.wav", "kind": "instrumental"},
        ]
        retry = [
            {**first[0], "title": "Recovered vocals"},
            {**first[1], "title": "Recovered instrumental"},
        ]
        server.upsert_tracks_batch({"items": first})
        server.upsert_tracks_batch({"items": retry})
        library = server.read_lib()
        self.assertEqual(len(library), 2)
        self.assertEqual({item["id"] for item in library}, {"stable-voice", "stable-inst"})
        self.assertEqual(library[:2], retry)

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

    def test_cleanup_cannot_bypass_registered_audio_with_different_case(self):
        server.write_lib([{"id": "track-1", "file": "TRACK.WAV"}])
        with self.assertRaises(server.HTTPException) as raised:
            server.cleanup_unregistered_audio({"file": "track.wav"})
        self.assertEqual(raised.exception.status_code, 409)
        self.assertTrue(self.audio_file.exists())

    def test_delete_is_blocked_while_source_separation_is_running(self):
        server.jobs.clear()
        server.jobs["active-job"] = {
            "status": "running",
            "source_file": "track.wav",
            "created_at": time.time(),
        }
        with self.assertRaises(server.HTTPException) as raised:
            server.delete_track("track-1")
        self.assertEqual(raised.exception.status_code, 409)
        self.assertEqual(len(server.read_lib()), 1)
        self.assertTrue(self.audio_file.exists())

    def test_separation_job_registers_source_filename(self):
        server.jobs.clear()
        with mock.patch.object(server.threading, "Thread") as thread_factory:
            result = server.separate({"file": "track.wav"})
        job = server.job_status(result["job"])
        self.assertEqual(job["source_file"], "track.wav")
        self.assertEqual(job["status"], "running")
        thread_factory.assert_called_once()

    def test_separation_thread_start_failure_marks_job_failed(self):
        server.jobs.clear()
        worker = mock.Mock()
        worker.start.side_effect = RuntimeError("thread startup failed")
        with mock.patch.object(server.threading, "Thread", return_value=worker):
            result = server.separate({"file": "track.wav"})
        job = server.job_status(result["job"])
        self.assertEqual(job["status"], "error")
        self.assertIn("thread startup failed", job["msg"])
        self.assertIsNotNone(job.get("finished_at"))
        self.assertFalse(any(
            info.get("status") == "running" and info.get("source_file") == "track.wav"
            for info in server.jobs.values()
        ))

    def test_delete_unknown_id_is_noop(self):
        result = server.delete_track("missing")
        self.assertEqual(result, {"ok": True})
        self.assertEqual(len(server.read_lib()), 1)
        self.assertTrue(self.audio_file.exists())


if __name__ == "__main__":
    unittest.main()
