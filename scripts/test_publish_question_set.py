import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from test_check_question_sets import QUESTION

spec = importlib.util.spec_from_file_location('publish', Path(__file__).with_name('publish-question-set.py'))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)

class PublishValidationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.dir = Path(self.temp.name)
        self.path = self.dir / 'trip-v1.yaml'
        self.path.write_text('theme: trip\nversion: 1\ndefault_next_action: decide\nprofile_phrases:\n' + ''.join(f'  {slot}: text\n' for slot in sorted(publisher.checker.PHRASES)) + 'questions:\n' + QUESTION * 8)
        self.review = self.dir / 'review.json'
        self.rights = self.dir / 'rights.json'
        self.evidence()

    def evidence(self):
        digest = hashlib.sha256(self.path.read_bytes()).hexdigest()
        self.review.write_text(json.dumps({'sha256':digest,'reviewer':'reviewer','date':'2026-11-28','checks':{k:True for k in publisher.CHECKS}}))
        self.rights.write_text(json.dumps({'sha256':digest,'author':'author','date':'2026-11-28','creation_record':'AI-generated'}))

    def prepare(self): return publisher.prepare(self.path, self.review, self.rights, 'Travel', 1)

    def test_valid_evidence(self): self.assertEqual(self.prepare()['content']['version'], 1)
    def test_missing_review_or_rights(self):
        for p in [self.review,self.rights]:
            data = p.read_text(); p.unlink()
            with self.assertRaises(ValueError): self.prepare()
            p.write_text(data)
    def test_review_must_match_content_and_check_every_item(self):
        review = json.loads(self.review.read_text()); review['checks']['politics'] = False; self.review.write_text(json.dumps(review))
        with self.assertRaises(ValueError): self.prepare()
        self.evidence(); self.path.write_text(self.path.read_text().replace('question','another'))
        with self.assertRaises(ValueError): self.prepare()
    def test_prohibited_result_phrase_rejected(self):
        self.path.write_text(self.path.read_text().replace('balanced: text', 'balanced: shit'))
        self.evidence()
        with self.assertRaisesRegex(ValueError, 'prohibited'): self.prepare()

if __name__ == '__main__': unittest.main()
