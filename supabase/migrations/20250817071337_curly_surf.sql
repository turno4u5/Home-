/*
  # Management System Database Schema

  1. New Tables
    - `missions` - Store mission configurations and settings
    - `user_submissions` - Store all user mission submissions
    - `platform_accounts` - Store platform-specific follow accounts
    - `mission_settings` - Store global mission settings

  2. Security
    - Enable RLS on all tables
    - Add policies for public read/write access (since this is a demo)

  3. Real-time Features
    - Enable real-time subscriptions for live updates
*/

-- Missions configuration table
CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('followers', 'likes', 'comments')),
  count integer NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User submissions table
CREATE TABLE IF NOT EXISTS user_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube')),
  username text NOT NULL,
  video_link text,
  missions_data jsonb NOT NULL,
  follow_completed boolean DEFAULT false,
  follow_account text,
  ip_address text,
  user_agent text,
  submitted_at timestamptz DEFAULT now()
);

-- Platform accounts table
CREATE TABLE IF NOT EXISTS platform_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube')),
  account_url text NOT NULL,
  account_name text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mission settings table
CREATE TABLE IF NOT EXISTS mission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for production)
CREATE POLICY "Allow public read access on missions"
  ON missions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access on missions"
  ON missions FOR ALL
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access on user_submissions"
  ON user_submissions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access on user_submissions"
  ON user_submissions FOR ALL
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access on platform_accounts"
  ON platform_accounts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access on platform_accounts"
  ON platform_accounts FOR ALL
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access on mission_settings"
  ON mission_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public write access on mission_settings"
  ON mission_settings FOR ALL
  TO anon, authenticated
  USING (true);

-- Insert default mission configurations
INSERT INTO missions (type, count, enabled) VALUES
  ('followers', 10, true),
  ('followers', 20, true),
  ('followers', 50, true),
  ('followers', 100, true),
  ('likes', 10, true),
  ('likes', 20, true),
  ('likes', 50, true),
  ('likes', 100, true),
  ('comments', 10, true),
  ('comments', 20, true),
  ('comments', 50, true),
  ('comments', 100, true);

-- Insert default platform accounts
INSERT INTO platform_accounts (platform, account_url, account_name, enabled) VALUES
  ('instagram', 'https://www.instagram.com/imdannyc4u/', '@imdannyc4u', true),
  ('tiktok', 'https://www.tiktok.com/@dannycross443', '@dannycross443', true),
  ('youtube', 'https://www.youtube.com/@mami4u5', '@mami4u5', true);

-- Insert default mission settings
INSERT INTO mission_settings (setting_key, setting_value, description) VALUES
  ('reset_timer_hours', '2', 'Hours before users can reuse the same mission count'),
  ('max_daily_submissions', '10', 'Maximum submissions per user per day'),
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(type);
CREATE INDEX IF NOT EXISTS idx_user_submissions_platform ON user_submissions(platform);
CREATE INDEX IF NOT EXISTS idx_user_submissions_submitted_at ON user_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_platform_accounts_platform ON platform_accounts(platform);