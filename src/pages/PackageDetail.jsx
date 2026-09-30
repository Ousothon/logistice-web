import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, TriangleAlert, Package } from 'lucide-react'
import Timeline from '../components/Timeline'
import InfoGrid from '../components/InfoGrid'
import StatusBadge from '../components/StatusBadge'
import { PACKAGE_DETAILS, PACKAGE_STAGES } from '../lib/details'

function fallbackDetail(tk) {
  return {
    tk,
    customer: 'Unknown Customer',
    customerId: '—',
    order: '—',
    supplier: '—',
    weight: '—',
    dimension: '—',
    cbm: '—',
    warehouse: '—',
    shipment: null,
    container: null,
    exception: null,
    timeline: PACKAGE_STAGES.map((label, i) => ({
      label,
      time: null,
      state: i === 0 ? 'active' : 'pending',
    })),
  }
}

export default function PackageDetail() {
  const { tk } = useParams()
  const data = PACKAGE_DETAILS[tk] || fallbackDetail(tk)
  const currentStage = data.timeline.find((s) => s.state === 'active')?.label
    || [...data.timeline].reverse().find((s) => s.state === 'done')?.label
    || data.timeline[0].label

  return (
    <div className="space-y-5">
      <Link
        to="/packages"
        className="inline-flex items-center gap-1.5 text-sm text-ink-600/60 hover:text-ink-900"
      >
        <ArrowLeft size={15} />
        ត្រឡប់ទៅ Packages / TK
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md bg-signal-blue/10 text-signal-blue flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-ink-900">{data.tk}</h1>
            <p className="text-sm text-ink-600/55 mt-0.5">
              {data.customerId} · {data.customer}
            </p>
          </div>
        </div>
        <StatusBadge label={currentStage} />
      </div>

      {data.exception && (
        <div className="flex items-start gap-2.5 bg-signal-red/10 text-signal-red text-sm rounded-md px-4 py-3">
          <TriangleAlert size={16} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">{data.exception.type}</div>
            <div className="text-signal-red/80 mt-0.5">{data.exception.detail}</div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-mist-200 rounded-md shadow-panel p-5">
          <h2 className="font-display font-bold text-sm text-ink-900 mb-5">Tracking Timeline</h2>
          <Timeline steps={data.timeline} />
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
            <h2 className="font-display font-bold text-sm text-ink-900 mb-4">ព័ត៌មានកញ្ចប់</h2>
            <InfoGrid
              items={[
                { label: 'Order ID', value: data.order },
                { label: 'Supplier', value: data.supplier },
                { label: 'Weight', value: data.weight },
                { label: 'CBM', value: data.cbm },
                { label: 'Dimension', value: data.dimension, span: true },
                { label: 'Warehouse', value: data.warehouse, span: true },
              ]}
            />
          </div>

          {(data.shipment || data.container) && (
            <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
              <h2 className="font-display font-bold text-sm text-ink-900 mb-4">ការដឹកជញ្ជូន</h2>
              <InfoGrid
                items={[
                  data.shipment && { label: 'Shipment', value: data.shipment, span: true },
                  data.container && {
                    label: 'Container',
                    value: (
                      <Link to={`/containers/${data.container}`} className="text-signal-blue hover:underline">
                        {data.container}
                      </Link>
                    ),
                    span: true,
                  },
                ].filter(Boolean)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
