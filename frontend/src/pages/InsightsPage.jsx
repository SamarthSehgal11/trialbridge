import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ISO 2-letter to ISO numeric ID mapping for common countries
const ISO_2_TO_NUMERIC = {
  "US": 840, "CA": 124, "GB": 826, "DE": 276, "FR": 250,
  "KR": 410, "JP": 392, "AU": 36,  "SG": 702, "IN": 356,
  "CN": 156, "BR": 76,  "ZA": 710, "IT": 380, "ES": 724,
  "NL": 528, "CH": 756, "SE": 752, "NO": 578, "DK": 208,
  "FI": 246, "RU": 643, "MX": 484, "NZ": 554
};

// Numeric ISO to full country name lookup
const NUMERIC_TO_NAME = {
  840: "United States", 124: "Canada", 826: "United Kingdom",
  276: "Germany", 250: "France", 410: "South Korea",
  392: "Japan", 36: "Australia", 702: "Singapore",
  356: "India", 156: "China", 76: "Brazil",
  710: "South Africa", 380: "Italy", 724: "Spain",
  528: "Netherlands", 756: "Switzerland", 752: "Sweden",
  578: "Norway", 208: "Denmark", 246: "Finland",
  643: "Russia", 484: "Mexico", 554: "New Zealand"
};

// Utility function to format dates nicely
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, options);
  } catch (e) {
    return dateStr;
  }
};

// SVG Shield Icon for Privacy
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// SECTION 1: Top Searched Conditions - Horizontal Bar Chart
const TopConditionsChart = ({ data }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clean data and capitalize first letter
    const cleanData = data.map((d) => {
      const decoded = decodeURIComponent(d.condition).split('&')[0].trim().toLowerCase();
      const capitalized = decoded.charAt(0).toUpperCase() + decoded.slice(1);
      return {
        condition: capitalized,
        count: d.count
      };
    });

    // Dimensions
    const margin = { top: 10, right: 50, bottom: 20, left: 140 };
    const width = 600 - margin.left - margin.right;
    const height = Math.max(260, cleanData.length * 36) - margin.top - margin.bottom;

    // Clear previous elements
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chart = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleLinear()
      .domain([0, d3.max(cleanData, d => d.count) || 1])
      .range([0, width]);

    // Y scale
    const y = d3.scaleBand()
      .range([0, height])
      .domain(cleanData.map(d => d.condition))
      .padding(0.25);

    // Draw Y axis
    chart.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .call(g => g.select(".domain").remove()) // Remove axis line
      .selectAll("text")
      .style("font-family", "Inter, sans-serif")
      .style("font-size", "13px")
      .style("font-weight", "500")
      .style("fill", "#1C1C2E");

    // Draw grid lines
    chart.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .ticks(5)
        .tickSize(-height)
        .tickFormat("")
      )
      .call(g => g.select(".domain").remove())
      .selectAll(".tick line")
      .attr("stroke", "#E5E7EB")
      .attr("stroke-dasharray", "3,3");

    // Draw bars with mount animation
    const barGroups = chart.selectAll(".bar-group")
      .data(cleanData)
      .enter()
      .append("g")
      .attr("class", "bar-group");

    barGroups.append("rect")
      .attr("y", d => y(d.condition))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", (d, i) => i === 0 ? "#00B894" : "#1A6BCC")
      .attr("width", 0) // start at 0
      .transition()
      .duration(500)
      .ease(d3.easeCubicOut)
      .attr("width", d => x(d.count));

    // Draw count labels at the end of each bar
    barGroups.append("text")
      .attr("y", d => y(d.condition) + y.bandwidth() / 2 + 4)
      .attr("x", 0) // start at 0
      .attr("fill", "#1C1C2E")
      .style("font-family", "Inter, sans-serif")
      .style("font-weight", "600")
      .style("font-size", "12px")
      .text(d => d.count)
      .transition()
      .duration(500)
      .ease(d3.easeCubicOut)
      .attr("x", d => x(d.count) + 8);

  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="empty-state-card">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <p>No searches recorded yet. Be the first to search.</p>
      </div>
    );
  }

  return (
    <div className="chart-wrapper">
      <svg ref={svgRef}></svg>
    </div>
  );
};

