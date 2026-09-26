import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { rolesAPI } from '../services/api'

export default function RoleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [role, setRole] = useState(null)
  const [allPermissions, setAllPermissions] = useState([])
  const [selectedPerms, setSelectedPerms] = useState(new Set())
  const [originalPerms, setOriginalPerms] = useState(new Set())
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      rolesAPI.get(id),
      rolesAPI.permissions(),
    ]).then(([r, p]) => {
      const roleData = r.data?.data
      setRole(roleData)
      setName(roleData.name || '')
      setDescription(roleData.description || '')
      const perms = p.data?.data || []
      setAllPermissions(perms)
      const ids = (roleData.permissions || []).map((perm) => typeof perm === 'string' ? perm : perm.id)
      setSelectedPerms(new Set(ids))
      setOriginalPerms(new Set(ids))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const grouped = useMemo(() => {
    return allPermissions.reduce((acc, perm) => {
      const mod = perm.module || perm.group || 'General'
      if (!acc[mod]) acc[mod] = []
      acc[mod].push(perm)
      return acc
    }, {})
  }, [allPermissions])

  const permColumns = useMemo(() => {
    const actions = new Set()
    allPermissions.forEach((p) => {
      const action = p.action || p.name?.split('.').pop() || 'access'
      actions.add(action)
    })
    return [...actions].sort()
  }, [allPermissions])

  const diff = useMemo(() => {
    const added = [...selectedPerms].filter((p) => !originalPerms.has(p))
    const removed = [...originalPerms].filter((p) => !selectedPerms.has(p))
    return { added, removed }
  }, [selectedPerms, originalPerms])

  const togglePerm = (permId) => {
    if (role?.is_system) return
    setSelectedPerms((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return next
    })
  }

  const toggleModule = (perms) => {
    if (role?.is_system) return
    setSelectedPerms((prev) => {
      const next = new Set(prev)
      const allSelected = perms.every((p) => next.has(p.id))
      perms.forEach((p) => {
        if (allSelected) next.delete(p.id)
        else next.add(p.id)
      })
      return next
    })
  }

  const toggleColumn = (action) => {
    if (role?.is_system) return
    const colPerms = allPermissions.filter((p) => {
      const act = p.action || p.name?.split('.').pop() || 'access'
      return act === action
    })
    const allSelected = colPerms.every((p) => selectedPerms.has(p.id))
    setSelectedPerms((prev) => {
      const next = new Set(prev)
      colPerms.forEach((p) => {
        if (allSelected) next.delete(p.id)
        else next.add(p.id)
      })
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await rolesAPI.update(id, {
        name,
        description,
        permissions: [...selectedPerms],
      })
      navigate('/roles')
    } catch {} finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>
  if (!role) return <div className="py-20 text-center text-red-400">Role not found</div>

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/roles')} className="text-gray-400 hover:text-gray-600">&larr; Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Role</h1>
        {role.is_system && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">System Role - Read Only</span>
        )}
      </div>

      <div className="mb-6 rounded-xl bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={role.is_system}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={role.is_system}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Permissions Matrix</h2>
        {Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-gray-400">No permissions available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase text-gray-500">Module</th>
                  {permColumns.map((col) => (
                    <th key={col} className="pb-2 px-2 text-center text-xs font-semibold uppercase text-gray-500">
                      <button
                        onClick={() => toggleColumn(col)}
                        disabled={role.is_system}
                        className="hover:text-primary-600 disabled:cursor-not-allowed"
                      >
                        {col}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([module, perms]) => {
                  const allChecked = perms.every((p) => selectedPerms.has(p.id))
                  return (
                    <tr key={module} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={() => toggleModule(perms)}
                            disabled={role.is_system}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 disabled:cursor-not-allowed"
                          />
                          <span className="font-medium text-gray-700 uppercase">{module}</span>
                        </div>
                      </td>
                      {permColumns.map((action) => {
                        const matchingPerm = perms.find((p) => {
                          const act = p.action || p.name?.split('.').pop() || 'access'
                          return act === action
                        })
                        return (
                          <td key={action} className="py-3 px-2 text-center">
                            {matchingPerm ? (
                              <input
                                type="checkbox"
                                checked={selectedPerms.has(matchingPerm.id)}
                                onChange={() => togglePerm(matchingPerm.id)}
                                disabled={role.is_system}
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 disabled:cursor-not-allowed"
                              />
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diff Preview */}
      {!role.is_system && (diff.added.length > 0 || diff.removed.length > 0) && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="mb-3 text-sm font-semibold text-amber-800">Permission Changes Preview</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {diff.added.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-green-700">Adding ({diff.added.length})</p>
                <div className="space-y-1">
                  {diff.added.map((permId) => {
                    const perm = allPermissions.find((p) => p.id === permId)
                    return (
                      <div key={permId} className="flex items-center gap-2 rounded bg-green-50 px-2 py-1 text-xs text-green-700">
                        <span className="text-green-500">+</span>
                        {perm?.name || perm?.description || permId}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {diff.removed.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-red-700">Removing ({diff.removed.length})</p>
                <div className="space-y-1">
                  {diff.removed.map((permId) => {
                    const perm = allPermissions.find((p) => p.id === permId)
                    return (
                      <div key={permId} className="flex items-center gap-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                        <span className="text-red-500">-</span>
                        {perm?.name || perm?.description || permId}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={() => navigate('/roles')} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving || role.is_system}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
