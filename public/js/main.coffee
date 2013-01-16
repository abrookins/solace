# *Solace* is a web app that allows the user to search across multiple
# Craigslist locations simultaneously.
#
# The front-end is written in CoffeeScript and uses Backbone.js to separate
# components between models, views and routers (see the [Backbone.js
# FAQ](http://documentcloud.github.com/backbone/#FAQ-mvc) for an explanation of
# *views* in Backbone.js versus in traditional MVC).
#
# The back-end is a Flask service that parses search results from Craigslist.
#
# Full source code for the app is at:
# [Github](https://github.com/abrookins/solace).

define([
  'views'
  'lib/backbone',
], (views, Backbone) ->


  #### Router ####
  # Handle page navigation with back/forward support.
  # See: (http://documentcloud.github.com/backbone/#Router)
  class Router extends Backbone.Router
    routes:
      '': 'index'
      'search/:locations/:type/:query': 'search'
      'search/:locations/:type/:query/:params' : 'search'
      'filter/:field/:min/:max/:locations/:type/:query': 'filter'
      'filter/:field/:min/:max/:locations/:type/:query/:params': 'filter'
      'history': 'history'

    initialize: (options) ->
      @app = new views.AppView
        router: @
        locations: options.locations

    index: =>
      @app.displayIndex()

    # Handle a search encoded as a URI.
    #
    # Multiple locations are specified as 'location=locationName' in the URI, so
    # first we split the parameters of the search and create an array of location
    # names.
    search: (locationQuery, type, query, params) =>
      parsedLocations = @app.parseSearchLocations(locationQuery)
      parsedParams = @app.parseSearchParams(params)
      @app.search(parsedLocations, type, query, parsedParams)

    # Filter search results by `min` (number) and `max` (number) of `field`
    # (string - a property name of the result's CraigslistSearch).
    #
    # A search fragment is tacked onto the URL in `locations`, `type` and `query`
    # in order to make filtered URLs bookmarkable; IE, in that case the search
    # must be performed again, before the filter is applied.
    filter: (field, min, max, locations, type, query, params) ->
      # Search using the given parameters if a search isn't in progress.
      if not @app.lastSearch
        @search(locations, type, query, params)

      @app.filter(
        field: field
        min: min
        max: max
      )

    # Show list of past searches.
    history: =>
      @app.displaySavedSearches()

  return {
    Router: Router
  }
)

