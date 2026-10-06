# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Formatting

Run `npm run format` to format the source and configuration files, and
`npm run format:check` to check them without making changes. GitHub Actions
runs the formatting check on pushes and pull requests. Generated files and
build output are excluded.

## Vercel deployment

The app uses TanStack Start and Nitro's Vercel preset. `vercel.json` selects
the TanStack Start framework so Vercel does not use the previous Next.js preset.
Deploy the production branch through the existing Vercel GitHub integration.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for each deployment
environment. The build also accepts the existing Vercel integration's
`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` names.
Only the public URL and publishable key are bundled into the frontend;
server secrets must remain unprefixed. Copy `.env.example` to `.env.local`
for local development.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
