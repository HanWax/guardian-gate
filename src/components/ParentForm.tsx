import React, { useState } from 'react'
import { createParentSchema } from '~/lib/parents'
import type { Parent } from '~/lib/parents'
import { formatPhoneDisplay } from '~/lib/parents'

interface ParentFormProps {
  initialData?: Parent
  onSubmit: (data: { name: string; phone: string }) => Promise<void>
  isLoading: boolean
  serverError?: string
}

export function ParentForm({ initialData, onSubmit, isLoading, serverError }: ParentFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [phone, setPhone] = useState(
    initialData ? formatPhoneDisplay(initialData.phone) : ''
  )
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})

    const result = createParentSchema.safeParse({ name, phone })
    if (!result.success) {
      const fieldErrors: { name?: string; phone?: string } = {}
      for (const err of result.error.errors) {
        const field = err.path[0] as 'name' | 'phone'
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    await onSubmit({ name, phone })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {serverError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      <div>
        <label htmlFor="parent-name" className="block text-sm font-medium text-gray-700">
          שם ההורה
        </label>
        <input
          id="parent-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setErrors((prev) => ({ ...prev, name: undefined }))
          }}
          disabled={isLoading}
          placeholder="הזינו שם"
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="parent-phone" className="block text-sm font-medium text-gray-700">
          מספר טלפון
        </label>
        <input
          id="parent-phone"
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            setErrors((prev) => ({ ...prev, phone: undefined }))
          }}
          disabled={isLoading}
          placeholder="05X-XXXXXXX"
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.phone ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.phone && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {errors.phone}
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
