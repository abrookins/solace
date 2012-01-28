# Solace utilities.
import re
import requests
from BeautifulSoup import BeautifulSoup


def extract_results(raw_results):
    """
    Extra data about a single Craiglist search result from HTML into a dict,
    using BeautifulSoup.
    """
    results = []

    money = re.compile('|'.join([
      r'^\$?(\d*\.\d{1,2})$',
      r'^\$?(\d+)$',
      r'^\$(\d+\.?)$',
    ]))

    for el in raw_results.nextGenerator():
        if not hasattr(el, 'name') or el.name == 'h4':
            continue

        if el.name == 'p':
            result = {}

            # Items for sale            
            if el.get('class') == 'row':
                result['image'] = el.contents[1].get('id')
                result['date'] = el.contents[2].strip().rstrip('- ')
                result['link'] = el.contents[3].get('href')
                result['desc'] = el.contents[3].text
                result['location'] = el.contents[5].string

                # Try to parse the price.
                #price_str = el.contents[4].split('-')[1].strip()
                price_str = el.contents[4].strip()
                matches = money.match(price_str)
                price = matches and matches.group(0) or None

                if price:
                    result['price'] = float(price[1:])
            else:
                result['date'] = el.contents[0].strip().rstrip('- ')
                result['link'] = el.contents[1].get('href')
                result['desc'] = el.contents[1].text
                result['location'] = el.contents[3].text

                category = el.find('small')

                if category:
                    result['category'] = category.text

            results.append(result)

    return results

def search_craigslist(location, category, query):
    """
    Search each Craigslist location `location` (iterable) for `query` in
    `category`.
    """
    results = []

    search_url = '%ssearch/%s?query=%s&srchType=A' % (
        location, category, query)

    content = BeautifulSoup(requests.get(search_url).text)

    for raw_results in content.findAll('h4'):
        results = results + (extract_results(raw_results))

    return results

