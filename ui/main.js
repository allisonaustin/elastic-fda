import { mountChart, focusView, changeView, updateLabels } from './src/lineplot.js'
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

async function computeOutliers(k, threshold) {
  const flaskUrl = `http://127.0.0.1:5001/getOutliers/${k}/${threshold}`;
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
  
  if (viewType == 0) {
    document.getElementById('depth-config').style.display = 'none';
  } else if (viewType == 1) {
    document.getElementById('depth-config').style.display = 'block';
  }

  mount(filename, viewType);
}

function toggleButton(button) {
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  updateViewType(button.value);

  if (button.value == 0) {
    document.getElementById('depth-config').style.display = 'none';
  } else if (button.value == 1) {
    document.getElementById('depth-config').style.display = 'block';
  }
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

// document.getElementsByClassName("num-input").addEventListener("input", function (event) {
//   this.value = this.value.replace(/[^0-9]/g, '');
// });

document.getElementById("depth-params").addEventListener("submit", submitDepthParams);

async function submitDepthParams(event) {
  event.preventDefault();

  const kValue = document.getElementById('k-input').value;
  const thresholdValue = document.getElementById('threshold-input').value;

  // change in defaults
  if ((kValue != 1.5) || (thresholdValue != 0.5)) {
    const timeSeriesData = await computeOutliers(kValue, thresholdValue)
    updateLabels(timeSeriesData)
  }
}