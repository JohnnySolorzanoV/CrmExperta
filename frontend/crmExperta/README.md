# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

## API endpoint configuration

This app reads the API base URL from `VITE_API_BASE_URL`.

- If `VITE_API_BASE_URL` is not set, it defaults to `/api`.
- In local development, this works with the Vite proxy configured in `vite.config.js`.
- In DigitalOcean App Platform, set `VITE_API_BASE_URL` to the public backend base that your ingress exposes:
  - If ingress keeps `/api`: `https://your-backend-service-url/api`
  - If ingress strips `/api`: `https://your-backend-service-url`

To configure it:

1. Copy `.env.example` to `.env` (or set env vars in your deployment platform).
2. Set `VITE_API_BASE_URL` when needed.
