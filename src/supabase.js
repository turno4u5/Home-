import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please set up your Supabase connection.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database operations
export const db = {
  // Mission operations
  async getMissions() {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .order('type', { ascending: true })
      .order('count', { ascending: true })
    
    if (error) throw error
    return data
  },

  async createMission(mission) {
    const { data, error } = await supabase
      .from('missions')
      .insert([mission])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateMission(id, updates) {
    const { data, error } = await supabase
      .from('missions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async deleteMission(id) {
    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // User submission operations
  async createSubmission(submission) {
    const { data, error } = await supabase
      .from('user_submissions')
      .insert([submission])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async getSubmissions(limit = 100) {
    const { data, error } = await supabase
      .from('user_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  },

  async deleteSubmission(id) {
    const { error } = await supabase
      .from('user_submissions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Platform account operations
  async getPlatformAccounts() {
    const { data, error } = await supabase
      .from('platform_accounts')
      .select('*')
      .order('platform', { ascending: true })
    
    if (error) throw error
    return data
  },

  async updatePlatformAccount(id, updates) {
    const { data, error } = await supabase
      .from('platform_accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  // Mission settings operations
  async getSettings() {
    const { data, error } = await supabase
      .from('mission_settings')
      .select('*')
    
    if (error) throw error
    return data
  },

  async updateSetting(key, value) {
    const { data, error } = await supabase
      .from('mission_settings')
      .upsert([{
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString()
      }])
      .select()
    
    if (error) throw error
    return data[0]
  }
}

// Real-time subscriptions
export const subscriptions = {
  onSubmissions(callback) {
    return supabase
      .channel('user_submissions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_submissions'
      }, callback)
      .subscribe()
  },

  onMissions(callback) {
    return supabase
      .channel('missions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'missions'
      }, callback)
      .subscribe()
  },

  onPlatformAccounts(callback) {
    return supabase
      .channel('platform_accounts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'platform_accounts'
      }, callback)
      .subscribe()
  }
}