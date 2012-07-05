d3.json('/regions.json', function(regions) {
    var regionIdLookupTable = {}
    _.each(regions, function(d) {
        regionIdLookupTable[d.name.toLowerCase()] = d.id;
    });

    var setupTypeahead = function(id) {
        $(id).typeahead({
            'source': _.map(regions, function(region) { return region.name; })
        });
        $(id).change(function(e){
            updateUrl();
        });
        $(id).submit(function(e) {
            e.preventDefault();
            updateUrl();
        });
        $(id).keydown(function(e) {
            if (e.keyCode == 13 && !$(id).data('typeahead').shown) {
                updateUrl();
            }
        });
    };

    var showMainError = function(mainName) {
        $('#mainErrorMessage').text("Place '" + mainName + "' not found.");
        $('#mainErrorBox').show();
    };
    var showCompareError = function(compareName) {
        $('#compareErrorMessage').text("Place '" + compareName + "' not found for comparison.");
        $('#compareErrorBox').show();
    };

    var loadAgeProfile = function(id, callback) {
        d3.json('/region/' + id + '.json', function(data) {
            callback(data);
        });
    };

    var updatePyramid = function(mainName, compareName) {
        var mainId = regionIdLookupTable[mainName.toLowerCase()];
        var compareId = regionIdLookupTable[compareName.toLowerCase()];

        // update error boxes
        if (mainId === undefined && compareId == undefined) {
            showMainError(mainName);
            showCompareError(compareName);
        } else if (mainId === undefined) {
            showMainError(mainName);
            $('#compareErrorBox').hide();
        } else if (compareId === undefined) {
            $('#mainErrorBox').hide();
            showCompareError(compareName);
        } else {
            $('#mainErrorBox').hide();
            $('#compareErrorBox').hide();
        }

        // remove old chart
        $('#chart').empty();
        $('.popover').remove(); // remove open popovers

        // update chart config
        if (mainId === undefined && compareId == undefined) {
            ;
        } else if (mainId === undefined) {
            ;
        } else if (compareId === undefined) {
            $('#loadingBox').show();

            loadAgeProfile(mainId, function(data) {
                renderChart(data, undefined, mainName, undefined);
                $('#loadingBox').hide();
            });
        } else {
            $('#loadingBox').show();

            // TODO parallel loading
            loadAgeProfile(mainId, function(data) {
                loadAgeProfile(compareId, function(compareData) {
                    renderChart(data, compareData, mainName, compareName);
                    $('#loadingBox').hide();
                });
            });
        }
    };

    setupTypeahead('#select_main');
    setupTypeahead('#select_compare');

    var updateShareConfig = function(mainName, compareName) {
        window.addthis_share = {
            email_vars: { CustomText: 'Age profile of ' + mainName + ' compared to ' + compareName },
            email_template: "pop_pyramid",
            description: 'Age profile of ' + mainName + ' compared to ' + compareName,
            templates : {
                twitter: 'Age profile of ' + mainName + ' compared to ' + compareName+ ' {{url}} (by @jamiestarke and @lgrammel)'
            }
        }
    };

    var updateTitle = function(mainName, compareName) {
        window.document.title = + mainName + " compared to " + compareName + " - Population Pyramids" ;
    };

    var updateControls = function(mainName, compareName) {
        $("#select_main").val(mainName);
        $("#select_compare").val(compareName);
    };

    var trackSelection = function(mainName, compareName) {
        window._gaq.push(['_trackPageview',window.location.pathname+window.location.hash]);
        window._gat._getTrackerByName()._trackEvent('Region View', mainName, "Main Region");
        window._gat._getTrackerByName()._trackEvent('Region View', compareName, "Comparison Region");
    };

    // routing
    var updateUrl = function(mainName, compareName) {
        if (mainName === undefined) {
            mainName = $('#select_main').val();
        }
        if (compareName === undefined) {
            compareName = $('#select_compare').val();
        }

        hasher.setHash(encodeURIComponent(mainName) + '/' + encodeURIComponent(compareName));
    };

    crossroads.addRoute('/{mainName}/{compareName}', function(mainName, compareName){
        mainName = decodeURIComponent(mainName);
        compareName = decodeURIComponent(compareName);

        updateTitle(mainName, compareName);
        updateControls(mainName, compareName);
        updateShareConfig(mainName, compareName);
        updatePyramid(mainName, compareName);
        trackSelection(mainName, compareName);
    });
    crossroads.bypassed.add(function() {
        // if we cannot match the route, reset to default
        updateUrl('Capital, BC (CD)', 'Canada');
    });

    var parseHash = function(newHash, oldHash) {
        crossroads.parse(newHash);
    }
    hasher.initialized.add(parseHash);
    hasher.changed.add(parseHash);
    hasher.init();

});