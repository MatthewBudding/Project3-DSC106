// Configuration
const config = {
    width: 1200,
    height: 800,
    margin: { top: 50, right: 50, bottom: 50, left: 50 },
    intervalsPerHour: 6, // 10-minute intervals
    hours: 24,
    days: 14,
    minutesPerInterval: 10
};

// Create SVG
const svg = d3.select("#heatmap")
    .append("svg")
    .attr("width", config.width + 100) // Increased width to accommodate legend
    .attr("height", config.height * 1.2); // Increased height to accommodate legend and slider

// Create tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

    // Create filter range text
const filterRangeText = svg.append("text")
    .attr("x", config.width / 2)
    .attr("y", config.margin.top +430)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Filter Range: All");
// Calculate dimensions for each heatmap
const heatmapHeight = (config.height - config.margin.top - config.margin.bottom) / 2;
const heatmapWidth = config.width - config.margin.left - config.margin.right;

// Scales
const xScale = d3.scaleLinear()
    .domain([0, config.hours * config.intervalsPerHour])
    .range([0, heatmapWidth]);

const yScale = d3.scaleLinear()
    .domain([0, config.days])
    .range([0, heatmapHeight]);

const colorScale = d3.scaleSequential(d3.interpolateInferno)
    .domain([0, 100]);

