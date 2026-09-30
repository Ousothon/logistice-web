import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Container as ContainerIcon } from 'lucide-react'
import Timeline from '../components/Timeline'
import InfoGrid from '../components/InfoGrid'
import StatusBadge from '../components/StatusBadge'
import DataTable from '../components/DataTable'
import { CONTAINER_DETAILS, CONTAINER_STAGES } from '../lib/details'

function fallbackDetail(no) {
  return {
    no,
    type: '—',
    seal: '—',
    shipment: '—',
    route: '—',
    packages: 0,
    weight: '—',
    cbm: '—',
    vessel: '—',
    timeline: CONTAINER_STAGES.map((label, i) => ({
      label,
      time: null,
      state: i === 0 ? 'active' : 'pending',
    })),
  }
}

// A short illustrative sample of the packages loaded in this container —
// swap for a real "packages where container_id = :id" query.
function sampleContents(containerNo, count) {
  const n = Math.min(count, 5)
  return Array.from({ length: n }, (_, i) => ({
    tk: `TK20260925${String(41 - i).padStart(4, '0')}`,
    customer: ['KH-000582 · Sothon Shop', 'KH-000117 · Dara Trading', 'KH-000721 · Chenda Mart', 'KH-000340 · Bopha Import', 'KH-000582 · Sothon Shop'][i],
    weight: `${(6 + i * 2.3).toFixed(1)} KG`,
    status: 'Container Loaded',
  }))
}

export default function ContainerDetail() {
  const { id } = useParams()
  const data = CONTAINER_DETAILS[id] || fallbackDetail(id)
  const currentStage = data.timeline.find((s) => s.state === 'active')?.label
    || [...data.timeline].reverse().find((s) => s.state === 'done')?.label
    || data.timeline[0].label

  return (
    <div className="space-y-5">
      <Link
        to="/containers"
        className="inline-flex items-center gap-1.5 text-sm text-ink-600/60 hover:text-ink-900"
      >
        <ArrowLeft size={15} />
        ត្រឡប់ទៅ Containers
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md bg-ink-900/5 text-ink-800 flex items-center justify-center shrink-0">
            <ContainerIcon size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-ink-900">{data.no}</h1>
            <p className="text-sm text-ink-600/55 mt-0.5">{data.route}</p>
          </div>
        </div>
        <StatusBadge label={currentStage} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-mist-200 rounded-md shadow-panel p-5">
          <h2 className="font-display font-bold text-sm text-ink-900 mb-5">Container Timeline</h2>
          <Timeline steps={data.timeline} />
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
            <h2 className="font-display font-bold text-sm text-ink-900 mb-4">ព័ត៌មាន Container</h2>
            <InfoGrid
              items={[
                { label: 'Type', value: data.type },
                { label: 'Seal No', value: data.seal },
                { label: 'Packages', value: data.packages },
                { label: 'Weight', value: data.weight },
                { label: 'CBM', value: data.cbm },
                {
                  label: 'Shipment',
                  value: (
                    <Link to="/shipments" className="text-signal-blue hover:underline">
                      {data.shipment}
                    </Link>
                  ),
                },
                { label: 'Vessel / Voyage', value: data.vessel, span: true },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-mist-200 rounded-md shadow-panel">
        <div className="flex items-center justify-between px-4 lg:px-5 py-3.5 border-b border-mist-200">
          <h2 className="font-display font-bold text-sm text-ink-900">
            Packages ក្នុង Container ({data.packages})
          </h2>
          <span className="text-xs text-ink-600/45">បង្ហាញ 5 ដំបូង</span>
        </div>
        <DataTable
          columns={[
            { key: 'tk', label: 'TK Number', strong: true, linkTo: (row) => `/packages/${row.tk}` },
            { key: 'customer', label: 'Customer' },
            { key: 'weight', label: 'Weight' },
            { key: 'status', label: 'Status', status: true },
          ]}
          rows={sampleContents(data.no, data.packages)}
        />
      </div>
    </div>
  )
}
