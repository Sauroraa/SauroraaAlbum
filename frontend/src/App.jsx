import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  deletePhoto,
  deleteEvent,
  fetchAdminEvents,
  fetchAdminMe,
  fetchEvent,
  fetchEvents,
  fetchEventsByYear,
  fetchYears,
  loginAdmin,
  logoutAdmin,
  saveEvent,
  uploadPhotos,
} from './api'
import { translations } from './i18n'
import { getUploadQueue, removeUploadQueueItems, replaceUploadQueue } from './uploadQueue'

const aboutHighlights = [
  'about_highlight_1',
  'about_highlight_2',
  'about_highlight_3',
  'about_highlight_4',
]

const aboutTeam = [
  { name: 'Loris', roleKey: 'team_role_loris' },
  { name: 'Julien', roleKey: 'team_role_julien' },
  { name: 'Alec', roleKey: 'team_role_alec' },
  { name: 'Alexandre', roleKey: 'team_role_alexandre' },
]

const navigation = [
  { to: '/', key: 'nav_home' },
  { to: '/archives', key: 'nav_archives' },
  { to: '/a-propos', key: 'nav_about' },
  { to: '/contact', key: 'nav_contact' },
  { to: '/mentions-legales', key: 'nav_legal' },
]

const emptyEvent = {
  title: '',
  slug: '',
  event_date: '',
  location: '',
  description: '',
  cover_photo_id: '',
  is_published: false,
}

function getSiteOrigin() {
  if (typeof window === 'undefined') return 'https://album.sauroraa.be'
  return window.location.origin || 'https://album.sauroraa.be'
}

function buildPageUrl(pathname = '/') {
  return new URL(pathname, getSiteOrigin()).toString()
}

function ensureMeta(selector, attributes) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== 'content') element.setAttribute(key, value)
    })
    document.head.appendChild(element)
  }
  return element
}

function usePageMeta({ title, description, path, image, type = 'website', jsonLd }) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const canonicalHref = buildPageUrl(path)
    document.title = title
    document.documentElement.setAttribute('data-page', path || '/')

    const descriptionMeta = ensureMeta('meta[name="description"]', { name: 'description' })
    descriptionMeta.setAttribute('content', description)

    const ogTitle = ensureMeta('meta[property="og:title"]', { property: 'og:title' })
    ogTitle.setAttribute('content', title)
    const ogDescription = ensureMeta('meta[property="og:description"]', { property: 'og:description' })
    ogDescription.setAttribute('content', description)
    const ogType = ensureMeta('meta[property="og:type"]', { property: 'og:type' })
    ogType.setAttribute('content', type)
    const ogUrl = ensureMeta('meta[property="og:url"]', { property: 'og:url' })
    ogUrl.setAttribute('content', canonicalHref)
    const ogSite = ensureMeta('meta[property="og:site_name"]', { property: 'og:site_name' })
    ogSite.setAttribute('content', 'Sauroraa Albums')

    const twitterCard = ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card' })
    twitterCard.setAttribute('content', image ? 'summary_large_image' : 'summary')
    const twitterTitle = ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title' })
    twitterTitle.setAttribute('content', title)
    const twitterDescription = ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description' })
    twitterDescription.setAttribute('content', description)

    if (image) {
      const absoluteImage = image.startsWith('http') ? image : buildPageUrl(image)
      const ogImage = ensureMeta('meta[property="og:image"]', { property: 'og:image' })
      ogImage.setAttribute('content', absoluteImage)
      const twitterImage = ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image' })
      twitterImage.setAttribute('content', absoluteImage)
    }

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', canonicalHref)

    let jsonLdScript = document.head.querySelector('script[data-seo-jsonld="true"]')
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script')
      jsonLdScript.setAttribute('type', 'application/ld+json')
      jsonLdScript.setAttribute('data-seo-jsonld', 'true')
      document.head.appendChild(jsonLdScript)
    }
    jsonLdScript.textContent = JSON.stringify(jsonLd)

    return () => {
      document.documentElement.removeAttribute('data-page')
    }
  }, [description, image, jsonLd, path, title, type])
}

function formatEventDate(value, language = 'fr') {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const localeMap = {
    fr: 'fr-BE',
    en: 'en-GB',
    nl: 'nl-BE',
  }
  return date.toLocaleDateString(localeMap[language] || 'fr-BE')
}

