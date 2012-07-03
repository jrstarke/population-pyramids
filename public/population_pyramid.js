function renderChart(data, compareData, place, comparePlace) {

    // chart settings
    var margin = {top: 40, right: 10, bottom: 20, left: 10};
    var outerWidth = 940;
    var outerHeight = 800;
    var width = outerWidth - margin.left - margin.right;
    var height = outerHeight - margin.top - margin.bottom;

    var centerLabelWidth = 50;
    var gridLabelHeight = 40;

    // sum of population
    var totalMales = d3.nest()
        .key(function(d) { return 'all'; })
        .rollup(function(d) { return d3.sum(d, function(d) { return parseInt(d.male.people); }); })
        .entries(data)[0].values;
    var totalFemales = d3.nest()
        .key(function(d) { return 'all'; })
        .rollup(function(d) { return d3.sum(d, function(d) { return parseInt(d.female.people); }); })
        .entries(data)[0].values;

    // scales
    var sideWidth = (width - centerLabelWidth) / 2;
    var maxPopulationPercentage = d3.max(data, function(d) {
        return d3.max([d.male.percentOfTotal, d.female.percentOfTotal]);
    });
    if (compareData !== undefined) {
        var maxComparePopulationPercentage = d3.max(compareData, function(d) {
            return d3.max([d.male.percentOfTotal, d.female.percentOfTotal]);
        });
        maxPopulationPercentage = d3.max([maxPopulationPercentage, maxComparePopulationPercentage]);
    }

    var xScale = d3.scale.linear().domain([0, maxPopulationPercentage]).range([0, sideWidth]).nice();
    var yScale = d3.scale.ordinal().domain(d3.range(0, data.length)).rangeBands([height - gridLabelHeight, 0]); // flip

    // svg container element
    var chart = d3.select('#chart').append("svg")
        .attr("width", outerWidth)
        .attr("height", outerHeight)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // center labels
    var centerLabelPanel = chart.append('g').attr('transform', 'translate(' + sideWidth + ',0)');
    centerLabelPanel.append('text').text('Age')
        .attr("x", centerLabelWidth / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr('class', 'centerHeader');
        
    centerLabelPanel.selectAll("text.tickLabel").data(data).enter().append("text")
        .attr('class', 'tickLabel')
        .attr("x", centerLabelWidth / 2)
        .attr("y", function(d, i) { return yScale(i) + yScale.rangeBand() / 2; })
        .attr("dy", ".35em") // vertical-align: middle
        .attr("text-anchor", "middle")
        .attr("display", function(d, i) { return (i % 5) === 0 ? "block" : "none" })
        .text(function(d) { return d.age; });

    // panels
    renderPanel('male', 0, "Males", totalMales);
    renderPanel('female', centerLabelWidth + sideWidth, "Females", totalFemales);

    function renderPanel(type, xTranslate, gender, numberOfPeople) {
        var panel = chart.append('g').attr('transform', 'translate(' + xTranslate + ',0)');

        panel.append('text').text($.formatNumber(numberOfPeople, {format:"#,###", locale:"us"}) + ' ' + gender + ' (' + place + ')')
            .attr("x", sideWidth / 2)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .attr('class', 'panelHeader');

        panel.selectAll("rect").data(data).enter().append("rect")
            .attr('class', type)
            .attr('x', function(d) {
                return (type === 'male') ? xScale.range()[1] - xScale(d[type].percentOfTotal) : 0;
            })
            .attr('y', function(d, i) { return yScale(i); })
            .attr('height', yScale.rangeBand())
            .attr('width', function(d) { return xScale(d[type].percentOfTotal); } )

        if (compareData !== undefined) {
            var line = d3.svg.line()
                .x(function(d) {
                    return (type === 'male') ? xScale.range()[1] - xScale(d[type].percentOfTotal) : xScale(d[type].percentOfTotal);
                })
                .y(function(d, i) {
                    if (i == compareData.length) {
                        return yScale.rangeExtent()[0];
                    }
                    return yScale(i) + yScale.rangeBand();
                })
                .interpolate("step-before");
            panel.append("svg:path")
                .attr("class", "outline-" + type)
                .attr("d", line(compareData.concat(compareData[compareData.length - 1])));
        }

        var ticks = xScale.ticks(5);
        var tickPosition = (type === 'male') ? function(d) { return xScale.range()[1] - xScale(d); } : xScale;

        var gridContainer = chart.append('g')
            .attr('transform', 'translate(' + xTranslate + ',' + (height - gridLabelHeight) + ')');
        gridContainer.selectAll("text.tickLabel").data(ticks).enter().append("text")
            .attr('class','tickLabel')
            .attr("x", tickPosition)
            .attr("dy", 25)
            .attr('text-anchor', 'middle')
            .text(String);
        gridContainer.append('line')
            .attr('class', 'axis')
            .attr('x1', xScale.range()[0])
            .attr('x2', xScale.range()[1])
            .attr("y1", 1)
            .attr("y2", 1)
        gridContainer.selectAll("line.tick").data(ticks).enter().append("line")
            .attr('class', 'tick')
            .attr("x1", tickPosition)
            .attr("x2", tickPosition)
            .attr("y1", 1)
            .attr("y2", 6);
        gridContainer.append('text')
            .attr('class', 'panelHeader')
            .attr('x', sideWidth / 2)
            .attr('y', 55)
            .attr('text-anchor', 'middle')
            .text(gender + ', by single year of age, as percent of the total population');
    }

    // interaction overlay
    var interactionOverlay = chart.append('g');
    interactionOverlay.selectAll("rect").data(data).enter().append('rect')
        .attr('class', 'interaction-overlay')
        .attr('x', 0)
        .attr('y', function(d, i) { return yScale(i); })
        .attr('width', width)
        .attr('height', yScale.rangeBand())
        .attr('fill', 'none')
        .attr('stroke', 'none')
        .attr('pointer-events','visible')
        .attr('title', function(d) { return 'Age ' + d.age; })
        .attr('data-content', function(d, i) {
            console.log(compareData[i]);
            return '<div style="white-space:nowrap;"><b>' + d.total.people + ' people, ' + d3.round(d.total.percentOfTotal, 2) + '% of population' + '</b>'
                + ((compareData !== undefined) ? ' (' + comparePlace + ' ' + d3.round(compareData[i].total.percentOfTotal, 2) + '%)' : '') +  '</div>'
                + '<div style="white-space:nowrap;">' + d.male.people + ' males,' + d3.round(d.male.percentOfTotal, 2) + '% of population'
                + ((compareData !== undefined) ? ' (' + comparePlace + ' ' + d3.round(compareData[i].male.percentOfTotal, 2) + '%)' : '')
                +  '</div>'
                + '<div style="white-space:nowrap;">' + d.female.people + ' females,' + d3.round(d.female.percentOfTotal, 2) + '% of population'
                + ((compareData !== undefined) ? ' (' + comparePlace + ' ' + d3.round(compareData[i].female.percentOfTotal, 2) + '%)' : '') +  '</div>'
        })
        .on('mouseover', function(d,i) {
            d3.select(this).attr('fill', 'rgba(0,0,0,.15)');
        })
        .on('mouseout', function(d,i) {
            d3.select(this).attr('fill', 'none');
        });

    $('.interaction-overlay').cpopover({
        'placement': 'bottom'
    });
}