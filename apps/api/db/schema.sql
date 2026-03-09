BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE language_code AS ENUM ('am', 'en');
CREATE TYPE profile_type AS ENUM ('consumer', 'small_business');
CREATE TYPE user_status AS ENUM ('active', 'suspended');
CREATE TYPE verification_status AS ENUM ('pending', 'verified');
CREATE TYPE listing_status AS ENUM ('draft', 'active', 'sold', 'hidden', 'flagged');
CREATE TYPE listing_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'used');
CREATE TYPE thread_status AS ENUM ('active', 'blocked', 'closed');
CREATE TYPE report_target_type AS ENUM ('listing', 'user', 'message');
CREATE TYPE report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
CREATE TYPE moderation_action_type AS ENUM ('approve_listing', 'hide_listing', 'suspend_user', 'warn_user', 'resolve_report');

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  display_name TEXT NOT NULL,
  preferred_language language_code NOT NULL DEFAULT 'en',
  profile_type profile_type NOT NULL DEFAULT 'consumer',
  status user_status NOT NULL DEFAULT 'active',
  is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_phone_e164_format CHECK (phone ~ '^\+[1-9][0-9]{7,14}$')
);

CREATE TABLE phone_verifications (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT phone_verifications_phone_e164_format CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  CONSTRAINT phone_verifications_attempt_count_nonnegative CHECK (attempt_count >= 0),
  CONSTRAINT phone_verifications_consumed_after_create CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sessions_expiry_after_create CHECK (expires_at > created_at),
  CONSTRAINT sessions_revoked_after_create CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);


CREATE TABLE device_push_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  business_name TEXT,
  avatar_url TEXT,
  meetup_guidance_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label_am TEXT NOT NULL,
  label_en TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  subcity TEXT NOT NULL,
  area_label_am TEXT NOT NULL,
  area_label_en TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (city, subcity)
);

CREATE TABLE listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_etb INTEGER NOT NULL,
  negotiable BOOLEAN NOT NULL DEFAULT FALSE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  condition listing_condition NOT NULL,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  status listing_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  search_document tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) STORED,
  CONSTRAINT listings_price_positive CHECK (price_etb > 0),
  CONSTRAINT listings_publish_state CHECK (
    (status = 'active' AND published_at IS NOT NULL) OR
    (status <> 'active')
  )
);

CREATE TABLE listing_images (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT listing_images_sort_order_nonnegative CHECK (sort_order >= 0),
  UNIQUE (listing_id, sort_order)
);

CREATE TABLE favorites (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, user_id)
);

CREATE TABLE chat_threads (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status thread_status NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_threads_distinct_participants CHECK (buyer_id <> seller_id),
  UNIQUE (listing_id, buyer_id)
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  CONSTRAINT messages_text_nonempty CHECK (length(trim(text)) > 0),
  CONSTRAINT messages_read_after_create CHECK (read_at IS NULL OR read_at >= created_at)
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  target_type report_target_type NOT NULL,
  target_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason_code TEXT NOT NULL,
  notes TEXT,
  status report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE moderation_actions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action_type moderation_action_type NOT NULL,
  target_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_admin_status ON users (is_admin, status) WHERE is_admin = TRUE;
CREATE INDEX idx_phone_verifications_phone_created ON phone_verifications (phone, created_at DESC);
CREATE INDEX idx_sessions_user_active ON sessions (user_id, expires_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX idx_device_push_tokens_user ON device_push_tokens (user_id, updated_at DESC);
CREATE INDEX idx_categories_active ON categories (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_locations_city_subcity ON locations (city, subcity);
CREATE INDEX idx_listings_feed ON listings (status, location_id, category_id, created_at DESC);
CREATE INDEX idx_listings_seller ON listings (seller_id, status, updated_at DESC);
CREATE INDEX idx_listings_price ON listings (price_etb);
CREATE INDEX idx_listings_search_document ON listings USING GIN (search_document);
CREATE INDEX idx_listings_title_trgm ON listings USING GIN (title gin_trgm_ops);
CREATE INDEX idx_listing_images_listing_sort ON listing_images (listing_id, sort_order);
CREATE INDEX idx_favorites_user ON favorites (user_id, created_at DESC);
CREATE INDEX idx_chat_threads_user_last_message ON chat_threads (buyer_id, last_message_at DESC);
CREATE INDEX idx_chat_threads_seller_last_message ON chat_threads (seller_id, last_message_at DESC);
CREATE INDEX idx_messages_thread_created ON messages (thread_id, created_at ASC);
CREATE INDEX idx_reports_status_created ON reports (status, created_at DESC);
CREATE INDEX idx_reports_target ON reports (target_type, target_id);

COMMIT;


