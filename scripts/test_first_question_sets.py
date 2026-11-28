import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('publish', Path(__file__).with_name('publish-question-set.py'))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
ROOT = Path(__file__).resolve().parent.parent / 'content/question-sets'

class FirstQuestionSetsTest(unittest.TestCase):
    def check_theme(self, name, title, order):
        payload = publisher.prepare(ROOT / f'{name}-v1.yaml', ROOT / 'evidence' / f'{name}-v1.review.json', ROOT / 'evidence' / f'{name}-v1.rights.json', title, order)
        self.assertEqual(len(payload['content']['questions']), 8)
        self.assertEqual(len(payload['content']['profile_phrases']), 7)
        self.assertEqual({q.get('axis') for q in payload['content']['questions'] if q.get('axis')}, publisher.checker.AXES)

    def test_travel(self): self.check_theme('travel', '여행', 1)
    def test_dinner(self): self.check_theme('dinner', '회식·저녁', 2)
    def test_weekend(self): self.check_theme('weekend', '주말 나들이', 3)

if __name__ == '__main__': unittest.main()
