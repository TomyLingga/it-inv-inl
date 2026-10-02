// src/app/traceability/TraceTree.tsx
'use client'

import { useState } from 'react'
import {
  Boxes,
  Factory,
  Truck,
  Store,
  Package,
  CircleDashed,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Repeat,
} from 'lucide-react'
import { normalizeCode } from '@/app/shared/utils/filterUtils'
import { TraceGraph, TraceNode, TraceRoot } from './traceEngine'

export function formatQty(n: number | undefined): string {
  return Math.abs(Number(n) || 0).toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

export function formatDate(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface NodeProps {
  node: TraceNode
  graph: TraceGraph
  depth: number
  onFocus: (root: TraceRoot) => void
}

function NodeCard({ node, graph, onFocus }: Omit<NodeProps, 'depth'>) {
  if (node.kind === 'lot') {
    const lot = graph.lots.get(node.lotKey)
    return (
      <div className="flex-1 min-w-0 rounded-xl border border-violet-200 dark:border-violet-900/50 bg-white dark:bg-slate-900 px-3 py-2">
        {node.relation && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
            {node.relation.startsWith('Transfer') && <Repeat className="w-3 h-3" />}
            {node.relation}
          </span>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Boxes className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
              <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-[240px]" title={lot?.materialName}>
                {lot?.materialName || normalizeCode(lot?.material) || 'Material'}
              </span>
              {lot?.batch ? (
                <span className="font-mono text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-1.5 py-0.5 rounded border border-violet-200 dark:border-violet-900/40">
                  {lot.batch}
                </span>
              ) : (
                <span className="text-[10px] italic text-slate-400">tanpa batch</span>
              )}
            </div>
            <span className="font-mono text-[10px] text-slate-400">{normalizeCode(lot?.material)}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {node.qty !== undefined && (
              <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200 num-tabular">
                {formatQty(node.qty)} {lot?.satuan}
              </span>
            )}
            <button
              type="button"
              onClick={() => onFocus({ type: 'lot', lotKey: node.lotKey })}
              title="Jadikan titik fokus penelusuran"
              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (node.kind === 'order') {
    return (
      <div className="flex-1 min-w-0 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Factory className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Order Produksi</span>
          <span className="font-mono text-xs font-extrabold text-amber-900 dark:text-amber-200">{node.orderNo}</span>
          {node.date && <span className="text-[10px] text-amber-700/70 dark:text-amber-400/70">· {formatDate(node.date)}</span>}
        </div>
        <button
          type="button"
          onClick={() => onFocus({ type: 'order', orderNo: node.orderNo })}
          title="Jadikan titik fokus penelusuran"
          className="p-1 rounded-md text-amber-500 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shrink-0"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  if (node.kind === 'external') {
    const f = node.flow
    const style =
      f.kind === 'supplier'
        ? { box: 'border-teal-200 dark:border-teal-900/50 bg-teal-50/70 dark:bg-teal-950/20', text: 'text-teal-800 dark:text-teal-300', icon: <Truck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />, tag: 'Vendor / Supplier' }
        : f.kind === 'customer'
        ? { box: 'border-sky-200 dark:border-sky-900/50 bg-sky-50/70 dark:bg-sky-950/20', text: 'text-sky-800 dark:text-sky-300', icon: <Store className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />, tag: 'Customer / Buyer' }
        : { box: 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-300', icon: <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />, tag: f.kind === 'opening' ? 'Saldo awal' : 'Pemakaian lain' }
    return (
      <div className={`flex-1 min-w-0 rounded-xl border px-3 py-2 ${style.box}`}>
        <span className={`block text-[10px] font-bold uppercase tracking-wider opacity-70 ${style.text}`}>{style.tag}</span>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {style.icon}
            <span className={`text-xs font-extrabold truncate max-w-[260px] ${style.text}`} title={f.label}>{f.label}</span>
          </div>
          <span className={`font-mono text-[11px] font-bold num-tabular shrink-0 ${style.text}`}>
            {formatQty(f.qty)} {f.satuan}
          </span>
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap gap-x-2">
          {f.ref && <span className="font-mono">{f.ref}</span>}
          {f.firstDate && <span>{formatDate(f.firstDate)}</span>}
          {f.docs.length > 0 && <span className="font-mono">Dok: {f.docs.slice(0, 3).join(', ')}{f.docs.length > 3 ? ` +${f.docs.length - 3}` : ''}</span>}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex-1 min-w-0 rounded-xl border border-dashed px-3 py-1.5 text-[11px] flex items-center gap-1.5 ${
        node.tone === 'warn'
          ? 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400'
          : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
      }`}
    >
      {node.tone === 'warn' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <CircleDashed className="w-3.5 h-3.5 shrink-0" />}
      <span>{node.label}</span>
    </div>
  )
}

function TreeNodeView({ node, graph, depth, onFocus }: NodeProps) {
  // Deep levels start collapsed so long chains stay readable
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children.length > 0

  return (
    <li className="relative">
      <div className="flex items-start gap-1">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-2 p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}
        <NodeCard node={node} graph={graph} onFocus={onFocus} />
      </div>
      {hasChildren && open && (
        <ul className="ml-[9px] pl-4 mt-1.5 space-y-1.5 border-l-2 border-slate-200 dark:border-slate-700/80">
          {node.children.map((child) => (
            <TreeNodeView key={child.id} node={child} graph={graph} depth={depth + 1} onFocus={onFocus} />
          ))}
        </ul>
      )}
      {hasChildren && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-7 mt-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Tampilkan {node.children.length} cabang ▾
        </button>
      )}
    </li>
  )
}

export default function TraceTree({
  tree,
  graph,
  onFocus,
}: {
  tree: TraceNode
  graph: TraceGraph
  onFocus: (root: TraceRoot) => void
}) {
  // The root itself is shown in the page header; render its branches here.
  if (tree.children.length === 0) return null
  return (
    <ul className="space-y-1.5">
      {tree.children.map((child) => (
        <TreeNodeView key={child.id} node={child} graph={graph} depth={0} onFocus={onFocus} />
      ))}
    </ul>
  )
}
