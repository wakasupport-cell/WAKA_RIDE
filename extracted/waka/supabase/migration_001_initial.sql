-- ============================================================
-- WAKA PLATFORM — PRODUCTION DATABASE MIGRATION
-- Version: 1.0.0
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy text search

-- ─── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('rider', 'driver', 'admin');
CREATE TYPE driver_status AS ENUM ('pending_approval', 'approved', 'rejected', 'suspended');
CREATE TYPE vehicle_type AS ENUM ('keke', 'taxi', 'premium');
CREATE TYPE booking_status AS ENUM (
  'pending', 'accepted', 'driver_en_route',
  'arrived', 'in_progress', 'completed', 'cancelled'
);
CREATE TYPE payment_method AS ENUM ('orange_money', 'afri_money', 'q_money');
CREATE TYPE payment_status AS ENUM ('pending', 'submitted', 'confirmed', 'failed');

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  avatar_url  TEXT,
  role        user_role NOT NULL DEFAULT 'rider',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);

-- ─── DRIVERS ──────────────────────────────────────────────────────────────────
CREATE TABLE drivers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id          UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  license_number      TEXT NOT NULL,
  national_id_number  TEXT NOT NULL,
  license_doc_url     TEXT,
  national_id_doc_url TEXT,
  driver_photo_url    TEXT,
  status              driver_status NOT NULL DEFAULT 'pending_approval',
  approval_notes      TEXT,
  total_trips         INTEGER NOT NULL DEFAULT 0,
  average_rating      NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  is_online           BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat         NUMERIC(10,7),
  current_lng         NUMERIC(10,7),
  approved_at         TIMESTAMPTZ,
  approved_by         UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_profile_id ON drivers(profile_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_is_online ON drivers(is_online);
CREATE INDEX idx_drivers_status_online ON drivers(status, is_online);

-- ─── VEHICLES ─────────────────────────────────────────────────────────────────
CREATE TABLE vehicles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id           UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_type        vehicle_type NOT NULL,
  make                TEXT NOT NULL,
  model               TEXT NOT NULL,
  year                SMALLINT NOT NULL,
  color               TEXT NOT NULL,
  plate_number        TEXT NOT NULL UNIQUE,
  registration_number TEXT NOT NULL,
  vehicle_photo_url   TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type);

-- ─── FARE SETTINGS ────────────────────────────────────────────────────────────
CREATE TABLE fare_settings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_type      vehicle_type NOT NULL UNIQUE,
  base_fare         NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  per_km_rate       NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  minimum_fare      NUMERIC(10,2) NOT NULL DEFAULT 10.00,
  surge_multiplier  NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────
CREATE TABLE bookings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rider_id             UUID NOT NULL REFERENCES profiles(id),
  driver_id            UUID REFERENCES drivers(id),
  vehicle_type         vehicle_type NOT NULL,
  pickup_address       TEXT NOT NULL,
  pickup_lat           NUMERIC(10,7) NOT NULL,
  pickup_lng           NUMERIC(10,7) NOT NULL,
  destination_address  TEXT NOT NULL,
  destination_lat      NUMERIC(10,7) NOT NULL,
  destination_lng      NUMERIC(10,7) NOT NULL,
  distance_km          NUMERIC(8,2) NOT NULL,
  fare_amount          NUMERIC(10,2) NOT NULL,
  status               booking_status NOT NULL DEFAULT 'pending',
  cancellation_reason  TEXT,
  payment_method       payment_method,
  payment_status       payment_status NOT NULL DEFAULT 'pending',
  payment_reference    TEXT,
  rated_by_rider       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at          TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_rider_id ON bookings(rider_id);
