import { useState, useRef, useEffect, type FormEvent, type Ref } from 'react'
import { Link } from '@tanstack/react-router'
import { teacherCreateSchema } from '~/lib/schemas/teacher'
import type { Teacher } from '~/lib/database.types'

interface TeacherFormProps {
  teacher?: Teacher
  nurseryId: string
  onSubmit: (data: { name: string; phone: string; nursery_id: string }) => void
  isPending: boolean
  serverError?: string | null
}

export function TeacherForm({ teacher, nurseryId, onSubmit, isPending, serverError }: TeacherFormProps) {
  const isEdit = !!teacher
  const [name, setName] = useState(teacher?.name ?? '')
  const [phone, setPhone] = useState(teacher?.phone ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstInputRef.current?.focus() }, [])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const nid = teacher?.nursery_id ?? nurseryId
    const result = teacherCreateSchema.safeParse({ name, phone, nursery_id: nid })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        if (!fieldErrors[field]) fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    onSubmit({ name: name.trim(), phone: phone.trim(), nursery_id: nid })
  }

  function clearError(field: string) {
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
  }

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'עריכת מורה' : 'הוספת מורה'}
      </h1>

      {serverError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field id="name" label="שם" value={name}
          onChange={(v) => { setName(v); clearError('name') }}
          error={errors.name} required inputRef={firstInputRef} disabled={isPending} />

        <Field id="phone" label="טלפון" type="tel" value={phone}
          onChange={(v) => { setPhone(v); clearError('phone') }}
          error={errors.phone} required disabled={isPending} dir="ltr" placeholder="050-1234567" />

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isPending}
            className="bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {isPending ? (isEdit ? 'שומר...' : 'יוצר...') : (isEdit ? 'שמירה' : 'יצירת מורה')}
          </button>
          <Link to="/teachers"
            className="px-5 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            ביטול
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({ id, label, type = 'text', value, onChange, error, required, disabled, inputRef, dir, placeholder }: {
  id: string; label: string; type?: 'text' | 'tel'; value: string; onChange: (v: string) => void
  error?: string; required?: boolean; disabled?: boolean; inputRef?: Ref<HTMLInputElement>
  dir?: 'ltr' | 'rtl'; placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ms-1">*</span>}
      </label>
      <input ref={inputRef} id={id} name={id} type={type} value={value}
        onChange={(e) => onChange(e.target.value)} disabled={disabled} dir={dir} placeholder={placeholder}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  )
}
