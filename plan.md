# Prompty — Prompt & Snippet Library Manager

## Context

The user needs a personal prompt/snippet library to organize, find, and assemble AI prompts quickly. Key emotional reality: the user is sometimes mid-task and needs zero friction; other times they're curating. The single biggest risk of abandonment is the assembly flow (prefix/suffix toggles + variable filling) becoming a chore. Every UX decision should optimize for **confidence without friction**.

The app must run as plain HTML/CSS/JS (no build tools), use Supabase for persistence and auth, and work both hosted (primary) and from `file://` (secondary, e.g. synced folder on multiple machines).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla JS (ES modules), HTML, CSS |
| Data / Auth | Supabase JS v2 via CDN (`esm.sh`) |
| Primary deployment | GitHub Pages or Netlify (static host) |
| Secondary deployment | `file://` from a synced folder (OneDrive/Dropbox) |

**Auth:** Email/password only. No magic links or OAuth — these require a live redirect URL, which breaks `file://` compat. Supabase v2 stores session in `localStorage`; works in both deployment contexts. User logs in once per machine/origin.

---

## File Structure

```
prompty/
├── index.html
├── styles/
│   └── main.css
└── js/
    ├── setup.js             ← first-run config screen (reads/writes localStorage)
    ├── supabase-client.js   ← Supabase client init (reads config from localStorage)
    ├── auth.js              ← login / logout / session guard
    ├── prompts.js           ← CRUD + duplicate naming logic
    ├── affixes.js           ← CRUD for prefix/suffix library
    ├── tags.js              ← CRUD for tag library
    ├── search.js            ← client-side filter/search
    ├── variables.js         ← {{placeholder}} parsing
    ├── assembly.js          ← assembly overlay logic (always shown on copy)
    └── ui.js                ← two-panel layout, event wiring
```

---

## Supabase Schema

### `prompts`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| user_id | uuid FK → auth.users | RLS: user sees only own rows |
| title | text NOT NULL | |
| body | text NOT NULL | prompt text, may contain `{{vars}}` |
| description | text | optional notes |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | updated via trigger |

### `tags`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | RLS scoped |
| name | text NOT NULL | canonical label |
| created_at | timestamptz | |

### `prompt_tags` (junction)
| Column | Type | Notes |
|---|---|---|
| prompt_id | uuid FK → prompts | |
| tag_id | uuid FK → tags | |
| PK | (prompt_id, tag_id) | composite |

Tags are managed in a dedicated **Tags** section (create, rename, delete). Deleting a tag cascades to remove all `prompt_tags` rows. The prompt edit form uses a multi-select picker from the user's tag library.

### `affixes`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | RLS scoped |
| type | text | `'prefix'` or `'suffix'` |
| name | text NOT NULL | display label |
| body | text NOT NULL | the actual text |
| is_active | boolean | global default toggle state |
| sort_order | integer | display ordering |
| created_at | timestamptz | |

RLS policies: `user_id = auth.uid()` on all tables for SELECT, INSERT, UPDATE, DELETE.

---

## Features & Implementation

### Two-Panel Layout
- **Left panel:** search bar at top, tag filter chips, scrollable prompt list (title + first line of description). Collapsible affix drawer at the bottom for managing/toggling global prefix/suffix defaults.
- **Right panel:** prompt detail (read mode) + edit form. Shows title, description, tags, and body. Edit mode shows full form.

### CRUD
- Create/edit form: title (text input), body (textarea), description (textarea), tags (multi-select from tag library).
- Delete: confirmation dialog before Supabase delete.
- Duplicate: smart naming (see below).

### Duplicate with Smart Naming (`prompts.js`)
```
Pattern: title ends with ##NN or ##NN.M
Logic:
  1. Regex: /##(\d+)(?:\.(\d+))?$/
  2. No match → candidate = `${title} ##01`
  3. Match ##NN → candidate = `${base} ##${pad(N+1, 2)}`
  4. Query DB: SELECT 1 FROM prompts WHERE user_id=... AND title=candidate
  5. No collision → use candidate
  6. Collision → try candidate + `.1`, `.2`, … until free
```
The `.#` suffix resets to `.1` each time the `##NN` number increments.

### Assembly Overlay — Always Shown (`assembly.js`)

**Always opens on copy** — even for prompts with no variables and no active affixes. This is intentional: the user wants to see and confirm what will be copied before it goes to the clipboard.

Overlay contents:
1. **Affix toggles:** all user affixes listed (prefixes then suffixes), each with a checkbox. Pre-checked from `is_active` global default. Changes here are per-copy only — do not persist to the DB unless the user explicitly saves new defaults.
2. **Variable fields:** if `{{var}}` found in body, render a labeled input per unique variable. Tab-order flows naturally through fields.
3. **Color-coded preview:** read-only preview area showing the assembled text with prefix highlighted in one color, body in another, suffix in a third. Updates live as the user types variable values or toggles affixes.
4. **Copy button** (primary action, keyboard: `Enter` when no text field is focused, or `Ctrl+Enter` anywhere). Writes assembled text to clipboard and closes overlay.
5. **Keyboard support:** `Escape` to dismiss, `Tab` to move between variable fields.

