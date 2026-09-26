import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { commissionsAPI } from '../services/api'
import { useToast } from '../components/ui/Toast'
import Stepper from '../components/ui/Stepper'

const STEPS = [
  { title: 'Description', description: 'Tell us about your character' },
  { title: 'Details', description: 'Style and features' },
  { title: 'Files', description: 'Reference images' },
  { title: 'Review', description: 'Confirm details' },
  { title: 'Submit', description: 'Final submission' },
]

const STYLES = [
  { value: 'toony', label: 'Toony', description: 'Cartoon-like, expressive style' },
  { value: 'semi_realistic', label: 'Semi-Realistic', description: 'A blend of realistic and stylized' },
  { value: 'realistic', label: 'Realistic', description: 'Lifelike, detailed features' },
  { value: 'kemono', label: 'Kemono', description: 'Japanese kemono inspired' },
  { value: 'digigrade', label: 'Digigrade', description: 'Digitigrade leg style' },
  { value: 'other', label: 'Other', description: 'Custom style not listed' },
]

const SIZES = [
  { value: 'small', label: 'Small (Youth/Small Adult)' },
  { value: 'medium', label: 'Medium (Average Adult)' },
  { value: 'large', label: 'Large (Larger Adult)' },
  { value: 'custom', label: 'Custom Measurement' },
]

const SPECIES_OPTIONS = [
  { value: 'fur', label: 'Fur', icon: '🦊' },
  { value: 'scalie', label: 'Scalie', icon: '🐉' },
  { value: 'avian', label: 'Avian', icon: '🦅' },
  { value: 'equine', label: 'Equine', icon: '🐴' },
  { value: 'other', label: 'Other', icon: '✨' },
]

