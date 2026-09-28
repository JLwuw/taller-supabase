import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ModuleRegistrationName,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createTaxRegionsWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

const COUNTRY_CODE = "ec"
const REGION_NAME = "Ecuador"
const FULFILLMENT_SET_NAME = "Ecuador delivery"
const SHIPPING_OPTION_NAME = "Standard Shipping"

export default async function addEcuadorRegion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code"],
  })
  const store = stores[0]

  if (!store) {
    throw new Error("No store found. Run the initial data seed first.")
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          { currency_code: "usd", is_default: true },
          { currency_code: "eur", is_default: false },
        ],
      },
    },
  })

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  })
  let region = regions.find((candidate) =>
    candidate.countries?.some((country) => country.iso_2 === COUNTRY_CODE)
  )

  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: REGION_NAME,
            currency_code: "usd",
            countries: [COUNTRY_CODE],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    region = result[0]
    logger.info("Created Ecuador region.")
  } else {
    if (region.currency_code !== "usd") {
      await updateRegionsWorkflow(container).run({
        input: {
          selector: { id: region.id },
          update: { currency_code: "usd" },
        },
      })
      region.currency_code = "usd"
      logger.info("Updated Ecuador region currency to USD.")
    }
    logger.info("Ecuador region already exists; skipped creation.")
  }

  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  })
  if (!taxRegions.some((taxRegion) => taxRegion.country_code === COUNTRY_CODE)) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: COUNTRY_CODE, provider_id: "tp_system" }],
    })
    logger.info("Created Ecuador tax region.")
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfiles[0]
  if (!shippingProfile) {
    throw new Error("No shipping profile found. Run the initial data seed first.")
  }

  const { data: fulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: [
      "id",
      "name",
      "service_zones.id",
      "service_zones.name",
      "service_zones.geo_zones.country_code",
    ],
  })
  let fulfillmentSet = fulfillmentSets.find(
    (candidate) => candidate.name === FULFILLMENT_SET_NAME
  )

  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: FULFILLMENT_SET_NAME,
      type: "shipping",
      service_zones: [
        {
          name: REGION_NAME,
          geo_zones: [{ country_code: COUNTRY_CODE, type: "country" }],
        },
      ],
    })
    logger.info("Created Ecuador fulfillment set and service zone.")
  }

  const serviceZone = fulfillmentSet.service_zones?.[0]
  if (!serviceZone) {
    throw new Error("Ecuador fulfillment set has no service zone.")
  }

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  })
  const stockLocation = stockLocations[0]
  if (stockLocation) {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    })
  }

  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id", "type.code"],
  })
  const standardOption = shippingOptions.find(
    (option) =>
      option.name === SHIPPING_OPTION_NAME &&
      option.service_zone_id === serviceZone.id
  )

  if (!standardOption) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: SHIPPING_OPTION_NAME,
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: serviceZone.id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Ship in 2-3 days.",
            code: "standard",
          },
          prices: [
            { currency_code: "usd", amount: 10 },
            { region_id: region.id, amount: 10 },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
      ],
    })
    logger.info("Created Standard Shipping for Ecuador at USD 10.")
  } else {
    logger.info("Ecuador Standard Shipping already exists; skipped creation.")
  }

  logger.info("Ecuador region setup completed.")
}