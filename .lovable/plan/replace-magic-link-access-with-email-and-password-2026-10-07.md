# Replace magic-link access with email and password

## What will change
- Replace the current “Send magic link” screen with a polished sign-in form using email and password.
- Add a create-account mode on the same screen. New accounts will use email confirmation before first sign-in.
- Add a “Forgot password?” flow that emails a secure recovery link.
- Add a public reset-password page where recovery links let users choose a new password.
- Keep the existing sign-out button, study progress, settings, and all three certification tracks unchanged.

## Validation
- Confirm sign-in, account creation, forgot-password confirmation, form errors, and password-reset screens render correctly on desktop and phone sizes.
- Confirm the app still builds cleanly and signed-in users reach the reviewer normally.

## Technical details
- Use the existing Lovable Cloud authentication and account storage; no profiles table will be added.
- Enable email/password authentication without enabling automatic email confirmation.
- Use the app’s existing design tokens and shared button control.
- Add complete page metadata for the reset-password page.
