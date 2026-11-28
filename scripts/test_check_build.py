import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('check_build', Path(__file__).with_name('check-build.py'))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class BuildCheckTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.package = root / 'package.json'
        self.build = root / 'dist'
        self.build.mkdir()
        self.file = self.build / 'app.js'
        self.file.write_text('const answer = 42;')
        self.version('3.6.0')

    def version(self, value):
        self.package.write_text(json.dumps({'dependencies': {'@apps-in-toss/web-framework': value}}))

    def test_valid_build(self):
        self.assertEqual(checker.check(self.package, self.build), [])

    def test_invalid_versions(self):
        for value in ('', '3.5.9', '2.9.9', '4.0.0', '^3.6.0'):
            with self.subTest(version=value):
                self.version(value)
                self.assertTrue(checker.check(self.package, self.build))

    def test_each_violation(self):
        for snippet in ('<iframe src=x>', 'loadFullScreenAd()', 'IAP.createOneTimePurchaseOrder()', 'eval("x")', 'new Function("x")', '@media (prefers-color-scheme: dark) { body { color: white } }'):
            with self.subTest(snippet=snippet):
                self.file.write_text(snippet)
                self.assertTrue(checker.check(self.package, self.build))

    def test_missing_build_fails(self):
        self.file.unlink()
        self.assertTrue(checker.check(self.package, self.build))


if __name__ == '__main__':
    unittest.main()
