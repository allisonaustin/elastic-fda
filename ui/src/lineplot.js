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
    let opacity = 0.5; 
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
    data.forEach((d, index) => {
        (Object.keys(d)).forEach((c) => {
            if (c != 'timestamp' && c != 'index') {
                processed.push({ 
                    index: d.timestamp ? d3.timeParse('%Y-%m-%d %H:%M:%S')(d.timestamp) : index,
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

function getXAxisScale(data, width) {
    if (svgdata.some(d => d.hasOwnProperty('timestamp'))) {
        return d3.scaleTime()
            .domain(d3.extent(data, function(d) { return d.index }))
            .range([ 0, width ]);
    } else {
        return d3.scaleLinear()
            .domain(d3.extent(data, function(d) { return d.index }))
            .range([0, width]);
    }
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
        addFuncs();
    }
}

function addLegend() {
    removeLegend();

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
                d3.selectAll('.ds-circle')
                    .style('opacity', 0.1)
           
                d3.selectAll('.focus .line')
                    .filter(function() {
                        return d3.select(this).attr('class').includes(label);
                    })
                    .style('opacity', 1);

                d3.selectAll('.context .line')
                    .filter(function() {
                        return d3.select(this).attr('class').includes(label);
                    })
                    .style('opacity', 1);
            })
            .on('mouseout', () => {
                d3.selectAll('.focus .line')
                    .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity)
    
                d3.selectAll('.context .line')
                    .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity)
                
                d3.selectAll('.ds-circle')
                    .style('opacity', 0.8)
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

function hideLegend() {
    d3.select('#ts_legend').style('display', 'none');
}

function showLegend() {
    d3.select('#ts_legend').style('display', 'block');
}

function removeLegend() {
    d3.select('.legend')
        .remove()
}

// https://observablehq.com/@thetylerwolf/day-16-zoomable-area-chart
export function focusView(data) {

    d3.select('#line-svg').selectAll('*').remove()

    data = processData(svgdata)
    const grouped = d3.group(data, d => d.measurement)
    
    const format = d3.format(",.0f");
    size = { width: 600, height1: 250, height2: 100 }

    d3.select('#line-svg').attr('width', size.width + margin.right)

    x1 = getXAxisScale(data, size.width)

    y1 = d3.scaleLinear()
      .domain([d3.min(data, function(d) { return +d.value }), d3.max(data, function(d) { return +d.value; })])
      .range([ size.height1, 0 ]);

    const line = d3.line()
        .x(function(d) { return x1(d.index) })
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
            .attr('id', (d) => `${d[0]}-focus`)
            .attr('class', (d, i) => {
                let classes = `line `;
                if (labels.amp[i]) classes += '.amplitude';
                if (labels.phs[i]) classes += '.phase';
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
    x2 = getXAxisScale(data, size.width)

    y2 = d3.scaleLinear()
        .domain([d3.min(data, function(d) { return +d.value }), d3.max(data, function(d) { return +d.value; })])
        .range([ size.height2, 0 ]);

    let line2 = d3.line()
        .x(function(d) { return x2(d.index) })
        .y(function(d) { return y2(+d.value) })

    const context = chartContainer.append('g')
      .attr('class', 'context')
      .attr('transform', `translate(${ margin.left },${ size.height1 + size.height2 - margin.bottom - margin.top })`)
    
    context.selectAll('.line')
        .data(grouped)
        .enter()
            .append('path')
            .attr('id', (d) => `${d[0]}-context`)
            .attr('class', (d, i) => {
                let classes = `line `;
                if (labels.amp[i]) classes += '.amplitude';
                if (labels.phs[i]) classes += '.phase';
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
    brushEnd = Math.floor(data.length * 0.4);

    const defaultWindow = [
        x2(data[brushStart].index),
        x2(data[brushEnd].index)
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

        const isDateIndex = svgdata.some(d => d.hasOwnProperty('timestamp'));

        brushStart = svgdata.findIndex(d => {
            if (isDateIndex) {
                return new Date(d.timestamp) >= extent[0]
            } else {
                return Math.round(d.index) >= Math.round(extent[0])
            }
        });

        brushEnd = svgdata.findIndex(d => {
            if (isDateIndex) {
                return new Date(d.timestamp) > extent[1]
            } else {
                return Math.round(d.index) > Math.round(extent[1])
            }
        }) - 1;

        d3.selectAll('.focus .line').attr('d', d => d3.line()
            .x(d => x1(d.index))
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
        showLegend();
        showFuncs();
    } else if (viewType == 0) {
        hideLegend();
        hideFuncs();
    }
}

export function addFuncs() {
    removeFuncs();
    const fsList = document.getElementById('fs-list');

    let dataList = Object.keys(depths.amplitude).map(key => ({
        amplitude: depths.amplitude[key],
        phase: depths.phase[key],
        measurement: depths.measurement[key]
    }));

    dataList.forEach((item, i) => {
        const fn = document.createElement('div');
        fn.classList.add('fs_option');
        fn.textContent = item.measurement;

        fn.addEventListener('mouseover', function() {
            const allFuncs = document.querySelectorAll('.fs_option');
            const anyActive = Array.from(allFuncs).some(fn => fn.classList.contains('active'));
            if (!anyActive) {
                d3.selectAll('.focus .line')
                    .style('opacity', 0.1);
                d3.selectAll('.context .line')
                    .style('opacity', 0.1);
                d3.selectAll(`#${this.textContent}-focus`)
                    .style('opacity', 1);
                d3.selectAll(`#${this.textContent}-context`)
                    .style('opacity', 1);
                d3.selectAll('.ds-circle')
                    .style('opacity', 0.1);
                d3.selectAll(`#${this.textContent}-circle`)
                    .style('opacity', 0.8)
            }
        })
        fn.addEventListener('mouseout', function () {
            const allFuncs = document.querySelectorAll('.fs_option');
            const anyActive = Array.from(allFuncs).some(fn => fn.classList.contains('active'));
            if (!anyActive) {
                d3.selectAll('.focus .line')
                    .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity)
                d3.selectAll('.context .line')
                    .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity)
                d3.selectAll('.ds-circle')
                    .style('opacity', 0.8)
                }
        });

        fn.addEventListener('click', function() {
            const isActive = this.classList.contains('active');
            if (!isActive) {
                // d3.selectAll('.focus .line')
                //     .style('opacity', 0.1);
                // d3.selectAll('.context .line')
                //     .style('opacity', 0.1);
                d3.selectAll(`#${this.textContent}-focus`)
                    .style('opacity', 1);
                d3.selectAll(`#${this.textContent}-context`)
                    .style('opacity', 1);
                d3.selectAll(`#${this.textContent}-circle`)
                    .style('opacity', 0.8)
            }
            this.classList.toggle('active');
        });
        
        const amplitudePercent = (item.amplitude) * 100;
        const phasePercent = (item.phase) * 100;

        if (labels.amp[i] && labels.phs[i]) {
            fn.style.background = `linear-gradient(90deg, ${pallette.red} 50%, ${pallette.green} 50%)`;  // Both amplitude and phase
            fn.style.color = 'white';
        } else if (labels.amp[i]) {
            fn.style.background = `linear-gradient(90deg, ${pallette.red} 100%, white 100%)`;  // Only amplitude
            fn.style.color = 'white';
        } else if (labels.phs[i]) {
            fn.style.background = `linear-gradient(90deg, ${pallette.green} 100%, white 100%)`;  // Only phase
            fn.style.color = 'white';
        } else {
            fn.style.background = ''; 
            fn.style.color = '';
        }

        fsList.appendChild(fn);
    });
}

export function showFuncs() {
    const fs = document.querySelectorAll('.fs_option');
    fs.forEach(fn => {
        fn.style.display = 'inline-block';
    });
}

export function hideFuncs() {
    const fs = document.querySelectorAll('.fs_option');
    fs.forEach(fn => {
        fn.style.display = 'none';
    });
}

export function removeFuncs() {
    const fContainer = document.getElementById('fs-list');
    fContainer.innerHTML = '';
}

export function updateLabels(chartdata) {
    depths = chartdata.depths
    labels = chartdata.labels

    // updating line properties for focus and context views
    d3.selectAll('.focus .line')
        .attr('class', (d, i) => {
            let classes = `line `;
            if (labels.amp[i]) classes += '.amplitude';
            if (labels.phs[i]) classes += '.phase';
            return classes;
        })
        .style('stroke', (d, i) => viewType == 0 ? d3.schemeCategory10[i % 10] : getLineProperties(d[0]).color)
        .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity)
        .style('stroke-width', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).width)
    
    d3.selectAll('.context .line')
        .attr('class', (d, i) => {
            let classes = `line `;
            if (labels.amp[i]) classes += '.amplitude';
            if (labels.phs[i]) classes += '.phase';
            return classes;
        })
        .style('stroke', (d, i) => viewType == 0 ? d3.schemeCategory10[i % 10] : getLineProperties(d[0]).color)
        .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity)
        .style('stroke-width', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).width)


    // updating functions
    const fs = document.querySelectorAll('.fs_option');
    fs.forEach((fn, i) => {
        if (labels.amp[i] && labels.phs[i]) {
            fn.style.background = `linear-gradient(90deg, ${pallette.red} 50%, ${pallette.green} 50%)`;  // Both amplitude and phase
            fn.style.color = 'white';
        } else if (labels.amp[i]) {
            fn.style.background = `linear-gradient(90deg, ${pallette.red} 100%, white 100%)`;  // Only amplitude
            fn.style.color = 'white';
        } else if (labels.phs[i]) {
            fn.style.background = `linear-gradient(90deg, ${pallette.green} 100%, white 100%)`;  // Only phase
            fn.style.color = 'white';
        } else {
            fn.style.background = ''; 
            fn.style.color = '';
        }
    });
}

document.addEventListener('click', function(event) {
    const allFuncs = document.querySelectorAll('.fs_option');
    const fsList = document.getElementById('fs-list');

    if (!fsList.contains(event.target)) {
        allFuncs.forEach(fn => fn.classList.remove('active'));
        d3.selectAll('.focus .line')
            .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity);
        d3.selectAll('.context .line')
            .style('opacity', (d) => viewType == 0 ? 1 : getLineProperties(d[0]).opacity);
    }
});
