import { mountChart, focusView, changeView } from './src/lineplot.js'
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

async function mount(file, viewType) {
  const timeSeriesData = await getData(file);
  mountChart(timeSeriesData, viewType)
}

async function updateChart(file) {
  const timeSeriesData = await getData(file);
  let viewType = document.querySelector('.active').value;
  mountChart(timeSeriesData, viewType)
  focusView(timeSeriesData.data)
}

function updateViewType(viewType) {
  changeView(viewType);
}

function init() {
  let filename = document.getElementById('data_selection').value;
  let viewType = document.querySelector('.active').value;
  mount(filename, viewType);
}

function toggleButton(button) {
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  updateViewType(button.value);
}

document.getElementById('btn1').addEventListener('click', function() {
  toggleButton(this);
});

document.getElementById('btn2').addEventListener('click', function() {
  toggleButton(this);
});

window.update = () => {
  let filename = document.getElementById('data_selection').value;
  updateChart(filename);
}

document.addEventListener('DOMContentLoaded', function () {
  init();
})