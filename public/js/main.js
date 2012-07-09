if (Modernizr.svg && Modernizr.inlinesvg) {
    d3.json('/regions.json', function(regions) {

        // build main area lookup table
        var tempRegionIdToList = {};
        regions.forEach(function(d) {
            var name = d.n.toLowerCase();

            if (d.g === 'CSD') {
                name = name.substring(0, name.length - ' (CSD)'.length);
            }
            if (d.g === 'CD') {
                name = name.substring(0, name.length - ' (CD)'.length);
            }

            if (!tempRegionIdToList.hasOwnProperty(name)) {
                 tempRegionIdToList[name] = [];
            }

            tempRegionIdToList[name].push(d);
        });

        var typeaheadContent = [];
        var regionIdLookupTable = {};
        for (var name in tempRegionIdToList) {
            if(tempRegionIdToList.hasOwnProperty(name)) {
                var tempRegions = tempRegionIdToList[name];
                if (tempRegions.length === 1) {
                    var name = tempRegions[0].n;

                    if (tempRegions[0].g === 'CSD') {
                        name = name.substring(0, name.length - ' (CSD)'.length);
                    }
                    if (tempRegions[0].g === 'CD') {
                        name = name.substring(0, name.length - ' (CD)'.length);
                    }

                    regionIdLookupTable[name.toLowerCase()] = tempRegions[0].i;
                    typeaheadContent.push(name);
                } else {
                    console.log(tempRegions);
                    // more than 1 region, need to generate more names
                    tempRegions.forEach(function(d) {
                       // for CD's, just have them in parentheses 
                       if (d.g === 'CD') {
                           regionIdLookupTable[d.n.toLowerCase()] = d.i;
                           typeaheadContent.push(d.n);
                       }
                       // for CDS, also add the type
                       else if (d.g === 'CSD') {
                           var name = d.n.substring(0, d.n.length - ')'.length) + ', ' + d.t + ')';
                           regionIdLookupTable[name.toLowerCase()] = d.i;
                           typeaheadContent.push(name);
                       }
                    });
                }
            }
        }

        // build fallback table
        var legacyRegionIdLookupTable = {};
        regions.forEach(function(d) {
            legacyRegionIdLookupTable[d.n.toLowerCase()] = d.i;
        });

        var setupTypeahead = function(id) {
            $(id).typeahead({
                'source': typeaheadContent
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
            if (compareName === undefined) {
                $('#compareErrorBox').hide();
            } else {
                $('#compareErrorMessage').text("Place '" + compareName + "' not found for comparison.");
                $('#compareErrorBox').show();
            }
        };

        var cache = {};
        var loadAgeProfile = function(id, callback) {
            if (cache.hasOwnProperty(id)) {
                callback(cache[id]);
            } else {
                d3.json('/region/' + id + '.json', function(data) {
                    cache[id] = data;
                    callback(data);
                });
            }
        };

        var updatePyramid = function(mainName, compareName) {
            var mainId = regionIdLookupTable[mainName.toLowerCase()];
            if (mainId === undefined) {
                mainId = legacyRegionIdLookupTable[mainName.toLowerCase()];
            }
            var compareId = compareName !== undefined ? regionIdLookupTable[compareName.toLowerCase()] : undefined;
            if (compareId === undefined) {
                compareId = compareName !== undefined ? legacyRegionIdLookupTable[compareName.toLowerCase()] : undefined;
            }

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

                // parallel loading
                var loadedMainData = undefined;
                var loadedCompareData = undefined;

                var renderIfLoaded = function() {
                    if (loadedMainData !== undefined && loadedCompareData !== undefined) {
                        renderChart(loadedMainData, loadedCompareData, mainName, compareName);
                        $('#loadingBox').hide();
                    }
                };

                loadAgeProfile(mainId, function(data) {
                    loadedMainData = data;
                    renderIfLoaded();
                });

                loadAgeProfile(compareId, function(data) {
                    loadedCompareData = data;
                    renderIfLoaded();
                });
            }
        };

        setupTypeahead('#select_main');
        setupTypeahead('#select_compare');

        var updateShareConfig = function(mainName, compareName) {
            var addthis_config = {
                'data_track_addressbar': true,
                'data_ga_social' : true,
                'data_ga_property': 'UA-69155-30'
                };

            var addthis_share = undefined;
            if (compareName !== undefined) {
                addthis_share = {
                    email_vars: { CustomText: 'Age profile of ' + mainName + ' compared to ' + compareName },
                    email_template: "pop_pyramid",
                    description: 'Age profile of ' + mainName + ' compared to ' + compareName,
                    templates : {
                        twitter: 'Age profile of ' + mainName + ' compared to ' + compareName+ ' {{url}} (vis by @jamiestarke @lgrammel)'
                    }
                };
            } else {
                addthis_share = {
                    email_vars: { CustomText: 'Age profile of ' + mainName },
                    email_template: "pop_pyramid",
                    description: 'Age profile of ' + mainName,
                    templates : {
                        twitter: 'Age profile of ' + mainName + ' {{url}} (vis by @jamiestarke @lgrammel)'
                    }
                };
            }

            $('#addthis').html('<a class="addthis_button_facebook"></a><a class="addthis_button_twitter"></a><a class="addthis_button_compact"></a>');

            window.addthis.toolbox("#addthis", addthis_config, addthis_share);
        };

        var updateTitle = function(mainName, compareName) {
            if (compareName !== undefined) {
                window.document.title = mainName + " compared to " + compareName + " - Canadian Population Pyramids" ;
            } else {
                window.document.title = mainName + " Canadian Population Pyramid" ;
            }
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

            // main name must be set
            if (mainName === '') {
                return;
            }

            hasher.setHash(encodeURIComponent(mainName) + '/' + encodeURIComponent(compareName));
        };

        var currentMainName = undefined;
        var currentCompareName = undefined;

        var onUrlChange = function(mainName, compareName){
            mainName = decodeURIComponent(mainName);
            compareName = compareName !== undefined ? decodeURIComponent(compareName) : undefined;

            // prevent double loading
            if (mainName === currentMainName && compareName === currentCompareName) {
                return;
            }
            currentMainName = mainName;
            currentCompareName = compareName;

            updateTitle(mainName, compareName);
            updateControls(mainName, compareName);
            updateShareConfig(mainName, compareName);
            updatePyramid(mainName, compareName);
            trackSelection(mainName, compareName);
        };

        crossroads.addRoute('/{mainName}/{compareName}', onUrlChange);
        crossroads.addRoute('/{mainName}', onUrlChange);
        crossroads.bypassed.add(function() {
            // if we cannot match the route, reset to default
            updateUrl('Capital, BC', 'Canada');
        });

        var parseHash = function(newHash, oldHash) {
            crossroads.parse(newHash);
        };
        hasher.initialized.add(parseHash);
        hasher.changed.add(parseHash);
        hasher.init();

    });
} else {
    $('#unsupportedBrowser').show();
    $('#inputBar').hide();
}