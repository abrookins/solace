(function() {
  var AppView, Craigslist, CraigslistSearch, ItemView, Router;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  window.solace = {};
  window.solace.handleAjaxError = function(xhr, status, error) {
    return console.log(xhr, status, error);
  };
  CraigslistSearch = (function() {
    __extends(CraigslistSearch, Backbone.Model);
    function CraigslistSearch() {
      this.cacheResult = __bind(this.cacheResult, this);
      CraigslistSearch.__super__.constructor.apply(this, arguments);
    }
    CraigslistSearch.prototype.initialize = function(options) {
      this.createdAt = null;
      this.result = options.result || {};
      this.url = options.url;
      this.query = options.query;
      this.type = options.type;
      this.locations = options.locations;
      this.cachedResult = options.cachedResult;
      this.searchCacheKey = options.searchCacheKey;
      return this.cacheTtl = 3600000;
    };
    CraigslistSearch.prototype.toJSON = function() {
      return {
        url: this.url,
        type: this.type,
        query: this.query,
        result: this.result,
        locations: this.locations,
        cacheTtl: this.cacheTtl
      };
    };
    CraigslistSearch.prototype.fromJSON = function(json) {
      var obj;
      obj = JSON.parse(json);
      return new CraigslistSearch({
        url: obj.url,
        query: obj.query,
        type: obj.type,
        result: obj.result,
        locations: obj.locations,
        cacheTtl: obj.cacheTtl,
        cachedResult: true
      });
    };
    CraigslistSearch.prototype.run = function() {
      if (this.cachedResult) {
        return this.trigger('searchFinished');
      } else {
        return $.ajax({
          type: "GET",
          url: this.url,
          dataType: 'json',
          error: window.solace.handleAjaxError,
          success: __bind(function(data) {
            if (data.result) {
              this.result.items = data.result;
              this.result.created = new Date().toUTCString();
              this.cacheResult();
            }
            return this.trigger('searchFinished');
          }, this)
        });
      }
    };
    CraigslistSearch.prototype.getCreatedAtTime = function() {
      var result;
      result = this.get('result');
      if (result) {
        return Date.parse(result.created);
      }
    };
    CraigslistSearch.prototype.cacheResult = function() {
      if (!localStorage) {
        return;
      }
      try {
        return localStorage.setItem(this.searchCacheKey + this.url, JSON.stringify(this));
      } catch (e) {
        if (e.name === 'QUOTA_EXCEEDED_ERR') {
          console.log('Could not cache result: Out of space in localStorage.');
        }
      }
    };
    CraigslistSearch.prototype.parseSubdomain = function(url) {
      return url.split('.')[0].substr(7);
    };
    return CraigslistSearch;
  })();
  Craigslist = (function() {
    __extends(Craigslist, Backbone.Model);
    function Craigslist() {
      Craigslist.__super__.constructor.apply(this, arguments);
    }
    Craigslist.prototype.initialize = function(options) {
      this.searchCacheKey = 'searchCache';
      return this.baseUrl = "/search";
    };
    Craigslist.prototype.buildQueryString = function(key, values) {
      var val;
      return ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = values.length; _i < _len; _i++) {
          val = values[_i];
          _results.push("" + key + "=" + (encodeURIComponent(val)));
        }
        return _results;
      })()).join('&');
    };
    Craigslist.prototype.buildQueryUrl = function(locationNames, type, query) {
      var encodedQuery, locationQuery, typeQuery;
      locationQuery = this.buildQueryString('location', locationNames);
      typeQuery = this.buildQueryString('type', [type]);
      encodedQuery = encodeURIComponent(query.replace(' ', '+'));
      return "" + this.baseUrl + "?" + locationQuery + "&" + typeQuery + "&q=" + encodedQuery;
    };
    Craigslist.prototype.search = function(options) {
      var result, url;
      url = this.buildQueryUrl(options.locations, options.type, options.query);
      result = this.getSearchFromCache(url);
      if (!result) {
        result = new CraigslistSearch({
          url: url,
          type: options.type,
          query: options.query,
          locations: options.locations,
          searchCacheKey: this.searchCacheKey
        });
      }
      return result;
    };
    Craigslist.prototype.getSearchFromCache = function(url) {
      var diff, json, search;
      if (!localStorage) {
        return;
      }
      json = localStorage.getItem(this.searchCacheKey + url);
      if (json) {
        search = new CraigslistSearch().fromJSON(json);
        diff = new Date().getTime() - search.getCreatedAtTime();
        if (diff <= search.cacheTtl) {
          return search;
        } else {
          return localStorage.removeItem(this.searchCacheKey + url);
        }
      }
    };
    Craigslist.prototype.clearSearchCache = function() {
      var key, val, _results;
      if (!localStorage) {
        return;
      }
      _results = [];
      for (key in localStorage) {
        val = localStorage[key];
        _results.push(key.search(this.searcCacheKey) === 0 ? localStorage.removeItem(key) : void 0);
      }
      return _results;
    };
    Craigslist.prototype.getCachedSearches = function() {
      var cachedSearches, key, val;
      if (!localStorage) {
        return;
      }
      cachedSearches = {};
      for (key in localStorage) {
        val = localStorage[key];
        if (key.search(this.searchCacheKey) === 0) {
          cachedSearches[key] = new CraigslistSearch().fromJSON(val);
        }
      }
      return cachedSearches;
    };
    return Craigslist;
  })();
  ItemView = (function() {
    __extends(ItemView, Backbone.View);
    function ItemView() {
      ItemView.__super__.constructor.apply(this, arguments);
    }
    ItemView.prototype.initialize = function(options) {
      this.item = options.item;
      this.ul = options.ul;
      this.li = null;
      return this.render();
    };
    ItemView.prototype.render = function() {
      var title;
      title = "" + this.item.date + " - " + this.item.desc + " " + this.item.location;
      if (this.item.price) {
        title = "" + title + " - $" + this.item.price;
      }
      this.li = $('<li>').appendTo(this.ul);
      return $("<a>").attr({
        href: this.item.link,
        title: title,
        target: "_blank"
      }).text(title).appendTo(this.li);
    };
    ItemView.prototype.remove = function() {
      return this.li.remove();
    };
    ItemView.prototype.hide = function() {
      return this.li.addClass('hidden');
    };
    ItemView.prototype.show = function() {
      return this.li.removeClass('hidden');
    };
    return ItemView;
  })();
  AppView = (function() {
    __extends(AppView, Backbone.View);
    function AppView() {
      this.clearSavedSearches = __bind(this.clearSavedSearches, this);
      this.setFormElements = __bind(this.setFormElements, this);
      this.displaySearchResults = __bind(this.displaySearchResults, this);
      this.handleSearchClick = __bind(this.handleSearchClick, this);
      this.search = __bind(this.search, this);
      this.clearLocation = __bind(this.clearLocation, this);
      this.startAutocomplete = __bind(this.startAutocomplete, this);
      this.hideSearchDropdown = __bind(this.hideSearchDropdown, this);
      this.showSearchDropdown = __bind(this.showSearchDropdown, this);
      this.receiveKey = __bind(this.receiveKey, this);
      this.handleKeydown = __bind(this.handleKeydown, this);
      AppView.__super__.constructor.apply(this, arguments);
    }
    AppView.prototype.initialize = function(options) {
      var city, url, _ref;
      this.router = options.router;
      this.initComplete = false;
      this.locationsDiv = $('#locations');
      this.locationInput = $('#location');
      this.searchForm = $('#search-form');
      this.searchButton = $('#submit');
      this.searchIcon = '/icons/search.png';
      this.loadingIcon = '/images/ajax-loader.gif';
      this.maxSearchRetry = 3;
      this.locations = options.locations;
      this.locationsReversed = {};
      _ref = this.locations['cities'];
      for (city in _ref) {
        url = _ref[city];
        this.locationsReversed[url] = city;
      }
      this.craigslist = new Craigslist;
      this.itemViews = [];
      $('#submit').live('click', this.handleSearchClick);
      $('#clear-history').live('click', this.clearSavedSearches);
      this.locationsDiv.live('click', __bind(function() {
        return this.locationInput.focus();
      }, this));
      $(".remove", this.locationsDiv).live("click", this.removeLocation);
      this.searchForm.find('.searchbox-input').live('focus click', this.showSearchDropdown);
      $('#close-search').live('click', this.hideSearchDropdown);
      $(document).keydown(this.handleKeydown);
      $('html').live('click', this.hideSearchDropdown);
      $('div#search').live('click', function(e) {
        return e.stopPropagation();
      });
      return this.startAutocomplete();
    };
    AppView.prototype.hasValidModifierKey = function(keyEvent) {
      switch (keyEvent.which) {
        case 91:
        case 93:
        case 17:
          return true;
        default:
          return false;
      }
    };
    AppView.prototype.handleKeydown = function(e) {
      var hasValidModifier;
      hasValidModifier = this.hasValidModifierKey(e);
      if (hasValidModifier) {
        return this.validModifierKeyPressed || (this.validModifierKeyPressed = hasValidModifier);
      } else {
        return this.receiveKey(e);
      }
    };
    AppView.prototype.receiveKey = function(keyEvent) {
      switch (keyEvent.which) {
        case 191:
          if (this.validModifierKeyPressed) {
            if ($('ul.searchbox-dropdown').is(':visible')) {
              this.hideSearchDropdown();
            } else {
              $('#query').focus();
            }
            return this.validModifierKeyPressed = false;
          }
          break;
        case 27:
          return this.hideSearchDropdown();
      }
    };
    AppView.prototype.showSearchDropdown = function() {
      return this.searchForm.find('.searchbox-dropdown').show();
    };
    AppView.prototype.hideSearchDropdown = function() {
      return this.searchForm.find('.searchbox-dropdown').hide();
    };
    AppView.prototype.startAutocomplete = function() {
      var cities, city, _;
      cities = (function() {
        var _ref, _results;
        _ref = this.locations['cities'];
        _results = [];
        for (city in _ref) {
          _ = _ref[city];
          _results.push(city);
        }
        return _results;
      }).call(this);
      cities.sort();
      this.locationInput.autocomplete({
        source: cities,
        select: __bind(function(el, ui) {
          this.addSearchLocation(ui.item.value);
          return this.clearLocation;
        }, this),
        change: this.clearLocation,
        close: this.clearLocation
      });
      this.locationInput.focus(__bind(function() {
        return this.locationInput.autocomplete('search', ' ');
      }, this));
      this.locationInput.click(__bind(function() {
        return this.locationInput.autocomplete('search', ' ');
      }, this));
      this.initComplete = true;
      return this.trigger('initComplete');
    };
    AppView.prototype.addSearchLocation = function(locationName) {
      var a, span;
      span = $("<span>");
      span.text(locationName);
      a = $("<a>").addClass("remove").attr({
        href: "javascript:",
        title: "Remove " + location
      }).text("x").appendTo(span);
      return span.appendTo(this.locationsDiv);
    };
    AppView.prototype.clearLocation = function() {
      return this.locationInput.val('');
    };
    AppView.prototype.clearChosenLocations = function() {
      return $('#locations').children('span').remove();
    };
    AppView.prototype.showLoadingIcon = function() {
      return this.searchButton.css('background', "#F2F2F2 url(" + this.loadingIcon + ") no-repeat center center");
    };
    AppView.prototype.showSearchIcon = function() {
      return this.searchButton.css('background', "#F2F2F2 url(" + this.searchIcon + ") no-repeat center center");
    };
    AppView.prototype.getSearchLocations = function() {
      var l, loc, locations, _i, _len, _results;
      locations = _.uniq((function() {
        var _i, _len, _ref, _results;
        _ref = this.locationsDiv.children('span');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          l = _ref[_i];
          _results.push($(l).text());
        }
        return _results;
      }).call(this));
      _results = [];
      for (_i = 0, _len = locations.length; _i < _len; _i++) {
        loc = locations[_i];
        _results.push("location=" + (loc.slice(0, loc.length - 1)));
      }
      return _results;
    };
    AppView.prototype.getLocationUrls = function(locations) {
      var loc, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = locations.length; _i < _len; _i++) {
        loc = locations[_i];
        _results.push(this.locations['cities'][loc]);
      }
      return _results;
    };
    AppView.prototype.search = function(locations, type, query) {
      var locationUrls;
      if (!this.initComplete) {
        this.bind('initComplete', __bind(function() {
          return this.search(locations, type, query);
        }, this));
        return;
      }
      this.setFormElements(locations, type, query);
      this.showLoadingIcon();
      locationUrls = this.getLocationUrls(locations);
      this.lastSearch = this.craigslist.search({
        type: type,
        query: query,
        locations: locationUrls
      });
      this.lastSearch.bind('searchFinished', this.displaySearchResults);
      return this.lastSearch.run();
    };
    AppView.prototype.retryLastSearch = function() {
      if (this.lastSearch && this.retryCount <= this.maxSearchRetry) {
        this.retryCount += 1;
        return this.search(this.lastSearch.locations, this.astSearch.type, this.lastSearch.query);
      } else {
        return alert('Oops, we could not complete the search! Try again later.');
      }
    };
    AppView.prototype.buildUrlForExistingSearch = function(search) {
      var locations;
      locations = this.getLocationNamesForUrls(search.locations);
      return '/#' + this.buildSearchUrl(locations, search.type, search.query);
    };
    AppView.prototype.buildSearchUrlFragment = function(locations, type, query) {
      var encodedLocations, encodedQuery, encodedType;
      encodedType = encodeURIComponent(type);
      encodedLocations = encodeURIComponent(locations.join('&'));
      encodedQuery = encodeURIComponent(query);
      return "" + encodedLocations + "/" + encodedType + "/" + encodedQuery;
    };
    AppView.prototype.buildSearchUrl = function(locations, type, query) {
      var searchFragment;
      searchFragment = this.buildSearchUrlFragment(locations, type, query);
      return "/search/" + searchFragment;
    };
    AppView.prototype.handleSearchClick = function(event) {
      var locations, query, searchUrl, type;
      event.preventDefault();
      query = $('#query').val();
      type = $('#type').val();
      locations = this.getSearchLocations();
      if (query && type && locations.length > 0) {
        this.hideSearchDropdown();
        $('ul.ui-autocomplete').hide();
        searchUrl = this.buildSearchUrl(locations, type, query);
        return this.router.navigate(searchUrl);
      }
    };
    AppView.prototype.removeLocation = function() {
      $(this).parent().remove();
      if (this.locationsDiv.children('span').length === 0) {
        return this.locationInput.css("top", 0);
      }
    };
    AppView.prototype.displaySearchResults = function() {
      var item, items, li, location, locationHeader, locationName, locationNav, prices, resultType, rooms, ul, _i, _len, _ref;
      this.hideSearchDropdown();
      this.showSearchIcon();
      prices = [];
      rooms = [];
      if (!this.lastSearch.result.items) {
        this.retryLastSearch();
      } else {
        this.retryCount = 0;
      }
      this.clearItems();
      this.displaySection(this.lastSearch.type);
      resultType = $('#' + this.lastSearch.type).children('.items');
      locationNav = $('ul#locationNav');
      $('#locationSeparator').removeClass('hidden');
      $('<p>').text("Searching for '" + this.lastSearch.query + ".'").appendTo(resultType);
      _ref = this.lastSearch.result.items;
      for (location in _ref) {
        items = _ref[location];
        locationName = this.locationsReversed[location];
        locationHeader = $('<h3>');
        locationHeader.text(locationName);
        $('<a>').attr({
          name: "" + (encodeURIComponent(locationName))
        }).prependTo(locationHeader);
        li = $('<li>').appendTo(locationNav);
        $('<a>').attr({
          href: "#" + (encodeURIComponent(locationName)),
          title: locationName
        }).text(locationName).appendTo(li);
        locationHeader.appendTo(resultType);
        ul = $('<ul>').appendTo(resultType);
        for (_i = 0, _len = items.length; _i < _len; _i++) {
          item = items[_i];
          if (item.price) {
            prices.push(item.price);
          }
          if (item.bedrooms) {
            rooms.push(item.bedrooms);
          }
          this.itemViews.push(new ItemView({
            item: item,
            ul: ul
          }));
        }
        if (this.itemViews.length === 0) {
          $("<p>").text("No results for this location.").appendTo(resultType);
        }
      }
      if (prices.length > 0) {
        this.displayPriceFacet(prices);
      }
      if (rooms.length > 0) {
        return this.displayRoomCountFacet(rooms);
      }
    };
    AppView.prototype.getFacetCounts = function(availableGroups, values) {
      var counts, group, groupUpperBound, groups, i, max, min, val, _i, _j, _k, _len, _len2, _len3, _len4;
      groups = [0];
      min = _.min(values);
      max = _.max(values);
      availableGroups.unshift(min);
      availableGroups.push(max);
      for (_i = 0, _len = availableGroups.length; _i < _len; _i++) {
        group = availableGroups[_i];
        if (group > min) {
          groups.push(group);
        } else {
          continue;
        }
      }
      counts = {};
      for (_j = 0, _len2 = groups.length; _j < _len2; _j++) {
        group = groups[_j];
        counts[group] = 0;
      }
      for (i = 0, _len3 = values.length; i < _len3; i++) {
        val = values[i];
        for (_k = 0, _len4 = groups.length; _k < _len4; _k++) {
          groupUpperBound = groups[_k];
          if (val < groupUpperBound) {
            counts[groupUpperBound] += 1;
            break;
          }
        }
      }
      return counts;
    };
    AppView.prototype.addResetFilterNavItem = function(search) {
      var li, resetNav;
      $('#resetSeparator').removeClass('hidden');
      resetNav = $('ul#resetNav');
      resetNav.children('li').empty();
      li = $('<li>').appendTo(resetNav);
      return this.buildLink("/#/filter/all/all/all/" + search, 'All').appendTo(li);
    };
    AppView.prototype.buildLink = function(href, text) {
      return $('<a>').attr({
        href: href,
        title: text
      }).text(text);
    };
    AppView.prototype.displayRoomCountFacet = function(rooms) {
      var i, li, linkText, locationNames, min, roomCounts, roomNav, roomUpperBounds, search, upperBound, _len;
      roomNav = $('ul#roomNav');
      locationNames = this.getLocationNamesForUrls(this.lastSearch.locations);
      search = this.buildSearchUrlFragment(locationNames, this.lastSearch.type, this.lastSearch.query);
      roomCounts = this.getFacetCounts([1, 2, 3, 4, 5], rooms);
      roomUpperBounds = _.keys(roomCounts);
      $('#roomSeparator').removeClass('hidden');
      for (i = 0, _len = roomUpperBounds.length; i < _len; i++) {
        upperBound = roomUpperBounds[i];
        if (upperBound === 0 || roomCounts[upperBound] === 0) {
          continue;
        }
        min = roomUpperBounds[i - 1];
        linkText = "" + min + "br - " + upperBound + "br (" + roomCounts[upperBound] + ")";
        li = $('<li>').appendTo(roomNav);
        this.buildLink("/#/filter/bedrooms/" + min + "/" + upperBound + "/" + search, linkText).appendTo(li);
      }
      return this.addResetFilterNavItem(search);
    };
    AppView.prototype.displayPriceFacet = function(prices) {
      var availablePriceGroups, i, li, linkText, locationNames, min, minPrice, priceCounts, priceNav, priceUpperBounds, search, upperBound, _len;
      priceNav = $('ul#priceNav');
      minPrice = _.min(prices);
      locationNames = this.getLocationNamesForUrls(this.lastSearch.locations);
      search = this.buildSearchUrlFragment(locationNames, this.lastSearch.type, this.lastSearch.query);
      availablePriceGroups = [50, 250, 500, 1000, 2000, 5000, 20000, 50000, 100000, 150000, 200000, 400000, 600000, 1000000];
      priceCounts = this.getFacetCounts(availablePriceGroups, prices);
      priceUpperBounds = _.keys(priceCounts);
      $('#priceSeparator').removeClass('hidden');
      for (i = 0, _len = priceUpperBounds.length; i < _len; i++) {
        upperBound = priceUpperBounds[i];
        if (upperBound === 0 || priceCounts[upperBound] === 0) {
          continue;
        }
        min = priceUpperBounds[i - 1];
        linkText = "$" + min + " - $" + upperBound + " (" + priceCounts[upperBound] + ")";
        li = $('<li>').appendTo(priceNav);
        this.buildLink("/#/filter/price/" + min + "/" + upperBound + "/" + search, linkText).appendTo(li);
      }
      return this.addResetFilterNavItem(search);
    };
    AppView.prototype.setFormElements = function(locations, type, query) {
      var loc, _i, _len;
      this.clearLocation();
      this.clearChosenLocations();
      for (_i = 0, _len = locations.length; _i < _len; _i++) {
        loc = locations[_i];
        this.addSearchLocation(loc);
      }
      $('#type').val(type);
      return $('#query').val(query);
    };
    AppView.prototype.clearSidebar = function() {
      $('ul#locationNav li').remove();
      $('ul#roomNav li').remove();
      $('ul#priceNav li').remove();
      $('ul#resetNav li').remove();
      return $('#sidebar div.separator').addClass('hidden');
    };
    AppView.prototype.clearSavedSearches = function() {
      var historyDiv, historyItems, successDiv;
      historyDiv = $('#history');
      historyItems = historyDiv.children('.items');
      successDiv = historyDiv.children('div.success-message');
      successDiv.fadeIn(200).delay(4000).fadeOut(200);
      historyItems.empty();
      return this.craigslist.clearSearchCache();
    };
    AppView.prototype.getLocationNamesForUrls = function(locationUrls) {
      var url, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = locationUrls.length; _i < _len; _i++) {
        url = locationUrls[_i];
        _results.push(this.locationsReversed[url]);
      }
      return _results;
    };
    AppView.prototype.displaySavedSearches = function() {
      var historyItems, id, li, locations, ol, savedSearches, search, title, type, url, _results;
      if (!this.initComplete) {
        this.bind('initComplete', __bind(function() {
          return this.displaySavedSearches();
        }, this));
        return;
      }
      savedSearches = this.craigslist.getCachedSearches();
      historyItems = $('#history').children('.items');
      this.displaySection('history');
      if (savedSearches) {
        _results = [];
        for (url in savedSearches) {
          search = savedSearches[url];
          type = $('#' + search.type).children('h2').text();
          id = "history-" + search.type;
          ol = $('ol#' + id);
          if (ol.length === 0) {
            $('<h3>').appendTo(historyItems).text(type);
            ol = $('<ol>').appendTo(historyItems).attr({
              id: id
            });
          }
          li = $('<li>').appendTo(ol);
          locations = this.getLocationNamesForUrls(search.locations);
          title = "" + type + " matching '" + search.query + "' in: " + (locations.join('; '));
          url = this.buildUrlForExistingSearch(search);
          _results.push($("<a>").attr({
            href: url,
            title: title
          }).text(title).appendTo(li));
        }
        return _results;
      } else {
        return $("<p>").text("No past searches on record.").appendTo(history);
      }
    };
    AppView.prototype.clearItems = function() {
      var item, _i, _len, _ref;
      _ref = this.itemViews;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        item.remove();
        delete item;
      }
      return this.itemViews = [];
    };
    AppView.prototype.displayHelp = function() {
      return this.displaySection('help');
    };
    AppView.prototype.displayIndex = function() {
      return this.displaySection('welcome');
    };
    AppView.prototype.displaySection = function(sectionId) {
      var listingDiv, sectionDiv, sectionItems;
      listingDiv = $('#result-listing');
      listingDiv.removeClass('hidden');
      sectionDiv = $('#' + sectionId);
      sectionItems = sectionDiv.children('.items');
      $('#result-listing div.items').empty();
      this.clearSidebar();
      $('#result-listing div').addClass('hidden');
      sectionDiv.removeClass('hidden');
      return sectionItems.removeClass('hidden');
    };
    AppView.prototype.parseSearchLocations = function(locationString) {
      var l, _i, _len, _ref, _results;
      _ref = locationString.split('&');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        l = _ref[_i];
        _results.push(l.replace('location=', ''));
      }
      return _results;
    };
    AppView.prototype.filter = function(options) {
      var max, min, val, view, _i, _len, _ref, _results;
      if (!this.initComplete) {
        this.bind('initComplete', __bind(function() {
          return this.filter(options);
        }, this));
        return;
      }
      if (options.min === 'all') {
        min = 'all';
        max = null;
      } else {
        min = parseFloat(options.min);
        max = parseFloat(options.max);
      }
      _ref = this.itemViews;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        view = _ref[_i];
        val = view.item[options.field];
        _results.push(min === 'all' || val >= min && val < max ? view.show() : view.hide());
      }
      return _results;
    };
    return AppView;
  })();
  Router = (function() {
    __extends(Router, Backbone.Router);
    function Router() {
      this.help = __bind(this.help, this);
      this.history = __bind(this.history, this);
      this.search = __bind(this.search, this);
      this.index = __bind(this.index, this);
      Router.__super__.constructor.apply(this, arguments);
    }
    Router.prototype.routes = {
      '': 'index',
      'search/:locations/:type/:query': 'search',
      'history': 'history',
      'help': 'help',
      'filter/:field/:min/:max/:locations/:type/:query': 'filter'
    };
    Router.prototype.initialize = function(options) {
      return this.app = new AppView({
        router: this,
        locations: options.locations
      });
    };
    Router.prototype.index = function() {
      return this.app.displayIndex();
    };
    Router.prototype.search = function(locationQuery, type, query) {
      var parsedLocations;
      parsedLocations = this.app.parseSearchLocations(locationQuery);
      return this.app.search(parsedLocations, type, query);
    };
    Router.prototype.history = function() {
      return this.app.displaySavedSearches();
    };
    Router.prototype.help = function() {
      return this.app.displayHelp();
    };
    Router.prototype.filter = function(field, min, max, locations, type, query) {
      if (!this.app.lastSearch) {
        this.search(locations, type, query);
      }
      return this.app.filter({
        field: field,
        min: min,
        max: max
      });
    };
    return Router;
  })();
  window.solace.Router = Router;
  window.solace.AppView = AppView;
  window.solace.CraigslistSearch = CraigslistSearch;
}).call(this);
