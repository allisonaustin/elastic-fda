import * as d3 from 'd3';
import axios from 'axios';
import { pallette, scale, percentColToD3Rgb } from './colors.js';
import { isEmpty, debounce, isUndefined } from 'lodash';

const margin = { left: 100, right: 30, top: 20, bottom: 45 }
let size = { width: 800, height: 650 }
let container = d3.select('#graph-svg')
let svgdata = []
let depths = []
let labels = []
let viewType = 1;
let simulation;

let defaultColor = pallette.lightgray;
let legendColors = {
    amplitude: pallette.red,
    phase: pallette.green
}

const format = (d) => d < 0.01 ? d3.format(".2e")(d) : d3.format(".2f")(d);

export function mountGraph(data) {
    d3.select('#graph-svg').selectAll('*').remove();

    const nodes = Object.keys(data.measurement).map(key => ({
        id: data.measurement[key],
        amplitude: data.amplitude[key],
        phase: data.phase[key]
    }));

    const xScale = d3.scaleLinear()
        .domain(d3.extent(nodes, d => d.phase)) 
        .range([margin.left, size.width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(nodes, d => d.amplitude)) 
        .range([size.height - margin.bottom, margin.top]);

    const svg = d3.select('#graph-svg')
        .attr('viewBox', `0 0 ${size.width + margin.right} ${size.height}`) 
        .append('g');

    svg.selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.phase)) // x-position based on phase depth
        .attr('cy', d => yScale(d.amplitude)) // y-position based on amplitude depth
        .attr('r', 7) 
        .attr('fill', 'steelblue') 
        .attr('opacity', 0.7);

    svg.selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .attr('x', d => xScale(d.phase) + 7) 
        .attr('y', d => yScale(d.amplitude) - 7) 
        .text(d => d.id) 
        .attr('font-size', '14px')
        .attr('fill', 'black');

    // X-axis
    const xAxis = d3.axisBottom(xScale).tickFormat(format);
    svg.append('g')
        .attr('transform', `translate(0, ${size.height - margin.bottom})`)
        .call(xAxis)
        .append('text')
        .attr('x', size.width / 1.7)
        .attr('y', margin.bottom)
        .attr('fill', 'black')
        .attr('text-anchor', 'end')
        .text('Phase Depth')
        
    d3.selectAll('text')
        .style('font-size', '14px')

    // Y-axis
    const yAxis = d3.axisLeft(yScale).tickFormat(format);
    svg.append('g')
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

    d3.selectAll('text')
        .style('font-size', '14px')
}
