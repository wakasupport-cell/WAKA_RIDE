import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Copy, Check, Hash, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PAYMENT_METHODS, formatSLL } from '@/lib/constants'
import { Button, Card, Spinner } from '@/components/ui'
import type { Booking, PaymentMethod } from '@/types'

export const PaymentPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('orange_money')
  const [referenceCode, setReferenceCode] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bookingId) return
    const fetch = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()
      if (!error && data) setBooking(data as Booking)
      setIsLoading(false)
    }
    fetch()
  }, [bookingId])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSubmitPayment = async () => {
    if (!referenceCode.trim()) {
      setError('Enter the reference code from your payment.')
      return
    }
    if (!booking) return

    setIsSubmitting(true)
    setError('')

    try {
      // Update booking with payment info
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          payment_method: selectedMethod,
          payment_status: 'submitted',
          payment_reference: referenceCode.trim(),
        })
        .eq('id', booking.id)

      if (bookingError) throw bookingError

      // Create payment record
      const { error: paymentError } = await supabase.from('payments').insert({
        booking_id: booking.id,
        amount: booking.fare_amount,
        currency: 'SLL',
        payment_method: selectedMethod,
        reference_code: referenceCode.trim(),
        status: 'submitted',
      })

      if (paymentError) throw paymentError

      navigate(`/rider/ride/${booking.id}`)
    } catch (err) {
      setError('Failed to submit payment. Please try again.')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">Booking not found.</p>
          <Button onClick={() => navigate('/rider')}>Go Home</Button>
        </div>
      </div>
    )
  }

  const activeMethod = PAYMENT_METHODS.find(m => m.id === selectedMethod)!

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Payment</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-32">
        {/* Ride Summary */}
        <Card className="p-4 mb-6">
          <h3 className="text-white font-semibold mb-3">Ride Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Pickup</span>
              <span className="text-white font-medium text-right max-w-[60%]">
                {booking.pickup_address}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Destination</span>
              <span className="text-white font-medium text-right max-w-[60%]">
                {booking.destination_address}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Distance</span>
              <span className="text-white font-medium">{booking.distance_km} km</span>
            </div>
            <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
              <span className="text-white font-semibold">Total Amount</span>
              <span className="text-amber-400 font-bold text-lg">
                {formatSLL(booking.fare_amount)}
              </span>
            </div>
          </div>
        </Card>

        {/* Payment Method Selection */}
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
          Select Payment Method
        </p>

        <div className="space-y-3 mb-6">
          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedMethod === method.id
            return (
              <motion.button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                whileTap={{ scale: 0.98 }}
                className={`w-full rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-current'
                    : 'border-slate-700 bg-slate-800'
                }`}
                style={isSelected ? {
                  borderColor: method.color,
                  backgroundColor: method.color + '15',
                } : {}}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: method.color + '25' }}
                    >
                      {method.id === 'orange_money' ? '🟠' : method.id === 'afri_money' ? '🔵' : '🟣'}
                    </div>
                    <span
                      className="font-semibold text-base"
                      style={{ color: isSelected ? method.color : '#F8FAFC' }}
                    >
                      {method.label}
                    </span>
                  </div>
                  {isSelected && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: method.color }}
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-slate-400 text-sm mb-3">{method.instructions}</p>

                      <div className="bg-slate-900/50 rounded-xl p-3">
                        <p className="text-slate-500 text-xs mb-1">
                          {method.merchant_id ? 'Merchant ID' : 'Merchant Number'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-mono font-semibold">
                            {method.merchant_id ?? method.merchant_number}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(
                                method.merchant_id ?? method.merchant_number,
                                method.id
                              )
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: method.color + '25',
                              color: method.color,
                            }}
                          >
                            {copiedId === method.id ? (
                              <><Check className="w-3 h-3" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copy</>
                            )}
                          </button>
                        </div>
                        <p
                          className="text-sm font-bold mt-2"
                          style={{ color: method.color }}
                        >
                          Amount to send: {formatSLL(booking.fare_amount)}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>

        {/* Reference Code */}
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-amber-400" />
            <h3 className="text-white font-semibold">Payment Reference Code</h3>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            After sending payment, enter the confirmation/reference code you received.
          </p>
          <input
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-mono"
            placeholder="e.g. OMP1234567890"
            value={referenceCode}
            onChange={(e) => {
              setReferenceCode(e.target.value)
              setError('')
            }}
          />
          {error && (
            <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </Card>

        <p className="text-slate-500 text-xs text-center">
          Your payment will be verified by our team within a few minutes.
        </p>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 p-4"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <Button
          fullWidth
          size="lg"
          isLoading={isSubmitting}
          onClick={handleSubmitPayment}
        >
          Confirm Payment &amp; Book Ride
        </Button>
      </div>
    </div>
  )
}
