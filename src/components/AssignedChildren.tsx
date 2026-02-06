import { useEffect, useState, useCallback } from 'react'
import { getAssignedChildren, type Child } from '~/lib/children-parents'
import { ChildAssignmentMultiSelect } from './ChildAssignmentMultiSelect'

interface AssignedChildrenProps {
  parentId: string
}

export function AssignedChildren({ parentId }: AssignedChildrenProps) {
  const [children, setChildren] = useState<Child[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const fetchChildren = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getAssignedChildren(parentId)
      setChildren(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת ילדים')
    } finally {
      setIsLoading(false)
    }
  }, [parentId])

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  const handleSave = () => {
    setIsEditing(false)
    fetchChildren()
  }

  if (isLoading) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">ילדים משוייכים</h2>
        <p className="text-gray-500">טוען...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">ילדים משוייכים</h2>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">ילדים משוייכים</h2>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          {isEditing ? 'ביטול' : 'עריכה'}
        </button>
      </div>

      {isEditing ? (
        <ChildAssignmentMultiSelect
          parentId={parentId}
          assignedChildIds={children.map((c) => c.id)}
          onSave={handleSave}
        />
      ) : (
        <>
          {children.length === 0 ? (
            <p className="text-gray-500">אין ילדים משוייכים להורה זה</p>
          ) : (
            <ul className="space-y-2">
              {children.map((child) => (
                <li key={child.id} className="p-3 bg-gray-50 rounded-md">
                  {child.name}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