CREATE INDEX idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX idx_bookings_rider_status ON bookings(rider_id, status);
CREATE INDEX idx_bookings_driver_status ON bookings(driver_id, status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_vehicle_type ON bookings(vehicle_type);

-- ─── PAYMENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'SLL',
  payment_method  payment_method NOT NULL,
  reference_code  TEXT,
  status          payment_status NOT NULL DEFAULT 'pending',
  confirmed_by    UUID REFERENCES profiles(id),
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ─── RATINGS ──────────────────────────────────────────────────────────────────
CREATE TABLE ratings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  rider_id    UUID NOT NULL REFERENCES profiles(id),
  driver_id   UUID NOT NULL REFERENCES drivers(id),
  score       SMALLINT NOT NULL CHECK (score >= 1 AND score <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ratings_driver_id ON ratings(driver_id);
CREATE INDEX idx_ratings_rider_id ON ratings(rider_id);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile after auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'rider')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update driver average_rating when new rating is added
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE drivers
  SET
    average_rating = (
      SELECT ROUND(AVG(score)::NUMERIC, 2)
      FROM ratings
      WHERE driver_id = NEW.driver_id
    ),
    total_trips = (
      SELECT COUNT(*)
      FROM ratings
      WHERE driver_id = NEW.driver_id
    )
  WHERE id = NEW.driver_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_driver_rating
  AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_driver_rating();

-- Set accepted_at / completed_at timestamps automatically
CREATE OR REPLACE FUNCTION handle_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.accepted_at = NOW();
  END IF;
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_status_change
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_booking_status_change();

-- Create notification on booking status change
CREATE OR REPLACE FUNCTION notify_booking_update()
RETURNS TRIGGER AS $$
DECLARE
  v_rider_id UUID;
  v_driver_profile_id UUID;
BEGIN
  v_rider_id := NEW.rider_id;

  IF NEW.driver_id IS NOT NULL THEN
    SELECT profile_id INTO v_driver_profile_id FROM drivers WHERE id = NEW.driver_id;
  END IF;

  -- Notify rider
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (v_rider_id, 'booking_accepted', 'Driver found!',
      'Your driver is on the way.', jsonb_build_object('booking_id', NEW.id));

  ELSIF NEW.status = 'driver_en_route' THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (v_rider_id, 'driver_en_route', 'Driver en route',
      'Your driver is heading to your pickup location.', jsonb_build_object('booking_id', NEW.id));

  ELSIF NEW.status = 'arrived' THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (v_rider_id, 'driver_arrived', 'Driver arrived!',
      'Your driver has arrived at the pickup point.', jsonb_build_object('booking_id', NEW.id));

  ELSIF NEW.status = 'completed' THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (v_rider_id, 'trip_completed', 'Trip completed',
      'Your trip is complete. Please rate your driver.', jsonb_build_object('booking_id', NEW.id));

  ELSIF NEW.status = 'cancelled' THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (v_rider_id, 'booking_cancelled', 'Trip cancelled',
      'Your trip has been cancelled.', jsonb_build_object('booking_id', NEW.id));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_booking_update
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION notify_booking_update();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fare_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ─── Helper: is admin ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── PROFILES policies ────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (is_admin());

-- ─── DRIVERS policies ─────────────────────────────────────────────────────────
CREATE POLICY "drivers_select_own" ON drivers
  FOR SELECT USING (
    profile_id = auth.uid() OR is_admin()
  );

CREATE POLICY "drivers_insert_own" ON drivers
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "drivers_update_own" ON drivers
  FOR UPDATE USING (profile_id = auth.uid() OR is_admin());

-- Approved drivers visible to riders (for driver discovery)
CREATE POLICY "drivers_select_approved" ON drivers
  FOR SELECT USING (status = 'approved');

-- ─── VEHICLES policies ────────────────────────────────────────────────────────
CREATE POLICY "vehicles_driver_own" ON vehicles
  FOR ALL USING (
    driver_id IN (SELECT id FROM drivers WHERE profile_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "vehicles_select_any" ON vehicles
  FOR SELECT USING (is_active = TRUE);

-- ─── BOOKINGS policies ────────────────────────────────────────────────────────
CREATE POLICY "bookings_rider_own" ON bookings
  FOR SELECT USING (rider_id = auth.uid() OR is_admin());

CREATE POLICY "bookings_rider_insert" ON bookings
  FOR INSERT WITH CHECK (rider_id = auth.uid());

CREATE POLICY "bookings_rider_cancel" ON bookings
  FOR UPDATE USING (
    rider_id = auth.uid()
    AND status IN ('pending', 'accepted')
  );

CREATE POLICY "bookings_driver_view" ON bookings
  FOR SELECT USING (
    driver_id IN (SELECT id FROM drivers WHERE profile_id = auth.uid())
    OR status = 'pending'
  );

CREATE POLICY "bookings_driver_update" ON bookings
  FOR UPDATE USING (
    driver_id IN (SELECT id FROM drivers WHERE profile_id = auth.uid())
    OR (status = 'pending' AND driver_id IS NULL)
  );

CREATE POLICY "bookings_admin_all" ON bookings
  FOR ALL USING (is_admin());

-- ─── FARE SETTINGS policies ───────────────────────────────────────────────────
CREATE POLICY "fare_settings_select_all" ON fare_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "fare_settings_admin_write" ON fare_settings
  FOR ALL USING (is_admin());

-- ─── PAYMENTS policies ────────────────────────────────────────────────────────
CREATE POLICY "payments_rider_own" ON payments
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE rider_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "payments_rider_insert" ON payments
  FOR INSERT WITH CHECK (
    booking_id IN (SELECT id FROM bookings WHERE rider_id = auth.uid())
  );

CREATE POLICY "payments_rider_update_ref" ON payments
  FOR UPDATE USING (
    booking_id IN (SELECT id FROM bookings WHERE rider_id = auth.uid())
    AND status = 'pending'
  );

CREATE POLICY "payments_admin_confirm" ON payments
  FOR UPDATE USING (is_admin());

-- ─── RATINGS policies ─────────────────────────────────────────────────────────
CREATE POLICY "ratings_select_all" ON ratings
  FOR SELECT USING (TRUE);

CREATE POLICY "ratings_rider_insert" ON ratings
  FOR INSERT WITH CHECK (
    rider_id = auth.uid()
    AND booking_id IN (
      SELECT id FROM bookings
      WHERE rider_id = auth.uid() AND status = 'completed' AND rated_by_rider = FALSE
    )
  );

-- ─── NOTIFICATIONS policies ───────────────────────────────────────────────────
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- REALTIME — enable for live features
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Fare settings — default Sierra Leone pricing in SLL (Leones)
INSERT INTO fare_settings (vehicle_type, base_fare, per_km_rate, minimum_fare, surge_multiplier) VALUES
  ('keke',    5.00,  3.00,  8.00,  1.00),
  ('taxi',    8.00,  5.00, 15.00,  1.00),
  ('premium', 15.00, 8.00, 25.00,  1.00);

-- ============================================================
-- STORAGE BUCKETS
-- Run separately if needed via Supabase Dashboard or API
-- ============================================================
-- Bucket: driver-documents (private)
-- Bucket: driver-photos (private)
-- Bucket: vehicle-photos (private)
-- Bucket: avatars (public)
