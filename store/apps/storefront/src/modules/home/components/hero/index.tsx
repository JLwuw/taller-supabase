import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <section className="coffee-hero">
      <div className="coffee-hero__image" />
      <div className="coffee-hero__content content-container">
        <p className="coffee-kicker">Cafe de especialidad · Ecuador</p>
        <h1>El origen se siente en cada taza.</h1>
        <p className="coffee-hero__copy">
          Lotes pequenos, tostados con intencion y enviados frescos desde las
          montanas de Ecuador.
        </p>
        <LocalizedClientLink href="/store" className="coffee-button">
          Explorar la cosecha
        </LocalizedClientLink>
      </div>
    </section>
  )
}

export default Hero
