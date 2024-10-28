import * as d3 from 'd3';
import axios from 'axios';
import * as d3Sankey from 'd3-sankey';
import { isEmpty, debounce, isUndefined } from 'lodash';

const margin = { left: 40, right: 20, top: 20, bottom: 60 }
var size = { width: 0, height: 0 }

var svgdata = []

const onResize = (targets) => {
    targets.forEach(target => {
        if (target.target.getAttribute('id') !== 'ts-container') return;
        size = { width: target.contentRect.width, height: target.contentRect.height }
        if (!isEmpty(size) && !isEmpty(svgdata)) {
            d3.select('#line-svg').selectAll('*').remove()
            //console.log(size, bars)
            initChart(svgdata)
        }
    })
}

function processData(data) {
    let processed = []
    data.forEach(d => {
        (Object.keys(d)).forEach((c) => {
            if (c != 'timestamp') {
                let Obj = { 
                    timestamp: d3.timeParse('%Y-%m-%d %H:%M:%S')(d.timestamp),
                    value: +d[c],
                    measurement: c,
                };
                processed.push(Obj)
            }
        })
    })
    return processed;
}

function groupBy(arr, property) {
    return arr.reduce(function (acc, obj) {
        let key = obj[property];

        if (key != null && key !== undefined) {
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(obj);
        }

        return acc;
    }, {});
}

const chartObserver = new ResizeObserver(debounce(onResize, 100))

export function mountChart(chartdata) { // registering this element to watch its size change
    let chartContainer = document.querySelector('#ts-container')
    chartObserver.observe(chartContainer)
    svgdata = chartdata
}

export function initChart(data) {
    d3.select('#line-svg').selectAll('*').remove()
    data = processData(svgdata)

    let chartContainer = d3.select('#line-svg')
    let chartSize = { 
        width: 700, 
        height: 300,
        marginTop: 20,
        marginRight: 30,
        marginBottom: 30,
        marginLeft: 50
    }
    const format = d3.format(",.0f");

    console.log(data)

    // x axis
    var x = d3.scaleTime()
      .domain(d3.extent(data, function(d) { return d.timestamp }))
      .range([ 0, chartSize.width ]);
    
    chartContainer.append("g")
        .attr("transform", `translate(${chartSize.marginLeft},${chartSize.height + chartSize.marginTop})`)
        .call(d3.axisBottom(x));

    // y axis
    var y = d3.scaleLinear()
      .domain([0, d3.max(data, function(d) { return +d.value; })])
      .range([ chartSize.height, 0 ]);
    
    chartContainer.append("g")
        .attr("transform", `translate(${chartSize.marginLeft},${chartSize.marginTop})`)
        .call(d3.axisLeft(y));

    chartContainer.append("path")
        .attr("transform", `translate(${chartSize.marginLeft},${chartSize.marginTop})`)
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function(d) { return x(d.timestamp) })
            .y(function(d) { return y(+d.value) })
    );

}