function ShareActions({ title, text, path, t }) {
  const [copied, setCopied] = useState(false)
  const shareUrl = buildPageUrl(path)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  async function handleNativeShare() {
    if (!navigator.share) return
    try {
      await navigator.share({ title, text, url: shareUrl })
    } catch {}
  }

  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedText = encodeURIComponent(`${title} - ${text}`)

  return (
    <div className="share-actions">
      {navigator.share ? (
        <button type="button" className="button button--ghost" onClick={handleNativeShare}>
          {t('share')}
        </button>
      ) : null}
      <button type="button" className="button button--ghost" onClick={handleCopy}>
        {copied ? t('copied') : t('copy_link')}
      </button>
      <a
        className="button button--ghost"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
      >
        Facebook
      </a>
      <a
        className="button button--ghost"
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`}
        target="_blank"
        rel="noreferrer"
      >
        X
      </a>
    </div>
  )
}

function LanguageModal({ onSelect, t }) {
  return (
    <div className="language-modal">
      <div className="language-card">
        <span>{t('lang_continue')}</span>
        <h2>{t('lang_title')}</h2>
        <p>{t('lang_text')}</p>
        <div className="language-actions">
          <button className="button" type="button" onClick={() => onSelect('fr')}>
            Francais
          </button>
          <button className="button button--ghost" type="button" onClick={() => onSelect('en')}>
            English
          </button>
          <button className="button button--ghost" type="button" onClick={() => onSelect('nl')}>
            Nederlands
          </button>
        </div>
      </div>
    </div>
  )
}

function Layout({ children, admin, t, language, setLanguage }) {
  return (
    <div className="shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark" />
          <div>
            <strong>Sauroraa</strong>
            <span>Albums</span>
          </div>
        </Link>
        <nav className="nav">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {t(item.key)}
            </NavLink>
          ))}
          <NavLink
            to={admin ? '/admin' : '/admin/login'}
            className={({ isActive }) => `nav-link nav-link--admin${isActive ? ' active' : ''}`}
          >
            {t('nav_admin')}
          </NavLink>
          <div className="language-switcher">
            {['fr', 'en', 'nl'].map((lang) => (
              <button
                key={lang}
                type="button"
                className={`language-chip${language === lang ? ' language-chip--active' : ''}`}
                onClick={() => setLanguage(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <p>{t('footer_tagline')}</p>
        <p>album.sauroraa.be</p>
      </footer>
    </div>
  )
}

function SectionIntro({ eyebrow, title, text, action }) {
  return (
    <div className="section-intro">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  )
}

function EventCard({ event, t, language }) {
  return (
    <article className="event-card">
      <div className="event-card__cover">
        {event.cover_thumbnail_url ? (
          <img
            className="media-cover"
            src={event.cover_thumbnail_url}
            alt={event.title}
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </div>
      <div className="event-card__body">
        <p>{formatEventDate(event.event_date, language)}</p>
        <h3>{event.title}</h3>
        <p>{event.location}</p>
        <Link className="button button--ghost" to={`/soiree/${event.slug}`}>
          {t('view_album')}
        </Link>
      </div>
    </article>
  )
}

function YearCard({ year, t }) {
  return (
    <Link className="year-card" to={`/archives/${year.year}`}>
      <div className="year-card__cover">
        {year.cover_image_url ? (
          <img
            className="media-cover"
            src={year.cover_image_url}
            alt={`${year.year}`}
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </div>
      <div className="year-card__body">
        <strong>{year.year}</strong>
        <span>{year.event_count} {t('events_count').toLowerCase()}</span>
      </div>
    </Link>
  )
}

function PhotoGrid({ photos, onOpen }) {
  return (
    <div className="photo-grid">
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          type="button"
          className="photo-tile"
          onClick={() => onOpen(index)}
          aria-label={photo.alt_text || `Photo ${index + 1}`}
        >
          <img
            src={photo.thumbnail_url}
            alt={photo.alt_text || `Photo ${index + 1}`}
            loading="lazy"
            decoding="async"
          />
        </button>
      ))}
    </div>
  )
}

function PhotoLightbox({ photos, index, onClose, onMove }) {
  useEffect(() => {
    if (index === null) return undefined

    function onKeydown(event) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onMove(1)
      if (event.key === 'ArrowLeft') onMove(-1)
    }

    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [index, onClose, onMove])

  if (index === null || !photos[index]) return null

  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox__nav" type="button" onClick={(e) => { e.stopPropagation(); onMove(-1) }}>
        ‹
      </button>
      <img src={photos[index].url} alt={photos[index].alt_text || ''} onClick={(e) => e.stopPropagation()} />
      <button className="lightbox__nav" type="button" onClick={(e) => { e.stopPropagation(); onMove(1) }}>
        ›
      </button>
    </div>
  )
}

function HomePage({ t, language }) {
  const [years, setYears] = useState([])
  const [events, setEvents] = useState([])
  const featuredEvent = events[0] || null
  const secondaryEvents = events.slice(1, 4)

  usePageMeta({
    title: t('seo_home_title'),
    description: t('seo_home_description'),
    path: '/',
    image: featuredEvent?.cover_image_url || '/og-default.jpg',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Sauroraa Albums',
      url: buildPageUrl('/'),
      description: t('seo_home_description'),
      inLanguage: language,
    },
  })

  useEffect(() => {
    fetchYears().then(setYears)
    fetchEvents().then((items) => setEvents(items.slice(0, 4)))
  }, [])

  return (
    <>
      <section className="hero">
        <div className="hero__backdrop" aria-hidden="true">
          <div className="hero__orb hero__orb--violet" />
          <div className="hero__orb hero__orb--pink" />
          <div className="hero__gridline" />
        </div>
        <div className="hero__copy">
          <span>{t('hero_eyebrow')}</span>
          <h1>{t('hero_title')}</h1>
          <p>{t('hero_text')}</p>
          <div className="hero__actions">
            <Link to="/archives" className="button">
              {t('hero_browse')}
            </Link>
            <Link to="/a-propos" className="button button--ghost">
              {t('hero_discover')}
            </Link>
          </div>
          <div className="hero__status">
            <span>{t('hero_status')}</span>
            <strong>{featuredEvent?.title || 'Sauroraa 2026'}</strong>
          </div>
          <div className="hero__metrics">
            <div>
              <strong>{years.length}</strong>
              <span>{t('metric_years')}</span>
            </div>
            <div>
              <strong>{events.length}</strong>
              <span>{t('metric_recent')}</span>
            </div>
            <div>
              <strong>2026</strong>
              <span>{t('metric_active')}</span>
            </div>
          </div>
          <ShareActions
            title={t('seo_home_title')}
            text={t('seo_home_description')}
            path="/"
            t={t}
          />
        </div>
        <div className="hero__panel">
          {featuredEvent ? (
            <>
              <div
                className="hero__featured"
                style={{
                  backgroundImage: featuredEvent.cover_image_url
                    ? `linear-gradient(180deg, rgba(8,10,14,.08), rgba(8,10,14,.9)), url(${featuredEvent.cover_image_url})`
                    : undefined,
                }}
              >
                <div className="hero__featured-inner">
                  <span>{t('latest_publication')}</span>
                  <h2>{featuredEvent.title}</h2>
                  <p>{featuredEvent.location}</p>
                  <div className="hero__featured-meta">
                    <small>{formatEventDate(featuredEvent.event_date, language)}</small>
                    <small>{featuredEvent.photos?.length || 0} {t('photos_count').toLowerCase()}</small>
                  </div>
                  <Link className="button button--ghost" to={`/soiree/${featuredEvent.slug}`}>
                    {t('open_album')}
                  </Link>
                </div>
              </div>
              <div className="hero__list">
                {secondaryEvents.map((event) => (
                  <Link key={event.id} to={`/soiree/${event.slug}`} className="hero__event">
                    <div>
                      <strong>{event.title}</strong>
                      <small>{event.location}</small>
                    </div>
                    <span>{formatEventDate(event.event_date, language)}</span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>{t('no_published_title')}</strong>
              <p>{t('no_published_text')}</p>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <SectionIntro
          eyebrow={t('archives_eyebrow')}
          title={t('archives_title')}
          text={t('archives_text')}
          action={
            <Link to="/archives" className="button button--ghost">
              {t('view_all_years')}
            </Link>
          }
        />
        {years.length ? (
          <div className="year-grid">
            {years.map((year) => (
              <YearCard key={year.year} year={year} t={t} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>{t('no_archives_title')}</strong>
            <p>{t('no_archives_text')}</p>
          </div>
        )}
      </section>
    </>
  )
}

function ArchivesPage({ t }) {
  const [years, setYears] = useState([])

  usePageMeta({
    title: t('seo_archives_title'),
    description: t('seo_archives_description'),
    path: '/archives',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: t('seo_archives_title'),
      url: buildPageUrl('/archives'),
      description: t('seo_archives_description'),
    },
  })

  useEffect(() => {
    fetchYears().then(setYears)
  }, [])

  return (
    <section className="section">
      <SectionIntro
        eyebrow={t('archives_eyebrow')}
        title={t('years_available')}
        text={t('years_available_text')}
        action={<ShareActions title={t('seo_archives_title')} text={t('seo_archives_description')} path="/archives" t={t} />}
      />
      {years.length ? (
        <div className="year-grid">
          {years.map((year) => (
            <YearCard key={year.year} year={year} t={t} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>{t('no_years_title')}</strong>
          <p>{t('no_years_text')}</p>
        </div>
      )}
    </section>
  )
}

function YearPage({ t, language }) {
  const { year } = useParams()
  const [events, setEvents] = useState([])

  usePageMeta({
    title: t('seo_year_title', { year }),
    description: t('seo_year_description', { year }),
    path: `/archives/${year}`,
    image: events[0]?.cover_image_url || '/og-default.jpg',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: t('seo_year_title', { year }),
      url: buildPageUrl(`/archives/${year}`),
      description: t('seo_year_description', { year }),
    },
  })

  useEffect(() => {
    fetchEventsByYear(year).then(setEvents)
  }, [year])

  return (
    <section className="section">
      <SectionIntro
        eyebrow={t('archives_of_year', { year })}
        title={t('events_of_year', { year })}
        text={t('year_page_text')}
        action={<ShareActions title={t('seo_year_title', { year })} text={t('seo_year_description', { year })} path={`/archives/${year}`} t={t} />}
      />
      {events.length ? (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard key={event.id} event={event} t={t} language={language} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>{t('no_events_year_title')}</strong>
          <p>{t('no_events_year_text')}</p>
        </div>
      )}
    </section>
  )
}

function EventPage({ t, language }) {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [activePhoto, setActivePhoto] = useState(null)

  useEffect(() => {
    fetchEvent(slug).then(setEvent)
  }, [slug])

  usePageMeta({
    title: event ? t('seo_event_title', { title: event.title }) : t('loading_album_title'),
    description: event?.description || (event ? t('seo_event_description', { title: event.title, location: event.location }) : t('loading_album_text')),
    path: `/soiree/${slug}`,
    image: event?.cover_image_url || '/og-default.jpg',
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event?.title || slug,
      startDate: event?.event_date || undefined,
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventCompleted',
      location: event?.location
        ? {
            '@type': 'Place',
            name: event.location,
          }
        : undefined,
      image: event?.cover_image_url ? [event.cover_image_url] : undefined,
      description: event?.description || t('loading_album_text'),
      url: buildPageUrl(`/soiree/${slug}`),
    },
  })

  if (!event) {
    return (
      <section className="section">
        <div className="empty-state">
          <strong>{t('loading_album_title')}</strong>
          <p>{t('loading_album_text')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="section section--album">
      <div
        className="album-hero"
        style={{
          backgroundImage: event.cover_image_url
            ? `linear-gradient(180deg, rgba(10,12,18,.3), rgba(10,12,18,.92)), url(${event.cover_image_url})`
            : undefined,
        }}
      >
        <span>{formatEventDate(event.event_date, language)}</span>
        <h1>{event.title}</h1>
        <p>{event.location}</p>
        {event.description ? <div className="album-hero__description">{event.description}</div> : null}
        <ShareActions
          title={t('seo_event_title', { title: event.title })}
          text={event.description || t('seo_event_description', { title: event.title, location: event.location })}
          path={`/soiree/${slug}`}
          t={t}
        />
      </div>
      {event.photos?.length ? (
        <PhotoGrid photos={event.photos} onOpen={setActivePhoto} />
      ) : (
        <div className="empty-state">
          <strong>{t('no_photos_title')}</strong>
          <p>{t('no_photos_text')}</p>
        </div>
      )}
      <PhotoLightbox
        photos={event.photos}
        index={activePhoto}
        onClose={() => setActivePhoto(null)}
        onMove={(delta) =>
          setActivePhoto((current) => (current === null ? null : (current + delta + event.photos.length) % event.photos.length))
        }
      />
    </section>
  )
}

function StaticPage({ eyebrow, title, text }) {
  return (
    <section className="section section--narrow">
      <SectionIntro eyebrow={eyebrow} title={title} text={text} />
    </section>
  )
}

function AboutPage({ t }) {
  usePageMeta({
    title: t('seo_about_title'),
    description: t('seo_about_description'),
    path: '/a-propos',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: t('seo_about_title'),
      url: buildPageUrl('/a-propos'),
      description: t('seo_about_description'),
    },
  })

  return (
    <section className="section">
      <SectionIntro
        eyebrow={t('about_eyebrow')}
        title={t('about_title')}
        text={t('about_text')}
        action={<ShareActions title={t('seo_about_title')} text={t('seo_about_description')} path="/a-propos" t={t} />}
      />
      <div className="content-grid">
        <article className="content-card">
          <h3>{t('identity_title')}</h3>
          <p>{t('identity_text')}</p>
          <div className="tag-list">
            {aboutHighlights.map((item) => (
              <span key={item} className="info-tag">
                {t(item)}
              </span>
            ))}
          </div>
        </article>

        <article className="content-card">
          <h3>{t('mission_title')}</h3>
          <p>{t('mission_text_1')}</p>
          <p>{t('mission_text_2')}</p>
        </article>
      </div>

      <section className="inner-section">
        <SectionIntro
          eyebrow={t('team_eyebrow')}
          title={t('team_title')}
          text={t('team_text')}
        />
        <div className="team-grid">
          {aboutTeam.map((member) => (
            <article key={member.name} className="team-card">
              <strong>{member.name}</strong>
              <span>{t(member.roleKey)}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

function ContactPage({ t }) {
  usePageMeta({
    title: t('seo_contact_title'),
    description: t('seo_contact_description'),
    path: '/contact',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: t('seo_contact_title'),
      url: buildPageUrl('/contact'),
      description: t('seo_contact_description'),
    },
  })

  return (
    <section className="section">
      <SectionIntro
        eyebrow={t('contact_eyebrow')}
        title={t('contact_title')}
        text={t('contact_text')}
        action={<ShareActions title={t('seo_contact_title')} text={t('seo_contact_description')} path="/contact" t={t} />}
      />
      <div className="content-grid">
        <article className="content-card">
          <h3>{t('main_contact_title')}</h3>
          <p>{t('main_contact_text')}</p>
          <a className="button" href="mailto:contact@sauroraa.be">
            contact@sauroraa.be
          </a>
          <div className="contact-list">
            <div>
              <strong>{t('contact_email_label')}</strong>
              <span>contact@sauroraa.be</span>
            </div>
            <div>
              <strong>{t('contact_site_purpose')}</strong>
              <span>{t('contact_site_purpose_value')}</span>
            </div>
            <div>
              <strong>{t('contact_area')}</strong>
              <span>{t('contact_area_value')}</span>
            </div>
          </div>
        </article>

        <article className="content-card">
          <h3>{t('image_rights_title')}</h3>
          <p>{t('image_rights_text_1')}</p>
          <p>{t('image_rights_text_2')}</p>
          <Link className="button button--ghost" to="/mentions-legales">
            {t('view_legal')}
          </Link>
        </article>
      </div>
    </section>
  )
}

function LegalPage({ t }) {
  usePageMeta({
    title: t('seo_legal_title'),
    description: t('seo_legal_description'),
    path: '/mentions-legales',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: t('seo_legal_title'),
      url: buildPageUrl('/mentions-legales'),
      description: t('seo_legal_description'),
    },
  })

  return (
    <section className="section">
      <SectionIntro
        eyebrow={t('legal_eyebrow')}
        title={t('legal_title')}
        text={t('legal_text')}
        action={<ShareActions title={t('seo_legal_title')} text={t('seo_legal_description')} path="/mentions-legales" t={t} />}
      />
      <div className="content-grid">
        <article className="content-card">
          <h3>{t('legal_editor_title')}</h3>
          <p>{t('legal_editor_text')}</p>
          <div className="contact-list">
            <div>
              <strong>{t('legal_public_name')}</strong>
              <span>SAURORAA</span>
            </div>
            <div>
              <strong>{t('legal_public_form')}</strong>
              <span>{t('legal_public_form_value')}</span>
            </div>
            <div>
              <strong>{t('legal_public_zone')}</strong>
              <span>{t('legal_public_zone_value')}</span>
            </div>
            <div>
              <strong>{t('legal_public_contact')}</strong>
              <span>contact@sauroraa.be</span>
            </div>
          </div>
        </article>

        <article className="content-card">
          <h3>{t('legal_purpose_title')}</h3>
          <p>{t('legal_purpose_text_1')}</p>
          <p>{t('legal_purpose_text_2')}</p>
        </article>

        <article className="content-card">
          <h3>{t('legal_ip_title')}</h3>
          <p>{t('legal_ip_text_1')}</p>
          <p>{t('legal_ip_text_2')}</p>
        </article>

        <article className="content-card">
          <h3>{t('legal_image_title')}</h3>
          <p>{t('legal_image_text_1')}</p>
          <p>{t('legal_image_text_2')}</p>
        </article>

        <article className="content-card">
          <h3>{t('legal_responsibility_title')}</h3>
          <p>{t('legal_responsibility_text_1')}</p>
          <p>{t('legal_responsibility_text_2')}</p>
        </article>

        <article className="content-card">
          <h3>{t('legal_privacy_title')}</h3>
          <p>{t('legal_privacy_text_1')}</p>
          <p>{t('legal_privacy_text_2')}</p>
        </article>

        <article className="content-card">
          <h3>{t('legal_missing_title')}</h3>
          <p>{t('legal_missing_text_1')}</p>
          <div className="tag-list">
            <span className="info-tag">{t('legal_missing_company')}</span>
            <span className="info-tag">{t('legal_missing_vat')}</span>
            <span className="info-tag">{t('legal_missing_address')}</span>
            <span className="info-tag">{t('legal_missing_director')}</span>
            <span className="info-tag">{t('legal_missing_host')}</span>
          </div>
          <p>{t('legal_missing_text_2')}</p>
        </article>
      </div>
    </section>
  )
}

function AdminLoginPage({ onAuthenticated, t }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  usePageMeta({
    title: `${t('admin_login_title')} | Sauroraa Albums`,
    description: t('admin_login_text'),
    path: '/admin/login',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${t('admin_login_title')} | Sauroraa Albums`,
      url: buildPageUrl('/admin/login'),
      description: t('admin_login_text'),
    },
  })

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      const user = await loginAdmin(form)
      onAuthenticated(user)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.message || t('login_error'))
    }
  }

  return (
    <section className="section section--narrow">
      <form className="admin-card" onSubmit={handleSubmit}>
        <SectionIntro
          eyebrow={t('admin_space')}
          title={t('admin_login_title')}
          text={t('admin_login_text')}
        />
        <label>
          {t('email')}
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
        </label>
        <label>
          {t('password')}
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button" type="submit">
          {t('login')}
        </button>
      </form>
    </section>
  )
}

