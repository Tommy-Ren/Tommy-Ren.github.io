# Blog community

Apply `migrations/20261013010000_blog_community.sql` once, after the existing photo translation migration. It backfills existing posts and photos to the first existing administrator; it does not grant anyone a new administrator role.

## Authentication setup

In Authentication → Sign In / Providers, enable **Allow new users to sign up**, keep **Confirm email** enabled, and keep anonymous sign-ins disabled.

Site URL: `https://tommy-ren.github.io/blog/home/`.

Allowed redirects:

- `https://tommy-ren.github.io/blog/**`
- `http://127.0.0.1:5175/blog/**` for local development

Configure custom SMTP in Authentication → Emails → SMTP Settings before opening registration to external users. Supabase's default sender only delivers to organization members. Keep SMTP credentials in the dashboard, never in Vite variables or Git. With Gmail, use an app password for an account with two-step verification, host `smtp.gmail.com`, port `587`, and the same full email address for sender and username. The account owner enters and saves the password directly.

Verify delivery using a real external email account: sign up, receive and open the confirmation email, log in, and check the writing studio. Until that has succeeded, do not treat email delivery as validated. Open the confirmation link in the same browser used for registration (PKCE); after confirming elsewhere, returning and logging in with email/password also works.

## Permission model

- Public profiles contain a display name and preset avatar key; **no email addresses**.
- Verified, non-anonymous, non-banned email users can create their own profile, posts, photos and comments.
- Authors can see/edit/delete their own drafts and publications. Author IDs are immutable. Other authors' drafts are private.
- Existing administrators retain moderation/site settings access. Only administrators see the footer Admin link; other members open `/blog/studio/` from their avatar. `/blog/admin/` redirects non-administrators to the homepage before mounting the dashboard; the dashboard also verifies its required role with a server RPC. Database RLS continues to enforce ownership independently.
- Image uploads remain limited to each user's own `blog-media/<user-id>/` prefix and the existing image type/size restrictions. Overwrites remain disabled.
- DeepL requests and site settings stay administrator-only. Member publishing works independently of translation.
- Comments are plain text, at most 2,000 characters, and rate limited to one per 30 seconds per account. Authors and administrators can delete them. Comments on unpublished articles are not publicly visible.
- Article views are recorded by `record_article_view`, using the existing private IP HMAC salt and gateway IP header. One IP/article/Vancouver date counts once. Missing or invalid gateway headers do not increment. Browser clients cannot directly write counters or read visitor hashes. Existing views start at zero; historical counts are not invented.

## Verification

`tests/community.sql` creates synthetic fixtures inside one transaction, exercises actual database roles/RLS, and rolls everything back. It covers anonymous/unverified write denial, own/other content boundaries, immutable authors, private drafts, comments and throttling, terms, photo ownership, protected counts and IP/day deduplication. Run the entire file; its final result must say PASS.

Existing checks: `npm run test:blog`, `npm run test:backend`, `npm run build`.

The migration was applied to the configured project on 2026-10-13. Public registration and email confirmation were enabled, and the above redirect URLs were configured. The account owner configured custom SMTP and reported receiving a registration email. Password recovery now returns to `/blog/account/?mode=recovery`, available to ordinary users as well as administrators.

## Taxonomy and playback update (2026-10-13)

Apply `migrations/20261013020000_blog_taxonomy.sql` after the community migration and deploy the updated `blog-translate` function. Only administrators can create terms or write their English/Chinese labels. A database trigger rejects unapproved categories/tags in member article writes, including direct API calls. Canonical names remain stable; translated labels are used in both the picker and public feeds. The existing 3 categories and 8 tags have been translated through DeepL.

Blog, studio, account and administrator routes share the persistent audio element. The floating player supports pointer dragging and arrow-key positioning. Manual sequential/repeat-one steps wrap; shuffle steps draw a new item from the bag in either direction. Automatic repeat-one still repeats the current track.