export default function CommissionWizardPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [files, setFiles] = useState([])
  const [autoSaved, setAutoSaved] = useState(false)
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(false)
  const autoSaveTimer = useRef(null)

  const [form, setForm] = useState({
    character_name: '',
    species: '',
    character_description: '',
    color_palette: '',
    style: '',
    custom_style: '',
    size: '',
    features: [],
    jaw_type: '',
    eye_type: '',
    ear_type: '',
    tongue: false,
    extra_tongue: false,
    breathing_vents: false,
    moving_eyes: false,
    led_eyes: false,
    glasses: false,
    custom_features: '',
    budget: '',
    deadline: '',
    additional_notes: '',
  })

  const autoSave = useCallback(async () => {
    if (!form.character_name) return
    try {
      await commissionsAPI.saveDraft({
        ...form,
        budget: form.budget ? Math.round(parseFloat(form.budget) * 100) : null,
      })
      setAutoSaved(true)
      setTimeout(() => setAutoSaved(false), 3000)
    } catch {
      // silent fail for auto-save
    }
  }, [form])

  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      autoSave()
    }, 30000)
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
    }
  }, [autoSave])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  const toggleFeature = (feature) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }))
  }

  const handleFileChange = (e) => {
    const newFiles = [...e.target.files].filter((f) => f.size <= 10 * 1024 * 1024)
    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length))
  const prev = () => setStep((s) => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    if (!copyrightConfirmed) {
      toast.error('Please confirm the copyright declaration before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        character_name: form.character_name,
        character_species: form.species,
        description: form.character_description || form.additional_notes || '',
        color_palette: form.color_palette,
        style: form.style === 'other' ? form.custom_style : form.style,
        size: form.size,
        features: form.features,
        jaw_type: form.jaw_type,
        eye_type: form.eye_type,
        ear_type: form.ear_type,
        options: {
          tongue: form.tongue,
          extra_tongue: form.extra_tongue,
          breathing_vents: form.breathing_vents,
          moving_eyes: form.moving_eyes,
          led_eyes: form.led_eyes,
          glasses: form.glasses,
        },
        budget_min_cents: form.budget ? Math.round(parseFloat(form.budget) * 100) : null,
        budget_max_cents: form.budget ? Math.round(parseFloat(form.budget) * 100) : null,
        deadline_date: form.deadline || null,
        additional_notes: form.additional_notes,
        copyright_declaration: 'I confirm I own the rights to all reference materials uploaded, or have obtained permission from the copyright holder.',
      }

      const res = await commissionsAPI.create(payload)
      const commissionId = res.data.data?.id

      if (files.length > 0 && commissionId) {
        for (const file of files) {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('type', 'reference')
          await commissionsAPI.submit(commissionId, fd)
        }
      }

      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
      toast.success('Commission submitted successfully!')
      navigate('/me/commissions')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit commission')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-custom py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-900">New Commission</h1>
        {autoSaved && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Draft saved</span>
        )}
      </div>
      <p className="text-gray-600 mb-6">Fill out the form below to start your custom fursuit head commission.</p>

      <div className="mb-8 overflow-x-auto pb-2">
        <Stepper steps={STEPS} currentStep={step} />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
        <h2 className="text-xl font-semibold mb-1">{STEPS[step - 1].title}</h2>
        <p className="text-gray-500 text-sm mb-6">{STEPS[step - 1].description}</p>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Character Name *</label>
              <input
                name="character_name"
                value={form.character_name}
                onChange={handleChange}
                required
                className="input-field min-h-[44px]"
                placeholder="e.g. Blaze"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Species</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {SPECIES_OPTIONS.map((sp) => (
                  <button
                    key={sp.value}
                    type="button"
                    onClick={() => setForm({ ...form, species: sp.value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all min-h-[72px] ${
                      form.species === sp.value
                        ? 'border-primary bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{sp.icon}</span>
                    <span className="text-xs font-medium text-gray-700">{sp.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Character Description</label>
              <textarea
                name="character_description"
                value={form.character_description}
                onChange={handleChange}
                rows={4}
                className="input-field"
                placeholder="Describe your character's personality, appearance, colors, markings..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color Palette</label>
              <input
                name="color_palette"
                value={form.color_palette}
                onChange={handleChange}
                className="input-field min-h-[44px]"
                placeholder="e.g. Orange, white, black markings"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Style *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm({ ...form, style: s.value })}
                    className={`text-left p-4 rounded-xl border-2 transition-all min-h-[44px] ${
                      form.style === s.value
                        ? 'border-primary bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{s.label}</span>
                    <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                  </button>
                ))}
              </div>
              {form.style === 'other' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Describe Your Preferred Style</label>
                  <input
                    name="custom_style"
                    value={form.custom_style}
                    onChange={handleChange}
                    className="input-field min-h-[44px]"
                    placeholder="Describe the style you want..."
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Head Size *</label>
              <div className="grid grid-cols-2 gap-3">
                {SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm({ ...form, size: s.value })}
                    className={`p-3 rounded-xl border-2 text-left text-sm min-h-[44px] ${
                      form.size === s.value
                        ? 'border-primary bg-purple-50 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['Moving Jaw', 'Follow Me Eyes', 'LED Eyes', 'Glasses', 'Tongue', 'Breathing Vents'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFeature(f)}
                    className={`p-3 rounded-lg border text-sm text-left min-h-[44px] ${
                      form.features.includes(f)
                        ? 'border-primary bg-purple-50 text-primary font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jaw Type</label>
                <select name="jaw_type" value={form.jaw_type} onChange={handleChange} className="input-field min-h-[44px]">
                  <option value="">Default</option>
                  <option value="moving">Moving</option>
                  <option value="fixed">Fixed</option>
                  <option value="magnetic">Magnetic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eye Type</label>
                <select name="eye_type" value={form.eye_type} onChange={handleChange} className="input-field min-h-[44px]">
                  <option value="">Default</option>
                  <option value="follow_me">Follow Me</option>
                  <option value="led">LED</option>
                  <option value="static">Static</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ear Type</label>
                <select name="ear_type" value={form.ear_type} onChange={handleChange} className="input-field min-h-[44px]">
                  <option value="">Default</option>
                  <option value="posable">Posable</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget (NZD)</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">$</span>
                <input
                  name="budget"
                  type="number"
                  value={form.budget}
                  onChange={handleChange}
                  className="input-field pl-8 min-h-[44px]"
                  placeholder="e.g. 2000"
                  min="0"
                  step="100"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Enter your maximum budget. We'll provide a quote based on your specifications.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Deadline</label>
              <input
                name="deadline"
                type="date"
                value={form.deadline}
                onChange={handleChange}
                className="input-field min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
              <textarea
                name="additional_notes"
                value={form.additional_notes}
                onChange={handleChange}
                rows={4}
                className="input-field"
                placeholder="Any other details, questions, or special requests..."
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reference Images</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-gray-600 font-medium">Click to upload reference images</p>
                  <p className="text-gray-400 text-sm mt-1">PNG, JPG, GIF up to 10MB each</p>
                </label>
              </div>
            </div>
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden shrink-0">
                        {file.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">📄</div>
                        )}
                      </div>
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {(file.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-red-500 hover:text-red-700 text-sm min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">
              Reference images help us understand your character design. You can also submit them later through your commission page.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-gray-900">Character Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <p className="font-medium">{form.character_name || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Species:</span>
                  <p className="font-medium">{SPECIES_OPTIONS.find((s) => s.value === form.species)?.label || '-'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Description:</span>
                  <p className="font-medium">{form.character_description || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Color Palette:</span>
                  <p className="font-medium">{form.color_palette || '-'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-gray-900">Style & Size</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Style:</span>
                  <p className="font-medium">{STYLES.find((s) => s.value === form.style)?.label || form.custom_style || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Size:</span>
                  <p className="font-medium">{SIZES.find((s) => s.value === form.size)?.label || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Budget:</span>
                  <p className="font-medium">{form.budget ? `$${form.budget} NZD` : '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Deadline:</span>
                  <p className="font-medium">{form.deadline || '-'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Features:</span>
                  <p className="font-medium">{form.features.length > 0 ? form.features.join(', ') : 'None selected'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-gray-900">Reference Files ({files.length})</h3>
              {files.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {files.map((file, i) => (
                    <div key={i} className="relative group">
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                        {file.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">📄</div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate max-w-[80px]">{file.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No files uploaded</p>
              )}
            </div>

            <div className="bg-amber-50 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyrightConfirmed}
                  onChange={(e) => setCopyrightConfirmed(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Copyright Declaration</p>
                  <p className="text-gray-600 mt-1">
                    I confirm I own the rights to all reference materials uploaded, or have obtained permission from the copyright holder to use them for this commission.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-gray-900">Ready to Submit</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Please review your commission details on the previous step. Once submitted, our team will review your request and provide a quote.
            </p>
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-left max-w-md mx-auto">
              <p className="font-medium text-blue-900 mb-1">What happens next?</p>
              <ul className="space-y-1 text-blue-800">
                <li>1. Our team reviews your commission request</li>
                <li>2. We provide a detailed quote</li>
                <li>3. You approve the quote and pay a deposit</li>
                <li>4. We begin crafting your custom head</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t">
          <button
            type="button"
            onClick={prev}
            disabled={step === 1}
            className="btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {step < STEPS.length ? (
            <button type="button" onClick={next} className="btn-primary btn-sm">
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !form.character_name || !copyrightConfirmed}
              className="btn-accent btn-sm disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Commission'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
