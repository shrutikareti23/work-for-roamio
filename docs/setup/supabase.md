# Set up Supabase for Roamio (free, no credit card)

Takes about 15 minutes. You only do this once.

## 1. Create the project

1. Go to https://supabase.com and click **Start your project**. Sign up (GitHub sign-in is easiest).
2. Create an **organization**: any name (e.g. "Roamio"), plan **Free**.
3. Click **New project**:
   - Name: `roamio`
   - Database password: click **Generate a password** and save it in a password manager.
     (Roamio doesn't need it now; it's for the nightly backup in a later phase.)
   - Region: the one closest to you.
4. Click **Create new project** and wait ~2 minutes until it's ready.

## 2. Create the tables (copy-paste one file)

1. In the left menu open **SQL Editor** → **New query**.
2. Open this file on GitHub and click the **Copy raw file** button (top right of the code):
   https://github.com/shrutikareti23/work-for-roamio/blob/main/supabase/migrations/20261105000000_initial_schema.sql
3. Paste it into the SQL editor and click **Run**.
4. You should see **"Success. No rows returned"**.
5. Check: left menu **Table Editor** should list `profiles`, `trips`, `trip_days`, `ratings`.

## 3. Email sign-in settings

1. Left menu **Authentication** → **Sign In / Providers** → **Email**:
   - **Enable Email provider**: on
   - **Confirm email**: **off for now** (see note below)
   - **Minimum password length**: `8`
   - Click **Save**.

> **Why "Confirm email" is off for now:** Supabase only lets you edit email templates
> after you connect your own email service (custom SMTP). Its default emails contain a
> link, but Roamio uses 6-digit codes. Until we connect a free email service (before
> launch, Phase 11), keep confirmation off. Sign up, sign in, sign out and delete
> account all work; **Forgot password** will work once email is connected.
>
> Later, after custom SMTP is set up: turn **Confirm email** back on and set these
> templates under **Authentication → Emails → Templates**:
>
> - **Confirm signup** — subject `Your Roamio code`, body:
>   ```html
>   <h2>Welcome to Roamio</h2>
>   <p>Your confirmation code is:</p>
>   <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
>   <p>Enter it in the app. If you didn't sign up, ignore this email.</p>
>   ```
> - **Reset Password** — subject `Your Roamio password reset code`, body:
>   ```html
>   <h2>Reset your Roamio password</h2>
>   <p>Your code is:</p>
>   <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
>   <p>If you didn't ask for this, ignore this email. Your password won't change.</p>
>   ```

## 4. Copy two values into the app

1. Click the **Connect** button at the top of the dashboard (or **Project Settings → API Keys**).
2. Copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **Publishable key** (starts with `sb_publishable_`).
     **Never** copy the _secret_ key (`sb_secret_...`) into the app.
3. On your computer, in PowerShell:
   ```
   cd ~\work-for-roamio\mobile
   git pull
   npm install
   Copy-Item .env.example .env
   notepad .env
   ```
4. In Notepad fill in the two lines, save, close:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_xxxxxxxx
   ```
   (`.env` is never uploaded to GitHub.)
5. Start the app with a fresh cache so it picks up the new values:
   ```
   npx expo start --tunnel ngrok --clear
   ```

## Limits to know (free plan)

- Supabase's built-in email sender only delivers to **members of your Supabase team**
  (your own email) and only **2 emails per hour**. Fine for testing with your email.
  Before launch we'll connect a free email service so everyone can sign up.
- The project **pauses after 1 week without use**. A daily keep-alive is added in Phase 4.
- Free plan: 500 MB database, 50,000 monthly active users, 2 active projects.
