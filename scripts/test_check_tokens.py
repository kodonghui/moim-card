import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('check_tokens', Path('scripts/check-tokens.py'))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)

class TokenCheckTest(unittest.TestCase):
    def test_token_styles_and_raw_values(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            css = root / 'app.css'
            tsx = root / 'App.tsx'
            good_css = '.x { border: 1px solid var(--color-border-control); border-bottom-width: 1px; border-width: 2px; padding: var(--space-4); margin: 0 auto; }'
            css.write_text(good_css)
            tsx.write_text('<div style={{ color: "var(--color-text-primary)", padding: "var(--space-4)" }} />')
            self.assertEqual(checker.check(root, generated=False), [])
            for value in ['outline: 1px solid red', 'box-shadow: 0 0 4px rgb(1,2,3)', 'fill: aliceblue', 'inset: 13px', 'border: 3px solid var(--color-border-control)', 'border-width: 3px']:
                with self.subTest(value=value):
                    css.write_text('.x { ' + value + '; }')
                    self.assertTrue(checker.check(root, generated=False))
            css.write_text(good_css)
            for value in ['color: "rgb(255,0,0)"', 'padding: 13', 'background: "white"', 'color: arbitrary', '...other']:
                with self.subTest(value=value):
                    tsx.write_text('<div style={{ ' + value + ' }} />')
                    self.assertTrue(checker.check(root, generated=False))

if __name__ == '__main__':
    unittest.main()
