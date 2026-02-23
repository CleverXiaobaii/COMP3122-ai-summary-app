import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'

// Simple password hashing function (using MD5 for compatibility with SQL migration)
// In production, use bcrypt or argon2
function hashPassword(password: string): string {
  // Match the SQL: md5(password || 'default-salt')
  return createHash('md5').update(password + 'default-salt').digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, username, isRegistering } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (isRegistering) {
      // User registration
      if (!username) {
        return NextResponse.json(
          { error: 'Username is required for registration' },
          { status: 400 }
        )
      }

      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${email},username.eq.${username}`)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError)
      }

      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email or username already exists' },
          { status: 409 }
        )
      }

      // Create new user
      const passwordHash = hashPassword(password)
      const userId = uuidv4()
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          password_hash: passwordHash,
          username,
          display_name: username,
          role: 'user',
          is_active: true
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating user:', insertError)
        return NextResponse.json(
          { 
            error: 'Failed to create user', 
            details: insertError.message,
            code: insertError.code,
            hint: insertError.hint
          },
          { status: 500 }
        )
      }

      // Create user bucket in storage
      const bucketName = `user-${userId}`
      try {
        await supabase.storage.createBucket(bucketName, {
          public: false,
          allowedMimeTypes: ['image/*', 'application/pdf', 'text/*'],
          fileSizeLimit: 10 * 1024 * 1024 // 10MB
        })
      } catch (bucketError) {
        console.warn('Failed to create user bucket (might already exist):', bucketError)
      }

      // Create JWT token (simplified - in production use proper JWT)
      const token = Buffer.from(JSON.stringify({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      })).toString('base64')

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          displayName: newUser.display_name,
          role: newUser.role
        },
        token
      })

    } else {
      // User login
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single()

      if (userError || !user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Verify password
      const passwordHash = hashPassword(password)
      if (passwordHash !== user.password_hash) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Create JWT token
      const token = Buffer.from(JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
        exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      })).toString('base64')

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.display_name,
          role: user.role
        },
        token
      })
    }

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}