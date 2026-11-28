import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('check_question_sets', Path(__file__).with_name('check-question-sets.py'))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)

QUESTION = '''  - prompt: question
    option_a: yes
    option_b: no
    split_suggestion: discuss
    agreed_text_a: choose A
    agreed_text_b: choose B
    axis: plan_speed
    axis_pole_a: low
'''.replace('option_a: yes', 'option_a: "yes"').replace('option_b: no', 'option_b: "no"')

class QuestionSetsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.dir = Path(self.temp.name)
        self.path = self.dir / 'trip-v1.yaml'
        self.write()

    def write(self, count=8, question=QUESTION):
        self.path.write_text('theme: trip\nversion: 1\ndefault_next_action: decide\nquestions:\n' + question * count)

    def test_valid_set(self):
        self.assertEqual(checker.check(self.dir, {}), [])

    def test_seven_questions_fail(self):
        self.write(count=7)
        self.assertIn('exactly 8', checker.validate(self.path)[0])

    def test_empty_text_and_unknown_axis_include_line_number(self):
        for snippet, expected in [('prompt: question', 'prompt:'), ('axis: plan_speed', 'axis: unknown')]:
            self.write(question=QUESTION.replace(snippet, expected))
            errors = checker.validate(self.path)
            self.assertTrue(errors)
            self.assertRegex(errors[0], r'\.yaml:\d+:')

    def test_published_version_cannot_change_or_disappear(self):
        digest = hashlib.sha256(self.path.read_bytes()).hexdigest()
        self.path.write_text(self.path.read_text().replace('prompt: question', 'prompt: new question'))
        self.assertIn('v2', checker.check(self.dir, {self.path.name: digest})[0])
        self.path.unlink()
        self.assertIn('v2', checker.check(self.dir, {self.path.name: digest})[0])

    def test_axis_and_pole_must_be_paired(self):
        self.write(question=QUESTION.replace('    axis_pole_a: low\n', ''))
        self.assertTrue(checker.validate(self.path))

if __name__ == '__main__': unittest.main()
