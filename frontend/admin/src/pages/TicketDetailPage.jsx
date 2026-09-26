import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ticketsAPI } from '../services/api'
import StatusBadge from '../components/StatusBadge'

export default function TicketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [newNote, setNewNote] = useState('')
  const [assigneeId, setAssigneeId] = useState('')

  const fetchTicket = async () => {
    try {
      const { data } = await ticketsAPI.get(id)
      setTicket(data.data)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTicket() }, [id])

  const handleStatus = async (status) => {
    try {
      await ticketsAPI.updateStatus(id, { status })
      fetchTicket()
    } catch {}
  }

  const handleAssign = async () => {
    try {
      await ticketsAPI.assign(id, { assignee_id: assigneeId })
      setAssigneeId('')
      fetchTicket()
    } catch {}
  }

  const handleAddMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    try {
      await ticketsAPI.addMessage(id, { content: newMessage })
      setNewMessage('')
      fetchTicket()
    } catch {}
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) return
    try {
      await ticketsAPI.addInternalNote(id, { content: newNote })
      setNewNote('')
      fetchTicket()
    } catch {}
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>
  if (!ticket) return <div className="py-20 text-center text-red-400">Ticket not found</div>

  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none'

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/tickets')} className="text-gray-400 hover:text-gray-600">&larr; Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Ticket #{ticket.ticket_number || ticket.id}</h1>
        <StatusBadge status={ticket.status} />
        <StatusBadge status={ticket.priority} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Messages */}
        <div className="lg:col-span-2">
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">{ticket.subject}</h2>
            <div className="space-y-4">
              {(ticket.messages || []).map((msg, i) => (
                <div key={msg.id || i} className={`rounded-lg p-4 ${msg.is_internal ? 'border border-yellow-200 bg-yellow-50' : 'bg-gray-50'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{msg.author?.name || msg.author || 'User'}</span>
                    <span className="text-xs text-gray-400">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</span>
                  </div>
                  {msg.is_internal && <p className="mb-1 text-xs font-medium text-yellow-600">Internal Note</p>}
                  <p className="text-sm text-gray-700">{msg.content || msg.body || msg.text}</p>
                </div>
              ))}
              {(!ticket.messages || ticket.messages.length === 0) && (
                <p className="py-8 text-center text-sm text-gray-400">No messages yet</p>
              )}
            </div>

            <form onSubmit={handleAddMessage} className="mt-4 border-t pt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Reply</label>
              <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className={inputCls} rows={3} placeholder="Type your reply..." />
              <button type="submit" className="mt-2 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">Send Reply</button>
            </form>
          </div>

          {/* Internal notes */}
          <div className="mt-6 rounded-xl border border-yellow-200 bg-white p-6 shadow">
            <h3 className="mb-4 text-sm font-semibold text-yellow-600">Internal Notes</h3>
            <div className="space-y-3">
              {(ticket.internal_notes || []).map((note, i) => (
                <div key={i} className="rounded-lg bg-yellow-50 p-3">
                  <p className="text-xs text-gray-500">{note.author?.name || 'Admin'} - {note.created_at ? new Date(note.created_at).toLocaleString() : ''}</p>
                  <p className="mt-1 text-sm text-gray-700">{note.content || note.text}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddNote} className="mt-4">
              <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} className={inputCls} rows={2} placeholder="Add internal note..." />
              <button type="submit" className="mt-2 rounded-lg border border-yellow-300 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50">Add Note</button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Details</h2>
            <div className="space-y-3 text-sm">
              <div><p className="text-gray-500">Status</p><StatusBadge status={ticket.status} /></div>
              <div><p className="text-gray-500">Priority</p><StatusBadge status={ticket.priority} /></div>
              <div><p className="text-gray-500">Created</p><p>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-'}</p></div>
              <div><p className="text-gray-500">Last Updated</p><p>{ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : '-'}</p></div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Actions</h2>
            <div className="space-y-2">
              {ticket.status === 'open' && (
                <button onClick={() => handleStatus('in_progress')} className="w-full rounded-lg bg-primary-600 py-2 text-sm text-white hover:bg-primary-700">Start Working</button>
              )}
              {ticket.status === 'in_progress' && (
                <button onClick={() => handleStatus('resolved')} className="w-full rounded-lg bg-green-600 py-2 text-sm text-white hover:bg-green-700">Resolve</button>
              )}
              {['open', 'in_progress'].includes(ticket.status) && (
                <button onClick={() => handleStatus('closed')} className="w-full rounded-lg border py-2 text-sm hover:bg-gray-50">Close Ticket</button>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Assign</h2>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Current: {ticket.assignee?.name || 'Unassigned'}</p>
              <input value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inputCls} placeholder="Assignee ID" />
              <button onClick={handleAssign} className="w-full rounded-lg border py-2 text-sm hover:bg-gray-50">Assign</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
