import type { ExecArgs } from "@medusajs/framework/types"
import {
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"

const COFFEE_COLLECTION = "Cafe de Origen"
const COFFEE_CATEGORY = "Cafe"

const COFFEE_PRODUCTS = [
  ["Sierra Andina", "sierra-andina", "Caturra lavado · Loja", 18, "photo-1495474472287-4d71bcdd2085"],
  ["Bosque de Niebla", "bosque-de-niebla", "Typica honey · Pichincha", 21, "photo-1447933601403-0c6688de566e"],
  ["Volcan de Cacao", "volcan-de-cacao", "Bourbon natural · Cotopaxi", 20, "photo-1514432324607-a09d9b4aefdd"],
  ["Bruma Floral", "bruma-floral", "Sidra lavado · Imbabura", 24, "photo-1509042239860-f550ce710b93"],
  ["Fuego Lento", "fuego-lento", "Blend espresso · Ecuador", 16, "photo-1445116572660-236099ec97a0"],
  ["Luna de Canela", "luna-de-canela", "Castillo lavado · Azuay", 19, "photo-1498804103079-a6351b050096"],
] as const

export default async function replaceWithCoffeeCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const search = container.resolve(Modules.SEARCH)
  const productModuleService = container.resolve(Modules.PRODUCT)

  const { data: salesChannels } = await query.graph({ entity: "sales_channel", fields: ["id"] })
  const { data: shippingProfiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
  const salesChannel = salesChannels[0]
  const shippingProfile = shippingProfiles[0]

  if (!salesChannel || !shippingProfile) {
    throw new Error("Run the initial data seed before replacing the catalog.")
  }

  const { data: existingProducts } = await query.graph({ entity: "product", fields: ["id"] })
  if (existingProducts.length) {
    await Promise.all(
      existingProducts.map((product) =>
        productModuleService.updateProducts(product.id, {
          status: ProductStatus.DRAFT,
        })
      )
    )
    logger.info(`Archived ${existingProducts.length} existing products.`)
  }

  const { data: existingCollections } = await query.graph({ entity: "product_collection", fields: ["id", "title"] })
  let collection = existingCollections.find((candidate) => candidate.title === COFFEE_COLLECTION)
  if (!collection) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: { collections: [{ title: COFFEE_COLLECTION }] },
    })
    collection = result[0]
  }

  const { data: existingCategories } = await query.graph({ entity: "product_category", fields: ["id", "name"] })
  let category = existingCategories.find((candidate) => candidate.name === COFFEE_CATEGORY)
  if (!category) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: [{ name: COFFEE_CATEGORY, is_active: true }] },
    })
    category = result[0]
  }

  const { data: existingOptions } = await query.graph({ entity: "product_option", fields: ["id", "title"] })
  let option = existingOptions.find((candidate) => candidate.title === "Presentacion")
  if (!option) {
    const { result } = await createProductOptionsWorkflow(container).run({
      input: { product_options: [{ title: "Presentacion", values: ["340 g"] }] },
    })
    option = result[0]
  }

  await createProductsWorkflow(container).run({
    input: {
      products: COFFEE_PRODUCTS.map(([title, handle, subtitle, price, imageId]) => {
        const image = `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=1200&q=85`
        return {
          title,
          handle,
          subtitle,
          description: `${title} es un cafe de especialidad de Ecuador, tostado en lotes pequenos para revelar notas dulces y limpias.`,
          status: ProductStatus.PUBLISHED,
          thumbnail: image,
          images: [{ url: image }],
          weight: 340,
          shipping_profile_id: shippingProfile.id,
          collection_id: collection.id,
          category_ids: [category.id],
          sales_channels: [{ id: salesChannel.id }],
          options: [{ id: option.id }],
          variants: [{
            title: "340 g",
            sku: `CAFE-${handle.toUpperCase()}`,
            options: { Presentacion: "340 g" },
            prices: [{ currency_code: "usd", amount: price * 100 }],
          }],
        }
      }),
    },
  })

  const { data: allProducts } = await query.graph({ entity: "product", fields: ["id"] })
  await search.ingest({
    name: "product.created",
    data: allProducts.map((product) => ({ id: product.id })),
  } as never)

  logger.info(`Coffee catalog ready with ${COFFEE_PRODUCTS.length} products.`)
}