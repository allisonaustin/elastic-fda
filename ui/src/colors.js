export const percentColToD3Rgb = percentCol => {
    const col256 = percentCol.map(elm => Math.round(elm * 255))
    return `rgb(${col256[0]}, ${col256[1]}, ${col256[2]})`;
}

export const pallette = {
    blue: [0.31, 0.48, 0.65],
    purple: [0.345, 0.24, 0.315],
    lightgray: '#9499a0',
    red: '#B85B68',
    green: '#457500',
    orange: '#DA7400',
    pink: '#DA73A1',
    lightblue: '#91a7c6',
    gray: '#b5c2d5'
}

export const scale = {
    0: '#443665',
    1: '#49457E',
    2: '#535C96',
    3: '#637CAE',
    4: '#72A0C5',
    5: '#84BBCE',
    6: '#96D2D7',
    7: '#A8DFD9',
    8: '#BBE7D9',
    9: '#CEEEDE',
    10:'#E1F5E8'
}