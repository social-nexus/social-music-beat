import os
import tempfile
import unittest
import sys
import types
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
        original_replace = server.os.replace

        def fail_second_move(src, dst):
            if Path(dst) == final_instrumental:
                raise OSError("simulated promotion failure")
            return original_replace(src, dst)

        with mock.patch.object(server.os, "replace", side_effect=fail_second_move):
            with self.assertRaises(OSError):
                server._commit_separation_outputs(
                    [staged_vocals, staged_instrumental],
                    [final_vocals, final_instrumental],
                )
        self.assertFalse(final_vocals.exists())
        self.assertFalse(final_instrumental.exists())
        self.assertFalse(staged_vocals.exists())
        self.assertFalse(staged_instrumental.exists())

    def test_delete_unknown_id_is_noop(self):
        result = server.delete_track("missing")
        self.assertEqual(result, {"ok": True})
        self.assertEqual(len(server.read_lib()), 1)
        self.assertTrue(self.audio_file.exists())


if __name__ == "__main__":
    unittest.main()
