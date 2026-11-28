import subprocess
import tempfile
import unittest
from pathlib import Path

class ClientLogCheck(unittest.TestCase):
    def test_prohibits_logs_and_analytics_parameters(self):
        with tempfile.TemporaryDirectory() as directory:
            sample = Path(directory) / 'sample.ts'
            for code, succeeds in [('Analytics.log({log_name: "interim_card_created", log_type: "event", params: {}})', True), ('Analytics.log({log_name: "interim_card_created", log_type: "event", params: {userId}})', False), ('Analytics.log("interim_card_created")', True), ('console.error("client request error")', True), ('console.error("client request error", roomCode)', False), ('console.log(roomCode)', False), ('window.console.log(roomCode)', False), ('globalThis.console.error(roomCode)', False), ('console?.log(roomCode)', False), ('const l = console.log; l(roomCode)', False), ('const {console: c} = window; c.log(roomCode)', False), ('window["console"].log(roomCode)', False), ('import { Analytics as A } from "sdk"; A.log({params: {roomCode}})', False), ('Analytics.log("interim_card_created", {roomCode})', False), ('reportError(roomCode)', False)]:
                with self.subTest(code=code):
                    sample.write_text(code)
                    result = subprocess.run(['node', 'scripts/check-client-logs.cjs', directory], capture_output=True)
                    self.assertEqual(result.returncode == 0, succeeds)

if __name__ == '__main__':
    unittest.main()
