# A base test class for Solace tests.
import mock
import unittest


class SolaceTestCase(unittest.TestCase):
    def get_mock_response(self, fixture):
        """
        Return a mock object with a 'text' property that contains HTML loaded
        from `fixture`.

        `fixture` should be the name of a file in the fixtures/test directory.
        """
        with open('fixtures/test/%s' % fixture) as f:
            fixture = f.read()
            mock_obj = mock.Mock()
            mock_obj.text = fixture
            return mock_obj
