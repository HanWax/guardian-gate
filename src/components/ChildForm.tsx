import { useState, useMemo, type FormEvent } from 'react'
import { childCreateSchema, childUpdateSchema } from '~/lib/schemas/child'
import { useAuth } from '~/lib/auth-context'
import { useNurseries } from '~/lib/queries/nurseries'
import type { Database } from '~/lib/database.types'

type Child = Database['public']['Tables']['children']['Row']
type Parent = Database['public']['Tables']['parents']['Row']

interface ChildFormProps {
  initialData?: Child
  onSubmit: (data: { name: string; nursery_id?: string; parent_ids?: string[] }) => void
  isPending: boolean
  serverError?: string | null
  availableParents?: Parent[]
  isLoadingParents?: boolean
}

export function ChildForm({ initialData, onSubmit, isPending, serverError, availableParents, isLoadingParents }: ChildFormProps) {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const nurseriesQuery = useNurseries()
  const isCreateMode = !initialData

  const [name, setName] = useState(initialData?.name ?? '')
  const [nurseryId, setNurseryId] = useState(initialData?.nursery_id ?? '')
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([])
  const [parentSearch, setParentSearch] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedParents = useMemo(() => {
    if (!availableParents) return []
    return availableParents.filter((p) => selectedParentIds.includes(p.id))
  }, [availableParents, selectedParentIds])

  const filteredParents = useMemo(() => {
    if (!availableParents || !parentSearch) return []
    const term = parentSearch.toLowerCase()
    return availableParents
      .filter((p) => !selectedParentIds.includes(p.id))
      .filter((p) => p.name.toLowerCase().includes(term) || p.phone.toLowerCase().includes(term))
  }, [availableParents, parentSearch, selectedParentIds])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})

    const payload = isAdmin
      ? { name, nursery_id: nurseryId || undefined, ...(isCreateMode ? { parent_ids: selectedParentIds } : {}) }
      : { name, ...(isCreateMode ? { parent_ids: selectedParentIds } : {}) }

    const schema = initialData ? childUpdateSchema : childCreateSchema
    const result = schema.safeParse(payload)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.errors) {
        const key = issue.path[0]?.toString() ?? 'general'
        fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    if (isAdmin && !initialData && !nurseryId) {
      setErrors({ nursery_id: 'יש לבחור גן' })
      return
    }

    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {serverError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      {isAdmin && !initialData && (
        <div>
          <label htmlFor="nursery-id" className="block text-sm font-medium text-gray-700">
            גן
          </label>
          <select
            id="nursery-id"
            value={nurseryId}
            onChange={(e) => { setNurseryId(e.target.value); setErrors((prev) => { const { nursery_id: _, ...rest } = prev; return rest }) }}
            disabled={isPending || nurseriesQuery.isLoading}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.nursery_id ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">בחר גן</option>
            {nurseriesQuery.data?.map((nursery) => (
              <option key={nursery.id} value={nursery.id}>
                {nursery.name}
              </option>
            ))}
          </select>
          {errors.nursery_id && <p className="mt-2 text-sm text-red-600" role="alert">{errors.nursery_id}</p>}
        </div>
      )}

      <div>
        <label htmlFor="child-name" className="block text-sm font-medium text-gray-700">
          שם הילד/ה
        </label>
        <input id="child-name" type="text" value={name}
          onChange={(e) => { setName(e.target.value); setErrors((prev) => { const { name: _, ...rest } = prev; return rest }) }}
          disabled={isPending} placeholder="הזינו שם"
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`} />
        {errors.name && <p className="mt-2 text-sm text-red-600" role="alert">{errors.name}</p>}
      </div>

      {isCreateMode && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {"הורים"}
          </label>

          {/* Selected parents as chips */}
          {selectedParents.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedParents.map((parent) => (
                <span key={parent.id} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                  {parent.name}
                  <button
                    type="button"
                    onClick={() => setSelectedParentIds((ids) => ids.filter((id) => id !== parent.id))}
                    className="text-indigo-600 hover:text-indigo-900 font-bold"
                    aria-label={`הסר ${parent.name}`}
                  >
                    {"\u00D7"}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <input
            type="text"
            placeholder={"חפש הורה לפי שם או טלפון..."}
            value={parentSearch}
            onChange={(e) => setParentSearch(e.target.value)}
            disabled={isPending || isLoadingParents}
            className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.parent_ids ? 'border-red-500' : 'border-gray-300'
            }`}
          />

          {/* Search results dropdown */}
          {parentSearch && filteredParents.length > 0 && (
            <ul className="mt-2 border border-gray-200 rounded-md max-h-48 overflow-y-auto bg-white shadow-lg">
              {filteredParents.map((parent) => (
                <li key={parent.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParentIds((ids) => [...ids, parent.id])
                      setParentSearch('')
                      setErrors((prev) => { const { parent_ids: _, ...rest } = prev; return rest })
                    }}
                    className="w-full text-start px-4 py-2 hover:bg-gray-50 flex flex-col"
                  >
                    <span className="font-medium">{parent.name}</span>
                    <span className="text-sm text-gray-500">{parent.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {parentSearch && filteredParents.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">{"לא נמצאו הורים"}</p>
          )}

          {isLoadingParents && (
            <p className="mt-2 text-sm text-gray-500">{"טוען הורים..."}</p>
          )}

          {errors.parent_ids && <p className="mt-2 text-sm text-red-600" role="alert">{errors.parent_ids}</p>}
        </div>
      )}

      <button type="submit" disabled={isPending}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
          isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
        }`}>
        {isPending ? 'שומר...' : 'שמירה'}
      </button>
    </form>
  )
}