// SECTION 2: Geographic Distribution - Choropleth World Map
const GeographicMap = ({ data }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ show: false, content: "", x: 0, y: 0 });

  useEffect(() => {
    let isMounted = true;

    // Load topojson file
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(res => res.json())
      .then(worldData => {
        if (!isMounted) return;

        const countries = topojson.feature(worldData, worldData.objects.countries).features;

        // Map count data
        const countryCounts = {};
        const maxCount = d3.max(data, d => d.count) || 1;
        
        data.forEach(d => {
          const numId = ISO_2_TO_NUMERIC[d.country.toUpperCase()];
          if (numId) {
            countryCounts[numId] = {
              count: d.count,
              code: d.country,
              name: NUMERIC_TO_NAME[numId] || d.country
            };
          }
        });

        // Dimensions
        const width = 600;
        const height = 300;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const mapGroup = svg
          .attr("width", width)
          .attr("height", height)
          .append("g");

        // Map projection
        const projection = d3.geoMercator()
          .scale(85)
          .translate([width / 2, height / 2 + 30]);

        const path = d3.geoPath().projection(projection);

        // Draw map paths
        mapGroup.selectAll("path")
          .data(countries)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("class", "country-path")
          .attr("fill", d => {
            const numId = parseInt(d.id);
            if (countryCounts[numId]) {
              const ratio = countryCounts[numId].count / maxCount;
              return d3.interpolateRgb("#C6DBF5", "#1A6BCC")(ratio);
            }
            return "#E5E7EB";
          })
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", "0.5")
          .on("mouseover", function(event, d) {
            const numId = parseInt(d.id);
            const countryInfo = countryCounts[numId];
            const countryName = NUMERIC_TO_NAME[numId] || d.properties?.name || "Unknown Country";
            const searchCount = countryInfo ? countryInfo.count : 0;
            
            d3.select(this)
              .attr("stroke", "#1A6BCC")
              .attr("stroke-width", "1");

            setTooltip({
              show: true,
              content: `${countryName}: ${searchCount} search${searchCount !== 1 ? 'es' : ''}`,
              x: event.clientX,
              y: event.clientY - 45
            });
          })
          .on("mousemove", function(event) {
            setTooltip(prev => ({
              ...prev,
              x: event.clientX,
              y: event.clientY - 45
            }));
          })
          .on("mouseout", function() {
            d3.select(this)
              .attr("stroke", "#FFFFFF")
              .attr("stroke-width", "0.5");
              
            setTooltip({ show: false, content: "", x: 0, y: 0 });
          });
      })
      .catch(err => console.error("Error loading TopoJSON world map:", err));

    return () => {
      isMounted = false;
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="empty-state-card">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
        <p>Geographic data will appear as users search from different locations.</p>
      </div>
    );
  }

  return (
    <div className="map-container-relative">
      <svg ref={svgRef}></svg>
      {tooltip.show && (
        <div 
          className="map-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 1000,
            background: 'rgba(28, 28, 46, 0.95)',
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

// SECTION 3: Trial Phase Distribution - Donut Chart
const PhaseDonutChart = ({ data }) => {
  const svgRef = useRef();
  
  // Calculate total count
  const total = data?.reduce((acc, d) => acc + d.count, 0) || 0;

  useEffect(() => {
    if (!data || data.length === 0) return;

    const width = 180;
    const height = 180;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chart = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const colorMap = {
      "Phase I": "#93C5FD",
      "Phase II": "#1A6BCC",
      "Phase III": "#00B894",
      "Phase IV": "#6366F1",
      "N/A": "#D1D5DB"
    };

    const pie = d3.pie()
      .value(d => d.count)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(radius * 0.58)
      .outerRadius(radius * 0.9);

    // Filter to render only phases with count > 0 to avoid D3 warnings
    const renderableData = data.filter(d => d.count > 0);
    const dataReady = pie(renderableData);

    // Render slices with transition
    chart.selectAll('slices')
      .data(dataReady)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => colorMap[d.data.phase] || "#D1D5DB")
      .attr("stroke", "white")
      .style("stroke-width", "2px")
      .transition()
      .duration(600)
      .attrTween("d", function(d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) { return arc(i(t)); };
      });

    // Center total count text
    chart.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.15em")
      .style("font-family", "Sora, sans-serif")
      .style("font-size", "22px")
      .style("font-weight", "700")
      .style("fill", "#1C1C2E")
      .text(total);

    chart.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.3em")
      .style("font-family", "Inter, sans-serif")
      .style("font-size", "10px")
      .style("font-weight", "600")
      .style("fill", "#6B7280")
      .text("TOTAL TRIALS");

  }, [data, total]);

  const colorMap = {
    "Phase I": "#93C5FD",
    "Phase II": "#1A6BCC",
    "Phase III": "#00B894",
    "Phase IV": "#6366F1",
    "N/A": "#D1D5DB"
  };

  return (
    <div className="donut-chart-container">
      <div className="donut-chart-svg">
        <svg ref={svgRef}></svg>
      </div>
      <div className="donut-chart-legend">
        {data.map((d, i) => {
          const percentage = total > 0 ? Math.round((d.count / total) * 100) : 0;
          return (
            <div key={i} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: colorMap[d.phase] || "#D1D5DB" }}></span>
              <span className="legend-label">{d.phase}</span>
              <span className="legend-percentage">{percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// MAIN COMPONENT
const InsightsPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_BASE}/insights`);
        setData(response.data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching insights data:', err);
        setError('Failed to load insights. Please try again later.');
        setIsLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (isLoading) {
    return (
      <div className="insights-loading">
        <div className="insights-spinner"></div>
        <p>Loading search insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="insights-page-container">
        <div className="insights-header">
          <h1 className="insights-title">Search Insights</h1>
          <p className="insights-subtitle">{error}</p>
        </div>
      </div>
    );
  }

  const {
    top_conditions = [],
    geo_distribution = [],
    phase_distribution = [],
    total_searches = 0,
    unique_conditions = 0,
    most_active_day = null
  } = data || {};

  return (
    <div className="insights-page-container">
      {/* Header section */}
      <div className="insights-header">
        <h1 className="insights-title">Search Insights</h1>
        <p className="insights-subtitle">
          Anonymized, real-time trends from TrialBridge searches
        </p>
      </div>

      {/* 3-column Stat Bar */}
      <div className="insights-stats-bar">
        <div className="stat-card">
          <span className="stat-number">{total_searches}</span>
          <span className="stat-label">Total Searches</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{unique_conditions}</span>
          <span className="stat-label">Unique Conditions Searched</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{formatDate(most_active_day)}</span>
          <span className="stat-label">Most Active Day</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="insights-charts-grid">
        {/* Card 1: Top Searched Conditions */}
        <div className="insights-chart-card">
          <h2 className="chart-card-title">Top Searched Conditions</h2>
          <TopConditionsChart data={top_conditions} />
        </div>

        {/* Card 3: Trial Phase Distribution */}
        <div className="insights-chart-card">
          <h2 className="chart-card-title">Trial Phase Distribution</h2>
          <PhaseDonutChart data={phase_distribution} />
        </div>

        {/* Card 2: Geographic Distribution (Full width below) */}
        <div className="insights-chart-card full-width-card">
          <h2 className="chart-card-title">Geographic Distribution</h2>
          <GeographicMap data={geo_distribution} />
        </div>
      </div>

      {/* Styled Privacy Footer Notice */}
      <div className="privacy-notice-card">
        <ShieldIcon />
        <p className="privacy-notice-text">
          All search data is fully anonymized. No personal identifiers are stored or transmitted.
        </p>
      </div>
    </div>
  );
};

export default InsightsPage;
