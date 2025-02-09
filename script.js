const svg = d3.select("svg");

const data = [10, 40, 30, 60, 90];

svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d, i) => i * 50)
    .attr("y", d => 400 - d * 4)
    .attr("width", 40)
    .attr("height", d => d * 4)
    .attr("fill", "steelblue");