function AdminDashboardPage({ admin, onLogout, onAuthenticated, t, language }) {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  usePageMeta({
    title: `${t('admin_dashboard_title')} | Sauroraa Albums`,
    description: t('admin_dashboard_text'),
    path: '/admin',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${t('admin_dashboard_title')} | Sauroraa Albums`,
      url: buildPageUrl('/admin'),
      description: t('admin_dashboard_text'),
    },
  })

  useEffect(() => {
    if (!admin) return
    fetchAdminEvents().then(setEvents).catch(() => {})
  }, [admin])

  if (!admin) {
    return <AdminLoginPage onAuthenticated={onAuthenticated} t={t} />
  }

  async function handleDelete(id) {
    await deleteEvent(id)
    setEvents((current) => current.filter((item) => item.id !== id))
  }

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      (event.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (event.location || '').toLowerCase().includes(search.toLowerCase()) ||
      (event.slug || '').toLowerCase().includes(search.toLowerCase())

    if (filter === 'published') return matchesSearch && event.is_published
    if (filter === 'draft') return matchesSearch && !event.is_published
    return matchesSearch
  })

  const totalPhotos = events.reduce((sum, event) => sum + (event.photos?.length || 0), 0)
  const publishedCount = events.filter((event) => event.is_published).length
  const draftCount = events.length - publishedCount

  return (
    <section className="section">
      <div className="admin-toolbar">
        <SectionIntro
          eyebrow={t('admin_eyebrow')}
          title={t('admin_dashboard_title')}
          text={t('admin_dashboard_text')}
        />
        <div className="admin-toolbar__actions">
          <button className="button button--ghost" type="button" onClick={() => navigate('/admin/new')}>
            {t('new_event')}
          </button>
          <button
            className="button"
            type="button"
            onClick={async () => {
              await logoutAdmin()
              onLogout()
              navigate('/admin/login')
            }}
          >
            {t('logout')}
          </button>
        </div>
      </div>
      <div className="admin-stats">
        <article className="stat-card">
          <span>{t('events_count')}</span>
          <strong>{events.length}</strong>
        </article>
        <article className="stat-card">
          <span>{t('published_count')}</span>
          <strong>{publishedCount}</strong>
        </article>
        <article className="stat-card">
          <span>{t('draft_count')}</span>
          <strong>{draftCount}</strong>
        </article>
        <article className="stat-card">
          <span>{t('photos_count')}</span>
          <strong>{totalPhotos}</strong>
        </article>
      </div>
      <div className="admin-filters">
        <label>
          {t('search')}
          <input
            type="search"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="filter-group">
          <button
            className={`button button--ghost${filter === 'all' ? ' button--selected' : ''}`}
            type="button"
            onClick={() => setFilter('all')}
          >
            {t('filter_all')}
          </button>
          <button
            className={`button button--ghost${filter === 'published' ? ' button--selected' : ''}`}
            type="button"
            onClick={() => setFilter('published')}
          >
            {t('published_count')}
          </button>
          <button
            className={`button button--ghost${filter === 'draft' ? ' button--selected' : ''}`}
            type="button"
            onClick={() => setFilter('draft')}
          >
            {t('draft_count')}
          </button>
        </div>
      </div>
      <div className="admin-table">
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <strong>{t('no_matching_title')}</strong>
            <p>{t('no_matching_text')}</p>
          </div>
        ) : filteredEvents.map((event) => (
          <div key={event.id} className="admin-row">
            <div>
              <strong>{event.title}</strong>
              <p>{event.location}</p>
              <small>{event.slug}</small>
            </div>
            <span>{formatEventDate(event.event_date, language)}</span>
            <span>{event.is_published ? t('published') : t('draft')}</span>
            <div className="admin-row__actions">
              <Link className="button button--ghost" to={`/soiree/${event.slug}`}>
                {t('see')}
              </Link>
              <button className="button button--ghost" type="button" onClick={() => navigate(`/admin/events/${event.id}`)}>
                {t('edit')}
              </button>
              <button className="button button--danger" type="button" onClick={() => handleDelete(event.id)}>
                {t('delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function AdminEventEditPage({ admin, onAuthenticated, t }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(emptyEvent)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [pendingCoverFile, setPendingCoverFile] = useState(null)
  const [pendingCoverPreview, setPendingCoverPreview] = useState('')
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState([])
  const [coverUploadProgress, setCoverUploadProgress] = useState(0)
  const resumeStartedRef = useRef('')

  usePageMeta({
    title: `${id ? t('edit_event_title') : t('create_event_title')} | Sauroraa Albums`,
    description: t('edit_event_text'),
    path: id ? `/admin/events/${id}` : '/admin/new',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${id ? t('edit_event_title') : t('create_event_title')} | Sauroraa Albums`,
      url: buildPageUrl(id ? `/admin/events/${id}` : '/admin/new'),
      description: t('edit_event_text'),
    },
  })

  useEffect(() => {
    if (!admin) return
    refreshEvents()
  }, [admin, id])

  useEffect(() => {
    return () => {
      if (pendingCoverPreview) {
        URL.revokeObjectURL(pendingCoverPreview)
      }
    }
  }, [pendingCoverPreview])

  useEffect(() => {
    if (!admin || !id || isUploadingPhotos || resumeStartedRef.current === String(id)) return

    let cancelled = false

    async function restorePendingUploads() {
      const queued = await getUploadQueue(id, 'gallery')
      if (cancelled || !queued.length) return

      resumeStartedRef.current = String(id)
      const restoredFiles = queued.map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        file: item.file,
        progress: 0,
        status: 'pending',
      }))
      setPendingPhotoFiles(restoredFiles)
      setStatus(t('upload_resume'))
      await runPhotoUpload(restoredFiles)
    }

    restorePendingUploads().catch(() => {})

    return () => {
      cancelled = true
    }
  }, [admin, id, isUploadingPhotos, t])

  if (!admin) {
    return <AdminLoginPage onAuthenticated={onAuthenticated} t={t} />
  }

  async function refreshEvents(nextCoverId = null) {
    const items = await fetchAdminEvents()
    setEvents(items)
    const current = items.find((item) => String(item.id) === String(id))
    if (current) {
      setForm({
        ...current,
        cover_photo_id: nextCoverId ?? current.cover_photo_id ?? '',
        is_published: Boolean(current.is_published),
      })
    }
    return current
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setStatus('')

    if (!form.title?.trim() || !form.event_date || !form.location?.trim()) {
      setError(t('event_required_error'))
      return
    }

    const payload = {
      ...form,
      cover_photo_id: form.cover_photo_id || null,
    }
    setIsSaving(true)
    try {
      const result = await saveEvent(payload, id)
      const nextId = id || result?.id
      setStatus(t('saved'))
      if (!id && nextId) {
        navigate(`/admin/events/${nextId}`)
        return
      }
      await refreshEvents()
    } catch (err) {
      setError(err.response?.data?.message || t('save_error'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCoverUpload(event) {
    const file = event.target.files?.[0]
    if (!file || !id) return
    setError('')
    setStatus('')
    setIsUploadingCover(true)
    setCoverUploadProgress(0)
    try {
      const created = await uploadPhotos(id, [file], {
        onFileProgress: ({ percent }) => setCoverUploadProgress(percent),
      })
      const coverId = created?.[0]?.id
      if (coverId) {
        const payload = {
          ...form,
          cover_photo_id: coverId,
        }
        await saveEvent(payload, id)
        setForm((prev) => ({ ...prev, cover_photo_id: coverId }))
        await refreshEvents(coverId)
      } else {
        await refreshEvents()
      }
      setStatus(t('cover_uploaded'))
    } catch (err) {
      setError(err.response?.data?.message || t('upload_error'))
    } finally {
      event.target.value = ''
      setPendingCoverFile(null)
      if (pendingCoverPreview) {
        URL.revokeObjectURL(pendingCoverPreview)
        setPendingCoverPreview('')
      }
      setCoverUploadProgress(0)
      setIsUploadingCover(false)
    }
  }

  function handleCoverSelection(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (pendingCoverPreview) {
      URL.revokeObjectURL(pendingCoverPreview)
    }
    setPendingCoverFile(file)
    setPendingCoverPreview(URL.createObjectURL(file))
    handleCoverUpload(event)
  }

  async function runPhotoUpload(queueItems) {
    setError('')
    setIsUploadingPhotos(true)
    try {
      await uploadPhotos(id, queueItems.map((item) => item.file), {
        onFileProgress: ({ index, percent }) => {
          const currentItem = queueItems[index]
          setPendingPhotoFiles((current) =>
            current.map((item) =>
              item.id === currentItem.id ? { ...item, progress: percent, status: 'uploading' } : item,
            ),
          )
        },
        onFileComplete: async ({ index }) => {
          const currentItem = queueItems[index]
          await removeUploadQueueItems([currentItem.id])
          setPendingPhotoFiles((current) =>
            current.map((item) =>
              item.id === currentItem.id ? { ...item, progress: 100, status: 'done' } : item,
            ),
          )
        },
      })
      setStatus(t('photos_sent'))
      await refreshEvents()
    } catch (err) {
      setError(err.response?.data?.message || t('upload_error'))
      setPendingPhotoFiles((current) =>
        current.map((item) => (item.status === 'done' ? item : { ...item, status: 'error' })),
      )
    } finally {
      setIsUploadingPhotos(false)
    }
  }

  async function handleUploadPhotos(event) {
    const files = event.target.files
    if (!files?.length || !id) return
    setStatus('')
    const stored = await replaceUploadQueue(id, 'gallery', Array.from(files))
    const selectedFiles = stored.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      file: item.file,
      progress: 0,
      status: 'pending',
    }))
    setPendingPhotoFiles(selectedFiles)
    await runPhotoUpload(selectedFiles)
    event.target.value = ''
  }

  async function handlePhotoDelete(photoId) {
    setError('')
    setStatus('')
    try {
      await deletePhoto(photoId)
      if (String(form.cover_photo_id) === String(photoId)) {
        setForm((prev) => ({ ...prev, cover_photo_id: '' }))
      }
      await refreshEvents()
      setStatus(t('photo_deleted'))
    } catch (err) {
      setError(err.response?.data?.message || t('delete_photo_error'))
    }
  }

  async function handleSelectCover(photoId) {
    setError('')
    setStatus('')
    try {
      const payload = {
        ...form,
        cover_photo_id: photoId,
      }
      await saveEvent(payload, id)
      setForm((prev) => ({ ...prev, cover_photo_id: photoId }))
      setStatus(t('cover_selected'))
      await refreshEvents(photoId)
    } catch (err) {
      setError(err.response?.data?.message || t('save_error'))
    }
  }

  const current = events.find((item) => String(item.id) === String(id))
  const photos = current?.photos || []
  const coverPhoto = photos.find((photo) => String(photo.id) === String(form.cover_photo_id))
  const uploadDoneCount = pendingPhotoFiles.filter((file) => file.status === 'done').length
  const uploadActiveCount = pendingPhotoFiles.filter((file) => file.status === 'uploading').length
  const uploadErrorCount = pendingPhotoFiles.filter((file) => file.status === 'error').length
  const uploadRemainingCount = pendingPhotoFiles.filter((file) => file.status !== 'done').length
  const uploadOverallProgress = pendingPhotoFiles.length
    ? Math.round(
        pendingPhotoFiles.reduce((sum, file) => sum + (file.progress || 0), 0) / pendingPhotoFiles.length,
      )
    : 0

  return (
    <section className="section">
      <form className="admin-form" onSubmit={handleSubmit}>
        <SectionIntro
          eyebrow={t('admin_eyebrow')}
          title={id ? t('edit_event_title') : t('create_event_title')}
          text={t('edit_event_text')}
        />
        <div className="form-grid">
          <label>
            {t('title')}
            <input required value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          </label>
          <label>
            {t('slug')}
            <input value={form.slug || ''} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} />
          </label>
          <label>
            {t('date')}
            <input
              type="date"
              required
              value={form.event_date}
              onChange={(e) => setForm((prev) => ({ ...prev, event_date: e.target.value }))}
            />
          </label>
          <label>
            {t('location')}
            <input required value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
          </label>
        </div>
        <label>
          {t('description')}
          <textarea
            rows="5"
            value={form.description || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={Boolean(form.is_published)}
            onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))}
          />
          {t('publish_event')}
        </label>
        {id ? (
          <div className="admin-upload-grid">
            <div className="upload-card">
              <div className="upload-card__header">
                <strong>{t('cover_upload_title')}</strong>
                <span>{t('cover_upload_text')}</span>
                <small>{t('upload_help')}</small>
              </div>
              {coverPhoto ? (
                <div className="cover-preview">
                  <img src={coverPhoto.thumbnail_url} alt={t('cover')} />
                </div>
              ) : pendingCoverPreview ? (
                <div className="cover-preview">
                  <img src={pendingCoverPreview} alt={pendingCoverFile?.name || t('cover')} />
                </div>
              ) : (
                <div className="cover-preview cover-preview--empty">
                  <span>{t('no_cover')}</span>
                </div>
              )}
              {pendingCoverFile ? (
                <div className="selected-files">
                  <div className="selected-file">
                    <strong>{pendingCoverFile.name}</strong>
                    <span>{t('selected_cover_ready')}</span>
                    {isUploadingCover ? (
                      <div className="upload-progress">
                        <div className="upload-progress__bar" style={{ width: `${coverUploadProgress}%` }} />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <label className="upload-field upload-field--panel">
                <span>{isUploadingCover ? t('uploading') : t('upload_cover')}</span>
                <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleCoverSelection} disabled={isUploadingCover} />
              </label>
            </div>

            <div className="upload-card">
              <div className="upload-card__header">
                <strong>{t('gallery_upload_title')}</strong>
                <span>{t('gallery_upload_text')}</span>
                <small>{t('upload_help')}</small>
              </div>
              <label className="upload-field upload-field--panel">
                <span>{isUploadingPhotos ? t('uploading') : t('upload_photos')}</span>
                <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={handleUploadPhotos} disabled={isUploadingPhotos} />
              </label>
              {pendingPhotoFiles.length ? (
                <div className="selected-files">
                  <div className="upload-summary">
                    <div className="upload-summary__stats">
                      <strong>{t('files_remaining', { count: uploadRemainingCount })}</strong>
                      <span>{t('files_summary', { total: pendingPhotoFiles.length, done: uploadDoneCount, active: uploadActiveCount, error: uploadErrorCount })}</span>
                    </div>
                    <div className="upload-progress upload-progress--summary">
                      <div className="upload-progress__bar" style={{ width: `${uploadOverallProgress}%` }} />
                    </div>
                  </div>
                  {pendingPhotoFiles.slice(0, 8).map((file) => (
                    <div key={`${file.name}-${file.size}`} className="selected-file">
                      <strong>{file.name}</strong>
                      <span>{Math.max(1, Math.round(file.size / 1024))} KB · {t(`upload_status_${file.status}`)}</span>
                      <div className="upload-progress">
                        <div className="upload-progress__bar" style={{ width: `${file.progress}%` }} />
                      </div>
                    </div>
                  ))}
                  {pendingPhotoFiles.length > 8 ? (
                    <div className="selected-file selected-file--more">
                      <strong>+{pendingPhotoFiles.length - 8}</strong>
                      <span>{t('more_files')}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : <p className="form-hint">{t('save_first_hint')}</p>}
        <div className="admin-stats admin-stats--compact">
          <article className="stat-card">
            <span>{t('photos_count')}</span>
            <strong>{photos.length}</strong>
          </article>
          <article className="stat-card">
            <span>{t('publication')}</span>
            <strong>{form.is_published ? t('yes') : t('no')}</strong>
          </article>
          <article className="stat-card">
            <span>{t('cover')}</span>
            <strong>{form.cover_photo_id ? t('defined') : t('to_choose')}</strong>
          </article>
        </div>
        {photos.length ? (
          <div className="photo-grid photo-grid--admin">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`photo-tile photo-tile--admin ${String(form.cover_photo_id) === String(photo.id) ? 'photo-tile--active' : ''}`}
              >
                <img src={photo.thumbnail_url} alt={photo.alt_text || `Photo ${photo.id}`} loading="lazy" decoding="async" />
                <div className="photo-tile__toolbar">
                  <button type="button" className="photo-pill" onClick={() => handleSelectCover(photo.id)}>
                    {String(form.cover_photo_id) === String(photo.id) ? t('cover_current') : t('set_cover')}
                  </button>
                  <button type="button" className="photo-pill photo-pill--danger" onClick={() => handlePhotoDelete(photo.id)}>
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {status ? <p className="form-success">{status}</p> : null}
        <div className="hero__actions">
          <button className="button" type="submit" disabled={isSaving}>
            {isSaving ? t('saving') : t('save')}
          </button>
          <button className="button button--ghost" type="button" onClick={() => navigate('/admin')}>
            {t('back')}
          </button>
        </div>
      </form>
    </section>
  )
}

export default function App() {
  const [admin, setAdmin] = useState(null)
  const [language, setLanguage] = useState('fr')
  const [languageReady, setLanguageReady] = useState(false)
  const [showLanguageModal, setShowLanguageModal] = useState(false)

  const t = (key, vars = {}) => {
    const current = translations[language] || translations.fr
    const fallback = translations.fr[key]
    const value = current[key] ?? fallback ?? key
    if (typeof value === 'function') return value(vars)
    if (typeof value !== 'string') return value
    return value.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? `{${name}}`)
  }

  useEffect(() => {
    fetchAdminMe().then(setAdmin).catch(() => setAdmin(null))
  }, [])

  useEffect(() => {
    const stored = window.localStorage.getItem('sauroraa-language')
    if (stored && translations[stored]) {
      setLanguage(stored)
      setShowLanguageModal(false)
    } else {
      setShowLanguageModal(true)
    }
    setLanguageReady(true)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    if (languageReady) {
      window.localStorage.setItem('sauroraa-language', language)
    }
  }, [language, languageReady])

  function handleLanguageSelect(nextLanguage) {
    setLanguage(nextLanguage)
    setShowLanguageModal(false)
  }

  if (!languageReady) {
    return null
  }

  return (
    <>
      {showLanguageModal ? <LanguageModal onSelect={handleLanguageSelect} t={t} /> : null}
      <Layout admin={admin} t={t} language={language} setLanguage={handleLanguageSelect}>
        <Routes>
          <Route path="/" element={<HomePage t={t} language={language} />} />
          <Route path="/archives" element={<ArchivesPage t={t} />} />
          <Route path="/archives/:year" element={<YearPage t={t} language={language} />} />
          <Route path="/soiree/:slug" element={<EventPage t={t} language={language} />} />
          <Route path="/a-propos" element={<AboutPage t={t} />} />
          <Route path="/contact" element={<ContactPage t={t} />} />
          <Route path="/mentions-legales" element={<LegalPage t={t} />} />
          <Route path="/admin/login" element={<AdminLoginPage onAuthenticated={setAdmin} t={t} />} />
          <Route
            path="/admin"
            element={<AdminDashboardPage admin={admin} onLogout={() => setAdmin(null)} onAuthenticated={setAdmin} t={t} language={language} />}
          />
          <Route path="/admin/new" element={<AdminEventEditPage admin={admin} onAuthenticated={setAdmin} t={t} />} />
          <Route path="/admin/events/:id" element={<AdminEventEditPage admin={admin} onAuthenticated={setAdmin} t={t} />} />
        </Routes>
      </Layout>
    </>
  )
}
