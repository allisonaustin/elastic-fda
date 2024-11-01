import * as d3 from 'd3';
import axios from 'axios';
import { pallette, scale, percentColToD3Rgb } from './colors.js';
import { isEmpty, debounce, isUndefined } from 'lodash';

const margin = { left: 50, right: 30, top: 20, bottom: 30 }
let size = { width: 0, height1: 0, height2: 0 }
let chartContainer = d3.select('#line-svg')
let x1;
let x2;
let y1;
let y2;
let svgdata = []
let depths = []
let labels = []
let viewType = 1;

export let brushStart;
export let brushEnd;

let defaultColor = pallette.lightgray;
let legendColors = {
    amplitude: pallette.red,
    phase: pallette.green
}

let colorScale = d3.scaleOrdinal()
    .domain([0, 1, 2])
    .range([pallette.blue, pallette.purple].map(percentColToD3Rgb));

const onResize = (targets) => {
    targets.forEach(target => {
        if (target.target.getAttribute('id') !== 'ts-container') return;
        size = { width: target.contentRect.width, height: target.contentRect.height }
        if (!isEmpty(size) && !isEmpty(svgdata)) {
            d3.select('#line-svg').selectAll('*').remove()
            //console.log(size, bars)
            focusView(svgdata)
        }
    })
}

function getLineProperties(measurement) {
    const index = Object.values(labels.measurement).indexOf(measurement);
    let color = defaultColor; 
    let opacity = 0.55; 
    let width = 1;

    if (index !== -1) {
        if (labels.amp[index]) {
            color = legendColors.amplitude;
            opacity = 1;
            width = 1.2; 
        }
        if (labels.phs[index]) {
            color = legendColors.phase;
            opacity = 1; 
            width = 1.2;
        }
    }
    return { color, opacity, width }; 
}

function processData(data) {
    let processed = []
    data.forEach(d => {
        (Object.keys(d)).forEach((c) => {
            if (c != 'timestamp') {
                processed.push({ 
                    timestamp: d3.timeParse('%Y-%m-%d %H:%M:%S')(d.timestamp),
                    value: +d[c],
                    measurement: c,
                });
            }
        })
    })
    return processed;
}

function formatTick(d) {
    if (Math.abs(d) < 1000) {
        return d3.format(".2f")(d);
    } else {
        return d3.format(".2e")(d).replace(/e\+0$/, '');
    }
}

function findClosestIndex(data, targetTimestamp) {
    return data.reduce((closestIndex, currentValue, index) => {
        const currentDiff = Math.abs(currentValue.timestamp - targetTimestamp);
        const closestDiff = Math.abs(data[closestIndex].timestamp - targetTimestamp);
        
        return currentDiff < closestDiff ? index : closestIndex;
    }, 0);
}

const chartObserver = new ResizeObserver(debounce(onResize, 100))

export function mountChart(chartdata, viewType) { // registering this element to watch its size change
    let chartContainer = document.querySelector('#ts-container')
    chartObserver.observe(chartContainer)
    svgdata = chartdata.data
    depths = chartdata.depths
    labels = chartdata.labels
    viewType = viewType

    if (viewType == 1) {
        addLegend();
    }
}

function addLegend() {
    const legend = d3.select("#ts_legend")
        .append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(0, ${margin.top})`);

    legend.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .text("Outliers")
        .style('text-anchor', 'start')
        .style('alignment-baseline', 'middle');

    Object.keys(legendColors).forEach((label, index) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${index * 20 + 10})`)
            .on('mouseover', () => {
                d3.selectAll('.focus .line')
                    .style('opacity', 0.1);
                d3.selectAll('.context .line')
                    .style('opacity', 0.1);
                d3.selectAll(`.focus .${label}`)
                    .style('opacity', 1);
    
                d3.selectAll(`.context .${label}`)
                    .style('opacity', 1);
            })
            .on('mouseout', () => {
                d3.selectAll('.focus .line')
                    .style('opacity', 1);
    
                d3.selectAll('.context .line')
                    .style('opacity', 1);
            });

        legendRow.append('rect')
            .attr('width', 10)
            .attr('height', 10)
            .attr('fill', legendColors[label]);

        legendRow.append('text')
            .attr('x', 15)
            .attr('y', 5)
            .text(label)
            .style('text-anchor', 'start')
            .style('alignment-baseline', 'middle');
    });
}

function removeLegend() {
    d3.select('.legend')
        .remove();
}

