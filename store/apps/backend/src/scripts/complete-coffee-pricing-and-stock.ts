import type { ExecArgs } from "@medusajs/framework/types"
import {
  createInventoryLevelsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export default async function completeCoffeePricingAndStock({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "variants.id",
      "variants.prices.currency_code",
      "variants.prices.amount",
    ],
    filters: { handle: [
      "sierra-andina",
      "bosque-de-niebla",
      "volcan-de-cacao",
      "bruma-floral",
      "fuego-lento",
      "luna-de-canela",
    ] },
  })

  const productVariants = products.flatMap((product) =>
    (product.variants ?? []).map((variant) => {
      const usdPrice = (variant.prices ?? []).find(
        (price) => price.currency_code === "usd"
      )
      const eurPrice = (variant.prices ?? []).find(
        (price) => price.currency_code === "eur"
      )

      return {
        id: variant.id,
        prices: [
          {
            currency_code: "usd",
            amount: usdPrice?.amount ?? 0,
          },
          {
            currency_code: "eur",
            amount: eurPrice?.amount ?? Math.round((usdPrice?.amount ?? 0) * 0.92),
          },
        ],
      }
    })
  )

  if (productVariants.length) {
    await updateProductVariantsWorkflow(container).run({
      input: { product_variants: productVariants },
    })
    logger.info(`Updated EUR prices for ${productVariants.length} coffee variant(s).`)
  }

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  })
  const stockLocation = stockLocations[0]
  if (!stockLocation) {
    throw new Error("No stock location found. Run the initial data seed first.")
  }

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })
  const { data: inventoryLevels } = await query.graph({
    entity: "inventory_level",
    fields: ["inventory_item_id", "location_id"],
  })
  const existingLevels = new Set(
    inventoryLevels.map(
      (level) => `${level.inventory_item_id}:${level.location_id}`
    )
  )
  const missingLevels = inventoryItems.filter(
    (item) => !existingLevels.has(`${item.id}:${stockLocation.id}`)
  )

  if (missingLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: missingLevels.map((item) => ({
          location_id: stockLocation.id,
          stocked_quantity: 100,
          inventory_item_id: item.id,
        })),
      },
    })
    logger.info(`Added stock for ${missingLevels.length} inventory item(s).`)
  } else {
    logger.info("All inventory items already have stock levels.")
  }

  const search = container.resolve(Modules.SEARCH)
  await search.ingest({
    name: "product.created",
    data: products.map((product) => ({ id: product.id })),
  } as never)
  logger.info("Coffee pricing and stock completed.")
}