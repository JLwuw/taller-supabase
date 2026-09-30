# Altura Cafe

Tienda de cafe de especialidad ecuatoriano construida con Medusa JS v2, Next.js y PostgreSQL en Supabase.

## Arquitectura

```text
Next.js storefront :8000
        |
        | Medusa JS SDK + Publishable API Key
        v
Medusa backend :9000
        |
        | DATABASE_URL con Session Pooler Supabase
        v
PostgreSQL Supabase :5432
```

El storefront nunca usa `supabase-js`, Auth ni Storage de Supabase. Supabase se utiliza exclusivamente como PostgreSQL para Medusa. El backend ejecuta migraciones y persiste productos, regiones, carritos y ordenes.

## Requisitos

- Node.js 22 (`.nvmrc` contiene `22`)
- pnpm 10.34.0
- PostgreSQL Supabase accesible mediante Session Pooler en el puerto `5432`

## Configuracion local

1. Instala dependencias:

```powershell
cd store
pnpm install
```

2. Crea los archivos locales desde las plantillas:

```powershell
Copy-Item apps/backend/.env.template apps/backend/.env
Copy-Item apps/storefront/.env.template apps/storefront/.env.local
```

3. En `apps/backend/.env`, configura `DATABASE_URL` con la URI de Supabase y agrega `?sslmode=no-verify`. Los archivos `.env` y `.env.local` estan excluidos por `.gitignore` y nunca deben versionarse.

4. En `apps/storefront/.env.local`, coloca la Publishable API Key creada en Medusa.

## Preparar la base y el catalogo

Desde `store`:

```powershell
cd apps/backend
pnpm medusa db:migrate
pnpm medusa user -e admin@medusajs.com -p supersecret
cd ../..
pnpm backend:region
pnpm backend:coffee
pnpm backend:coffee-stock
```

Los scripts son:

- `backend:region`: configura Ecuador (`ec`) en USD, tax region y envio Standard de 10 USD; es idempotente.
- `backend:coffee`: archiva productos anteriores y crea el catalogo propio de seis cafes ecuatorianos.
- `backend:coffee-stock`: anade precios EUR para DK y stock para las variantes.

## Arranque

En dos terminales, desde `store`:

```powershell
pnpm backend:dev
```

```powershell
pnpm storefront:dev
```

URLs:

- Tienda Ecuador: `http://localhost:8000/ec`
- Catalogo Ecuador: `http://localhost:8000/ec/store`
- Tienda Europa: `http://localhost:8000/dk/store`
- Admin Medusa: `http://localhost:9000/app`

Credenciales locales del admin:

- Email: `admin@medusajs.com`
- Password: `supersecret`

## Flujo de compra

1. Abre `/ec/store`.
2. Selecciona un cafe propio, elige cantidad y anadelo al carrito.
3. Entra al checkout, completa direccion, delivery y pago.
4. Confirma la orden.
5. Verifica la orden creada en el Admin de Medusa y las tablas correspondientes de PostgreSQL en Supabase.

## Evidencia para la presentacion

- Mostrar `store_region` con Ecuador en `usd` y Europa en `eur`.
- Mostrar `product`, variantes, precios e inventario.
- Mostrar `cart` y `order` despues de completar una compra.
- Explicar el flujo `storefront -> backend Medusa -> PostgreSQL Supabase`.
- Explicar que Redis externo no se configura; Medusa usa su fallback local durante desarrollo.

## Validacion

```powershell
pnpm build
```

La aplicacion usa `http://localhost:8000` para el storefront y `http://localhost:9000` para el backend/admin. La raiz redirige a `/ec`; `/dk` permanece disponible con precios EUR.
