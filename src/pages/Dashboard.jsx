import { Link } from 'react-router-dom'
import StatCard from '../components/StatCard'
import RouteFlow from '../components/RouteFlow'
import { TriangleAlert, PackageCheck, Ship, Stamp } from 'lucide-react'

const STATS = [
  { icon: 'LogIn', label: 'Inbound (today)', value: '1,245', tone: 'blue', delta: '+8.2%' },
  { icon: 'LogOut', label: 'Outbound (today)', value: '326', tone: 'ink', delta: '+2.1%' },
  { icon: 'Ship', label: 'In Transit', value: '86', tone: 'amber' },
  { icon: 'Stamp', label: 'Customs Pending', value: '42', tone: 'amber' },
  { icon: 'Warehouse', label: 'KH Warehouse Stock', value: '1,582', tone: 'teal', delta: '+4.6%' },
  { icon: 'TriangleAlert', label: 'Open Exceptions', value: '13', tone: 'red', delta: '-3' },
]

const RECENT = [
  { tk: 'TK202609250041', customer: 'KH-000582 · Sothon Shop', stage: 'Outbound Origin', time: '2 min ago', tone: 'blue' },
  { tk: 'TK202609250038', customer: 'KH-000117 · Dara Trading', stage: 'QC Completed', time: '9 min ago', tone: 'teal' },
  { tk: 'TK202609250035', customer: 'KH-000721 · Chenda Mart', stage: 'Inbound Origin', time: '18 min ago', tone: 'blue' },
  { tk: 'TK202609250029', customer: 'KH-000582 · Sothon Shop', stage: 'Weight Difference', time: '26 min ago', tone: 'red' },
  { tk: 'TK202609250012', customer: 'KH-000340 · Bopha Import', stage: 'Consolidated', time: '41 min ago', tone: 'ink' },
]

const EXCEPTIONS = [
  { id: 'EXC-0192', type: 'Missing', ref: 'SHP-2026-000125 · 6 packages', tone: 'red' },
  { id: 'EXC-0191', type: 'Customs Hold', ref: 'MSKU1234567', tone: 'amber' },
  { id: 'EXC-0190', type: 'Wrong Customer ID', ref: 'TK123456789', tone: 'amber' },
]

const DOT = {
  blue: 'bg-signal-blue',
  teal: 'bg-signal-teal',
  red: 'bg-signal-red',
  amber: 'bg-signal-amber',
  ink: 'bg-ink-600',
}

export default function Dashboard() {
  return (
    <div className="space-y-5">
      <RouteFlow />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-mist-200 rounded-md shadow-panel">
          <div className="flex items-center justify-between px-4 lg:px-5 py-3.5 border-b border-mist-200">
            <h2 className="font-display font-bold text-sm text-ink-900">Recent Activity</h2>
            <button className="text-xs font-medium text-signal-blue hover:underline">
              មើលទាំងអស់
            </button>
          </div>
          <div className="divide-y divide-mist-100">
            {RECENT.map((r) => (
              <div key={r.tk} className="flex items-center gap-3 px-4 lg:px-5 py-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[r.tone]}`} />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/packages/${r.tk}`}
                    className="text-sm font-medium text-ink-900 hover:text-signal-blue truncate block"
                  >
                    {r.tk}
                  </Link>
                  <div className="text-xs text-ink-600/55 truncate">{r.customer}</div>
                </div>
                <div className="text-xs text-ink-700 font-medium hidden sm:block">{r.stage}</div>
                <div className="text-xs text-ink-600/40 shrink-0 w-16 text-right">{r.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-mist-200 rounded-md shadow-panel">
          <div className="flex items-center justify-between px-4 lg:px-5 py-3.5 border-b border-mist-200">
            <h2 className="font-display font-bold text-sm text-ink-900">Exception Alerts</h2>
            <TriangleAlert size={16} className="text-signal-red" />
          </div>
          <div className="divide-y divide-mist-100">
            {EXCEPTIONS.map((e) => (
              <div key={e.id} className="px-4 lg:px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink-900">{e.id}</span>
                  <span
                    className={`text-[11px] font-medium px-1.5 py-0.5 rounded-sm ${
                      e.tone === 'red'
                        ? 'bg-signal-red/10 text-signal-red'
                        : 'bg-signal-amber/15 text-[#B87415]'
                    }`}
                  >
                    {e.type}
                  </span>
                </div>
                <div className="text-xs text-ink-600/55 mt-0.5">{e.ref}</div>
              </div>
            ))}
          </div>
          <div className="px-4 lg:px-5 py-3 border-t border-mist-200">
            <button className="w-full text-xs font-medium text-center text-signal-blue hover:underline">
              ទៅកាន់ Exception Center
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
