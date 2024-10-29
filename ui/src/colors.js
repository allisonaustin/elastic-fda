export const percentColToD3Rgb = percentCol => {
    const col256 = percentCol.map(elm => Math.round(elm * 255))
    return `rgb(${col256[0]}, ${col256[1]}, ${col256[2]})`;
}

export const pallette = {
    blue: [0.31, 0.48, 0.65],
    green: [0.36, 0.63, 0.32],
    purple: [0.345, 0.24, 0.315],
}