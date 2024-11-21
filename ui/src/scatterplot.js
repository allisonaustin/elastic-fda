import * as d3 from 'd3';
import axios from 'axios';
import { pallette, scale, percentColToD3Rgb } from './colors.js';
import { isEmpty, debounce, isUndefined } from 'lodash';

const margin = { left: 100, right: 30, top: 20, bottom: 45 }
let size = { width: 800, height: 650 }
let svgdata = []
let depths = []
let labels = []
let viewType = 1;

let container;
let svg;

let defaultColor = pallette.lightgray;
let legendColors = {
    amplitude: pallette.red,
    phase: pallette.green
}

const format = (d) => d < 0.01 ? d3.format(".2e")(d) : d3.format(".2f")(d);

let xScale = d3.scaleLinear().range([margin.left, size.width - margin.right]);
let yScale = d3.scaleLinear().range([size.height - margin.bottom, margin.top]);
let xAxis, yAxis;


export function mountGraph(data) {
    depths = data.depths;
    labels = data.labels;

    let nodes = Object.keys(depths.measurement).map(key => ({
        id: depths.measurement[key],
        amplitude: depths.amplitude[key],
        phase: depths.phase[key]
    }));

    xScale = d3.scaleLinear()
        .domain(d3.extent(nodes, d => d.phase)) 
        .range([margin.left, size.width - margin.right]);

    yScale = d3.scaleLinear()
        .domain(d3.extent(nodes, d => d.amplitude)) 
        .range([size.height - margin.bottom, margin.top]);

    svg = d3.select('#graph-svg')
        .attr('viewBox', `0 0 ${size.width + margin.right} ${size.height}`);
    
    container = svg.append('g').attr('id', 'scatter-container');

    // X-axis
    xAxis = d3.axisBottom(xScale).tickFormat(format);
    container.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${size.height - margin.bottom})`)
        .call(xAxis)
        .append('text')
        .attr('x', size.width / 1.7)
        .attr('y', margin.bottom)
        .attr('fill', 'black')
        .attr('text-anchor', 'end')
        .style('font-size', '14px')
        .text('Phase Depth')

    // Y-axis
    yAxis = d3.axisLeft(yScale).tickFormat(format);
    container.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(yAxis)
        .append('text')
        .attr('x', -margin.left)
        .attr('y', margin.top)
        .attr('dy', '0.75em')
        .attr('fill', 'black')
        .attr('text-anchor', 'end')
        .attr('transform', `rotate(-90) translate(-${size.width/5},${-margin.left})`)
        .style('font-size', '14px')
        .text('Amplitude Depth');

    appendCircles(nodes);
}

function appendCircles(data) {
    let circs = container.append('g')
        .selectAll('.ds-circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', (d, i) => {
            let classes = `ds-circle `;
            if (labels.amp[i]) classes += 'amplitude';
            if (labels.phs[i]) classes += 'phase';
            return classes;
        })
        .attr('id', (d, i) => d.id)
        .attr('cx', d => xScale(d.phase)) // x-position based on phase depth
        .attr('cy', d => yScale(d.amplitude)) // y-position based on amplitude depth
        .attr('r', 7) 
        .attr('fill', (d, i) => {
            if (labels.amp[i]) {
                return `${pallette.red}`;  
            } else if (labels.phs[i]) {
                return `${pallette.green}`; 
            } else {
                return 'steelblue'; 
            } 
        })
        .attr('opacity', 0);

    circs
        .transition()
        .duration(800)
        .style("opacity", 0.8);

    container.append('g')
        .selectAll('.text')
        .data(data)
        .enter()
            .append('text')
            .attr('class', 'ds-text')
            .attr('x', d => xScale(d.phase) + 7) 
            .attr('y', d => yScale(d.amplitude) - 7) 
            .text(d => d.id) 
            .attr('font-size', '14px')
            .attr('fill', 'black');
}

function updateAxis(data) {
    xScale.domain(d3.extent(data, d => d.phase));
    yScale.domain(d3.extent(data, d => d.amplitude));

    container.select('.x-axis')
        .transition()
        .duration(500)
        .call(d3.axisBottom(xScale));

    container.select('.y-axis')
        .transition()
        .duration(500)
        .call(d3.axisLeft(yScale)); 
}

export function updateData(newdata) {
    depths = newdata.depths;
    labels = newdata.labels;

    let newdepths = Object.keys(depths.measurement).map(key => ({
        id: depths.measurement[key],
        amplitude: depths.amplitude[key],
        phase: depths.phase[key]
    }));

    updateAxis(newdepths);
    updateCircles(newdepths);
}


function updateCircles(newdata) {
    let circles = container
        .selectAll(".ds-circle")
        .data(newdata)

    let circleText = container
        .selectAll('.ds-text')
        .data(newdata)
    
    circles
        .transition()
        .duration(500)
        .attr('cx', d => xScale(d.phase))
        .attr('cy', d => yScale(d.amplitude))
        .attr('fill', (d, i) => {
            if (labels.amp[i]) {
                return `${pallette.red}`;  
            } else if (labels.phs[i]) {
                return `${pallette.green}`; 
            } else {
                return 'steelblue'; 
            } 
        })

    circleText
        .transition()
        .duration(500)
        .attr('x', d => xScale(d.phase) + 7) 
        .attr('y', d => yScale(d.amplitude) - 7) 
}