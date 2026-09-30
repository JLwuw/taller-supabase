import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="coffee-checkout-shell w-full relative small:min-h-screen flex flex-col">
      <div className="h-16 coffee-checkout-header border-b">
        <nav className="flex h-full items-center content-container justify-between">
          <LocalizedClientLink
            href="/cart"
            className="text-small-semi text-ui-fg-base flex items-center gap-x-2 uppercase flex-1 basis-0"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="rotate-90" size={16} />
            <span className="mt-px hidden small:block txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base ">
              Back to shopping cart
            </span>
            <span className="mt-px block small:hidden txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base">
              Back
            </span>
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/"
            className="txt-compact-xlarge-plus text-ui-fg-subtle hover:text-ui-fg-base uppercase"
            data-testid="store-link"
          >
            ALTURA / CAFE
          </LocalizedClientLink>
          <div className="flex-1 basis-0" />
        </nav>
      </div>
      <main className="relative flex-1" data-testid="checkout-container">{children}</main>
      <div className="coffee-checkout-footer">ALTURA / CAFE · Loja, Ecuador · hola@alturacafe.ec</div>
    </div>
  )
}
