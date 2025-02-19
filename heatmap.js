// Configuration
const config = {
    width: 1200,
    height: 800,
    margin: { top: 50, right: 50, bottom: 50, left: 50 },
    intervalsPerHour: 6,
    hours: 24,
    days: 14,
    minutesPerInterval: 10
};

// Create SVG
const svg = d3.select("#heatmap")
    .append("svg")
    .attr("width", config.width + 100)
    .attr("height", config.height * 1.2);

// Create tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Create filter range text
const filterRangeText = svg.append("text")
    .attr("x", config.width / 2)
    .attr("y", config.margin.top + 430)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Filter Range: All");

// State management for current metric
let currentMetric = 'activity'; // or 'temperature'
let processedData = {
    activity: { female: null, male: null },
    temperature: { female: null, male: null }
};

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

// Separate color scales for activity and temperature
const colorScales = {
    activity: d3.scaleSequential(d3.interpolateViridis),
    temperature: d3.scaleSequential(d3.interpolateInferno)
};

function formatTime(interval) {
    const hour = Math.floor(interval / config.intervalsPerHour);
    const minutes = (interval % config.intervalsPerHour) * config.minutesPerInterval;
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function processCSVData(csvData) {
    const processedData = [];
    const minutesPerDay = config.hours * 60;
    
    csvData.forEach((row, rowIndex) => {
        const minuteOfDay = rowIndex % minutesPerDay;
        const intervalOfDay = Math.floor(minuteOfDay / config.minutesPerInterval);
        const day = Math.floor(rowIndex / minutesPerDay);
        
        if (day < config.days) {
            const values = Object.entries(row)
                .filter(([key]) => !['hours', 'light'].includes(key))
                .map(([_, value]) => parseFloat(value));
            
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            
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

function clearAllHeatmaps() {
    // Remove all existing heatmaps and their elements
    svg.selectAll(".heatmap").remove();
}

function createHeatmap(data, title, yPos, filterRange) {
    const metric = currentMetric;
    const tooltipLabel = metric === 'activity' ? 'Activity' : 'Temperature';
    
    const filteredData = data.filter(d => d.value <= filterRange[0] && d.value >= filterRange[1]);

    const group = svg.append("g")
        .attr("class", `heatmap`)  // Simplified class name
        .attr("transform", `translate(${config.margin.left}, ${yPos})`);

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

    group.selectAll(".cell")
        .data(filteredData)
        .enter()
        .append("rect")
        .attr("class", d => `cell cell-${title.includes("Female") ? "Female" : "Male"}`)
        .attr("x", d => xScale(d.interval))
        .attr("y", d => yScale(d.day))
        .attr("width", cellWidth)
        .attr("height", cellHeight)
        .attr("fill", d => colorScales[metric](d.value))
        .on("mouseover", function(event, d) {
            const otherGender = title.includes("Female") ? "Male" : "Female";
        
            // Find the corresponding value in the other heatmap
            const otherValue = processedData[currentMetric][otherGender.toLowerCase()]
                .find(e => e.day === d.day && e.interval === d.interval)?.value || 0;
            
            const difference = d.value - otherValue; // Compute difference
        
            // Highlight both the hovered and corresponding cell
            d3.select(this)
                .attr("stroke", "white")
                .attr("stroke-width", 2);
        
            d3.selectAll(`.cell-${otherGender}`)
                .filter(e => e.day === d.day && e.interval === d.interval)
                .attr("stroke", "white")
                .attr("stroke-width", 2);
        
            // Show tooltip with the difference included
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip.html(
                `Day: ${d.day + 1}<br>` +
                `Time: ${formatTime(d.interval)}<br>` +
                `${tooltipLabel}: ${d.value.toFixed(2)}<br>` +
                `-----<br>` +  // Separator line
                `Difference: ${difference.toFixed(2)}`
            )
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        
            // Store the other gender's corresponding cell data
            d3.select(this).attr("data-other-gender", otherGender);
        })
        .on("mouseout", function(event, d) {
            const otherGender = d3.select(this).attr("data-other-gender"); // Retrieve stored gender
        
            // Remove highlight from both elements
            d3.select(this)
                .attr("stroke", "none");
        
            d3.selectAll(`.cell-${otherGender}`)
                .filter(e => e.day === d.day && e.interval === d.interval)
                .attr("stroke", "none");
        
            // Hide tooltip
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    const xAxis = d3.axisBottom(xScale)
        .ticks(config.hours)
        .tickValues(d3.range(0, config.hours * config.intervalsPerHour, config.intervalsPerHour))
        .tickFormat(d => Math.floor(d / config.intervalsPerHour));
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(config.days);

    group.append("g")
        .attr("transform", `translate(0, ${heatmapHeight})`)
        .call(xAxis);

    group.append("g")
        .call(yAxis);

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

function updateHeatmaps(filterRange) {
    const data = processedData[currentMetric];
    if (!data.female || !data.male) return;

    if (filterRange === null) {
        const allValues = [...data.female, ...data.male].map(d => d.value);
        const minValue = d3.min(allValues);
        const maxValue = d3.max(allValues);
        filterRange = [maxValue, minValue];
    }

    // Clear all existing heatmaps before creating new ones
    clearAllHeatmaps();

    const metricLabel = currentMetric.charAt(0).toUpperCase() + currentMetric.slice(1);
    createHeatmap(data.female, `Female ${metricLabel}`, config.margin.top, filterRange);
    createHeatmap(data.male, `Male ${metricLabel}`, config.margin.top + heatmapHeight + 150, filterRange);
    filterRangeText.text(`Filter Range: ${filterRange[1].toFixed(2)} - ${filterRange[0].toFixed(2)}`);
}

function createLegend(minValue, maxValue) {
    // Remove existing legend before creating new one
    svg.selectAll(".legend").remove();

    const legendHeight = 800;
    const legendWidth = 20;

    const legendSvg = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${config.width + 30}, ${config.margin.top})`);

    // Add instruction text
    legendSvg.append("text")
        .attr("class", "legend-title")
        .attr("x", legendWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("fill", "#4a5568")
        .attr("font-size", "14px")
        .text("Drag to Filter");

    // Add visual handles at top and bottom
    const handleHeight = 10;
    const handleWidth = legendWidth + 10;
    
    // Top handle
    legendSvg.append("rect")
        .attr("class", "legend-handle")
        .attr("x", -5)
        .attr("y", -5)
        .attr("width", handleWidth)
        .attr("height", handleHeight)
        .attr("fill", "#e2e8f0")
        .attr("rx", 3);

    // Bottom handle
    legendSvg.append("rect")
        .attr("class", "legend-handle")
        .attr("x", -5)
        .attr("y", legendHeight - 5)
        .attr("width", handleWidth)
        .attr("height", handleHeight)
        .attr("fill", "#e2e8f0")
        .attr("rx", 3);

    const gradient = legendSvg.append("defs")
        .append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    gradient.selectAll("stop")
        .data(d3.range(0, 1.01, 0.01))
        .enter()
        .append("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => colorScales[currentMetric](d * (maxValue - minValue) + minValue));

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
        .attr("class", "legend-axis")
        .call(legendAxis);

    const brush = d3.brushY()
        .extent([[0, 0], [legendWidth, legendHeight]])
        .on("brush end", function(event) {
            const selection = event.selection || [0, legendHeight];
            const selectedRange = selection.map(legendScale.invert);
            updateHeatmaps(selectedRange);
        });

    const brushGroup = legendSvg.append("g")
        .attr("class", "brush")
        .call(brush);

    // Add CSS class for custom styling
    brushGroup.select(".selection")
        .attr("fill", "rgba(66, 153, 225, 0.15)")
        .attr("stroke", "#4299e1")
        .attr("stroke-width", "2px");

    // Add resize handles styling
    brushGroup.selectAll(".handle")
        .attr("fill", "#4299e1")
        .attr("stroke", "#2b6cb0");
}

function switchMetric(metric) {
    currentMetric = metric;
    const data = processedData[metric];
    if (!data.female || !data.male) return;

    clearAllHeatmaps();
    svg.selectAll(".legend").remove();

    const allValues = [...data.female, ...data.male].map(d => d.value);
    const minValue = d3.min(allValues);
    const maxValue = d3.max(allValues);
    colorScales[metric].domain([minValue, maxValue]);
    
    updateHeatmaps([maxValue, minValue]);
    createLegend(minValue, maxValue);
}

// Load all data at startup
Promise.all([
    d3.csv("data/FemAct.csv"),
    d3.csv("data/MaleAct.csv"),
    d3.csv("data/FemTemp.csv"),
    d3.csv("data/MaleTemp.csv")
]).then(([femAct, maleAct, femTemp, maleTemp]) => {
    // Process all data
    processedData.activity.female = processCSVData(femAct);
    processedData.activity.male = processCSVData(maleAct);
    processedData.temperature.female = processCSVData(femTemp);
    processedData.temperature.male = processCSVData(maleTemp);
    
    // Initialize with activity data
    switchMetric('activity');
}).catch(error => {
    console.error("Error loading the data:", error);
});

// Event listeners
document.getElementById("reset-filter").addEventListener("click", function() {
    updateHeatmaps(null);

    // Reset brush selection to the full range
    const legendScale = d3.scaleLinear()
        .domain(colorScales[currentMetric].domain()) // Get min/max values
        .range([800, 0]); // Match legend height

    const defaultSelection = [legendScale.range()[1], legendScale.range()[0]]; // Full range

    d3.select(".brush")
        .call(d3.brushY().move, defaultSelection); // Reset brush
});


document.getElementById("metric-toggle").addEventListener("change", function(event) {
    switchMetric(event.target.value);
});