"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { parseSQLSchema } from "@/lib/sql/schema-parser";

interface Column { name: string; type: string; nullable: boolean; primaryKey: boolean; foreignKey?: string }
interface Table { name: string; columns: Column[] }
interface Link { source: string; target: string; sourceCol: string; targetCol: string }

interface ERDiagramProps { schema: string; onClose: () => void }

const TABLE_WIDTH = 180;
const ROW_H = 24;
const HEADER_H = 32;

function getTableHeight(t: Table) { return HEADER_H + t.columns.length * ROW_H + 8; }

const COLORS = ["#7C3AED", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#14B8A6"];

export default function ERDiagram({ schema, onClose }: ERDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  useEffect(() => {
    if (!schema) return;
    const parsed = parseSQLSchema(schema);
    setTables(parsed);

    // Extract FK links
    const foundLinks: Link[] = [];
    parsed.forEach(t => {
      t.columns.forEach(c => {
        if (c.foreignKey) {
          foundLinks.push({ source: t.name, target: c.foreignKey, sourceCol: c.name, targetCol: "id" });
        }
      });
    });
    setLinks(foundLinks);

    // Auto-layout: grid with spacing
    const cols = Math.ceil(Math.sqrt(parsed.length));
    const pos: Record<string, { x: number; y: number }> = {};
    parsed.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      pos[t.name] = { x: col * (TABLE_WIDTH + 80) + 20, y: row * 260 + 20 };
    });
    setPositions(pos);
  }, [schema]);

  const handleMouseDown = (e: React.MouseEvent, tableName: string) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    setDragging(tableName);
    setDragOffset({ x: svgP.x / zoom - pan.x / zoom - positions[tableName].x, y: svgP.y / zoom - pan.y / zoom - positions[tableName].y });
    setSelectedTable(tableName);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());

    if (dragging) {
      const nx = svgP.x / zoom - pan.x / zoom - dragOffset.x;
      const ny = svgP.y / zoom - pan.y / zoom - dragOffset.y;
      setPositions(p => ({ ...p, [dragging]: { x: Math.max(0, nx), y: Math.max(0, ny) } }));
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => { setDragging(null); setIsPanning(false); };

  const handleSVGMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedTable(null);
    }
  };

  const getLinkPath = (link: Link) => {
    const sp = positions[link.source];
    const tp = positions[link.target];
    if (!sp || !tp) return "";
    const sx = sp.x + TABLE_WIDTH;
    const sy = sp.y + HEADER_H / 2;
    const tx = tp.x;
    const ty = tp.y + HEADER_H / 2;
    const mx = (sx + tx) / 2;
    return `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-[90vw] h-[85vh] glass-strong rounded-2xl border border-white/10 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-zinc-300">ER Diagram</span>
              <span className="text-xs text-zinc-600">{tables.length} tables · {links.length} relationships</span>
              {selectedTable && (
                <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                  {selectedTable}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="glass border border-white/5 hover:border-white/15 text-zinc-400 hover:text-white rounded-lg p-1.5 transition-all"><ZoomIn size={13} /></button>
              <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="glass border border-white/5 hover:border-white/15 text-zinc-400 hover:text-white rounded-lg p-1.5 transition-all"><ZoomOut size={13} /></button>
              <button onClick={() => { setZoom(1); setPan({ x: 40, y: 40 }); }} className="glass border border-white/5 hover:border-white/15 text-zinc-400 hover:text-white rounded-lg p-1.5 transition-all"><RotateCcw size={13} /></button>
              <span className="text-xs text-zinc-600 font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={onClose} className="glass border border-white/5 hover:border-red-500/30 text-zinc-400 hover:text-red-400 rounded-lg p-1.5 transition-all ml-2"><X size={13} /></button>
            </div>
          </div>

          {/* Hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-[10px] text-zinc-700 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
            Drag tables to rearrange · Scroll to zoom · Drag background to pan
          </div>

          {/* SVG Canvas */}
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            style={{ background: "radial-gradient(ellipse at center, #0D0B14 0%, #09090B 100%)" }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseDown={handleSVGMouseDown}
            onWheel={e => { e.preventDefault(); setZoom(z => Math.max(0.3, Math.min(2, z - e.deltaY * 0.001))); }}
          >
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#7C3AED" opacity="0.6" />
              </marker>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Grid dots */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="0.8" fill="#1C1C1F" />
                </pattern>
              </defs>
              <rect x="-1000" y="-1000" width="5000" height="5000" fill="url(#grid)" />

              {/* FK Relationship lines */}
              {links.map((link, i) => (
                <g key={i}>
                  <path d={getLinkPath(link)} fill="none" stroke="#7C3AED" strokeWidth="1.5"
                    strokeDasharray="6,3" opacity="0.5" markerEnd="url(#arrowhead)" />
                  {/* Relationship label */}
                  {positions[link.source] && positions[link.target] && (
                    <text
                      x={(positions[link.source].x + TABLE_WIDTH + positions[link.target].x) / 2}
                      y={(positions[link.source].y + positions[link.target].y) / 2}
                      textAnchor="middle" fontSize="9" fill="#7C3AED" opacity="0.7" fontFamily="JetBrains Mono"
                    >
                      FK
                    </text>
                  )}
                </g>
              ))}

              {/* Tables */}
              {tables.map((table, ti) => {
                const pos = positions[table.name] || { x: ti * 220, y: 0 };
                const color = COLORS[ti % COLORS.length];
                const isSelected = selectedTable === table.name;
                const th = getTableHeight(table);
                const linkedTables = links.filter(l => l.source === table.name || l.target === table.name).map(l => l.source === table.name ? l.target : l.source);

                return (
                  <g key={table.name} transform={`translate(${pos.x}, ${pos.y})`}
                    onMouseDown={e => handleMouseDown(e, table.name)}
                    style={{ cursor: "grab", filter: isSelected ? "url(#glow)" : undefined }}>

                    {/* Table shadow */}
                    <rect x="3" y="3" width={TABLE_WIDTH} height={th} rx="10" fill="black" opacity="0.4" />

                    {/* Table body */}
                    <rect width={TABLE_WIDTH} height={th} rx="10"
                      fill="#111113" stroke={isSelected ? color : "#1C1C1F"}
                      strokeWidth={isSelected ? 2 : 1} />

                    {/* Header */}
                    <rect width={TABLE_WIDTH} height={HEADER_H} rx="10"
                      fill={color} opacity="0.9" />
                    <rect y={HEADER_H - 10} width={TABLE_WIDTH} height={10} fill={color} opacity="0.9" />

                    <text x={TABLE_WIDTH / 2} y={HEADER_H / 2 + 5} textAnchor="middle"
                      fontSize="11" fontWeight="700" fill="white" fontFamily="JetBrains Mono">
                      {table.name}
                    </text>

                    {/* Relationship count badge */}
                    {linkedTables.length > 0 && (
                      <g transform={`translate(${TABLE_WIDTH - 18}, 8)`}>
                        <circle r="8" fill="white" opacity="0.2" />
                        <text textAnchor="middle" dy="4" fontSize="8" fill="white" fontWeight="700">{linkedTables.length}</text>
                      </g>
                    )}

                    {/* Columns */}
                    {table.columns.map((col, ci) => {
                      const cy = HEADER_H + ci * ROW_H + ROW_H / 2 + 4;
                      return (
                        <g key={col.name}>
                          {/* Alternating row bg */}
                          {ci % 2 === 0 && <rect y={HEADER_H + ci * ROW_H + 4} width={TABLE_WIDTH} height={ROW_H} fill="white" opacity="0.02" />}

                          {/* PK icon */}
                          {col.primaryKey && (
                            <text x="10" y={cy + 4} fontSize="9" fill="#F59E0B">🔑</text>
                          )}
                          {/* FK icon */}
                          {col.foreignKey && !col.primaryKey && (
                            <text x="10" y={cy + 4} fontSize="9" fill="#7C3AED">🔗</text>
                          )}

                          {/* Column name */}
                          <text x={col.primaryKey || col.foreignKey ? 26 : 10} y={cy + 4}
                            fontSize="10" fill={col.primaryKey ? "#FCD34D" : col.foreignKey ? "#A78BFA" : "#D4D4D8"}
                            fontFamily="JetBrains Mono" fontWeight={col.primaryKey ? "600" : "400"}>
                            {col.name.length > 16 ? col.name.slice(0, 14) + "…" : col.name}
                          </text>

                          {/* Type badge */}
                          <text x={TABLE_WIDTH - 6} y={cy + 4} textAnchor="end"
                            fontSize="9" fill="#52525B" fontFamily="JetBrains Mono">
                            {col.type.split("(")[0].slice(0, 8)}
                          </text>

                          {/* Nullable dot */}
                          {col.nullable && <circle cx={TABLE_WIDTH - 4} cy={cy} r="2" fill="#3F3F46" />}
                        </g>
                      );
                    })}

                    {/* Bottom border accent */}
                    <rect y={th - 2} width={TABLE_WIDTH} height={2} rx="1" fill={color} opacity="0.4" />
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-10 right-4 glass rounded-xl p-3 border border-white/5 text-[10px] space-y-1.5">
            <div className="text-zinc-600 font-medium mb-1">Legend</div>
            <div className="flex items-center gap-2 text-zinc-500"><span className="text-yellow-400">🔑</span> Primary Key</div>
            <div className="flex items-center gap-2 text-zinc-500"><span className="text-purple-400">🔗</span> Foreign Key</div>
            <div className="flex items-center gap-2 text-zinc-500">
              <div className="w-6 h-px border-t border-dashed border-purple-500" />
              FK Relation
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
