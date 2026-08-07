// desktop/src/plugin.tsx
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  PALETTE_AREA,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  SearchField,
  SegmentedControl,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  Tip,
  fmtDateTime,
  host,
  icons,
  relativeTime,
  useQuery,
  useValue
} from "@hermes/plugin-sdk";

// desktop/src/graph.ts
function hash(value) {
  let result = 2166136261;
  for (let index = 0;index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
function seededUnit(value) {
  return hash(value) % 1e5 / 1e5;
}
function layoutGraph(nodes, edges, topology = "constellation") {
  const degree = new Map;
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  const ordered = [...nodes].sort((a, b) => {
    const degreeDelta = (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0);
    return degreeDelta || (b.weight ?? 0) - (a.weight ?? 0) || a.id.localeCompare(b.id);
  });
  if (topology === "neural")
    return layoutNeural(ordered, edges, degree);
  const golden = Math.PI * (3 - Math.sqrt(5));
  return ordered.map((node, index) => {
    const normalized = ordered.length <= 1 ? 0 : Math.sqrt(index / (ordered.length - 1));
    const angle = index * golden + seededUnit(node.id) * 0.7;
    const eccentricity = 0.74 + seededUnit(`${node.id}:e`) * 0.24;
    const distance = 48 + normalized * 350 * eccentricity;
    const connections = degree.get(node.id) ?? 0;
    const weight = Math.max(0, Number(node.weight ?? 0));
    return {
      ...node,
      x: 500 + Math.cos(angle) * distance,
      y: 310 + Math.sin(angle) * distance * 0.68,
      radius: Math.max(4.5, Math.min(15, 4 + Math.sqrt(weight + connections) * 2.1))
    };
  });
}
function layoutNeural(nodes, edges, degree) {
  const categories = [...new Set(nodes.map((node) => node.category || "Other"))];
  const categoryIndex = new Map(categories.map((category, index) => [category, index]));
  const rankByCategory = new Map;
  const positioned = new Map;
  const entities = nodes.filter((node) => node.kind !== "memory");
  const memories = nodes.filter((node) => node.kind === "memory");
  for (const node of entities) {
    const category = node.category || "Other";
    const categoryRank = categoryIndex.get(category) ?? 0;
    const rank = rankByCategory.get(category) ?? 0;
    rankByCategory.set(category, rank + 1);
    const regionAngle = -Math.PI / 2 + categoryRank / Math.max(1, categories.length) * Math.PI * 2;
    const regionX = 500 + Math.cos(regionAngle) * 205;
    const regionY = 310 + Math.sin(regionAngle) * 132;
    const orbit = rank === 0 ? 0 : 28 + Math.sqrt(rank) * 22;
    const angle = regionAngle + rank * 2.399963;
    const connections = degree.get(node.id) ?? 0;
    const weight = Math.max(0, Number(node.weight ?? 0));
    positioned.set(node.id, {
      ...node,
      x: regionX + Math.cos(angle) * orbit,
      y: regionY + Math.sin(angle) * orbit * 0.72,
      radius: Math.max(4.5, Math.min(15, 4 + Math.sqrt(weight + connections) * 2.1))
    });
  }
  memories.forEach((node, index) => {
    const link = edges.find((edge) => edge.source === node.id || edge.target === node.id);
    const parentId = link ? link.source === node.id ? link.target : link.source : "";
    const parent = positioned.get(parentId);
    const category = node.category || "Other";
    const categoryRank = categoryIndex.get(category) ?? 0;
    const fallbackAngle = -Math.PI / 2 + categoryRank / Math.max(1, categories.length) * Math.PI * 2;
    const baseX = parent?.x ?? 500 + Math.cos(fallbackAngle) * 185;
    const baseY = parent?.y ?? 310 + Math.sin(fallbackAngle) * 120;
    const angle = (index * 137.508 + categoryRank * 29) % 360 * Math.PI / 180;
    const distance = 38 + index % 6 * 12;
    const connections = degree.get(node.id) ?? 0;
    const weight = Math.max(0, Number(node.weight ?? 0));
    positioned.set(node.id, {
      ...node,
      x: baseX + Math.cos(angle) * distance,
      y: baseY + Math.sin(angle) * distance * 0.72,
      radius: Math.max(4.5, Math.min(14, 4 + Math.sqrt(weight + connections) * 1.9))
    });
  });
  return nodes.map((node) => positioned.get(node.id)).filter((node) => Boolean(node));
}
function connectedIds(selectedId, edges) {
  const result = new Set;
  if (!selectedId)
    return result;
  result.add(selectedId);
  for (const edge of edges) {
    if (edge.source === selectedId)
      result.add(edge.target);
    if (edge.target === selectedId)
      result.add(edge.source);
  }
  return result;
}
function categoryCounts(nodes) {
  const counts = new Map;
  for (const node of nodes) {
    const category = node.category || "Other";
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// desktop/src/plugin.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var { Activity, Brain, Clock, Database, Eye, RefreshCw, Starmap } = {
  ...icons,
  Database: icons.Box
};
var PLUGIN_ID = "mnemosyne-dashboard";
var ROUTE = "/memory";
function errorMessage(error) {
  return error instanceof Error ? error.message : "Mnemosyne memory data could not be loaded.";
}
function query(path, params) {
  const values = new URLSearchParams;
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "")
      values.set(key, String(value));
  }
  const encoded = values.toString();
  return encoded ? `${path}?${encoded}` : path;
}
function memoryTime(item) {
  return item.timestamp || item.created_at || "";
}
function timestampMs(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}
function TypeBadge({ type }) {
  return /* @__PURE__ */ jsx(Badge, {
    variant: "outline",
    children: type || "memory"
  });
}
function Stat({ label, value, hint }) {
  return /* @__PURE__ */ jsx(Tip, {
    label: hint,
    children: /* @__PURE__ */ jsxs("div", {
      className: "mnem-stat",
      tabIndex: 0,
      children: [
        /* @__PURE__ */ jsx("strong", {
          children: value.toLocaleString()
        }),
        /* @__PURE__ */ jsx("span", {
          children: label
        })
      ]
    })
  });
}
function ActivityChart({ points }) {
  const values = points.map((point) => point.total);
  const max = Math.max(1, ...values);
  const width = 760;
  const height = 170;
  const inset = 10;
  const path = points.map((point, index) => {
    const x = inset + index / Math.max(1, points.length - 1) * (width - inset * 2);
    const y = height - inset - point.total / max * (height - inset * 2);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return /* @__PURE__ */ jsxs("section", {
    className: "mnem-section",
    children: [
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-section-title",
        children: [
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("h2", {
                children: "Memory activity"
              }),
              /* @__PURE__ */ jsx("p", {
                children: "Records written across memory, knowledge, and consolidation logs."
              })
            ]
          }),
          /* @__PURE__ */ jsx(Activity, {
            "aria-hidden": "true",
            size: 16
          })
        ]
      }),
      /* @__PURE__ */ jsxs("svg", {
        "aria-label": "Memory activity timeline",
        className: "mnem-activity",
        role: "img",
        viewBox: `0 0 ${width} ${height}`,
        children: [
          /* @__PURE__ */ jsx("line", {
            className: "mnem-gridline",
            x1: "10",
            x2: "750",
            y1: "160",
            y2: "160"
          }),
          /* @__PURE__ */ jsx("line", {
            className: "mnem-gridline",
            x1: "10",
            x2: "750",
            y1: "85",
            y2: "85"
          }),
          /* @__PURE__ */ jsx("path", {
            className: "mnem-area",
            d: `${path} L750,160 L10,160 Z`
          }),
          /* @__PURE__ */ jsx("path", {
            className: "mnem-line",
            d: path
          })
        ]
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-chart-axis",
        children: [
          /* @__PURE__ */ jsx("span", {
            children: points[0]?.date || ""
          }),
          /* @__PURE__ */ jsx("span", {
            children: points.at(-1)?.date || ""
          })
        ]
      })
    ]
  });
}
function MapLegend({ nodes }) {
  const categories = categoryCounts(nodes).slice(0, 6);
  return /* @__PURE__ */ jsxs("div", {
    className: "mnem-legend",
    children: [
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-legend-row",
        children: [
          /* @__PURE__ */ jsx("i", {
            className: "mnem-dot mnem-dot-entity"
          }),
          "Entity or topic"
        ]
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-legend-row",
        children: [
          /* @__PURE__ */ jsx("i", {
            className: "mnem-dot mnem-dot-memory"
          }),
          "Memory"
        ]
      }),
      categories.length > 0 && /* @__PURE__ */ jsxs("span", {
        className: "mnem-legend-summary",
        children: [
          categories.length,
          " leading categories"
        ]
      })
    ]
  });
}
function NodeInspector({
  node,
  nodes,
  edges,
  ctx,
  onSelect,
  onClose
}) {
  const relatedEdges = edges.filter((edge) => edge.source === node.id || edge.target === node.id);
  const byId = new Map(nodes.map((item) => [item.id, item]));
  const memory = useQuery({
    queryKey: [PLUGIN_ID, "memory", node.memory_id],
    queryFn: () => ctx.rest(`/memory/${encodeURIComponent(node.memory_id || "")}`),
    enabled: Boolean(node.memory_id),
    staleTime: 30000
  });
  return /* @__PURE__ */ jsxs("aside", {
    className: "mnem-inspector",
    children: [
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-inspector-head",
        children: [
          /* @__PURE__ */ jsx("span", {
            children: "Node inspector"
          }),
          /* @__PURE__ */ jsx(Tip, {
            label: "Close inspector",
            children: /* @__PURE__ */ jsx(Button, {
              "aria-label": "Close inspector",
              onClick: onClose,
              size: "icon-xs",
              variant: "ghost",
              children: /* @__PURE__ */ jsx(icons.X, {})
            })
          })
        ]
      }),
      /* @__PURE__ */ jsx("h2", {
        children: node.kind === "memory" ? node.preview || node.label : node.label
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-badges",
        children: [
          /* @__PURE__ */ jsx(TypeBadge, {
            type: node.kind
          }),
          node.category && /* @__PURE__ */ jsx(Badge, {
            variant: "outline",
            children: node.category
          })
        ]
      }),
      memory.data?.item && /* @__PURE__ */ jsxs("dl", {
        className: "mnem-meta",
        children: [
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("dt", {
                children: "Source"
              }),
              /* @__PURE__ */ jsx("dd", {
                children: memory.data.item.source || "Unknown"
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("dt", {
                children: "Trust"
              }),
              /* @__PURE__ */ jsx("dd", {
                children: memory.data.item.veracity || "Unknown"
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("dt", {
                children: "Importance"
              }),
              /* @__PURE__ */ jsx("dd", {
                children: Number(memory.data.item.importance || 0).toFixed(2)
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("dt", {
                children: "Last seen"
              }),
              /* @__PURE__ */ jsx("dd", {
                children: relativeTime(timestampMs(memoryTime(memory.data.item)))
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-linked",
        children: [
          /* @__PURE__ */ jsxs("h3", {
            children: [
              "Linked nodes ",
              /* @__PURE__ */ jsx("span", {
                children: relatedEdges.length
              })
            ]
          }),
          relatedEdges.slice(0, 18).map((edge) => {
            const otherId = edge.source === node.id ? edge.target : edge.source;
            const other = byId.get(otherId);
            if (!other)
              return null;
            return /* @__PURE__ */ jsxs("button", {
              onClick: () => onSelect(other.id),
              type: "button",
              children: [
                /* @__PURE__ */ jsx("span", {
                  children: other.kind === "memory" ? other.preview || other.label : other.label
                }),
                /* @__PURE__ */ jsx("small", {
                  children: edge.label || edge.kind || "linked"
                })
              ]
            }, edge.id);
          }),
          relatedEdges.length === 0 && /* @__PURE__ */ jsx("p", {
            children: "No linked nodes in this snapshot."
          })
        ]
      })
    ]
  });
}
function MemoryMap({ constellation, ctx }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [labels, setLabels] = useState("key");
  const [topology, setTopology] = useState("constellation");
  const [fullscreen, setFullscreen] = useState(false);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [drag, setDrag] = useState(null);
  const positioned = useMemo(() => layoutGraph(constellation.nodes, constellation.edges, topology), [constellation, topology]);
  const byId = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);
  const connected = useMemo(() => connectedIds(selectedId, constellation.edges), [selectedId, constellation.edges]);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const matches = useMemo(() => new Set(positioned.filter((node) => `${node.label} ${node.preview || ""} ${node.category || ""}`.toLocaleLowerCase().includes(normalizedSearch)).map((node) => node.id)), [normalizedSearch, positioned]);
  const selected = selectedId ? byId.get(selectedId) || null : null;
  const major = useMemo(() => new Set([...positioned].sort((a, b) => b.radius - a.radius).slice(0, 18).map((node) => node.id)), [positioned]);
  const opacity = (id) => {
    if (normalizedSearch)
      return matches.has(id) ? 1 : 0.12;
    if (selectedId)
      return connected.has(id) ? 1 : 0.22;
    return 1;
  };
  const showLabel = (node) => {
    if (normalizedSearch)
      return matches.has(node.id);
    if (selectedId)
      return connected.has(node.id);
    return labels === "all" || major.has(node.id);
  };
  const onWheel = (event) => {
    event.preventDefault();
    const next = Math.max(0.55, Math.min(3.6, view.scale * (event.deltaY > 0 ? 0.9 : 1.1)));
    setView((current) => ({ ...current, scale: next }));
  };
  const onPointerDown = (event) => {
    if (event.target !== event.currentTarget)
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(null);
    setDrag({ x: event.clientX, y: event.clientY, originX: view.x, originY: view.y });
  };
  const onPointerMove = (event) => {
    if (!drag)
      return;
    setView((current) => ({ ...current, x: drag.originX + event.clientX - drag.x, y: drag.originY + event.clientY - drag.y }));
  };
  const onPointerUp = () => setDrag(null);
  return /* @__PURE__ */ jsxs("section", {
    className: `mnem-map-shell${fullscreen ? " is-fullscreen" : ""}`,
    children: [
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-map-toolbar",
        children: [
          /* @__PURE__ */ jsx(SegmentedControl, {
            onChange: (value) => {
              setTopology(value);
              setView({ x: 0, y: 0, scale: 1 });
              setSelectedId(null);
            },
            options: [{ id: "constellation", label: "Constellation", icon: Starmap }, { id: "neural", label: "Neural map", icon: Brain }],
            value: topology
          }),
          /* @__PURE__ */ jsx(SearchField, {
            "aria-label": "Search memory map",
            containerClassName: "mnem-map-search",
            onChange: setSearch,
            placeholder: "Search nodes…",
            value: search
          }),
          /* @__PURE__ */ jsx(SegmentedControl, {
            onChange: setLabels,
            options: [{ id: "key", label: "Key labels" }, { id: "all", label: "All labels" }],
            value: labels
          }),
          /* @__PURE__ */ jsx(Tip, {
            label: "Reset map view",
            children: /* @__PURE__ */ jsx(Button, {
              "aria-label": "Reset map view",
              onClick: () => setView({ x: 0, y: 0, scale: 1 }),
              size: "icon-sm",
              variant: "ghost",
              children: /* @__PURE__ */ jsx(RefreshCw, {})
            })
          }),
          /* @__PURE__ */ jsx(Tip, {
            label: fullscreen ? "Exit fullscreen" : "Open fullscreen",
            children: /* @__PURE__ */ jsx(Button, {
              "aria-label": fullscreen ? "Exit fullscreen" : "Open fullscreen",
              onClick: () => setFullscreen((value) => !value),
              size: "icon-sm",
              variant: "ghost",
              children: /* @__PURE__ */ jsx(icons.Maximize, {})
            })
          })
        ]
      }),
      /* @__PURE__ */ jsxs("div", {
        className: `mnem-map-layout${selected ? " has-inspector" : ""}`,
        children: [
          /* @__PURE__ */ jsxs("div", {
            className: "mnem-map-canvas",
            children: [
              /* @__PURE__ */ jsx("svg", {
                "aria-label": "Interactive Mnemosyne memory map",
                onPointerDown,
                onPointerMove,
                onPointerUp,
                onWheel,
                role: "img",
                viewBox: "0 0 1000 620",
                children: /* @__PURE__ */ jsxs("g", {
                  transform: `translate(${view.x} ${view.y}) scale(${view.scale})`,
                  children: [
                    constellation.edges.map((edge) => {
                      const source = byId.get(edge.source);
                      const target = byId.get(edge.target);
                      if (!source || !target)
                        return null;
                      const highlighted = selectedId ? edge.source === selectedId || edge.target === selectedId : false;
                      return /* @__PURE__ */ jsxs("g", {
                        opacity: Math.min(opacity(source.id), opacity(target.id)),
                        children: [
                          /* @__PURE__ */ jsx("line", {
                            className: highlighted ? "mnem-edge is-highlighted" : "mnem-edge",
                            x1: source.x,
                            x2: target.x,
                            y1: source.y,
                            y2: target.y
                          }),
                          (normalizedSearch ? matches.has(source.id) || matches.has(target.id) : highlighted) && edge.label && /* @__PURE__ */ jsx("text", {
                            className: "mnem-edge-label",
                            x: (source.x + target.x) / 2,
                            y: (source.y + target.y) / 2,
                            children: edge.label
                          })
                        ]
                      }, edge.id);
                    }),
                    positioned.map((node) => /* @__PURE__ */ jsxs("g", {
                      className: "mnem-node",
                      onClick: (event) => {
                        event.stopPropagation();
                        setSelectedId(node.id);
                      },
                      opacity: opacity(node.id),
                      role: "button",
                      tabIndex: 0,
                      transform: `translate(${node.x} ${node.y})`,
                      children: [
                        /* @__PURE__ */ jsx("circle", {
                          className: node.kind === "memory" ? "mnem-node-memory" : "mnem-node-entity",
                          r: node.radius
                        }),
                        showLabel(node) && /* @__PURE__ */ jsx("text", {
                          className: "mnem-node-label",
                          x: node.radius + 4,
                          y: "4",
                          children: node.kind === "memory" ? node.preview || node.label : node.label
                        })
                      ]
                    }, node.id))
                  ]
                })
              }),
              /* @__PURE__ */ jsx(MapLegend, {
                nodes: constellation.nodes
              }),
              /* @__PURE__ */ jsx("span", {
                className: "mnem-map-help",
                children: "Drag to pan · scroll to zoom · select a node to inspect"
              })
            ]
          }),
          selected && /* @__PURE__ */ jsx(NodeInspector, {
            ctx,
            edges: constellation.edges,
            node: selected,
            nodes: constellation.nodes,
            onClose: () => setSelectedId(null),
            onSelect: setSelectedId
          })
        ]
      })
    ]
  });
}
function OverviewView({ data, ctx }) {
  const counts = data.stats.counts;
  return /* @__PURE__ */ jsxs("div", {
    className: "mnem-stack",
    children: [
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-stats",
        children: [
          /* @__PURE__ */ jsx(Stat, {
            hint: "Working memories currently retained for active recall.",
            label: "Working active",
            value: counts.working_memory || 0
          }),
          /* @__PURE__ */ jsx(Stat, {
            hint: "Longer-lived episodic memories created by consolidation.",
            label: "Episodic",
            value: counts.episodic_memory || 0
          }),
          /* @__PURE__ */ jsx(Stat, {
            hint: "Active non-stated memories above the review importance threshold.",
            label: "Review candidates",
            value: data.stats.review.active_candidates || 0
          }),
          /* @__PURE__ */ jsx(Stat, {
            hint: "Episodic memories that have moved to a lower lifecycle tier.",
            label: "Degraded",
            value: data.stats.degradation.degraded || 0
          })
        ]
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-overview-grid",
        children: [
          /* @__PURE__ */ jsx(ActivityChart, {
            points: data.activity.series
          }),
          /* @__PURE__ */ jsxs("section", {
            className: "mnem-section mnem-snapshot",
            children: [
              /* @__PURE__ */ jsxs("div", {
                className: "mnem-section-title",
                children: [
                  /* @__PURE__ */ jsxs("div", {
                    children: [
                      /* @__PURE__ */ jsx("h2", {
                        children: "Current memory map"
                      }),
                      /* @__PURE__ */ jsx("p", {
                        children: "Relationships in the active profile."
                      })
                    ]
                  }),
                  /* @__PURE__ */ jsx(Starmap, {
                    size: 16
                  })
                ]
              }),
              /* @__PURE__ */ jsx("div", {
                className: "mnem-mini-map",
                children: layoutGraph(data.constellation.nodes, data.constellation.edges).slice(0, 120).map((node) => /* @__PURE__ */ jsx("i", {
                  className: node.kind === "memory" ? "is-memory" : "",
                  style: { left: `${node.x / 10}%`, top: `${node.y / 6.2}%`, width: Math.max(3, node.radius / 2), height: Math.max(3, node.radius / 2) }
                }, node.id))
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsx(MemoryMap, {
        constellation: data.constellation,
        ctx
      })
    ]
  });
}
function MemoryRow({ item, selected, onClick }) {
  return /* @__PURE__ */ jsxs("button", {
    className: `mnem-memory-row${selected ? " is-selected" : ""}`,
    onClick,
    type: "button",
    children: [
      /* @__PURE__ */ jsxs("div", {
        children: [
          /* @__PURE__ */ jsx(TypeBadge, {
            type: item.memory_kind || item.tier || "memory"
          }),
          " ",
          /* @__PURE__ */ jsx(Badge, {
            variant: "outline",
            children: item.veracity || "unknown trust"
          })
        ]
      }),
      /* @__PURE__ */ jsx("p", {
        children: item.content
      }),
      /* @__PURE__ */ jsxs("small", {
        children: [
          item.source || "Unknown source",
          " · ",
          relativeTime(timestampMs(memoryTime(item))),
          " · importance ",
          Number(item.importance || 0).toFixed(2)
        ]
      })
    ]
  });
}
function MemoryDetail({ item, onClose }) {
  return /* @__PURE__ */ jsxs("aside", {
    className: "mnem-detail",
    children: [
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-inspector-head",
        children: [
          /* @__PURE__ */ jsx("span", {
            children: "Memory details"
          }),
          /* @__PURE__ */ jsx(Button, {
            "aria-label": "Close details",
            onClick: onClose,
            size: "icon-xs",
            variant: "ghost",
            children: /* @__PURE__ */ jsx(icons.X, {})
          })
        ]
      }),
      /* @__PURE__ */ jsx("h2", {
        children: item.memory_kind === "episodic" ? "Episodic memory" : "Working memory"
      }),
      /* @__PURE__ */ jsx("p", {
        className: "mnem-detail-content",
        children: item.content
      }),
      /* @__PURE__ */ jsxs("dl", {
        className: "mnem-meta",
        children: [
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("dt", {
                children: "ID"
              }),
              /* @__PURE__ */ jsx("dd", {
                children: item.id
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("dt", {
                children: "Source"
              }),
              /* @__PURE__ */ jsx("dd", {
                children: item.source || "Unknown"
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("dt", {
                children: "Session"
              }),
              /* @__PURE__ */ jsx("dd", {
                children: item.session_id || "Default"
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("dt", {
                children: "Scope"
              }),
              /* @__PURE__ */ jsx("dd", {
                children: item.scope || "Unknown"
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("dt", {
                children: "Trust"
              }),
              /* @__PURE__ */ jsx("dd", {
                children: item.veracity || "Unknown"
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("dt", {
                children: "Importance"
              }),
              /* @__PURE__ */ jsx("dd", {
                children: Number(item.importance || 0).toFixed(2)
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("dt", {
                children: "Created"
              }),
              /* @__PURE__ */ jsx("dd", {
                children: fmtDateTime.format(timestampMs(memoryTime(item)))
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-readonly-note",
        children: [
          /* @__PURE__ */ jsx(Eye, {
            size: 14
          }),
          " Read-only in this milestone"
        ]
      })
    ]
  });
}
function MemoriesView({ ctx, profile }) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [selected, setSelected] = useState(null);
  const memories = useQuery({
    queryKey: [PLUGIN_ID, profile, "memories", search, kind],
    queryFn: () => ctx.rest(query("/memories", { q: search, kind, limit: 150 })),
    staleTime: 1e4
  });
  return /* @__PURE__ */ jsxs("div", {
    className: "mnem-browser",
    children: [
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-browser-toolbar",
        children: [
          /* @__PURE__ */ jsx(SearchField, {
            containerClassName: "mnem-browser-search",
            loading: memories.isFetching,
            onChange: setSearch,
            placeholder: "Search retained memories…",
            value: search
          }),
          /* @__PURE__ */ jsx(SegmentedControl, {
            onChange: setKind,
            options: [{ id: "all", label: "All" }, { id: "working", label: "Working" }, { id: "episodic", label: "Episodic" }],
            value: kind
          })
        ]
      }),
      memories.isError ? /* @__PURE__ */ jsx(ErrorState, {
        description: errorMessage(memories.error),
        title: "Could not load memories"
      }) : /* @__PURE__ */ jsxs("div", {
        className: `mnem-browser-layout${selected ? " has-detail" : ""}`,
        children: [
          /* @__PURE__ */ jsxs("div", {
            className: "mnem-memory-list",
            children: [
              memories.isLoading && Array.from({ length: 8 }).map((_, index) => /* @__PURE__ */ jsx(Skeleton, {
                className: "mnem-row-skeleton"
              }, index)),
              memories.data?.items.map((item) => /* @__PURE__ */ jsx(MemoryRow, {
                item,
                onClick: () => setSelected(item),
                selected: selected?.id === item.id
              }, item.id)),
              memories.data?.items.length === 0 && /* @__PURE__ */ jsx(EmptyState, {
                description: "Try a different term or memory type.",
                title: "No memories found"
              })
            ]
          }),
          selected && /* @__PURE__ */ jsx(MemoryDetail, {
            item: selected,
            onClose: () => setSelected(null)
          })
        ]
      })
    ]
  });
}
function TimelineRow({ event }) {
  return /* @__PURE__ */ jsxs("div", {
    className: "mnem-timeline-row",
    children: [
      /* @__PURE__ */ jsx("i", {
        className: `mnem-timeline-icon is-${event.type}`,
        children: event.type === "memory" ? /* @__PURE__ */ jsx(Brain, {}) : event.type === "triple" ? /* @__PURE__ */ jsx(icons.Link, {}) : /* @__PURE__ */ jsx(RefreshCw, {})
      }),
      /* @__PURE__ */ jsxs("div", {
        children: [
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("strong", {
                children: event.title
              }),
              /* @__PURE__ */ jsx("span", {
                children: relativeTime(timestampMs(event.timestamp))
              })
            ]
          }),
          /* @__PURE__ */ jsx("p", {
            children: event.preview
          })
        ]
      })
    ]
  });
}
function TimelineView({ ctx, profile }) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("day");
  const timeline = useQuery({
    queryKey: [PLUGIN_ID, profile, "timeline", search, group],
    queryFn: () => ctx.rest(query("/timeline", { q: search, group, limit: 300 })),
    staleTime: 1e4
  });
  return /* @__PURE__ */ jsxs("div", {
    className: "mnem-browser",
    children: [
      /* @__PURE__ */ jsxs("div", {
        className: "mnem-browser-toolbar",
        children: [
          /* @__PURE__ */ jsx(SearchField, {
            containerClassName: "mnem-browser-search",
            loading: timeline.isFetching,
            onChange: setSearch,
            placeholder: "Search memory activity…",
            value: search
          }),
          /* @__PURE__ */ jsx(SegmentedControl, {
            onChange: setGroup,
            options: [{ id: "day", label: "By day" }, { id: "session", label: "By session" }],
            value: group
          })
        ]
      }),
      timeline.isError ? /* @__PURE__ */ jsx(ErrorState, {
        description: errorMessage(timeline.error),
        title: "Could not load the timeline"
      }) : /* @__PURE__ */ jsxs("div", {
        className: "mnem-timeline",
        children: [
          timeline.isLoading && Array.from({ length: 8 }).map((_, index) => /* @__PURE__ */ jsx(Skeleton, {
            className: "mnem-row-skeleton"
          }, index)),
          timeline.data?.groups.map((section) => /* @__PURE__ */ jsxs("section", {
            children: [
              /* @__PURE__ */ jsxs("header", {
                children: [
                  /* @__PURE__ */ jsx("h2", {
                    children: section.key
                  }),
                  /* @__PURE__ */ jsx(Badge, {
                    variant: "outline",
                    children: section.count
                  })
                ]
              }),
              section.events.map((event, index) => /* @__PURE__ */ jsx(TimelineRow, {
                event
              }, `${event.type}-${event.timestamp}-${index}`))
            ]
          }, section.key)),
          timeline.data?.groups.length === 0 && /* @__PURE__ */ jsx(EmptyState, {
            description: "No retained activity matches this view.",
            title: "No timeline activity"
          })
        ]
      })
    ]
  });
}
function Styles() {
  return /* @__PURE__ */ jsx("style", {
    children: `
    .mnem-page{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--background);color:var(--foreground)}
    .mnem-page *{box-sizing:border-box}.mnem-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:24px 28px 18px;border-bottom:1px solid var(--border)}
    .mnem-eyebrow,.mnem-inspector-head>span{display:block;color:var(--ui-accent);font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
    .mnem-header h1{font-size:28px;line-height:1.05;font-weight:690;letter-spacing:-.035em;margin:5px 0 7px}.mnem-header p,.mnem-section p{margin:0;color:var(--muted-foreground);font-size:12px}
    .mnem-profile{display:flex;align-items:center;gap:8px;color:var(--muted-foreground);font-size:12px}.mnem-profile strong{color:var(--foreground)}
    .mnem-tabs{padding:0 28px;border-bottom:1px solid var(--border)}.mnem-tabs [role=tablist]{background:transparent;padding:0;height:38px;gap:18px}.mnem-tabs [role=tab]{height:38px;padding:0 1px;border-radius:0;box-shadow:none}.mnem-tabs [data-state=active]{border-bottom:2px solid var(--foreground);background:transparent!important;box-shadow:none!important}
    .mnem-content{flex:1;min-height:0;overflow:auto;padding:24px 28px 40px}.mnem-stack{display:flex;flex-direction:column;gap:28px}
    .mnem-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid var(--border);border-bottom:1px solid var(--border)}.mnem-stat{padding:18px 20px;border-right:1px solid var(--border);outline:none}.mnem-stat:last-child{border-right:0}.mnem-stat strong{display:block;font-size:25px;line-height:1}.mnem-stat span{display:block;margin-top:8px;color:var(--muted-foreground);font-size:9px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}
    .mnem-overview-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}.mnem-section{min-width:0;border-top:1px solid var(--border);padding-top:16px}.mnem-section-title{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}.mnem-section-title h2{margin:0 0 4px;font-size:14px}.mnem-section-title>svg{color:var(--muted-foreground)}
    .mnem-activity{display:block;width:100%;height:180px;overflow:visible}.mnem-gridline{stroke:var(--border);stroke-width:1}.mnem-line{fill:none;stroke:var(--ui-accent);stroke-width:2.4}.mnem-area{fill:var(--ui-accent);opacity:.07}.mnem-chart-axis{display:flex;justify-content:space-between;color:var(--muted-foreground);font-size:9px}
    .mnem-mini-map{position:relative;height:180px;border:1px solid var(--border);overflow:hidden}.mnem-mini-map i{position:absolute;display:block;transform:translate(-50%,-50%);border-radius:50%;background:var(--ui-accent);opacity:.82}.mnem-mini-map i.is-memory{background:var(--foreground);opacity:.5}
    .mnem-map-shell{border-top:1px solid var(--border);padding-top:16px}.mnem-map-shell.is-fullscreen{position:fixed;inset:0;z-index:999;display:flex;flex-direction:column;padding:12px;background:var(--background)}.mnem-map-shell.is-fullscreen .mnem-map-layout{flex:1;min-height:0}.mnem-map-shell.is-fullscreen .mnem-map-canvas>svg{min-height:0;height:100%}.mnem-map-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-bottom:10px}.mnem-map-search{margin-right:auto;min-width:220px}.mnem-map-layout{display:grid;grid-template-columns:minmax(0,1fr);min-height:520px;border:1px solid var(--border);overflow:hidden}.mnem-map-layout.has-inspector{grid-template-columns:minmax(0,1fr) 280px}.mnem-map-canvas{position:relative;min-width:0;background:var(--background)}.mnem-map-canvas>svg{display:block;width:100%;height:100%;min-height:520px;touch-action:none;cursor:grab}.mnem-map-canvas>svg:active{cursor:grabbing}
    .mnem-edge{stroke:var(--border);stroke-width:1;vector-effect:non-scaling-stroke}.mnem-edge.is-highlighted{stroke:var(--ui-accent);stroke-width:1.8}.mnem-edge-label{fill:var(--ui-accent);font-size:8px;text-anchor:middle;paint-order:stroke;stroke:var(--background);stroke-width:3px}.mnem-node{cursor:pointer;outline:none;transition:opacity .16s}.mnem-node circle{stroke:var(--background);stroke-width:1.5;vector-effect:non-scaling-stroke}.mnem-node-entity{fill:var(--ui-accent)}.mnem-node-memory{fill:var(--foreground);opacity:.72}.mnem-node-label{fill:var(--foreground);font-size:9px;font-weight:600;paint-order:stroke;stroke:var(--background);stroke-width:4px;stroke-linejoin:round;max-width:160px}
    .mnem-legend{position:absolute;left:12px;bottom:12px;display:flex;align-items:center;gap:12px;padding:6px 8px;border:1px solid var(--border);background:var(--background);font-size:9px;color:var(--muted-foreground)}.mnem-legend-row{display:flex;align-items:center;gap:5px}.mnem-dot{width:7px;height:7px;border-radius:50%}.mnem-dot-entity{background:var(--ui-accent)}.mnem-dot-memory{background:var(--foreground);opacity:.72}.mnem-legend-summary{padding-left:10px;border-left:1px solid var(--border)}.mnem-map-help{position:absolute;right:12px;bottom:14px;font-size:9px;color:var(--muted-foreground)}
    .mnem-inspector,.mnem-detail{min-width:0;border-left:1px solid var(--border);padding:18px;overflow:auto;background:var(--background)}.mnem-inspector-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.mnem-inspector h2,.mnem-detail h2{font-size:18px;line-height:1.25;margin:12px 0}.mnem-badges{display:flex;gap:6px;flex-wrap:wrap}.mnem-meta{margin:20px 0}.mnem-meta>div{display:grid;grid-template-columns:86px minmax(0,1fr);gap:12px;padding:8px 0;border-bottom:1px solid var(--border);font-size:11px}.mnem-meta dt{color:var(--muted-foreground)}.mnem-meta dd{margin:0;text-align:right;overflow-wrap:anywhere}.mnem-linked h3{display:flex;justify-content:space-between;margin:20px 0 6px;font-size:11px}.mnem-linked button{display:block;width:100%;padding:9px 0;border:0;border-top:1px solid var(--border);background:transparent;color:var(--foreground);text-align:left;cursor:pointer}.mnem-linked button span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px}.mnem-linked button small{color:var(--ui-accent);font-size:9px}.mnem-linked p{color:var(--muted-foreground);font-size:11px}
    .mnem-browser{min-height:100%;display:flex;flex-direction:column}.mnem-browser-toolbar{display:flex;align-items:center;gap:18px;padding-bottom:16px;border-bottom:1px solid var(--border)}.mnem-browser-search{flex:1;max-width:620px}.mnem-browser-layout{display:grid;grid-template-columns:minmax(0,1fr);min-height:0}.mnem-browser-layout.has-detail{grid-template-columns:minmax(0,1fr) 320px}.mnem-memory-list{min-width:0}.mnem-memory-row{display:block;width:100%;padding:15px 8px;border:0;border-bottom:1px solid var(--border);background:transparent;color:var(--foreground);text-align:left;cursor:pointer}.mnem-memory-row:hover,.mnem-memory-row.is-selected{background:var(--accent)}.mnem-memory-row p{margin:8px 0 6px;font-size:12px;line-height:1.5}.mnem-memory-row small{color:var(--muted-foreground);font-size:10px}.mnem-row-skeleton{height:72px;margin:10px 0}.mnem-detail{position:sticky;top:0;height:calc(100vh - 190px)}.mnem-detail-content{font-size:12px;line-height:1.6}.mnem-readonly-note{display:flex;align-items:center;gap:7px;padding:9px;border:1px solid var(--border);color:var(--muted-foreground);font-size:10px}
    .mnem-timeline{max-width:900px;padding-top:8px}.mnem-timeline section>header{display:flex;align-items:center;gap:8px;padding:16px 0 8px}.mnem-timeline section>header h2{font-size:11px;margin:0;color:var(--muted-foreground);text-transform:uppercase;letter-spacing:.11em}.mnem-timeline-row{display:grid;grid-template-columns:30px minmax(0,1fr);gap:12px;padding:11px 0;border-bottom:1px solid var(--border)}.mnem-timeline-icon{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border:1px solid var(--border);border-radius:50%;color:var(--ui-accent)}.mnem-timeline-icon svg{width:13px}.mnem-timeline-row>div>div{display:flex;align-items:center;justify-content:space-between;gap:16px}.mnem-timeline-row strong{font-size:11px}.mnem-timeline-row span,.mnem-timeline-row p{color:var(--muted-foreground);font-size:10px}.mnem-timeline-row p{margin:4px 0 0;line-height:1.5}
    @media(max-width:900px){.mnem-header{padding:18px}.mnem-content{padding:18px}.mnem-tabs{padding:0 18px}.mnem-overview-grid{grid-template-columns:1fr}.mnem-stats{grid-template-columns:repeat(2,1fr)}.mnem-stat:nth-child(2){border-right:0}.mnem-stat:nth-child(-n+2){border-bottom:1px solid var(--border)}.mnem-map-layout.has-inspector{grid-template-columns:1fr}.mnem-inspector,.mnem-detail{border-left:0;border-top:1px solid var(--border)}.mnem-browser-layout.has-detail{grid-template-columns:1fr}.mnem-detail{position:relative;height:auto}.mnem-map-help{display:none}}
  `
  });
}
function MemoryPage({ ctx }) {
  const profile = useValue(host.state.profile);
  const [tab, setTab] = useState("explore");
  const overview = useQuery({
    queryKey: [PLUGIN_ID, profile, "overview"],
    queryFn: () => ctx.rest("/overview?days=30&map_limit=240"),
    refetchInterval: 15000,
    staleTime: 8000
  });
  return /* @__PURE__ */ jsxs("div", {
    className: "mnem-page",
    children: [
      /* @__PURE__ */ jsx(Styles, {}),
      /* @__PURE__ */ jsxs("header", {
        className: "mnem-header",
        children: [
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("span", {
                className: "mnem-eyebrow",
                children: "Mnemosyne"
              }),
              /* @__PURE__ */ jsx("h1", {
                children: "Memory"
              }),
              /* @__PURE__ */ jsx("p", {
                children: "Explore what Hermes retains, how it connects, and when it changed."
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            className: "mnem-profile",
            children: [
              /* @__PURE__ */ jsx(Database, {
                size: 15
              }),
              /* @__PURE__ */ jsx("span", {
                children: "Profile"
              }),
              /* @__PURE__ */ jsx("strong", {
                children: overview.data?.profile || profile || "coordinator"
              }),
              overview.isFetching && /* @__PURE__ */ jsx(RefreshCw, {
                className: "animate-spin",
                size: 13
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsx(Tabs, {
        className: "mnem-tabs",
        onValueChange: (value) => setTab(value),
        value: tab,
        children: /* @__PURE__ */ jsxs(TabsList, {
          children: [
            /* @__PURE__ */ jsxs(TabsTrigger, {
              value: "explore",
              children: [
                /* @__PURE__ */ jsx(Starmap, {}),
                "Explore"
              ]
            }),
            /* @__PURE__ */ jsxs(TabsTrigger, {
              value: "timeline",
              children: [
                /* @__PURE__ */ jsx(Clock, {}),
                "Timeline"
              ]
            }),
            /* @__PURE__ */ jsxs(TabsTrigger, {
              value: "memories",
              children: [
                /* @__PURE__ */ jsx(Brain, {}),
                "Memories"
              ]
            })
          ]
        })
      }),
      /* @__PURE__ */ jsxs("main", {
        className: "mnem-content",
        children: [
          tab === "explore" && overview.isLoading && /* @__PURE__ */ jsxs("div", {
            className: "mnem-stack",
            children: [
              /* @__PURE__ */ jsx(Skeleton, {
                className: "h-24"
              }),
              /* @__PURE__ */ jsx(Skeleton, {
                className: "h-72"
              }),
              /* @__PURE__ */ jsx(Skeleton, {
                className: "h-96"
              })
            ]
          }),
          tab === "explore" && overview.isError && /* @__PURE__ */ jsx(ErrorState, {
            description: `${errorMessage(overview.error)} Make sure the Mnemosyne Python plugin is installed and enabled for this profile.`,
            title: "Memory backend unavailable"
          }),
          tab === "explore" && overview.data && /* @__PURE__ */ jsx(OverviewView, {
            ctx,
            data: overview.data
          }),
          tab === "timeline" && /* @__PURE__ */ jsx(TimelineView, {
            ctx,
            profile
          }),
          tab === "memories" && /* @__PURE__ */ jsx(MemoriesView, {
            ctx,
            profile
          })
        ]
      })
    ]
  });
}
var plugin = {
  id: PLUGIN_ID,
  name: "Mnemosyne Memory",
  defaultEnabled: false,
  register(ctx) {
    ctx.registerMany([
      {
        id: "route",
        area: ROUTES_AREA,
        title: "Memory",
        data: { path: ROUTE },
        render: () => /* @__PURE__ */ jsx(MemoryPage, {
          ctx
        })
      },
      {
        id: "sidebar",
        area: SIDEBAR_NAV_AREA,
        order: 45,
        data: { path: ROUTE, label: "Memory", codicon: "database" }
      },
      {
        id: "open",
        area: PALETTE_AREA,
        data: {
          id: `${PLUGIN_ID}.open`,
          label: "Open Mnemosyne memory",
          icon: Brain,
          keywords: ["memory", "mnemosyne", "graph", "timeline", "recall"],
          run: () => host.navigate(ROUTE)
        }
      }
    ]);
  }
};
var plugin_default = plugin;
export {
  plugin_default as default
};
