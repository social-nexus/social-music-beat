import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from unittest.mock import AsyncMock
from starlette.requests import Request

TEMP_DATA = tempfile.mkdtemp(prefix="smb-provider-tests-")
os.environ["SOCIAL_MUSIC_BEAT_DATA"] = TEMP_DATA

import ai_providers
import ia_local


class ProviderConfigTests(unittest.TestCase):
    def setUp(self):
        ai_providers.CONFIG_PATH = Path(TEMP_DATA) / "ai-provider-config.json"
        ai_providers.CONFIG_PATH.unlink(missing_ok=True)

    def test_provider_catalog_includes_major_and_aggregator_services(self):
        for provider in ("openai", "anthropic", "gemini", "openrouter", "deepseek", "groq", "mistral"):
            self.assertIn(provider, ai_providers.PROVIDERS)

    def test_config_persists_preferences_but_never_api_keys(self):
        ai_providers._write_config({"provider": "openai", "models": {"openai": "gpt-4.1-mini"}})
        raw = ai_providers.CONFIG_PATH.read_text(encoding="utf-8")
        self.assertNotIn("api_key", raw.lower())
        self.assertNotIn("sk-", raw)
        self.assertEqual(ai_providers._read_config()["provider"], "openai")

    def test_invalid_provider_is_rejected(self):
        with self.assertRaises(ValueError):
            ai_providers._validate_provider("unknown-provider")

    def test_key_storage_uses_operating_system_keyring(self):
        with mock.patch.object(ai_providers, "_keyring_ready", return_value=True), mock.patch.object(ai_providers.keyring, "set_password") as save:
            ai_providers._set_key("openai", "test-secret-key-value")
            save.assert_called_once_with("SocialMusicBeat", "openai", "test-secret-key-value")

    def test_public_config_only_exposes_whether_key_exists(self):
        with mock.patch.object(ai_providers, "_get_key", side_effect=lambda provider: "secret" if provider == "openai" else None), mock.patch.object(ai_providers, "_keyring_ready", return_value=True):
            data = ai_providers.public_config()
        openai = next(item for item in data["providers"] if item["id"] == "openai")
        self.assertTrue(openai["configured"])
        self.assertNotIn("secret", json.dumps(data))



class CloudLyricsRoutingTests(unittest.IsolatedAsyncioTestCase):
    async def test_cloud_provider_does_not_require_local_runtime(self):
        request = Request({"type": "http", "headers": [(b"host", b"localhost:8002")]})
        payload = {"provider": "openai", "provider_model": "gpt-4.1-mini",
                   "mode": "full", "theme": "uma canção de amizade",
                   "genre": "pop", "mood": "alegre"}
        with mock.patch.object(ia_local, "generate_with_provider",
                               new=AsyncMock(return_value="TÍTULO: Amizade\\nLETRA:")) as generate:
            result = await ia_local.generate_lyrics(payload, request)
        self.assertEqual(result["provider"], "openai")
        self.assertEqual(result["lyrics"], "TÍTULO: Amizade\\nLETRA:")
        generate.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
