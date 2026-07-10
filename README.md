# CNI Scan — Frontend

Interface React (React 19 + Vite + TanStack Router/Query/Start + Tailwind) pour
l'extraction OCR et la vérification des cartes nationales d'identité sénégalaises.
Elle consomme l'API FastAPI du projet `cni-ocr-postgres`.

## Prérequis

- Node.js 18+ et npm
- Le backend `cni-ocr-postgres` opérationnel (PostgreSQL + Tesseract). Voir
  `../cni-ocr-postgres/BACKEND_CONTEXT.md`.

## Configuration

Copier `.env.example` en `.env.local` et ajuster si besoin :

```bash
cp .env.example .env.local
```

| Variable       | Description                                   | Défaut                  |
| -------------- | --------------------------------------------- | ----------------------- |
| `VITE_API_URL` | URL de base de l'API backend (sans slash fin) | `http://127.0.0.1:8000` |

> Le backend doit autoriser l'origine du frontend en CORS. Le dev server écoute
> sur **`http://localhost:8080`** (port imposé par `@lovable.dev/vite-tanstack-config`,
> avec repli 8081… si 8080 est occupé). Le backend autorise par défaut tout
> `localhost`/`127.0.0.1` en dev (variables `CORS_ORIGINS` + `CORS_ORIGIN_REGEX`).

## Lancer les deux serveurs

**1. Backend** (terminal 1) :

```bash
cd ../cni-ocr-postgres
source .venv/bin/activate
uvicorn api.main:app --reload   # http://127.0.0.1:8000  (Swagger: /docs)
```

**2. Frontend** (terminal 2) :

```bash
npm install
npm run dev                     # http://localhost:8080  (repli 8081… si occupé)
```

## Scripts

| Commande        | Rôle                                |
| --------------- | ----------------------------------- |
| `npm run dev`   | Serveur de développement (Vite)     |
| `npm run build` | Build de production                 |
| `npm run preview` | Prévisualise le build              |

## Architecture de la couche API

- `src/lib/types.ts` — types alignés sur les schémas Pydantic du backend.
- `src/lib/api.ts` — client fetch + `ApiError` (messages FR par code HTTP).
- `src/lib/hooks/` — hooks react-query : `useHealth`, `useExtract`, `useCnis`,
  `useCniDetail`, `useUpdateCni`, `useStats`.
