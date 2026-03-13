BEGIN;

INSERT INTO users (id, phone, verification_status, display_name, preferred_language, profile_type, status, is_phone_verified, is_admin, created_at, updated_at)
VALUES
  ('usr-admin-1', '+251900000001', 'verified', 'LwayLway Admin', 'en', 'consumer', 'active', TRUE, TRUE, '2026-03-01T08:00:00.000Z', '2026-03-01T08:00:00.000Z'),
  ('usr-seller-1', '+251911000111', 'verified', 'Marta Tech', 'en', 'small_business', 'active', TRUE, FALSE, '2026-03-01T09:00:00.000Z', '2026-03-01T09:00:00.000Z'),
  ('usr-buyer-1', '+251912000222', 'verified', 'Dawit', 'am', 'consumer', 'active', TRUE, FALSE, '2026-03-02T09:00:00.000Z', '2026-03-02T09:00:00.000Z');

INSERT INTO profiles (user_id, bio, business_name, avatar_url, meetup_guidance_accepted, joined_at, updated_at)
VALUES
  ('usr-admin-1', 'Marketplace moderation and launch operations.', NULL, NULL, TRUE, '2026-03-01T08:00:00.000Z', '2026-03-01T08:00:00.000Z'),
  ('usr-seller-1', 'Trusted phone accessories seller in Bole.', 'Marta Mobile Accessories', NULL, TRUE, '2026-03-01T09:00:00.000Z', '2026-03-01T09:00:00.000Z'),
  ('usr-buyer-1', 'Looking for reliable electronics in Addis.', NULL, NULL, TRUE, '2026-03-02T09:00:00.000Z', '2026-03-02T09:00:00.000Z');

INSERT INTO categories (id, slug, label_am, label_en)
VALUES
  ('cat-electronics', 'electronics', 'ኤሌክትሮኒክስ', 'Electronics'),
  ('cat-phones', 'phones', 'ስልኮች', 'Phones'),
  ('cat-home', 'home-goods', 'የቤት ዕቃዎች', 'Home Goods'),
  ('cat-fashion', 'fashion', 'ፋሽን', 'Fashion'),
  ('cat-baby', 'baby-items', 'የሕፃናት ዕቃዎች', 'Baby Items');

INSERT INTO locations (id, city, subcity, area_label_am, area_label_en)
VALUES
  ('loc-bole', 'Addis Ababa', 'Bole', 'ቦሌ', 'Bole'),
  ('loc-kirkos', 'Addis Ababa', 'Kirkos', 'ቂርቆስ', 'Kirkos'),
  ('loc-yeka', 'Addis Ababa', 'Yeka', 'የካ', 'Yeka'),
  ('loc-arada', 'Addis Ababa', 'Arada', 'አራዳ', 'Arada');

INSERT INTO listings (id, seller_id, title, description, price_etb, negotiable, category_id, condition, location_id, status, created_at, updated_at, published_at)
VALUES
  ('lst-1', 'usr-seller-1', 'iPhone 13 Pro 256GB', 'Clean condition, battery health 88%, meetup in Bole.', 98000, TRUE, 'cat-phones', 'good', 'loc-bole', 'active', '2026-03-05T09:00:00.000Z', '2026-03-05T09:00:00.000Z', '2026-03-05T09:00:00.000Z'),
  ('lst-2', 'usr-seller-1', 'Modern coffee table', 'Solid wood table, lightly used, pickup near Kirkos.', 14500, FALSE, 'cat-home', 'like_new', 'loc-kirkos', 'active', '2026-03-04T09:00:00.000Z', '2026-03-04T09:00:00.000Z', '2026-03-04T09:00:00.000Z');

INSERT INTO listing_images (id, listing_id, image_url, sort_order)
VALUES
  ('img-1', 'lst-1', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80', 0),
  ('img-2', 'lst-2', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', 0);

INSERT INTO favorites (id, listing_id, user_id, created_at)
VALUES
  ('fav-1', 'lst-1', 'usr-buyer-1', '2026-03-05T12:00:00.000Z');

INSERT INTO chat_threads (id, listing_id, buyer_id, seller_id, status, last_message_at, created_at, updated_at)
VALUES
  ('thr-1', 'lst-1', 'usr-buyer-1', 'usr-seller-1', 'active', '2026-03-05T12:20:00.000Z', '2026-03-05T12:15:00.000Z', '2026-03-05T12:20:00.000Z');

INSERT INTO messages (id, thread_id, sender_id, text, created_at)
VALUES
  ('msg-1', 'thr-1', 'usr-buyer-1', 'Is this still available?', '2026-03-05T12:15:00.000Z'),
  ('msg-2', 'thr-1', 'usr-seller-1', 'Yes, available. We can meet in Bole.', '2026-03-05T12:20:00.000Z');

COMMIT;