// Function to format time for tooltip
function formatTime(interval) {
    const hour = Math.floor(interval / config.intervalsPerHour);
    const minutes = (interval % config.intervalsPerHour) * config.minutesPerInterval;
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Function to process CSV data into 10-minute intervals
function processCSVData(csvData) {
    const processedData = [];
    const minutesPerDay = config.hours * 60;
    
    // Calculate mean for all mice at each timepoint
    csvData.forEach((row, rowIndex) => {
        const minuteOfDay = rowIndex % minutesPerDay;
        const intervalOfDay = Math.floor(minuteOfDay / config.minutesPerInterval);
        const day = Math.floor(rowIndex / minutesPerDay);
        
        if (day < config.days) {
            // Calculate mean of all columns except time-related ones
            const values = Object.entries(row)
                .filter(([key]) => !['hours', 'light'].includes(key))
                .map(([_, value]) => parseFloat(value));
            
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            
            // Add to processed data if it's a new 10-minute interval
            if (rowIndex % config.minutesPerInterval === 0) {
                processedData.push({
                    day: day,
                    interval: intervalOfDay,
                    value: mean
                });
            }
        }
    });
    
    return processedData;
}

// Function to create a single heatmap
function createHeatmap(data, title, yPos, filterRange) {
    
    const filteredData = data.filter(d => d.value <= filterRange[0] && d.value >= filterRange[1]);

    // Remove existing heatmap group if it exists
    const heatmapClass = `heatmap-${title.replace(/\s+/g, '-')}`;
    const existingGroup = svg.selectAll(`.${heatmapClass}`);
    if (!existingGroup.empty()) {
        existingGroup.remove();
    }

    const group = svg.append("g")
        .attr("class", `heatmap ${heatmapClass}`)
        .attr("transform", `translate(${config.margin.left}, ${yPos})`);

    // Add title
    group.append("text")
        .attr("x", heatmapWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(title);

    const cellWidth = heatmapWidth / (config.hours * config.intervalsPerHour);
    const cellHeight = heatmapHeight / config.days;

    // Add light/dark period rectangles
    for (let i = 0; i < config.hours; i += 12) {
        group.append("rect")
            .attr("x", xScale(i * config.intervalsPerHour))
            .attr("y", 0)
            .attr("width", cellWidth * config.intervalsPerHour * 12)
            .attr("height", heatmapHeight)
            .attr("fill", i % 24 === 0 ? "rgba(0,0,0,0.1)" : "none")
            .attr("opacity", 0.5);
    }

    // Add heatmap cells
    group.selectAll(".cell")
        .data(filteredData)
        .enter()
        .append("rect")
        .attr("class", "cell")
        .attr("x", d => xScale(d.interval))
        .attr("y", d => yScale(d.day))
        .attr("width", cellWidth)
        .attr("height", cellHeight)
        .attr("fill", d => colorScale(d.value))
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(
                `Day: ${d.day + 1}<br>` +
                `Time: ${formatTime(d.interval)}<br>` +
                `Temperature: ${d.value.toFixed(2)}`
            )
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Add axes
    const xAxis = d3.axisBottom(xScale)
        .ticks(config.hours)
        .tickValues(d3.range(0, config.hours * config.intervalsPerHour, config.intervalsPerHour)) // Only show the hour intervals
        .tickFormat(d => Math.floor(d / config.intervalsPerHour));
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(config.days);

    group.append("g")
        .attr("transform", `translate(0, ${heatmapHeight})`)
        .call(xAxis);

    group.append("g")
        .call(yAxis);

    // Add axis labels
    group.append("text")
        .attr("class", "axis-label")
        .attr("x", heatmapWidth / 2)
        .attr("y", heatmapHeight + 40)
        .attr("text-anchor", "middle")
        .text("Hour of Day");

    group.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -heatmapHeight / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text("Day");
}

// Function to update heatmaps based on filter range
function updateHeatmaps(filterRange) {
    if (filterRange === null) {
        // Reset to full range
        const allValues = [...femaleProcessed, ...maleProcessed].map(d => d.value);
        const minValue = d3.min(allValues);
        const maxValue = d3.max(allValues);
        filterRange = [maxValue, minValue];
    }
    createHeatmap(femaleProcessed, "Female Temperature", config.margin.top, filterRange);
    createHeatmap(maleProcessed, "Male Temperature", config.margin.top + heatmapHeight + 150, filterRange);
    filterRangeText.text(`Filter Range: ${filterRange[1].toFixed(2)} - ${filterRange[0].toFixed(2)}`);
}



// Load and process data
Promise.all([
    d3.csv("../data/FemTemp.csv"),
    d3.csv("../data/MaleTemp.csv")
]).then(([femData, maleData]) => {
    // Process the data
    femaleProcessed = processCSVData(femData);
    maleProcessed = processCSVData(maleData);
    
    // Update color scale domain based on actual data ranges
    const allValues = [...femaleProcessed, ...maleProcessed].map(d => d.value);
    const minValue = d3.min(allValues);
    const maxValue = d3.max(allValues);
    colorScale.domain([minValue, maxValue]);
    
    // Create heatmaps
    createHeatmap(femaleProcessed, "Female Temperature", config.margin.top, [maxValue, minValue]);
    createHeatmap(maleProcessed, "Male Temperature", config.margin.top + heatmapHeight + 150, [maxValue, minValue]);
    
    // Create legend
    createLegend(minValue, maxValue);
}).catch(error => {
    console.error("Error loading the data:", error);
});

// Function to create legend
// Function to create legend
function createLegend(minValue, maxValue) {
    const legendHeight = 800;
    const legendWidth = 20;

    const legendSvg = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${config.width + 50}, ${config.margin.top})`);

    const gradient = legendSvg.append("defs")
        .append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    // Use the same color scale for the legend
    gradient.selectAll("stop")
        .data(d3.range(0, 1.01, 0.01))
        .enter()
        .append("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => colorScale(d * (maxValue - minValue) + minValue));

    legendSvg.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legendGradient)");

    const legendScale = d3.scaleLinear()
        .domain([minValue, maxValue])
        .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(5);

    legendSvg.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(legendAxis);

    // Add brush for interactive legend
    const brush = d3.brushY()
        .extent([[0, 0], [legendWidth, legendHeight]])
        .on("brush end", function(event) {
            const selection = event.selection || [0, legendHeight];
            const selectedRange = selection.map(legendScale.invert);
            updateHeatmaps(selectedRange);
        });

    legendSvg.append("g")
        .attr("class", "brush")
        .call(brush);
}
// Add event listener to the "Reset Filter" button
document.getElementById("reset-filter").addEventListener("click", function() {
    updateHeatmaps(null);
});