The overlay must feel snappy — it is the highest-traffic interaction in the app.

### Prefix/Suffix Library (`affixes.js`)
- Managed in the left-panel affix drawer or a dedicated settings view.
- Create, rename, reorder (drag or up/down arrows), delete.
- `is_active` toggle on each affix = global default for the assembly overlay.

### Variable Placeholders (`variables.js`)
- Regex: `/\{\{(\w[\w\s]*)\}\}/g` — extract unique variable names from body.
- Variables are positional: all occurrences of `{{name}}` get the same value.
- No variable definition step needed — they're inferred from the body text.

### Search & Filter (`search.js`)
- In-memory filter over prompts loaded on login.
- Keyword: matches title + body + description (case-insensitive).
- Tag chips: multi-select AND filter (prompt must have all selected tags).
- Re-fetches from Supabase after any CRUD operation.

### Tags Management (`tags.js`)
- Accessible from a Tags panel/modal.
- Create: text input → insert into `tags`.
- Rename: inline edit → update `tags.name` (all `prompt_tags` references update automatically via FK).
- Delete: confirm → delete `tags` row (cascade removes `prompt_tags`).

---

## App Boot Sequence

```
Load index.html
  → supabase-client.js reads localStorage for 'prompty_sb_url' + 'prompty_sb_key'
  → Not found → show First-Run Setup screen
       User enters Supabase Project URL + Anon Key → save to localStorage → initialize client
  → Found → initialize Supabase client with stored values
  → auth.js: supabase.auth.getSession()
       No session → show Login screen (email + password)
       Session found → load app shell
```

A "Reset Setup" option in the settings/profile area clears `prompty_sb_url` and `prompty_sb_key` from localStorage and reloads (useful if switching Supabase projects or reconfiguring).

**No Supabase credentials are ever stored in source files.** Nothing sensitive to gitignore.

## Auth Flow (`auth.js`)

1. On load: `supabase.auth.getSession()` (client already initialized from stored config).
2. No session → show login screen (email + password, no magic link).
3. Login success → load app shell, fetch prompts + affixes + tags.
4. Logout → clear Supabase session, return to login screen.
5. `supabase.auth.onAuthStateChange` listener handles session expiry gracefully.

---

## Deployment Notes

- **Hosted:** Set Supabase project's Site URL to the GitHub Pages / Netlify URL. No redirects needed for email/password auth.
- **file://:** Works as-is. `localStorage` session persists per machine per file path. First open requires login; subsequent opens skip it.
- Supabase URL and anon key are stored in `localStorage` via the first-run setup screen — no credentials in source files, nothing to gitignore.

---

## Verification

1. Open app fresh (no prior setup) → first-run setup screen asks for Supabase URL + anon key → saves to localStorage → proceeds to login.
2. Reload app → setup screen skipped, goes straight to login (or app if session active).
3. Log in with email/password → app loads with two-panel layout.
4. Create a prompt with `{{tone}}` and `{{audience}}` variables → click copy → assembly overlay opens with two fill fields and a color-coded preview.
5. Fill variables, toggle a suffix off → preview updates live → click Copy → clipboard contents match preview.
6. Create a prefix "Be concise:", mark `is_active = true` → open any prompt → overlay pre-checks that prefix.
7. Duplicate `My Prompt ##02` → new prompt `My Prompt ##03` created.
8. Duplicate again when `##03` already exists → new prompt `My Prompt ##03.1`.
9. Search "refactor" → list filters in real time.
10. Create tag "coding", assign to two prompts → filter by tag chip → only those two shown.
11. Rename tag "coding" → "dev" → both prompts still tagged correctly.
12. Reload page → session persists (no re-login).
13. Open from a second machine → log in once → same prompt library appears.

---

## Decisions Made

| Topic | Decision |
|---|---|
| Auth method | Email/password only (no magic links; `file://` compat) |
| Deployment | Hosted primary + `file://` secondary (synced folder) |
| Assembly overlay | Always shown; keyboard-friendly; per-copy affix overrides don't persist |
| Tag model | Managed library — `tags` + `prompt_tags` junction; supports rename/delete |
| Affix global state | `is_active` boolean on the affix row |
| Variable definition | Inferred from `{{name}}` syntax in body — no separate definition step |
| AI send feature | Out of scope for v1; architecture doesn't block adding later |
| Multi-user sharing | Out of scope for v1; RLS already isolates users cleanly |
