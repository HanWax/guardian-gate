import { useState, useEffect } from 'react'
import { useChildren } from '~/lib/queries/children'
import { assignChildToParent, removeChildFromParent } from '~/lib/children-parents'

interface ChildAssignmentMultiSelectProps {
  parentId: string
  assignedChildIds: string[]
  onSave: () => void
}

export function ChildAssignmentMultiSelect({
  parentId,
  assignedChildIds,
  onSave,
}: ChildAssignmentMultiSelectProps) {
  const { data: allChildren, isLoading } = useChildren()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(assignedChildIds))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Update selected IDs when assigned children change
  useEffect(() => {
    setSelectedIds(new Set(assignedChildIds))
  }, [assignedChildIds])

  const handleToggle = (childId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(childId)) {
        next.delete(childId)
      } else {
        next.add(childId)
      }
      return next
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const originalIds = new Set(assignedChildIds)
      const currentIds = selectedIds

      // Calculate diff
      const toAdd = [...currentIds].filter((id) => !originalIds.has(id))
      const toRemove = [...originalIds].filter((id) => !currentIds.has(id))

      // Add new assignments
      for (const childId of toAdd) {
        await assignChildToParent(parentId, childId)
      }

      // Remove old assignments
      for (const childId of toRemove) {
        await removeChildFromParent(parentId, childId)
      }

      setSuccessMessage('השיוכים נשמרו בהצלחה')
      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת השיוכים')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <p className="text-gray-500">טוען רשימת ילדים...</p>
  }

  if (!allChildren || allChildren.length === 0) {
    return <p className="text-gray-500">אין ילדים זמינים</p>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-4">
        {allChildren.map((child) => (
          <label
            key={child.id}
            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(child.id)}
              onChange={() => handleToggle(child.id)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="flex-1">{child.name}</span>
          </label>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">
          {successMessage}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'שומר...' : 'שמור'}
        </button>
      </div>
    </div>
  )
}
