import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function Footer() {
  return (
    <footer className="coffee-footer">
      <div className="content-container coffee-footer__inner">
        <div>
          <LocalizedClientLink href="/" className="coffee-footer__brand">
            ALTURA / CAFE
          </LocalizedClientLink>
          <p>Especialidad ecuatoriana, tostada con calma.</p>
        </div>
        <div className="coffee-footer__details">
          <span>Loja · Ecuador</span>
          <a href="mailto:hola@alturacafe.ec">hola@alturacafe.ec</a>
          <span>© {new Date().getFullYear()} Altura Cafe</span>
        </div>
      </div>
    </footer>
  )
}
