import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from packages.shared.util import config


class LoadEnvFallbackTest(unittest.TestCase):
    def test_load_env_falls_back_to_basic_parser_when_dotenv_is_unavailable(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            env_path = Path(tmpdir) / ".env"
            env_path.write_text(
                "POSTGRES_DB=homepedia\nPOSTGRES_PASSWORD=secret\n",
                encoding="utf-8",
            )

            with mock.patch.object(config, "PROJECT_ROOT", Path(tmpdir)):
                with mock.patch.dict(os.environ, {}, clear=True):
                    with mock.patch.dict(sys.modules, {"dotenv": None}):
                        config.load_env()

                    self.assertEqual(os.environ["POSTGRES_DB"], "homepedia")
                    self.assertEqual(os.environ["POSTGRES_PASSWORD"], "secret")


if __name__ == "__main__":
    unittest.main()
