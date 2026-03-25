'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  type: 'entry' | 'keyword' | 'topic';
  group?: number;
  keywords?: string[];
  url?: string;
  authors?: string[];
  year?: number;
  fx?: number | null;
  fy?: number | null;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  type: 'keyword' | 'topic' | 'similar';
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface KnowledgeGraphProps {
  entries: any[];
  width?: number;
  height?: number;
  hideControls?: boolean;
}

export default function KnowledgeGraph({ entries, width = 800, height = 500, hideControls = false }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (!entries.length || !svgRef.current) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    // Process entries to create graph data
    const graphData = processEntriesToGraph(entries);

    if (graphData.nodes.length === 0) return;

    // Create SVG with zoom behavior
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Create zoom behavior with enhanced controls
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        const { transform } = event;
        g.attr("transform", transform);
        setZoomLevel(transform.k);

        // Update label font sizes based on current zoom level
        g.selectAll("text")
          .attr("font-size", function (d: any) {
            const nodeData = d as GraphNode;
            const baseSize = nodeData.type === 'entry' ? 16 : nodeData.type === 'topic' ? 14 : 12;
            const scaledSize = Math.max(baseSize * Math.sqrt(transform.k), 10);
            return `${scaledSize}px`;
          });
      });

    // Store zoom instance in ref
    zoomRef.current = zoom;

    // Apply zoom behavior to SVG
    svg.call(zoom);

    // Enable keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '=':
          case '+':
            event.preventDefault();
            svg.transition().duration(300).call(zoom.scaleBy as any, 1.2);
            break;
          case '-':
          case '_':
            event.preventDefault();
            svg.transition().duration(300).call(zoom.scaleBy as any, 0.8);
            break;
          case '0':
            event.preventDefault();
            svg.transition().duration(300).call(zoom.transform as any, d3.zoomIdentity);
            break;
        }
      }
    };

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    svg.call(zoom);

    // Create main group for zoomable content
    const g = svg.append("g");

    // Create simulation
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force("link", d3.forceLink(graphData.links)
        .id((d: any) => d.id)
        .distance(100)
        .strength(0.5))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Create tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "graph-tooltip")
      .style("position", "absolute")
      .style("background", "var(--background)")
      .style("border", "1px solid var(--border)")
      .style("border-radius", "6px")
      .style("padding", "8px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(graphData.links)
      .enter().append("line")
      .attr("stroke", (d: any) => {
        switch (d.type) {
          case 'keyword': return "var(--accent)";
          case 'topic': return "var(--muted-foreground)";
          case 'similar': return "var(--destructive)";
          default: return "var(--border)";
        }
      })
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d: any) => Math.sqrt(d.value));

    // Create node groups
    const node = g.append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    // Add circles for nodes
    node.append("circle")
      .attr("r", (d: GraphNode) => {
        switch (d.type) {
          case 'entry': return 20;
          case 'keyword': return 12;
          case 'topic': return 16;
          default: return 12;
        }
      })
      .attr("fill", (d: GraphNode) => {
        switch (d.type) {
          case 'entry': return "var(--accent)";
          case 'keyword': return "var(--primary)";
          case 'topic': return "var(--secondary)";
          default: return "var(--muted)";
        }
      })
      .attr("stroke", "var(--border)")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function (event: MouseEvent, d: GraphNode) {
        setHoveredNode(d);
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(getTooltipContent(d))
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        setHoveredNode(null);
        tooltip.transition().duration(500).style("opacity", 0);
      })
      .on("click", function (event: MouseEvent, d: GraphNode) {
        event.stopPropagation();
        setSelectedNode(d);
        if (d.type === 'entry' && d.url) {
          window.open(d.url, '_blank');
        }
      });

    // Add labels for important nodes
    node.append("text")
      .text((d: GraphNode) => {
        if (d.type === 'entry') {
          return d.title.length > 20 ? d.title.substring(0, 20) + "..." : d.title;
        }
        return d.title;
      })
      .attr("x", 0)
      .attr("y", (d: GraphNode) => {
        switch (d.type) {
          case 'entry': return 30;
          case 'keyword': return 20;
          case 'topic': return 25;
          default: return 20;
        }
      })
      .attr("text-anchor", "middle")
      .attr("font-size", (d: GraphNode) => {
        // Dynamic font size based on zoom level and node type
        const baseSize = d.type === 'entry' ? 16 : d.type === 'topic' ? 14 : 12;
        const scaledSize = Math.max(baseSize * Math.sqrt(zoomLevel), 10); // Minimum 10px
        return `${scaledSize}px`;
      })
      .attr("fill", "var(--foreground)")
      .style("pointer-events", "none");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

      // Update label font sizes based on current zoom level
      node.selectAll("text")
        .attr("font-size", function (d: any) {
          const nodeData = d as GraphNode;
          const baseSize = nodeData.type === 'entry' ? 12 : nodeData.type === 'topic' ? 10 : 9;
          const scaledSize = Math.max(baseSize * Math.sqrt(zoomLevel), 8);
          return `${scaledSize}px`;
        });
    });

    // Drag functions
    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => {
      tooltip.remove();
      simulation.stop();
      document.removeEventListener('keydown', handleKeyDown);
    };

  }, [entries, width, height]);

  const processEntriesToGraph = (entries: any[]): GraphData => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const keywordMap = new Map<string, Set<string>>();
    const topicMap = new Map<string, Set<string>>();

    // Process entries and create nodes
    entries.forEach((entry, index) => {
      const entryNode: GraphNode = {
        id: entry.id,
        title: entry.title,
        type: 'entry',
        keywords: entry.autoKeywords || [],
        url: entry.url,
        authors: entry.authors || [],
        year: entry.year
      };
      nodes.push(entryNode);

      // Process keywords
      (entry.autoKeywords || []).forEach((keyword: string) => {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, new Set());
        }
        keywordMap.get(keyword)!.add(entry.id);
      });

      // Process topics (if available)
      (entry.topics || []).forEach((topic: string) => {
        if (!topicMap.has(topic)) {
          topicMap.set(topic, new Set());
        }
        topicMap.get(topic)!.add(entry.id);
      });
    });

    // Create keyword nodes and links
    keywordMap.forEach((entryIds, keyword) => {
      if (entryIds.size > 1) { // Only include keywords that connect multiple entries
        const keywordNode: GraphNode = {
          id: `keyword-${keyword}`,
          title: keyword,
          type: 'keyword'
        };
        nodes.push(keywordNode);

        // Create links between keyword and entries
        entryIds.forEach(entryId => {
          links.push({
            source: keywordNode.id,
            target: entryId,
            value: 1,
            type: 'keyword'
          });
        });
      }
    });

    // Create topic nodes and links
    topicMap.forEach((entryIds, topic) => {
      if (entryIds.size > 1) { // Only include topics that connect multiple entries
        const topicNode: GraphNode = {
          id: `topic-${topic}`,
          title: topic,
          type: 'topic'
        };
        nodes.push(topicNode);

        // Create links between topic and entries
        entryIds.forEach(entryId => {
          links.push({
            source: topicNode.id,
            target: entryId,
            value: 2,
            type: 'topic'
          });
        });
      }
    });

    // Create similarity links between entries with shared keywords
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];
        const keywords1 = new Set<string>(entry1.autoKeywords || []);
        const keywords2 = new Set<string>(entry2.autoKeywords || []);

        const intersection = new Set(Array.from(keywords1).filter(x => keywords2.has(x)));
        if (intersection.size > 2) { // Connect entries with 3+ shared keywords
          links.push({
            source: entry1.id,
            target: entry2.id,
            value: intersection.size,
            type: 'similar'
          });
        }
      }
    }

    return { nodes, links };
  };

  const getTooltipContent = (node: GraphNode): string => {
    switch (node.type) {
      case 'entry':
        return `
          <div style="font-weight: bold; margin-bottom: 4px;">${node.title}</div>
          ${node.authors ? `<div style="font-size: 11px; color: var(--muted-foreground);">${node.authors.slice(0, 2).join(', ')}</div>` : ''}
          ${node.year ? `<div style="font-size: 11px; color: var(--muted-foreground);">${node.year}</div>` : ''}
          ${node.keywords ? `<div style="font-size: 11px; margin-top: 4px;">Keywords: ${node.keywords.slice(0, 3).join(', ')}</div>` : ''}
        `;
      case 'keyword':
        return `
          <div style="font-weight: bold;">Keyword: ${node.title}</div>
          <div style="font-size: 11px; color: var(--muted-foreground);">Connects related entries</div>
        `;
      case 'topic':
        return `
          <div style="font-weight: bold;">Topic: ${node.title}</div>
          <div style="font-size: 11px; color: var(--muted-foreground);">Groups related content</div>
        `;
      default:
        return node.title;
    }
  };

  // Zoom control functions
  const zoomIn = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy as any, 1.2);
    }
  };

  const zoomOut = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy as any, 0.8);
    }
  };

  const resetZoom = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform as any, d3.zoomIdentity);
    }
  };

  const toggleControls = () => {
    // This will be handled by the parent component
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        className="w-full h-full rounded-lg border border-[var(--border)] bg-[var(--card)]/50"
        style={{ minHeight: height }}
      />

      {/* Zoom Controls */}
      {!hideControls && (
        <div className="absolute top-4 right-4 bg-[var(--background)]/90 backdrop-blur-sm rounded-lg border border-[var(--border)] p-2 flex flex-col gap-2">
          <button
            onClick={zoomIn}
            className="w-8 h-8 rounded bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80 flex items-center justify-center text-sm font-medium transition-colors"
            title="Zoom In (Ctrl/Cmd + +)"
          >
            +
          </button>
          <div className="text-center text-xs text-[var(--muted-foreground)] font-medium">
            {Math.round(zoomLevel * 100)}%
          </div>
          <button
            onClick={zoomOut}
            className="w-8 h-8 rounded bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80 flex items-center justify-center text-sm font-medium transition-colors"
            title="Zoom Out (Ctrl/Cmd + -)"
          >
            −
          </button>
          <button
            onClick={resetZoom}
            className="w-8 h-8 rounded bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/80 flex items-center justify-center text-xs font-medium transition-colors"
            title="Reset Zoom (Ctrl/Cmd + 0)"
          >
            ⟲
          </button>
        </div>
      )}

      {/* Graph Legend */}
      {!hideControls && (
        <div className="absolute top-4 left-4 bg-[var(--background)]/90 backdrop-blur-sm rounded-lg border border-[var(--border)] p-3 text-xs">
          <div className="font-semibold mb-2">Graph Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--accent)]"></div>
              <span>Entries</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--primary)]"></div>
              <span>Keywords</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--secondary)]"></div>
              <span>Topics</span>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Instructions */}
      {!hideControls && (
        <div className="absolute bottom-4 left-4 bg-[var(--background)]/90 backdrop-blur-sm rounded-lg border border-[var(--border)] p-3 text-xs max-w-xs">
          <div className="font-semibold mb-2">Graph Controls</div>
          <div className="space-y-1 text-[var(--muted-foreground)]">
            <div>• Mouse wheel: Zoom in/out</div>
            <div>• Click & drag: Pan around</div>
            <div>• Ctrl/Cmd + +: Zoom in</div>
            <div>• Ctrl/Cmd + -: Zoom out</div>
            <div>• Ctrl/Cmd + 0: Reset view</div>
            <div>• Drag nodes: Reposition</div>
          </div>
        </div>
      )}

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="absolute top-20 right-4 bg-[var(--background)]/90 backdrop-blur-sm rounded-lg border border-[var(--border)] p-3 max-w-xs">
          <div className="font-semibold mb-2">Selected Node</div>
          <div className="text-sm">
            <div className="font-medium">{selectedNode.title}</div>
            <div className="text-[var(--muted-foreground)] text-xs mt-1">
              Type: {selectedNode.type}
            </div>
            {selectedNode.type === 'entry' && selectedNode.keywords && (
              <div className="text-xs mt-2">
                <div className="font-medium">Keywords:</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedNode.keywords.slice(0, 5).map((keyword, i) => (
                    <span key={i} className="bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-1 rounded text-xs">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="mt-3 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
