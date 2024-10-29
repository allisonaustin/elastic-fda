import { mountChart, focusView } from './src/lineplot.js'
import './styles/main.css'

async function getData(filename) {
  const flaskUrl = `http://127.0.0.1:5001/getData/${filename}`;
  try {
    const res = await fetch(flaskUrl);
    if (!res.ok) {
      throw new Error('Error getting data.');
    }
    const data = await res.json();
    return data
  } catch (error) {
    console.error('Error:', error);
  }
}

async function mount(file) {
  const timeSeriesData = await getData(file);
  mountChart(timeSeriesData)
}

async function updateChart(file) {
  const timeSeriesData = await getData(file);
  mountChart(timeSeriesData)
  focusView(timeSeriesData.data)
}

function init() {
  let filename = document.getElementById('data_selection').value;
  mount(filename);
}

window.update = () => {
  let filename = document.getElementById('data_selection').value;
  updateChart(filename);
}

document.addEventListener('DOMContentLoaded', function () {
  init();
})