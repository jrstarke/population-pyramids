function renderChart(data) {

    // sum of population
    var totalPopulation = d3.nest()
        .key(function(d) { return 'all'; })
        .rollup(function(d) { return d3.sum(d, function(d) { return parseInt(d.Male) + parseInt(d.Female); }); })
        .entries(data)[0].values;

    data = data.map(function(d) {
        return {
            'age': d['Min Age'],
            'total': {
                'people': parseInt(d.Male) + parseInt(d.Female),
                'percentOfTotal': ((parseInt(d.Male) + parseInt(d.Female)) * 100) / totalPopulation
            },
            'male': {
                'people': parseInt(d.Male),
                'percentOfTotal': (d.Male * 100) / totalPopulation
            },
            'female': {
                'people': parseInt(d.Female),
                'percentOfTotal': (d.Female * 100) / totalPopulation
            }
        };
    });

    // chart settings
    var margin = {top: 40, right: 10, bottom: 20, left: 10};
    var outerWidth = 860;
    var outerHeight = 800;
    var width = outerWidth - margin.left - margin.right;
    var height = outerHeight - margin.top - margin.bottom;

    var centerLabelWidth = 50;
    var gridLabelHeight = 80;

    // scales
    var sideWidth = (width - centerLabelWidth) / 2;
    var maxPopulationPercentage = d3.max(data, function(d) {
        return d3.max([d.male.percentOfTotal, d.female.percentOfTotal]);
    });

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
        .attr("y", function(d, i) { return yScale(i) + yScale.rangeBand(); })
        .attr("dy", ".35em") // vertical-align: middle
        .attr("text-anchor", "middle")
        .text(function(d) { return d.age; });

    // panels
    renderPanel('male', 0, "Males");
    renderPanel('female', centerLabelWidth + sideWidth, "Females");

    function renderPanel(type, xTranslate, gender) {
        var panel = chart.append('g').attr('transform', 'translate(' + xTranslate + ',0)');

        panel.selectAll("rect").data(data).enter().append("rect")
            .attr('class', type)
            .attr('x', function(d) {
                return (type === 'male') ? xScale.range()[1] - xScale(d[type].percentOfTotal) : 0;
            })
            .attr('y', function(d, i) { return yScale(i); })
            .attr('height', yScale.rangeBand())
            .attr('width', function(d) { return xScale(d[type].percentOfTotal); } )

        var line = d3.svg.line()
            .x(function(d) {
                return (type === 'male') ? xScale.range()[1] - xScale(d[type].percentOfTotal) : xScale(d[type].percentOfTotal);
            })
            .y(function(d, i) {
                if (i == data.length) {
                    return yScale.rangeExtent()[0];
                }
                return yScale(i) + yScale.rangeBand();
            })
            .interpolate("step-before");
        panel.append("svg:path")
            .attr("class", "outline-" + type)
            .attr("d", line(data.concat(data[data.length - 1])));

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
            .text(gender + ', by single year of age,')
        gridContainer.append('text')
            .attr('class', 'panelHeader')
            .attr('x', sideWidth / 2)
            .attr('y', 85)
            .attr('text-anchor', 'middle')
            .text('as percent of the total population')
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
        .attr('data-content', function(d) {
            return '<b>' + d.total.people + ' people (' + d3.round(d.total.percentOfTotal, 2) + '% of population)' + '</b><br/>'
                + d.male.people + ' men (' + d3.round(d.male.percentOfTotal, 2) + '% of population)' + '<br/>'
                + d.female.people + ' women (' + d3.round(d.female.percentOfTotal, 2) + '% of population)'
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