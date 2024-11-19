import * as d3 from 'd3';
import axios from 'axios';
import { pallette, scale, percentColToD3Rgb } from './colors.js';
import { isEmpty, debounce, isUndefined } from 'lodash';

const margin = { left: 50, right: 30, top: 20, bottom: 30 }
let size = { width: 800, height: 600 }
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

export function mountGraph(data) {
    depths = data.depths;
    labels = data.labels;
    d3.select('#graph-svg').selectAll('*').remove();

    const nodes = Object.keys(depths.measurement).map(key => ({
        id: depths.measurement[key],
        amplitude: depths.amplitude[key],
        phase: depths.phase[key]
    }));

    simulation = d3.forceSimulation(nodes)
        .force('center', d3.forceCenter(size.width / 2, size.height / 2))
        .force('charge', d3.forceManyBody().strength(-50))
        .force('collision', d3.forceCollide().radius(d => d.amplitude * 100));

    const node = container.selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('id', `circle-${d.id}`)
        .attr('r', d => d.amplitude) 
        .attr('fill', (d, i) => {
            if (labels.amp[i] && labels.phs[i]) {
                return `linear-gradient(90deg, ${pallette.red} 50%, ${pallette.green} 50%)`;  // Both amplitude and phase
            } else if (labels.amp[i]) {
                return `linear-gradient(90deg, ${pallette.red} 100%, white 100%)`;  // Only amplitude
            } else if (labels.phs[i]) {
                return `linear-gradient(90deg, ${pallette.green} 100%, white 100%)`;  // Only phase
            } else {
                return '#e0f7fa'; 
            }
        }) 
        
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded));
    
    const label = container.selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .attr('dx', 10)
        .attr('dy', '.35em')
        .text(d => d.id);
}

function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}