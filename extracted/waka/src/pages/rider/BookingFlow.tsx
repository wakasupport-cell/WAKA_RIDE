import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import { ArrowLeft, MapPin, Navigation, Search, Clock, ChevronRight } from 'lucide-react'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { calculateFares, calculateDistance, VEHICLE_CONFIG, formatSLL } from '@/lib/constants'
import { Button, Spinner, Card } from '@/components/ui'
import type { VehicleType, FareEstimate, LocationResult } from '@/types'

const FREETOWN: [number, number] = [8.4657, -13.2317]

// Map icons
const pickupIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;background:#22C55E;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const destIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;background:#F59E0B;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 20],
})

// Nominatim geocoding for Freetown/Sierra Leone
const searchLocation = async (query: string): Promise<LocationResult[]> => {
  if (query.length < 3) return []
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' Freetown Sierra Leone')}&format=json&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    return data.map((item: { display_name: string; lat: string; lon: string }) => ({
      address: item.display_name.split(',').slice(0, 3).join(', '),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }))
  } catch {
    return []
  }
}

// Freetown neighborhoods for quick select
const FREETOWN_LOCATIONS: LocationResult[] = [
  { address: 'Congo Cross, Freetown', lat: 8.4724, lng: -13.2344 },
  { address: 'Brookfields, Freetown', lat: 8.4778, lng: -13.2281 },
  { address: 'Aberdeen, Freetown', lat: 8.4856, lng: -13.2619 },
  { address: 'Wilberforce, Freetown', lat: 8.4589, lng: -13.2419 },
  { address: 'Lumley, Freetown', lat: 8.4698, lng: -13.2714 },
  { address: 'Tengbeh Town, Freetown', lat: 8.4731, lng: -13.2503 },
  { address: 'Murray Town, Freetown', lat: 8.4817, lng: -13.2503 },
  { address: 'Goderich, Freetown', lat: 8.4500, lng: -13.3000 },
  { address: 'Waterloo, Freetown', lat: 8.3400, lng: -13.0700 },
  { address: 'Kissy, Freetown', lat: 8.4556, lng: -13.1847 },
]

type Step = 'pickup' | 'destination' | 'vehicle' | 'confirm'

const MapUpdater = ({ pickup, destination }: { pickup: LocationResult | null, destination: LocationResult | null }) => {
  const map = useMap()
  useEffect(() => {
    if (pickup && destination) {
      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng]
      ])
      map.fitBounds(bounds, { padding: [50, 50] })
    } else if (pickup) {
      map.setView([pickup.lat, pickup.lng], 15)
    }
  }, [pickup, destination, map])
  return null
}

