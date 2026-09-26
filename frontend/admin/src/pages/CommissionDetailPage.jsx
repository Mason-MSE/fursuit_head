import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { commissionsAPI, rolesAPI } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'

export default function CommissionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [commission, setCommission] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [milestones, setMilestones] = useState([])
  const [changeRequests, setChangeRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [makers, setMakers] = useState([])
  const [assignModal, setAssignModal] = useState(false)
  const [quoteModal, setQuoteModal] = useState(false)
  const [milestoneModal, setMilestoneModal] = useState({ open: false, milestone: null })
  const [crModal, setCrModal] = useState(false)
  const [makerId, setMakerId] = useState('')
  const [quote, setQuote] = useState({ price: '', notes: '', estimated_days: '', deposit_percent: '', line_items: [{ description: '', amount: '' }] })
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', due_date: '' })
  const [crForm, setCrForm] = useState({ description: '', type: 'addition' })
  const [tab, setTab] = useState('details')

  const fetchCommission = async () => {
    try {
      const [c, t] = await Promise.all([
        commissionsAPI.get(id),
        commissionsAPI.timeline(id).catch(() => ({ data: { data: [] } })),
      ])
      setCommission(c.data?.data)
      setTimeline(t.data?.data || [])
      try {
        const ms = await commissionsAPI.milestones(id)
        setMilestones(ms.data?.data || [])
      } catch { setMilestones([]) }
      try {
        const cr = await commissionsAPI.changeRequests(id)
        setChangeRequests(cr.data?.data || [])
      } catch { setChangeRequests([]) }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommission()
    rolesAPI.list({ per_page: 100 }).then(({ data }) => {
      const makers = (data.data || []).flatMap((r) => r.users || [])
      setMakers(makers)
    }).catch(() => {})
  }, [id])

  const handleAssign = async () => {
    try {
      await commissionsAPI.assignMaker(id, { maker_id: makerId })
      setAssignModal(false)
      setMakerId('')
      fetchCommission()
    } catch {}
  }

  const handleQuote = async () => {
    try {
      const payload = {
        price: quote.price,
        notes: quote.notes,
        estimated_days: quote.estimated_days,
        deposit_percent: quote.deposit_percent,
        line_items: quote.line_items.filter((li) => li.description && li.amount),
      }
      await commissionsAPI.createQuote(id, payload)
      setQuoteModal(false)
      setQuote({ price: '', notes: '', estimated_days: '', deposit_percent: '', line_items: [{ description: '', amount: '' }] })
      fetchCommission()
    } catch {}
  }

  const handleStatus = async (status) => {
    try {
      await commissionsAPI.updateStatus(id, { status })
      fetchCommission()
    } catch {}
  }

  const handleMilestone = async () => {
    try {
      if (milestoneModal.milestone?.id) {
        await commissionsAPI.updateMilestone(id, milestoneModal.milestone.id, milestoneForm)
      } else {
        await commissionsAPI.createMilestone(id, milestoneForm)
      }
      setMilestoneModal({ open: false, milestone: null })
      setMilestoneForm({ title: '', description: '', due_date: '' })
      fetchCommission()
    } catch {}
  }

  const handleDeleteMilestone = async (milestoneId) => {
    try {
      await commissionsAPI.deleteMilestone(id, milestoneId)
      fetchCommission()
    } catch {}
  }

  const handleCR = async () => {
    try {
      await commissionsAPI.createChangeRequest(id, crForm)
      setCrModal(false)
      setCrForm({ description: '', type: 'addition' })
      fetchCommission()
    } catch {}
  }

  const handleCRStatus = async (crId, status) => {
    try {
      await commissionsAPI.updateChangeRequest(id, crId, { status })
      fetchCommission()
    } catch {}
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>
  if (!commission) return <div className="py-20 text-center text-red-400">Commission not found</div>

  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none'

  const addLineItem = () => {
    setQuote({ ...quote, line_items: [...quote.line_items, { description: '', amount: '' }] })
  }

  const updateLineItem = (index, field, value) => {
    const items = [...quote.line_items]
    items[index] = { ...items[index], [field]: value }
    setQuote({ ...quote, line_items: items })
  }

  const removeLineItem = (index) => {
    setQuote({ ...quote, line_items: quote.line_items.filter((_, i) => i !== index) })
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/commissions')} className="text-gray-400 hover:text-gray-600">&larr; Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Commission #{commission.commission_number || commission.id}</h1>
        <StatusBadge status={commission.status} />
      </div>

      <div className="mb-6 flex gap-1 border-b">
        {['details', 'milestones', 'changes'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition ${
              tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Commission Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Character</p><p className="font-medium">{commission.character?.name || '-'}</p></div>
              <div><p className="text-gray-500">Client</p><p className="font-medium">{commission.client?.name || commission.user?.name || '-'}</p></div>
              <div><p className="text-gray-500">Maker</p><p className="font-medium">{commission.maker?.name || 'Unassigned'}</p></div>
              <div><p className="text-gray-500">Price</p><p className="font-medium">{commission.price ? `$${commission.price}` : 'Not quoted'}</p></div>
              <div><p className="text-gray-500">Type</p><p className="font-medium capitalize">{commission.type || commission.commission_type || '-'}</p></div>
              <div><p className="text-gray-500">Created</p><p className="font-medium">{commission.created_at ? new Date(commission.created_at).toLocaleDateString() : '-'}</p></div>
              <div><p className="text-gray-500">Deposit %</p><p className="font-medium">{commission.deposit_percent || '-'}%</p></div>
              <div><p className="text-gray-500">Estimated Days</p><p className="font-medium">{commission.estimated_days || '-'}</p></div>
            </div>
            {commission.description && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Description</p>
                <p className="mt-1 text-sm">{commission.description}</p>
              </div>
            )}
            {commission.reference_images && commission.reference_images.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-gray-500">Reference Images</p>
                <div className="flex gap-2">
                  {commission.reference_images.map((img, i) => (
                    <div key={i} className="h-20 w-20 overflow-hidden rounded-lg bg-gray-100">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {commission.quote?.line_items && commission.quote.line_items.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-gray-500">Quote Line Items</p>
                <div className="divide-y rounded-lg border">
                  {commission.quote.line_items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3">
                      <span className="text-sm">{item.description}</span>
                      <span className="text-sm font-medium">${item.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">Status Flow</h2>
              <div className="space-y-2">
                {['submitted', 'reviewing', 'quoted', 'in_progress', 'final_review', 'completed'].map((s, i) => {
                  const statusOrder = ['submitted', 'reviewing', 'quoted', 'in_progress', 'final_review', 'completed']
                  const currentIdx = statusOrder.indexOf(commission.status)
                  return (
                    <div key={s} className={`flex items-center gap-3 rounded-lg p-2 text-sm ${i <= currentIdx ? 'bg-primary-50 text-primary-700' : 'text-gray-400'}`}>
                      <div className={`h-2 w-2 rounded-full ${i <= currentIdx ? 'bg-primary-600' : 'bg-gray-300'}`} />
                      <span className="capitalize">{s.replace(/_/g, ' ')}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">Actions</h2>
              <div className="space-y-2">
                <button onClick={() => setAssignModal(true)} className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                  Assign Maker
                </button>
                <button onClick={() => setQuoteModal(true)} className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                  Create Quote
                </button>
                {commission.status === 'submitted' && (
                  <button onClick={() => handleStatus('reviewing')} className="w-full rounded-lg bg-primary-600 py-2 text-sm text-white hover:bg-primary-700">
                    Start Review
                  </button>
                )}
                {commission.status === 'reviewing' && (
                  <button onClick={() => handleStatus('quoted')} className="w-full rounded-lg bg-primary-600 py-2 text-sm text-white hover:bg-primary-700">
                    Send Quote
                  </button>
                )}
                {commission.status === 'quoted' && (
                  <button onClick={() => handleStatus('in_progress')} className="w-full rounded-lg bg-primary-600 py-2 text-sm text-white hover:bg-primary-700">
                    Start Work
                  </button>
                )}
                {commission.status === 'in_progress' && (
                  <button onClick={() => handleStatus('final_review')} className="w-full rounded-lg bg-primary-600 py-2 text-sm text-white hover:bg-primary-700">
                    Submit for Review
                  </button>
                )}
                {commission.status === 'final_review' && (
                  <button onClick={() => handleStatus('completed')} className="w-full rounded-lg bg-green-600 py-2 text-sm text-white hover:bg-green-700">
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'milestones' && (
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Milestones</h2>
            <button
              onClick={() => { setMilestoneForm({ title: '', description: '', due_date: '' }); setMilestoneModal({ open: true, milestone: null }) }}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              + Add Milestone
            </button>
          </div>
          {milestones.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No milestones yet</p>
          ) : (
            <div className="space-y-3">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900">{m.title}</h3>
                      {m.status && <StatusBadge status={m.status} />}
                    </div>
                    {m.description && <p className="mt-1 text-sm text-gray-500">{m.description}</p>}
                    {m.due_date && <p className="mt-1 text-xs text-gray-400">Due: {new Date(m.due_date).toLocaleDateString()}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setMilestoneForm({ title: m.title, description: m.description || '', due_date: m.due_date || '' }); setMilestoneModal({ open: true, milestone: m }) }}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMilestone(m.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'changes' && (
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Change Requests</h2>
            <button
              onClick={() => setCrModal(true)}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              + New Request
            </button>
          </div>
          {changeRequests.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No change requests</p>
          ) : (
            <div className="space-y-3">
              {changeRequests.map((cr) => (
                <div key={cr.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 capitalize">
                        {cr.type || 'change'}
                      </span>
                      {cr.status && <StatusBadge status={cr.status} />}
                    </div>
                    {cr.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleCRStatus(cr.id, 'approved')} className="text-sm text-green-600 hover:underline">Approve</button>
                        <button onClick={() => handleCRStatus(cr.id, 'rejected')} className="text-sm text-red-600 hover:underline">Reject</button>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{cr.description}</p>
                  {cr.created_at && (
                    <p className="mt-1 text-xs text-gray-400">{new Date(cr.created_at).toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="mt-6 rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">No timeline events</p>
        ) : (
          <div className="space-y-4">
            {timeline.map((event, i) => (
              <div key={event.id || i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-primary-600" />
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-gray-200" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{event.action || event.status}</p>
                  <p className="text-sm text-gray-500">{event.description || event.notes || ''}</p>
                  <p className="text-xs text-gray-400">{event.created_at ? new Date(event.created_at).toLocaleString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Maker"
        footer={<>
          <button onClick={() => setAssignModal(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleAssign} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">Assign</button>
        </>}
      >
        <label className="mb-1 block text-sm font-medium text-gray-700">Select Maker</label>
        <select value={makerId} onChange={(e) => setMakerId(e.target.value)} className={inputCls}>
          <option value="">Choose a maker...</option>
          {makers.map((m) => (
            <option key={m.id} value={m.id}>{m.name || m.email}</option>
          ))}
        </select>
      </Modal>

      <Modal open={quoteModal} onClose={() => setQuoteModal(false)} title="Create Quote"
        footer={<>
          <button onClick={() => setQuoteModal(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleQuote} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">Submit Quote</button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Total Price</label>
            <input type="number" step="0.01" value={quote.price} onChange={(e) => setQuote({ ...quote, price: e.target.value })} className={inputCls} placeholder="0.00" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Deposit %</label>
            <input type="number" min="0" max="100" value={quote.deposit_percent} onChange={(e) => setQuote({ ...quote, deposit_percent: e.target.value })} className={inputCls} placeholder="50" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Estimated Days</label>
            <input type="number" value={quote.estimated_days} onChange={(e) => setQuote({ ...quote, estimated_days: e.target.value })} className={inputCls} placeholder="Days" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea value={quote.notes} onChange={(e) => setQuote({ ...quote, notes: e.target.value })} className={inputCls} rows={3} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Line Items</label>
              <button type="button" onClick={addLineItem} className="text-xs text-primary-600 hover:underline">+ Add item</button>
            </div>
            <div className="space-y-2">
              {quote.line_items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={item.description}
                    onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                    className={inputCls + ' flex-1'}
                    placeholder="Description"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => updateLineItem(i, 'amount', e.target.value)}
                    className={inputCls + ' w-28'}
                    placeholder="Amount"
                  />
                  {quote.line_items.length > 1 && (
                    <button type="button" onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-600">&times;</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={milestoneModal.open} onClose={() => setMilestoneModal({ open: false, milestone: null })} title={milestoneModal.milestone ? 'Edit Milestone' : 'Add Milestone'}
        footer={<>
          <button onClick={() => setMilestoneModal({ open: false, milestone: null })} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleMilestone} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">{milestoneModal.milestone ? 'Update' : 'Add'}</button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} className={inputCls} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} className={inputCls} rows={3} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label>
            <input type="date" value={milestoneForm.due_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })} className={inputCls} />
          </div>
        </div>
      </Modal>

      <Modal open={crModal} onClose={() => setCrModal(false)} title="New Change Request"
        footer={<>
          <button onClick={() => setCrModal(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleCR} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">Submit</button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select value={crForm.type} onChange={(e) => setCrForm({ ...crForm, type: e.target.value })} className={inputCls}>
              <option value="addition">Addition</option>
              <option value="modification">Modification</option>
              <option value="removal">Removal</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea value={crForm.description} onChange={(e) => setCrForm({ ...crForm, description: e.target.value })} className={inputCls} rows={4} required />
          </div>
        </div>
      </Modal>
    </div>
  )
}