// https://observablehq.com/@thetylerwolf/day-16-zoomable-area-chart
export function focusView(data) {

    d3.select('#line-svg').selectAll('*').remove()

    data = processData(svgdata)
    const grouped = d3.group(data, d => d.measurement)
    
    const format = d3.format(",.0f");
    size = { width: 700, height1: 250, height2: 100 }

    x1 = d3.scaleTime()
      .domain(d3.extent(data, function(d) { return d.timestamp }))
      .range([ 0, size.width ]);

    y1 = d3.scaleLinear()
      .domain([d3.min(data, function(d) { return +d.value }), d3.max(data, function(d) { return +d.value; })])
      .range([ size.height1, 0 ]);

    const line = d3.line()
        .x(function(d) { return x1(d.timestamp) })
        .y(function(d) { return y1(+d.value) })

    chartContainer.append('defs')
        .append('clipPath')
            .attr('id', 'clip')
        .append('rect')
            .attr('width', size.width)
            .attr('height', size.height1)
    
    const focus = chartContainer.append('g')
        .attr('class', 'focus')
        .attr('transform', `translate(${margin.left},${margin.top})`)
    
    focus.selectAll('.line')
        .data(grouped)
        .enter()
            .append('path')
            .attr('class', (d, i) => {
                let classes = `line line-${d[0].measurement} `;
                if (labels.amp[i]) classes += 'amplitude';
                if (labels.phs[i]) classes += 'phase';
                return classes;
            })
            .attr('clip-path', 'url(#clip)')
            .style('fill', 'none')
            .style('stroke', (d, i) => viewType == 0 ? d3.schemeCategory10[i % 10] : getLineProperties(d[0]).color)
            .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity)
            .style('stroke-width', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).width)
            .attr('d', d => line(d[1]))

    focus.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${ size.height1 })`)
          .call(d3.axisBottom(x1))
          .select('.domain')
          .remove()

    focus.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y1).tickFormat(formatTick));
        // .select('.domain')
        // .remove()

    contextView(data, grouped)
}

function contextView(data, grouped) {
    x2 = d3.scaleTime()
        .domain(d3.extent(data, function(d) { return d.timestamp }))
        .range([ 0, size.width ]);

    y2 = d3.scaleLinear()
        .domain([d3.min(data, function(d) { return +d.value }), d3.max(data, function(d) { return +d.value; })])
        .range([ size.height2, 0 ]);

    let line2 = d3.line()
        .x(function(d) { return x2(d.timestamp) })
        .y(function(d) { return y2(+d.value) })

    const context = chartContainer.append('g')
      .attr('class', 'context')
      .attr('transform', `translate(${ margin.left },${ size.height1 + size.height2 - margin.bottom - margin.top })`)

    context.selectAll('.line')
        .data(grouped)
        .enter()
            .append('path')
            .attr('class', (d, i) => {
                let classes = `line line-${d[0].measurement} `;
                if (labels.amp[i]) classes += 'amplitude';
                if (labels.phs[i]) classes += 'phase';
                return classes;
            })
            .attr('clip-path', 'url(#clip)')
            .style('fill', 'none')
            .style('stroke', (d, i) => viewType == 0 ? d3.schemeCategory10[i % 10] : getLineProperties(d[0]).color)
            .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity)
            .style('stroke-width', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).width)
            .attr('d', d => line2(d[1]))

    context.append('g')
        .attr('class', 'x-axis')
        .attr('transform',  `translate(0,${ size.height2 })`)
        .call( d3.axisBottom(x2) )

    context.append("g")
        .call(d3.axisLeft(y2).tickFormat(formatTick));

    context.append('g')
        .attr('class', 'x-brush')

    brushStart = Math.floor(data.length * 0.3);
    brushEnd = Math.floor(data.length * 0.6);

    const defaultWindow = [
        x2(data[brushStart].timestamp),
        x2(data[brushEnd].timestamp)
    ]

    const brush = d3.brushX(x2)
        .extent([[0, 20 ], [size.width, size.height2 + margin.top]])
        .on('brush', brushed)
    
    context.append('g')
        .attr('class', 'x-brush')
        .attr('transform', `translate(0, ${-margin.top})`)
        .call(brush)
        .call(brush.move, defaultWindow)
}

function brushed(event) {
    if (event.selection) {
        let extent = event.selection.map(d => x2.invert(d));

        x1.domain(extent);

        brushStart = svgdata.findIndex(d => {
            const timestampDate = new Date(d.timestamp); 
            return timestampDate >= extent[0]; 
        });

        brushEnd = svgdata.findIndex(d => {
            const timestampDate = new Date(d.timestamp);
            return timestampDate > extent[1]; 
        }) - 1;

        d3.selectAll('.focus .line').attr('d', d => d3.line()
            .x(d => x1(d.timestamp))
            .y(d => y1(d.value))
            (d[1]) 
        );

        d3.select('.focus .x-axis').call(d3.axisBottom(x1));
    }
}

export function changeView(type) {
    viewType = type
    d3.selectAll('.focus .line')
        .style('stroke', (d, i) => viewType == 0 ? d3.schemeCategory10[i % 10] : getLineProperties(d[0]).color)
        .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity)
        .style('stroke-width', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).width)
    
    d3.selectAll('.context .line')
        .style('stroke', (d, i) => viewType == 0 ? d3.schemeCategory10[i % 10] : getLineProperties(d[0]).color)
        .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity)
        .style('stroke-width', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).width)

    if (viewType == 1) {
        addLegend();
    } else if (viewType == 0) {
        removeLegend();
    }
}

export function updateLabels(chartdata) {
    depths = chartdata.depths
    labels = chartdata.labels

    // updating line properties for focus and context views
    d3.selectAll('.focus .line')
        .attr('class', (d, i) => {
            let classes = `line line-${d[0].measurement} `;
            if (labels.amp[i]) classes += 'amplitude';
            if (labels.phs[i]) classes += 'phase';
            return classes;
        })
        .style('stroke', (d, i) => viewType == 0 ? d3.schemeCategory10[i % 10] : getLineProperties(d[0]).color)
        .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity)
        .style('stroke-width', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).width)
    
    d3.selectAll('.context .line')
        .attr('class', (d, i) => {
            let classes = `line line-${d[0].measurement} `;
            if (labels.amp[i]) classes += 'amplitude';
            if (labels.phs[i]) classes += 'phase';
            return classes;
        })
        .style('stroke', (d, i) => viewType == 0 ? d3.schemeCategory10[i % 10] : getLineProperties(d[0]).color)
        .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity)
        .style('stroke-width', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).width)
}

