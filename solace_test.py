import json
import mock
import unittest
import urllib

import solace
from base_test import SolaceTestCase


class TestSolace(SolaceTestCase):
    """ Tests for the solace odule. """

    def setUp(self):
        solace.app.config['TESTING'] = True
        self.app = solace.app.test_client()

    def test_index_contains_locations(self):
        """
        The index should load and render JSON data for Craigslist
        locations.
        """
        resp = self.app.get('/')
        self.assertTrue('{"cities":' in resp.data)
        self.assertTrue('Portland, Oregon' in resp.data)
        self.assertTrue('Corpus Christi, Texas' in resp.data)
        self.assertTrue('"all": "http://chicago.craigslist.org/"' in resp.data)

    @mock.patch('requests.get')
    def test_search_returns_json_data(self, mock_search):
        """ 
        Search should return JSON results of the structure:
        
        {
            'result':
                { 'location1': [ ... ], 'location2': [ ... ]
        }

        This test does not run a live search. It mocks an HTML response from
        Craigslist.
        """
        mock_search.return_value = self.get_mock_response('housing_search.html')
        url = '/search?location=%s&type=hhh&q=test' % urllib.quote_plus(
            'http://portland.craigslist.org/')

        resp = self.app.get(url)
        results = json.loads(resp.data)    
        self.assertTrue('result' in results)
        self.assertTrue(type(results['result']) == dict)
        self.assertTrue(
            type(results['result']['http://portland.craigslist.org/']) == list)
        self.assertEqual(resp.content_type, 'application/json')

    def test_locations(self):
        """
        Verify that results are returned for all locations indicated in the
        search URL.
        
        Note: This runs a live search!
        """
        locations = [
            'http://portland.craigslist.org/',
            'http://chicago.craigslist.org/'
        ]

        loc_url_parts = ['location=%s' % urllib.quote_plus(l) for l in locations]
        url = '/search?%s&type=hhh&q=rooms' % '&'.join(loc_url_parts)

        resp = self.app.get(url)
        results = json.loads(resp.data)
        result_locations = results['result'].keys()

        for location in locations:
            self.assertTrue(location in result_locations)


if __name__ == '__main__':
    unittest.main()
