// Load the CSV file
d3.csv("data/FemTemp.csv").then(data => {
    // Extract feature names (column headers)
    const features = Object.keys(data[0]);
    
    // Extract values from the first row and convert them to numbers
    const values = features.map(feature => +data[0][feature]);

    // Create an array of objects with { category, value }
    const chartData = features.map((feature, i) => ({
        category: feature,
        value: values[i]
    }));

    // Set up chart dimensions
    const width = 600, height = 400, margin = { top: 20, right: 30, bottom: 50, left: 50 };

    // Create SVG container
    const svg = d3.select("body")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create scales
    const x = d3.scaleBand()
        .domain(chartData.map(d => d.category))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.value)])
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Draw bars
    svg.selectAll("rect")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("x", d => x(d.category))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - margin.bottom - y(d.value))
        .attr("fill", "steelblue");

    // Add X-axis
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")  
        .style("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em")
        .attr("transform", "rotate(-45)");

    // Add Y-axis
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));
    
}).catch(error => {
    console.error("Error loading CSV file:", error);
});
