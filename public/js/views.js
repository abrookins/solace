// Generated by CoffeeScript 1.4.0
(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  define(['jquery', 'lib/underscore', 'lib/backbone', 'models', 'lib/chosen.jquery'], function($, _, Backbone, models) {
    var AppView, ItemView;
    ItemView = (function(_super) {

      __extends(ItemView, _super);

      function ItemView() {
        return ItemView.__super__.constructor.apply(this, arguments);
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

    })(Backbone.View);
    AppView = (function(_super) {

      __extends(AppView, _super);

      function AppView() {
        this.clearSavedSearches = __bind(this.clearSavedSearches, this);

        this.setFormElements = __bind(this.setFormElements, this);

        this.displaySearchResults = __bind(this.displaySearchResults, this);

        this.handleSearchClick = __bind(this.handleSearchClick, this);

        this.search = __bind(this.search, this);

        this.toggleSearchDropdown = __bind(this.toggleSearchDropdown, this);

        this.clearLocation = __bind(this.clearLocation, this);

        this.startAutocomplete = __bind(this.startAutocomplete, this);

        this.receiveKey = __bind(this.receiveKey, this);

        this.handleKeydown = __bind(this.handleKeydown, this);
        return AppView.__super__.constructor.apply(this, arguments);
      }

      AppView.prototype.initialize = function(options) {
        var city, url, _ref;
        this.router = options.router;
        this.initComplete = false;
        this.locationsDiv = $('.location-container');
        this.locationInput = $('.location');
        this.searchForm = $('.search');
        this.searchButton = this.searchForm.find('.btn');
        this.maxSearchRetry = 3;
        this.locations = options.locations;
        this.locationsReversed = {};
        _ref = this.locations['cities'];
        for (city in _ref) {
          url = _ref[city];
          this.locationsReversed[url] = city;
        }
        this.craigslist = new models.Craigslist;
        this.searchClicked = false;
        this.itemViews = [];
        this.searchButton.live('click', this.handleSearchClick);
        $('#clear-history').live('click', this.clearSavedSearches);
        $('.search-choice-close').live('click', function(e) {
          return e.stopPropagation();
        });
        $('.search-menu, .search-menu > form').live('click', function(e) {
          return e.stopPropagation();
        });
        $(document).keydown(this.handleKeydown);
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
              $('.query').focus();
            }
            return this.validModifierKeyPressed = false;
        }
      };

      AppView.prototype.startAutocomplete = function() {
        this.locationInput.chosen();
        this.initComplete = true;
        return this.trigger('initComplete');
      };

      AppView.prototype.addSearchLocation = function(locationName) {
        var chosen, item, item_id, li, position;
        li = $('.active-result:contains("' + locationName + '")');
        item_id = li.attr('id');
        position = item_id.substr(item_id.lastIndexOf("_") + 1);
        chosen = this.locationInput.data('chosen');
        item = chosen.results_data[position];
        item.selected = true;
        return chosen.choice_build(item);
      };

      AppView.prototype.clearLocation = function() {
        return this.locationInput.val('');
      };

      AppView.prototype.clearChosenLocations = function() {
        return $('#locations').children('span').remove();
      };

      AppView.prototype.showLoadingIcon = function() {
        return this.searchButton.addClass('loading');
      };

      AppView.prototype.hideLoadingIcon = function() {
        return this.searchButton.removeClass('loading');
      };

      AppView.prototype.toggleSearchDropdown = function() {
        return $('#search-menu').dropdown('toggle');
      };

      AppView.prototype.getSearchLocations = function() {
        var l, loc, locations;
        locations = _.uniq((function() {
          var _i, _len, _ref, _results;
          _ref = this.locationsDiv.find('span');
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            l = _ref[_i];
            _results.push($(l).text());
          }
          return _results;
        }).call(this));
        return (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = locations.length; _i < _len; _i++) {
            loc = locations[_i];
            _results.push("location=" + loc);
          }
          return _results;
        })();
      };

      AppView.prototype.getLocationUrls = function(locations) {
        var loc;
        return (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = locations.length; _i < _len; _i++) {
            loc = locations[_i];
            _results.push(this.locations['cities'][loc]);
          }
          return _results;
        }).call(this);
      };

      AppView.prototype.search = function(locations, type, query) {
        var locationUrls,
          _this = this;
        if (!this.initComplete) {
          this.bind('initComplete', function() {
            return _this.search(locations, type, query);
          });
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
          return this.search(this.lastSearch.locations, this.lastSearch.type, this.lastSearch.query);
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
        query = $('.query').val();
        type = $('.category').val();
        locations = this.getSearchLocations();
        if (query && type && locations.length > 0) {
          this.searchClicked = true;
          searchUrl = this.buildSearchUrl(locations, type, query);
          this.router.navigate(searchUrl);
          return this.toggleSearchDropdown();
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
        prices = [];
        rooms = [];
        if (!this.lastSearch.result.items) {
          this.retryLastSearch();
        } else {
          this.retryCount = 0;
        }
        this.clearItems();
        this.hideLoadingIcon();
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
        var counts, group, groupUpperBound, groups, i, max, min, val, _i, _j, _k, _l, _len, _len1, _len2, _len3;
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
        for (_j = 0, _len1 = groups.length; _j < _len1; _j++) {
          group = groups[_j];
          counts[group] = 0;
        }
        for (i = _k = 0, _len2 = values.length; _k < _len2; i = ++_k) {
          val = values[i];
          for (_l = 0, _len3 = groups.length; _l < _len3; _l++) {
            groupUpperBound = groups[_l];
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
        var i, li, linkText, locationNames, min, roomCounts, roomNav, roomUpperBounds, search, upperBound, _i, _len;
        roomNav = $('ul#roomNav');
        locationNames = this.getLocationNamesForUrls(this.lastSearch.locations);
        search = this.buildSearchUrlFragment(locationNames, this.lastSearch.type, this.lastSearch.query);
        roomCounts = this.getFacetCounts([1, 2, 3, 4, 5], rooms);
        roomUpperBounds = _.keys(roomCounts);
        $('#roomSeparator').removeClass('hidden');
        for (i = _i = 0, _len = roomUpperBounds.length; _i < _len; i = ++_i) {
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
        var availablePriceGroups, i, li, linkText, locationNames, min, priceCounts, priceNav, priceUpperBounds, search, upperBound, _i, _len;
        priceNav = $('ul#priceNav');
        locationNames = this.getLocationNamesForUrls(this.lastSearch.locations);
        search = this.buildSearchUrlFragment(locationNames, this.lastSearch.type, this.lastSearch.query);
        availablePriceGroups = [50, 250, 500, 1000, 2000, 5000, 20000, 50000, 100000, 150000, 200000, 400000, 600000, 1000000];
        priceCounts = this.getFacetCounts(availablePriceGroups, prices);
        priceUpperBounds = _.keys(priceCounts);
        $('#priceSeparator').removeClass('hidden');
        for (i = _i = 0, _len = priceUpperBounds.length; _i < _len; i = ++_i) {
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
        if (!this.searchClicked) {
          this.locationInput.trigger('liszt:updated');
          for (_i = 0, _len = locations.length; _i < _len; _i++) {
            loc = locations[_i];
            this.addSearchLocation(loc);
          }
        }
        $('.category').val(type);
        return $('.query').val(query);
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
        var url;
        return (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = locationUrls.length; _i < _len; _i++) {
            url = locationUrls[_i];
            _results.push(this.locationsReversed[url]);
          }
          return _results;
        }).call(this);
      };

      AppView.prototype.displaySavedSearches = function() {
        var historyItems, id, li, locations, ol, savedSearches, search, title, type, url, _results,
          _this = this;
        if (!this.initComplete) {
          this.bind('initComplete', function() {
            return _this.displaySavedSearches();
          });
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
        }
        return this.itemViews = [];
      };

      AppView.prototype.displayIndex = function() {
        return this.displaySection('welcome');
      };

      AppView.prototype.displaySection = function(sectionId) {
        var listingDiv, sectionDiv, sectionItems;
        listingDiv = $('#result-listing');
        listingDiv.removeClass('hidden');
        sectionDiv = $('#' + sectionId);
        sectionItems = sectionDiv.find('.items');
        $('#result-listing').find('.items').empty();
        this.clearSidebar();
        $('#result-listing').children('div').not(sectionDiv).addClass('hidden');
        sectionDiv.removeClass('hidden');
        return sectionItems.removeClass('hidden');
      };

      AppView.prototype.parseSearchLocations = function(locationString) {
        var l;
        return (function() {
          var _i, _len, _ref, _results;
          _ref = locationString.split('&');
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            l = _ref[_i];
            _results.push(l.replace('location=', ''));
          }
          return _results;
        })();
      };

      AppView.prototype.filter = function(options) {
        var max, min, val, view, _i, _len, _ref, _results,
          _this = this;
        if (!this.initComplete) {
          this.bind('initComplete', function() {
            return _this.filter(options);
          });
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
          if (min === 'all' || val >= min && val < max) {
            _results.push(view.show());
          } else {
            _results.push(view.hide());
          }
        }
        return _results;
      };

      return AppView;

    })(Backbone.View);
    return {
      AppView: AppView
    };
  });

}).call(this);
