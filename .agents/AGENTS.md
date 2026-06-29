# Drillhole Logger Project Guidelines & Rules

## Project Overview
This is the drillhole logging application for Kale Maden A.Ş. It is used to log collar, survey, lithology, alteration, TCR/RQD, assay, sampleprep, and sampleprep metallic screen data, synchronizing with a Supabase PostgreSQL database.

## Authorized Users & Roles (RBAC)
Only authorized users with emails ending in `@kale.com.tr` are allowed to log in or use the application.

1. **Administrator (`ismailcansever@kale.com.tr`):**
   * İsmailcan Sever (Admin) has full administrative privileges.
   * Can edit Database Connection settings.
   * Can perform hard clears/resets of the database (Reset / Clear).
   * Can overwrite and rename any drillholes.

2. **Geologist / Editor (`leventcan@kale.com.tr`):**
   * Levent Can has write and overwrite privileges.
   * Can overwrite and rename drillholes.
   * Does NOT have access to Database Connection settings.
   * Does NOT have access to hard clears/resets.

3. **General Users:**
   * Any other `@kale.com.tr` emails will login as Geologists but cannot overwrite or modify other geologists' drillholes (collision protection is active for general editors).

## Security Constraints
* **Session Storage:** Supabase is configured with `sessionStorage` for auth persistence. Sessions last as long as the tab/browser is open. Refreshing the page (F5) preserves the session, but closing the browser completely signs the user out.
* **Email Verification:** Email confirmation is disabled in Supabase. Sign-up immediately registers the user and allows sign-in.
* **Email Domain Restriction:** The application enforces `@kale.com.tr` domain validation in both the login screen and on session loaded hooks. Non-kale emails are signed out immediately.

## Architectural Notes
* **Realtime Collars:** The application subscribes to Supabase real-time updates for the `collars` table to sync the list of available drillholes across users instantly without page reloads.
* **Collision Protection:** Checks `collar.logger` against `canOverwrite` status when saving or background syncing to prevent unauthorized overwrites.
