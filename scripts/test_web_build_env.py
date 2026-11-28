import os
import subprocess
import unittest

class WebBuildEnvironmentTest(unittest.TestCase):
    def test_missing_or_insecure_production_api_url_fails(self):
        for value, message in [(None, 'VITE_API_BASE_URL is required'), ('http://127.0.0.1:4010', 'VITE_API_BASE_URL must be an HTTPS URL')]:
            with self.subTest(value=value):
                env = os.environ.copy()
                env.pop('VITE_API_BASE_URL', None)
                if value is not None:
                    env['VITE_API_BASE_URL'] = value
                result = subprocess.run(['pnpm', '--filter', '@moim-card/apps-web', 'exec', 'vite', 'build'], env=env, capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(message, result.stderr + result.stdout)

if __name__ == '__main__':
    unittest.main()
