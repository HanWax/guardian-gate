import { useState, useMemo } from 'react'
import { useChildren } from '~/lib/queries/children'
import { useChildrenForParent, useAssignParent, useUnassignParent } from '~/lib/queries/children-parents'

interface AssignedChildrenProps {
  parentId: string
}

export function AssignedChildren({ parentId }: AssignedChildrenProps) {
  const { data: assignedChildren, isLoading: isLoadingChildren } = useChildrenForParent(parentId)
  const { data: allChildren } = useChildren()
  const assignMutation = useAssignParent()
  const unassignMutation = useUnassignParent()
  const [childToRemove, setChildToRemove] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter available children (not already assigned)
  const availableChildren = useMemo(() => {
    if (!allChildren || !assignedChildren) return []
    const assignedIds = new Set(assignedChildren.map((c) => c.id))
    return allChildren.filter((c) => !assignedIds.has(c.id))
  }, [allChildren, assignedChildren])

  // Filter by search term
  const filteredChildren = useMemo(() => {
    if (!searchTerm) return availableChildren
    const term = searchTerm.toLowerCase()
    return availableChildren.filter((c) => c.name.toLowerCase().includes(term))
  }, [availableChildren, searchTerm])

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h2 className="text-xl font-semibold mb-4">{"ילדים שהוקצו"}</h2>

      {isLoadingChildren ? (
        <p className="text-gray-500">{"טוען..."}</p>
      ) : assignedChildren && assignedChildren.length > 0 ? (
        <ul className="space-y-2">
          {assignedChildren.map((child) => (
            <li key={child.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
              <span>{child.name}</span>
              <button
                type="button"
                onClick={() => setChildToRemove(child.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                {"הסר"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">{"אין ילדים שהוקצו"}</p>
      )}

      {/* Add child dropdown */}
      <div className="mt-4">
        <label htmlFor="child-search" className="block text-sm font-medium text-gray-700 mb-2">
          {"הוסף ילד"}
        </label>
        <input
          id="child-search"
          type="text"
          placeholder="חפש לפי שם..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
        {searchTerm && filteredChildren.length > 0 && (
          <ul className="mt-2 border border-gray-200 rounded-md max-h-48 overflow-y-auto bg-white shadow-lg">
            {filteredChildren.map((child) => (
              <li key={child.id}>
                <button
                  type="button"
                  onClick={() => {
                    assignMutation.mutate({ childId: child.id, parentId });
                    setSearchTerm('');
                  }}
                  className="w-full text-start px-4 py-2 hover:bg-gray-50"
                >
                  <span className="font-medium">{child.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {searchTerm && filteredChildren.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">{"לא נמצאו ילדים"}</p>
        )}
      </div>

      {/* Confirmation dialog */}
      {childToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{"בטוח שברצונך להסיר?"}</h3>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setChildToRemove(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                {"ביטול"}
              </button>
              <button
                type="button"
                onClick={() => {
                  unassignMutation.mutate(
                    { childId: childToRemove, parentId },
                    {
                      onSuccess: () => {
                        setChildToRemove(null);
                      },
                    }
                  );
                }}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded"
              >
                {"אישור"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
