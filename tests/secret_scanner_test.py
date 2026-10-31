import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('secret_check', Path(__file__).resolve().parents[1] / 'scripts/check-secrets.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SecretScannerTest(unittest.TestCase):
    def uri(self, scheme='postgresql', password='ephemeral'):
        # Assemble only in memory: these values are never service credentials.
        return scheme + '://' + 'test-user:' + password + '@db.example.invalid/db'

    def test_catches_supported_schemes_and_encoded_passwords(self):
        for scheme in ('postgres', 'postgresql', 'POSTGRESQL'):
            for password in ('ephemeral', 'encoded%40value'):
                self.assertEqual(module.credential_lines('\n' + self.uri(scheme, password)), [2])

    def test_allows_passwordless_and_runtime_configuration(self):
        for value in ('postgresql://db.example.invalid/db', 'postgresql://test@db.example.invalid/db', 'process.env.DATABASE_URL'):
            self.assertEqual(module.credential_lines(value), [])


if __name__ == '__main__':
    unittest.main()