export const BookingFlow = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('pickup')
  const [pickup, setPickup] = useState<LocationResult | null>(null)
  const [destination, setDestination] = useState<LocationResult | null>(null)
  const [pickupQuery, setPickupQuery] = useState('')
  const [destQuery, setDestQuery] = useState('')
  const [pickupResults, setPickupResults] = useState<LocationResult[]>([])
  const [destResults, setDestResults] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('taxi')
  const [fares, setFares] = useState<FareEstimate[]>([])
  const [isBooking, setIsBooking] = useState(false)
  const [routePoints, setRoutePoints] = useState<[number, number][]>([])

  // Get user location for pickup default
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setPickup({
        address: 'My Location',
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      })
      setPickupQuery('My Location')
    })
  }, [])

  // Search debounce
  const debouncedSearch = useCallback(
    async (query: string, type: 'pickup' | 'dest') => {
      if (query.length < 3) {
        type === 'pickup' ? setPickupResults([]) : setDestResults([])
        return
      }
      setIsSearching(true)
      const results = await searchLocation(query)
      type === 'pickup' ? setPickupResults(results) : setDestResults(results)
      setIsSearching(false)
    },
    []
  )

  useEffect(() => {
    const t = setTimeout(() => debouncedSearch(pickupQuery, 'pickup'), 400)
    return () => clearTimeout(t)
  }, [pickupQuery, debouncedSearch])

  useEffect(() => {
    const t = setTimeout(() => debouncedSearch(destQuery, 'dest'), 400)
    return () => clearTimeout(t)
  }, [destQuery, debouncedSearch])

  // Fetch route polyline
  useEffect(() => {
    if (!pickup || !destination) return
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=simplified&geometries=geojson`
        )
        const data = await res.json()
        if (data.routes?.[0]) {
          const coords = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
          )
          setRoutePoints(coords)
        }
      } catch {
        // Fallback: straight line
        setRoutePoints([[pickup.lat, pickup.lng], [destination.lat, destination.lng]])
      }
    }
    fetchRoute()
  }, [pickup, destination])

  // Calculate fares when both locations set
  useEffect(() => {
    if (!pickup || !destination) return
    const dist = calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng)
    calculateFares(dist).then(setFares)
  }, [pickup, destination])

  const selectedFare = fares.find(f => f.vehicle_type === selectedVehicle)
  const distance = pickup && destination
    ? calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng)
    : 0

  const handleConfirmBooking = async () => {
    if (!profile || !pickup || !destination || !selectedFare) return

    setIsBooking(true)
    try {
      const { data, error } = await supabase.from('bookings').insert({
        rider_id: profile.id,
        vehicle_type: selectedVehicle,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        destination_address: destination.address,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        distance_km: distance,
        fare_amount: selectedFare.total_fare,
        status: 'pending',
        payment_status: 'pending',
      }).select().single()

      if (error) throw error
      navigate(`/rider/payment/${data.id}`)
    } catch (err) {
      console.error('Booking failed:', err)
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={FREETOWN}
          zoom={14}
          className="w-full h-full z-0"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapUpdater pickup={pickup} destination={destination} />
          {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
          {destination && <Marker position={[destination.lat, destination.lng]} icon={destIcon} />}
          {routePoints.length > 1 && (
            <Polyline positions={routePoints} color="#F59E0B" weight={4} opacity={0.9} dashArray="8,4" />
          )}
        </MapContainer>

        {/* Back button */}
        <button
          onClick={() => step === 'pickup' ? navigate('/rider') : setStep('pickup')}
          className="absolute top-4 left-4 z-10 w-10 h-10 bg-slate-900/90 backdrop-blur-md rounded-full flex items-center justify-center border border-slate-700"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Bottom Sheet */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border-t border-slate-800 rounded-t-3xl"
          style={{ maxHeight: '65vh', overflowY: 'auto' }}
        >
          {/* STEP: Location Selection */}
          {(step === 'pickup' || step === 'destination') && (
            <div className="px-4 pt-4 pb-8">
              <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white mb-4">Where to?</h2>

              {/* Pickup */}
              <div className="relative mb-3">
                <div className="flex items-center gap-3 bg-slate-800 rounded-2xl px-4 py-3 border border-slate-700 focus-within:border-green-500">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                  <input
                    className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
                    placeholder="Pickup location"
                    value={pickupQuery}
                    onChange={(e) => {
                      setPickupQuery(e.target.value)
                      setStep('pickup')
                    }}
                    onFocus={() => setStep('pickup')}
                  />
                  {isSearching && step === 'pickup' && <Spinner size="sm" />}
                </div>

                {step === 'pickup' && (pickupResults.length > 0 || pickupQuery.length < 3) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden z-20 shadow-xl">
                    {pickupQuery.length < 3 ? (
                      FREETOWN_LOCATIONS.slice(0, 5).map((loc) => (
                        <button
                          key={loc.address}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 text-left border-b border-slate-700 last:border-0"
                          onClick={() => {
                            setPickup(loc)
                            setPickupQuery(loc.address)
                            setStep('destination')
                          }}
                        >
                          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-white">{loc.address}</span>
                        </button>
                      ))
                    ) : (
                      pickupResults.map((loc) => (
                        <button
                          key={loc.address}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 text-left border-b border-slate-700 last:border-0"
                          onClick={() => {
                            setPickup(loc)
                            setPickupQuery(loc.address)
                            setStep('destination')
                          }}
                        >
                          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-white">{loc.address}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Destination */}
              <div className="relative">
                <div className="flex items-center gap-3 bg-slate-800 rounded-2xl px-4 py-3 border border-slate-700 focus-within:border-amber-500">
                  <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
                  <input
                    className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
                    placeholder="Where to?"
                    value={destQuery}
                    onChange={(e) => {
                      setDestQuery(e.target.value)
                      setStep('destination')
                    }}
                    onFocus={() => setStep('destination')}
                    autoFocus={step === 'destination'}
                  />
                  {isSearching && step === 'destination' && <Spinner size="sm" />}
                </div>

                {step === 'destination' && (destResults.length > 0 || destQuery.length < 3) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden z-20 shadow-xl">
                    {destQuery.length < 3 ? (
                      FREETOWN_LOCATIONS.map((loc) => (
                        <button
                          key={loc.address}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 text-left border-b border-slate-700 last:border-0"
                          onClick={() => {
                            setDestination(loc)
                            setDestQuery(loc.address)
                            setStep('vehicle')
                          }}
                        >
                          <Navigation className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-white">{loc.address}</span>
                        </button>
                      ))
                    ) : (
                      destResults.map((loc) => (
                        <button
                          key={loc.address}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 text-left border-b border-slate-700 last:border-0"
                          onClick={() => {
                            setDestination(loc)
                            setDestQuery(loc.address)
                            setStep('vehicle')
                          }}
                        >
                          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-white">{loc.address}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {pickup && destination && (
                <Button fullWidth className="mt-4" onClick={() => setStep('vehicle')}
                  rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Choose Ride Type
                </Button>
              )}
            </div>
          )}

          {/* STEP: Vehicle Selection */}
          {step === 'vehicle' && (
            <div className="px-4 pt-4 pb-8">
              <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Choose ride type</h2>
                <span className="text-slate-400 text-sm">{distance.toFixed(1)} km</span>
              </div>

              {fares.length === 0 ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : (
                <div className="space-y-3 mb-6">
                  {fares.map((fare) => {
                    const config = VEHICLE_CONFIG[fare.vehicle_type]
                    const isSelected = selectedVehicle === fare.vehicle_type
                    return (
                      <button
                        key={fare.vehicle_type}
                        onClick={() => setSelectedVehicle(fare.vehicle_type)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-3xl">{config.emoji}</span>
                        <div className="flex-1 text-left">
                          <p className={`font-semibold ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                            {config.label}
                          </p>
                          <p className="text-slate-400 text-xs">{config.description}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{config.eta}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                            {formatSLL(fare.total_fare)}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              <Button fullWidth size="lg" onClick={() => setStep('confirm')}
                rightIcon={<ChevronRight className="w-4 h-4" />}>
                Continue
              </Button>
            </div>
          )}

          {/* STEP: Confirm */}
          {step === 'confirm' && pickup && destination && selectedFare && (
            <div className="px-4 pt-4 pb-8">
              <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white mb-4">Confirm ride</h2>

              <Card className="p-4 mb-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-slate-400 text-xs">Pickup</p>
                      <p className="text-white text-sm font-medium">{pickup.address}</p>
                    </div>
                  </div>
                  <div className="w-px h-4 bg-slate-600 ml-1.5" />
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-slate-400 text-xs">Destination</p>
                      <p className="text-white text-sm font-medium">{destination.address}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-700 mt-4 pt-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-slate-400 text-xs">Distance</p>
                    <p className="text-white font-semibold">{distance.toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Vehicle</p>
                    <p className="text-white font-semibold">{VEHICLE_CONFIG[selectedVehicle].label}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Fare</p>
                    <p className="text-amber-400 font-bold">{formatSLL(selectedFare.total_fare)}</p>
                  </div>
                </div>
              </Card>

              <p className="text-slate-500 text-xs text-center mb-4">
                Payment collected after trip completion
              </p>

              <Button
                fullWidth
                size="lg"
                isLoading={isBooking}
                onClick={handleConfirmBooking}
              >
                Confirm Booking
              </Button>

              <Button
                variant="ghost"
                fullWidth
                className="mt-2"
                onClick={() => setStep('vehicle')}
              >
                Go Back
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
