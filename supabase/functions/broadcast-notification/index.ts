import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BroadcastPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify user is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || (profile?.role !== 'ADMIN' && profile?.role !== 'admin')) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Get request body
    const { title, body, data }: BroadcastPayload = await req.json()

    // Get all users who have admin_announcements enabled
    const { data: preferences, error: prefError } = await supabaseClient
      .from('user_notification_preferences')
      .select('user_id')
      .eq('admin_announcements', true)

    if (prefError) throw prefError

    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users have admin announcements enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const targetUserIds = preferences.map((p: { user_id: string }) => p.user_id)

    // Get FCM tokens for target users
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('user_fcm_tokens')
      .select('token')
      .in('user_id', targetUserIds)

    if (tokensError) throw tokensError

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No FCM tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get Firebase credentials
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID')
    
    if (!serviceAccountJson || !projectId) {
      throw new Error('Firebase credentials not configured')
    }

    const serviceAccount = JSON.parse(serviceAccountJson)

    // Get OAuth2 access token using googleapis
    const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const now = Math.floor(Date.now() / 1000)
    const jwtPayload = btoa(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }))

    const unsignedToken = `${jwtHeader}.${jwtPayload}`
    
    // Sign with private key
    const privateKeyPem = serviceAccount.private_key
    const pemHeader = '-----BEGIN PRIVATE KEY-----'
    const pemFooter = '-----END PRIVATE KEY-----'
    const pemContents = privateKeyPem.substring(
      pemHeader.length,
      privateKeyPem.length - pemFooter.length - 1
    ).replace(/\s/g, '')
    
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    )

    const signedToken = `${unsignedToken}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedToken}`,
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      throw new Error(`Failed to get access token: ${errorText}`)
    }

    const { access_token } = await tokenResponse.json()

    const fcmTokens = tokens.map((t: { token: string }) => t.token)
    const results = {
      success: 0,
      failed: 0,
      total: fcmTokens.length,
      invalidTokens: [] as string[]
    }

    // Insert messages into user_admin_messages for persistence
    const messagesToInsert = preferences.map((p: any) => ({
      user_id: p.user_id,
      sender_id: user.id, // The admin sending the broadcast
      content: body, // The message body
      title: title, // Store title if schema supports it, otherwise logic assumes body content
      is_read: false,
      is_global: true, // Flag as global broadcast
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Batch insert messages (Supabase handles batch inserts well)
    // Note: We might want to chunk this if the user base is massive, but for now direct insert is fine.
    const { error: insertError } = await supabaseClient
      .from('user_admin_messages')
      .insert(messagesToInsert)
    
    if (insertError) {
      console.error('Error persisting broadcast messages:', insertError)
      // We continue to send push notifications even if persistence fails, or we could throw. 
      // Let's log and continue to ensure at least the alert goes out.
    }

    // Send notifications using FCM v1 API
    for (const fcmToken of fcmTokens) {
      try {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify({
              message: {
                token: fcmToken,
                notification: {
                  title,
                  body,
                },
                data: {
                  ...data,
                  type: 'admin_announcement',
                  is_global: 'true'
                },
                webpush: {
                  notification: {
                    icon: '/icon-192x192.png',
                    badge: '/icon-192x192.png'
                  }
                }
              }
            })
          }
        )

        if (response.ok) {
          results.success++
        } else {
          const errorData = await response.json()
          results.failed++
          
          // Check if token is invalid
          if (errorData.error?.details?.[0]?.errorCode === 'UNREGISTERED' ||
              errorData.error?.details?.[0]?.errorCode === 'INVALID_ARGUMENT') {
            results.invalidTokens.push(fcmToken)
          }
        }
      } catch (error) {
        console.error('Error sending to token:', fcmToken, error)
        results.failed++
      }
    }

    // Clean up invalid tokens
    if (results.invalidTokens.length > 0) {
      await supabaseClient
        .from('user_fcm_tokens')
        .delete()
        .in('token', results.invalidTokens)
    }

    return new Response(
      JSON.stringify({
        message: 'Broadcast sent',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
