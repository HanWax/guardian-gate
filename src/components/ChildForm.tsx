import React, { useState } from 'react'
import { updateChildSchema } from '~/lib/children'
import type { Child } from '~/lib/children'

interface ChildFormProps {
  initialData?: Child
  onSubmit: (data: { name: string }) => Promise<void>
  isLoading: boolean
}

export function ChildForm({ initialData, onSubmit, isLoading }: ChildFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const result = updateChildSchema.safeParse({ name })
    if (!result.success) {
      setError(result.error.errors[0].message)
      return
    }

    await onSubmit({ name })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div>
        <label htmlFor="child-name" className="block text-sm font-medium text-gray-700">
          שם הילד/ה
        </label>
        <input
          id="child-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          disabled={isLoading}
          placeholder="הזינו שם"
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        {isLoading ? 'שומר...' : 'שמירה'}
      </button>
    </form>
  )
}
