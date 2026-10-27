/* Public client config. The publishable key is safe in the browser:
   every table is protected by row-level security and needs a signed-in user.
   NEVER put the secret (sb_secret_…) key in this file or anywhere in the repo. */
window.DATA_CONFIG = {
  supabaseUrl: 'https://sbloucgjyndaqnruxhxv.supabase.co',   // same project as finance — change if you use a separate one
  supabaseKey: 'sb_publishable_pyWZmZNwvqWpNapWOqaDAg_RmLfguVW',
  schema: 'tracker',
};
