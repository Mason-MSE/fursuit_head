import { useState, useEffect } from 'react'
import { commissionConfigAPI } from '../services/api'

export default function CommissionConfigPage() {
  const [config, setConfig] = useState({
    is_open: true,
    max_slots: '',
    enable_waitlist: false,
    min_deposit_percent: 50,
    quote_validity_days: 14,
    booked_slots: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    commissionConfigAPI.get().then(({ data }) => {
      const d = data?.data || {}
      setConfig({
        is_open: d.is_open ?? true,
        max_slots: d.max_slots ?? '',
        enable_waitlist: d.enable_waitlist ?? false,
        min_deposit_percent: d.min_deposit_percent ?? 50,
        quote_validity_days: d.quote_validity_days ?? 14,
        booked_slots: d.booked_slots ?? 0,
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await commissionConfigAPI.update(config)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {} finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Loading config...</div>

  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none'
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700'

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Commission Configuration</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Status */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Commission Status</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setConfig({ ...config, is_open: !config.is_open })}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  config.is_open ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  config.is_open ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <div>
                <p className="text-sm font-medium text-gray-900">{config.is_open ? 'Commissions Open' : 'Commissions Closed'}</p>
                <p className="text-xs text-gray-500">Toggle to accept or reject new commission submissions</p>
              </div>
            </div>
          </div>

          {/* Slots */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Slot Management</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Max Slots</label>
                <input
                  type="number"
                  min="0"
                  value={config.max_slots}
                  onChange={(e) => setConfig({ ...config, max_slots: e.target.value ? parseInt(e.target.value) : '' })}
                  className={inputCls}
                  placeholder="Unlimited"
                />
                <p className="mt-1 text-xs text-gray-400">Leave empty for unlimited slots</p>
              </div>
              <div>
                <label className={labelCls}>Booked Slots</label>
                <div className="flex items-center gap-2">
                  <div className={`${inputCls} bg-gray-50 cursor-not-allowed`}>{config.booked_slots}</div>
                </div>
                <p className="mt-1 text-xs text-gray-400">Currently in use</p>
              </div>
            </div>

            {config.max_slots && (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>{config.booked_slots} booked</span>
                  <span>{config.max_slots} max</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary-600 transition-all"
                    style={{ width: `${Math.min((config.booked_slots / config.max_slots) * 100, 100)}%` }}
                  />
                </div>
                {config.booked_slots >= config.max_slots && (
                  <p className="mt-1 text-xs font-medium text-red-600">All slots are booked</p>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setConfig({ ...config, enable_waitlist: !config.enable_waitlist })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enable_waitlist ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  config.enable_waitlist ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <div>
                <p className="text-sm font-medium text-gray-900">Enable Waitlist</p>
                <p className="text-xs text-gray-500">Allow clients to join a waitlist when slots are full</p>
              </div>
            </div>
          </div>

          {/* Quote Settings */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Quote Settings</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Minimum Deposit %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.min_deposit_percent}
                  onChange={(e) => setConfig({ ...config, min_deposit_percent: parseInt(e.target.value) || 0 })}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-400">Minimum deposit required to start work</p>
              </div>
              <div>
                <label className={labelCls}>Quote Validity (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={config.quote_validity_days}
                  onChange={(e) => setConfig({ ...config, quote_validity_days: parseInt(e.target.value) || 1 })}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-400">How long a quote remains valid</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Current Status</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium ${config.is_open ? 'text-green-600' : 'text-red-600'}`}>
                  {config.is_open ? 'Open' : 'Closed'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Slots</span>
                <span className="font-medium text-gray-900">
                  {config.booked_slots}{config.max_slots ? ` / ${config.max_slots}` : ' / ∞'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Waitlist</span>
                <span className="font-medium text-gray-900">{config.enable_waitlist ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Min Deposit</span>
                <span className="font-medium text-gray-900">{config.min_deposit_percent}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Quote Validity</span>
                <span className="font-medium text-gray-900">{config.quote_validity_days} days</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            {saved && (
              <p className="mt-2 text-center text-sm text-green-600">Configuration saved successfully!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
