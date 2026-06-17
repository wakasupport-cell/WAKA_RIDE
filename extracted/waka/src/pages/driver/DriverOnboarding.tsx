import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ChevronRight, ChevronLeft, Check, Camera, Car, FileText } from 'lucide-react'
import { supabase, uploadFile } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, WakaLogo } from '@/components/ui'
import type { VehicleType } from '@/types'

interface OnboardingData {
  // Personal
  phone: string
  license_number: string
  national_id_number: string
  // Documents
  license_doc: File | null
  national_id_doc: File | null
  driver_photo: File | null
  // Vehicle
  vehicle_type: VehicleType
  make: string
  model: string
  year: string
  color: string
  plate_number: string
  registration_number: string
  vehicle_photo: File | null
}

const STEPS = [
  { id: 1, title: 'Personal Info', icon: FileText },
  { id: 2, title: 'Documents', icon: Upload },
  { id: 3, title: 'Vehicle', icon: Car },
  { id: 4, title: 'Review', icon: Check },
]

export const DriverOnboarding = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [data, setData] = useState<OnboardingData>({
    phone: profile?.phone ?? '',
    license_number: '',
    national_id_number: '',
    license_doc: null,
    national_id_doc: null,
    driver_photo: null,
    vehicle_type: 'taxi',
    make: '',
    model: '',
    year: '',
    color: '',
    plate_number: '',
    registration_number: '',
    vehicle_photo: null,
  })

  const update = (key: keyof OnboardingData, value: unknown) =>
    setData((prev) => ({ ...prev, [key]: value }))

  const handleFileChange = (key: keyof OnboardingData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) update(key, file)
  }

  const FileUploadField = ({
    label, fileKey, accept = 'image/*', description
  }: {
    label: string
    fileKey: keyof OnboardingData
    accept?: string
    description?: string
  }) => {
    const file = data[fileKey] as File | null
    return (
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
        {description && <p className="text-slate-500 text-xs mb-2">{description}</p>}
        <label className={`
          flex flex-col items-center justify-center w-full h-32
          border-2 border-dashed rounded-2xl cursor-pointer transition-all
          ${file ? 'border-green-500 bg-green-500/10' : 'border-slate-600 bg-slate-800 hover:border-amber-500'}
        `}>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange(fileKey)}
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <Check className="w-8 h-8 text-green-400" />
              <p className="text-green-400 text-sm font-medium">{file.name}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Upload className="w-8 h-8" />
              <p className="text-sm">Tap to upload</p>
            </div>
          )}
        </label>
      </div>
    )
  }

  const validateStep = (): boolean => {
    setError('')
    if (step === 1) {
      if (!data.phone || !data.license_number || !data.national_id_number) {
        setError('Please fill in all fields.')
        return false
      }
    }
    if (step === 2) {
      if (!data.license_doc || !data.national_id_doc || !data.driver_photo) {
        setError('Please upload all required documents.')
        return false
      }
    }
    if (step === 3) {
      if (!data.make || !data.model || !data.year || !data.color || !data.plate_number || !data.registration_number) {
        setError('Please fill in all vehicle details.')
        return false
      }
      if (!data.vehicle_photo) {
        setError('Please upload a vehicle photo.')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, 4))
  }

  const handleSubmit = async () => {
    if (!profile) return
    setIsSubmitting(true)
    setError('')

    try {
      const uid = profile.id

      // Upload documents to Supabase Storage
      const [licenseUrl, nationalIdUrl, driverPhotoUrl, vehiclePhotoUrl] = await Promise.all([
        data.license_doc
          ? uploadFile('driver-documents', `${uid}/license.${data.license_doc.name.split('.').pop()}`, data.license_doc)
          : Promise.resolve(null),
        data.national_id_doc
          ? uploadFile('driver-documents', `${uid}/national-id.${data.national_id_doc.name.split('.').pop()}`, data.national_id_doc)
          : Promise.resolve(null),
        data.driver_photo
          ? uploadFile('driver-photos', `${uid}/photo.${data.driver_photo.name.split('.').pop()}`, data.driver_photo)
          : Promise.resolve(null),
        data.vehicle_photo
          ? uploadFile('vehicle-photos', `${uid}/vehicle.${data.vehicle_photo.name.split('.').pop()}`, data.vehicle_photo)
          : Promise.resolve(null),
      ])

      // Update profile phone
      await supabase.from('profiles').update({ phone: data.phone }).eq('id', uid)

      // Create driver record
      const { data: driverRecord, error: driverError } = await supabase.from('drivers').insert({
        profile_id: uid,
        license_number: data.license_number,
        national_id_number: data.national_id_number,
        license_doc_url: licenseUrl,
        national_id_doc_url: nationalIdUrl,
        driver_photo_url: driverPhotoUrl,
        status: 'pending_approval',
      }).select().single()

      if (driverError) throw driverError

      // Create vehicle record
      const { error: vehicleError } = await supabase.from('vehicles').insert({
        driver_id: driverRecord.id,
        vehicle_type: data.vehicle_type,
        make: data.make,
        model: data.model,
        year: parseInt(data.year),
        color: data.color,
        plate_number: data.plate_number.toUpperCase(),
        registration_number: data.registration_number,
        vehicle_photo_url: vehiclePhotoUrl,
      })

      if (vehicleError) throw vehicleError

      navigate('/driver')
    } catch (err) {
      console.error(err)
      setError('Submission failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <WakaLogo size="md" className="mb-4" />
        <h1 className="text-2xl font-bold text-white mb-1">Driver Registration</h1>
        <p className="text-slate-400 text-sm">Complete all steps to start earning</p>
      </div>

      {/* Step Indicators */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step > s.id ? 'bg-green-500 text-white' : step === s.id ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'}
              `}>
                {step > s.id ? <Check className="w-4 h-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${step > s.id ? 'bg-green-500' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-amber-400 text-sm font-medium mt-2">{STEPS[step - 1].title}</p>
      </div>

      {/* Step Content */}
      <div className="px-4 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 1: Personal */}
            {step === 1 && (
              <div className="space-y-4">
                <Input label="Phone Number" placeholder="076 123 456" value={data.phone}
                  onChange={(e) => update('phone', e.target.value)} type="tel" />
                <Input label="Driver License Number" placeholder="SL-DL-123456" value={data.license_number}
                  onChange={(e) => update('license_number', e.target.value)} />
                <Input label="National ID Number" placeholder="NP-123456789" value={data.national_id_number}
                  onChange={(e) => update('national_id_number', e.target.value)} />
              </div>
            )}

            {/* Step 2: Documents */}
            {step === 2 && (
              <div className="space-y-5">
                <FileUploadField
                  label="Driver License (Front)"
                  fileKey="license_doc"
                  accept="image/*,.pdf"
                  description="Upload a clear photo of your driver's license"
                />
                <FileUploadField
                  label="National ID"
                  fileKey="national_id_doc"
                  accept="image/*,.pdf"
                  description="Upload a clear photo of your national ID"
                />
                <FileUploadField
                  label="Your Photo"
                  fileKey="driver_photo"
                  accept="image/*"
                  description="Clear headshot photo of yourself"
                />
              </div>
            )}

            {/* Step 3: Vehicle */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Vehicle Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Vehicle Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['keke', 'taxi', 'premium'] as VehicleType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => update('vehicle_type', type)}
                        className={`py-3 rounded-xl border-2 transition-all text-center ${
                          data.vehicle_type === type
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-slate-700 bg-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-2xl mb-1">
                          {type === 'keke' ? '🛺' : type === 'taxi' ? '🚕' : '🚙'}
                        </div>
                        <span className="text-xs font-medium capitalize">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input label="Make" placeholder="Toyota" value={data.make}
                    onChange={(e) => update('make', e.target.value)} />
                  <Input label="Model" placeholder="Corolla" value={data.model}
                    onChange={(e) => update('model', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Year" placeholder="2018" type="number" value={data.year}
                    onChange={(e) => update('year', e.target.value)} />
                  <Input label="Color" placeholder="Silver" value={data.color}
                    onChange={(e) => update('color', e.target.value)} />
                </div>
                <Input label="Plate Number" placeholder="AAB 1234" value={data.plate_number}
                  onChange={(e) => update('plate_number', e.target.value)} />
                <Input label="Registration Number" placeholder="REG-123456" value={data.registration_number}
                  onChange={(e) => update('registration_number', e.target.value)} />
                <FileUploadField
                  label="Vehicle Photo"
                  fileKey="vehicle_photo"
                  accept="image/*"
                  description="Clear photo of your vehicle"
                />
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                  <p className="text-amber-400 font-semibold mb-1">Ready to submit</p>
                  <p className="text-slate-400 text-sm">
                    Your application will be reviewed by our team within 24 hours.
                    You'll be notified once approved.
                  </p>
                </div>

                <div className="bg-slate-800 rounded-2xl p-4 space-y-2 text-sm">
                  <h3 className="text-white font-semibold mb-3">Summary</h3>
                  {[
                    { label: 'License No.', value: data.license_number },
                    { label: 'National ID', value: data.national_id_number },
                    { label: 'Vehicle', value: `${data.year} ${data.make} ${data.model}` },
                    { label: 'Plate', value: data.plate_number.toUpperCase() },
                    { label: 'Type', value: data.vehicle_type },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-white font-medium capitalize">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 p-4"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              variant="secondary"
              onClick={() => setStep((s) => s - 1)}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              fullWidth={step === 1}
              className="flex-1"
              onClick={handleNext}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          ) : (
            <Button
              className="flex-1"
              isLoading={isSubmitting}
              onClick={handleSubmit}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Submit Application
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
