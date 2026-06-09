# Supabase live submissions setup

This site can publish visitor submissions directly when a Supabase project is configured.

## 1. Create the table

In Supabase, open SQL Editor and run the SQL in `supabase.sql`.

The script creates `public.submissions`, enables Row Level Security, and allows anonymous visitors to:

- read public submissions
- insert new anonymous submissions

## 2. Copy public browser keys

In the Supabase dashboard, copy:

- Project URL
- anon / publishable key

Do not use the `service_role` key in this static site.

## 3. Update `config.js`

```js
window.YUSHUO_BACKEND = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabaseAnonKey: "YOUR_ANON_OR_PUBLISHABLE_KEY",
};
```

After updating `config.js`, commit and push to GitHub Pages.

## Note

This is a direct-publication workflow. Anyone with the access code can submit content that becomes public after the client-side privacy check passes.
