# Solace utilities.
import re
import requests
from BeautifulSoup import BeautifulSoup


_extractor_registry = {}


def register_extractor(*args):
    """
    Register `fn` as an extractor for string arguments.
    Arguments should be Craiglist search categories like 'sss' or 'jjj'.
    """
    def decorator(fn):
        for category in args:
            _extractor_registry[category] = fn
        def inner_function(*args, **kwargs):
            fn(*args, **kwargs)
        return inner_function
    return decorator


def get_extractor(category):
    """ Get the extractor function for `category` (string). """
    fn = _extractor_registry.get(category, None)

    if fn == None:
        fn = _extractor_registry.get('default')

    return fn


def get_price(string):
    """
    Try to extract a price from `string`.
    """
    money = re.compile('|'.join([
      r'^\$?(\d*\.\d{1,2})$',
      r'^\$?(\d+)$',
      r'^\$(\d+\.?)$',
    ]))

    price_str = string.strip()
    matches = money.match(price_str)
    price = matches and matches.group(0) or None
    
    if price:
        return float(price[1:])


@register_extractor('default', 'sss')
def extract_item_for_sale(item):
    """ Extract a Craigslist item for sale. """
    result = {}
    result['image'] = item.contents[1].get('id')
    result['date'] = item.contents[2].strip().rstrip('- ')
    result['link'] = item.contents[3].get('href')
    result['desc'] = item.contents[3].text
    result['location'] = item.contents[5].string

    price = get_price(item.contents[4])

    if price:
        result['price'] = price

    return result


@register_extractor('jjj', 'ggg', 'bbb')
def extract_job(item):
    """ Extra a Craigslist job posting. """
    result = {}
    result['date'] = item.contents[0].strip().rstrip('- ')
    result['link'] = item.contents[1].get('href')
    result['desc'] = item.contents[1].text
    result['location'] = item.contents[3].text

    category = item.find('small')

    if category:
        result['category'] = category.text

    return result 


@register_extractor('hhh')
def extract_housing(item):
    """ Extract a Craigslist house for sale or rental. """
    result = {}

    # Isolate the price and details (bedrooms, square feet) from a title like:
    # '$1425 / 3br - 1492ft - Beautiful Sherwood Home Could Be Yours, Move in March 1st'
    if '/' in item.contents[1].text:
        print item.contents[1]
        parts = item.contents[1].text.split('/')
        price = get_price(parts[0])

        if price:
            result['price'] = price

        rental_details = parts[1].split('-')

        for detail in rental_details:
            detail = detail.strip()

            if 'ft' in detail:
                result['sqft'] = detail
            elif 'br' in detail:
                result['bedrooms'] = detail
            else:
                result['desc'] = detail
    else:
        result['desc'] = item.contents[1].text.strip()

    result['link'] = item.contents[1].get('href')
    result['date'] = item.contents[0].strip().rstrip('- ')
    result['location'] = item.contents[3].text

    small = item.find('small')
    if small:
        result['type'] = small.text

    return result


def extract_results(raw_results, category):
    """
    Extract data about a single Craiglist search result from HTML into a dict,
    using BeautifulSoup.
    """
    results = []

    for el in raw_results.nextGenerator():
        if not hasattr(el, 'name') or el.name == 'h4':
            continue

        if el.name == 'p':
            extractor = get_extractor(category)
            results.append(extractor(el))

    return results


def search_craigslist(location, category, query):
    """
    Search each Craigslist location `location` (iterable) for `query` in
    `category`.
    """
    results = []

    search_url = '%ssearch/%s?query=%s&srchType=A' % (
        location, category, query)

    content = BeautifulSoup(
        requests.get(search_url).text, convertEntities=BeautifulSoup.HTML_ENTITIES)

    for raw_results in content.findAll('h4'):
        results = results + extract_results(raw_results, category)

    return results

