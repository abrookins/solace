
define([
  'jquery',
  'lib/underscore',
  'lib/backbone',
], ($, _, Backbone) ->

  handleAjaxError = (xhr, status, error) ->
    console.log(xhr, status, error)

  #### CraigslistSearch ####
  # A Craigslist search. On success, parses the resulting items and caches itself
  # as JSON in localStorage, keyed to the URL of the search.
  #
  # TODO: Refactor to use Backbone's get() and set() API.
  class CraigslistSearch extends Backbone.Model
    initialize: (options) ->
      @createdAt = null
      @result = options.result or {}
      @url = options.url
      @query = options.query
      @type = options.type
      @params = options.params
      @locations = options.locations
      @cachedResult = options.cachedResult
      @searchCacheKey = options.searchCacheKey
      @cacheTtl = 3600000 # one hour

    # The attributes to return for this object when calling JSON.stringify,
    # conforming with the JSON API:
    # (https://developer.mozilla.org/en/JSON#toJSON()_method)
    toJSON: ->
      url: @url
      type: @type
      query: @query
      result: @result
      locations: @locations
      cacheTtl: @cacheTtl
      params: @params

    fromJSON: (json) ->
      obj = JSON.parse(json)

      return new CraigslistSearch
        url: obj.url
        query: obj.query
        type: obj.type
        result: obj.result
        params: obj.params
        locations: obj.locations
        cacheTtl: obj.cacheTtl
        cachedResult: true

    # Run the search and trigger 'searchFinished' when complete. If this search
    # was reinstantiated from a cache, then finish immediately without hitting
    # the server.
    run: ->
      if @cachedResult
        @trigger('searchFinished')
      else
        $.ajax
          type: "GET"
          url: @url
          dataType: 'json'
          error: handleAjaxError
          success: (data) =>
            if data.result
              @result.items = data.result
              @result.created = new Date().toUTCString()
              @cacheResult()
            @trigger('searchFinished')

    getParams: ->
      params = []

      _.each(@params, (param) ->
        params.push("#{param[0]}=#{param[1]}")
      )

      return params

    getCreatedAtTime: ->
      result = @.get('result')
      if result
        return Date.parse(result.created)

    # Save a search in localStorage. Searches are stored with a key that is the
    # solace search URL and values are a JSON stringified `CraigslistSearch`, e.g.:
    #
    #       'http://solace.heroku.com/somesearchstring/etc': json-string-value
    #
    # A search is only stored once in this scheme, and saving a search for the
    # same keywords and locations overwrites a previously saved search.
    #
    # Note that the result of the search is stored, not just the search criteria.
    cacheResult: =>
      return unless localStorage

      # Log an error - probably out of space. TODO: Handle this better.
      try
        localStorage.setItem(@searchCacheKey + @url, JSON.stringify(@))
      catch e
        if e.name == 'QUOTA_EXCEEDED_ERR'
          console.log('Could not cache result: Out of space in localStorage.')
          return

    # Parse the Craigslist subdomain from a URL.
    parseSubdomain: (url) ->
      return url.split('.')[0].substr(7);


  #### Craigslist ####
  # An object that builds search queries for user-specified keywords and
  # Craigslist locations and returns `CraigslistSearch` objects.
  class Craigslist extends Backbone.Model
    initialize: (options) ->
      @searchCacheKey = 'searchCache'
      @baseUrl = "/search"

    # Build a query string in the format:
    #     "key=values[0]&key=values[1]&key=values[2] ..."
    buildQueryString: (key, values) ->
      return ("#{key}=#{encodeURIComponent(val)}" for val in values).join('&')

    # Build the full search query URL.
    #
    # Takes an array of human-readable location names `locationNames` (the
    # locations the user chose on the search form), the type the user chose, and
    # the user's query.
    #
    # Returns a URL string.
    buildQueryUrl: (locationNames, type, query, params) ->
      locationQuery = @buildQueryString('location', locationNames)
      typeQuery = @buildQueryString('type', [type])

      # Craigslist expects spaces to be encoded with '+' because this data
      # supposedly comes from a form on their site.
      encodedQuery = encodeURIComponent(query.replace(/\s/g, '+'))

      url = "#{@baseUrl}?#{locationQuery}&#{typeQuery}&q=#{encodedQuery}"

      if params and params.length
        _.each(params, (param) ->
          url += "&#{param[0]}=#{param[1]}"
        )

      return url

    # Use the back-end web service to search Craigslist for a query in the chosen
    # locations.
    search: (options) ->
      url = @buildQueryUrl(
        options.locations, options.type, options.query, options.params)

      result = @getSearchFromCache(url)

      if not result
        result = new CraigslistSearch
          url: url
          type: options.type
          query: options.query
          locations: options.locations
          params: options.params
          searchCacheKey: @searchCacheKey

      return result

    # Look for a cached search result for this URL. If a cached result exists,
    # check its TTL and return it if valid; otherwise delete the cached result and
    # return nothing.
    getSearchFromCache: (url) ->
      return unless localStorage
      json = localStorage.getItem(@searchCacheKey + url)

      if json
        search = new CraigslistSearch().fromJSON(json)
        diff = new Date().getTime() - search.getCreatedAtTime()

        if diff <= search.cacheTtl
          return search
        else
          localStorage.removeItem(@searchCacheKey + url)

    clearSearchCache: () ->
      return unless localStorage

      for key, val of localStorage
        if key.search(@searchCacheKey) == 0
          localStorage.removeItem(key)

    getCachedSearches: () ->
      return unless localStorage

      cachedSearches = {}

      for key, val of localStorage
        if key.search(@searchCacheKey) == 0
          cachedSearches[key] = new CraigslistSearch().fromJSON(val)

      return cachedSearches

  return {
    Craigslist: Craigslist
  }
)