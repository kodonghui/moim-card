import os
from pathlib import Path
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

    def test_missing_operator_details_fail_production_build(self):
        for name, contact in [(None, None), ('CI operator', None), (None, 'ci@example.invalid'), (' ', 'ci@example.invalid')]:
            with self.subTest(name=bool(name), contact=bool(contact)):
                env = os.environ.copy()
                env['VITE_API_BASE_URL'] = 'https://example.invalid'
                env.pop('VITE_OPERATOR_NAME', None)
                env.pop('VITE_OPERATOR_CONTACT', None)
                if name is not None:
                    env['VITE_OPERATOR_NAME'] = name
                if contact is not None:
                    env['VITE_OPERATOR_CONTACT'] = contact
                result = subprocess.run(['pnpm', '--filter', '@moim-card/apps-web', 'exec', 'vite', 'build'], env=env, capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('VITE_OPERATOR_NAME and VITE_OPERATOR_CONTACT are required', result.stderr + result.stdout)

    def test_notification_template_warning_does_not_block_build(self):
        for template in [None, 'example-template']:
            with self.subTest(template=template):
                env = os.environ.copy()
                env['VITE_API_BASE_URL'] = 'https://example.invalid'
                env['VITE_OPERATOR_NAME'] = 'CI operator'
                env['VITE_OPERATOR_CONTACT'] = 'ci@example.invalid'
                env.pop('VITE_NOTIFICATION_TEMPLATE_CODE', None)
                if template:
                    env['VITE_NOTIFICATION_TEMPLATE_CODE'] = template
                result = subprocess.run(['pnpm', '--filter', '@moim-card/apps-web', 'exec', 'vite', 'build'], env=env, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual('VITE_NOTIFICATION_TEMPLATE_CODE is unset' in (result.stderr + result.stdout), template is None)
                chunks = ''.join(path.read_text() for path in Path('apps/web/dist/assets').glob('*.js'))
                self.assertIn('CI operator', chunks)
                self.assertIn('ci@example.invalid', chunks)

if __name__ == '__main__':
    unittest.main()
