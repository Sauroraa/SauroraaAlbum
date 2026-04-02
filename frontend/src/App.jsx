import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
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

const navigation = [
  { to: '/', label: 'Accueil' },
  { to: '/archives', label: 'Archives' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/contact', label: 'Contact' },
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

function Layout({ children, admin }) {
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
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to={admin ? '/admin' : '/admin/login'}
            className={({ isActive }) => `nav-link nav-link--admin${isActive ? ' active' : ''}`}
          >
            Admin
          </NavLink>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <p>Archives photo premium des soirées Sauroraa.</p>
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

function EventCard({ event }) {
  return (
    <article className="event-card">
      <div
        className="event-card__cover"
        style={{
          backgroundImage: event.cover_thumbnail_url
            ? `linear-gradient(180deg, rgba(12,14,18,.12), rgba(12,14,18,.85)), url(${event.cover_thumbnail_url})`
            : undefined,
        }}
      />
      <div className="event-card__body">
        <p>{new Date(event.event_date).toLocaleDateString('fr-BE')}</p>
        <h3>{event.title}</h3>
        <p>{event.location}</p>
        <Link className="button button--ghost" to={`/soiree/${event.slug}`}>
          Voir l’album
        </Link>
      </div>
    </article>
  )
}

function YearCard({ year }) {
  return (
    <Link className="year-card" to={`/archives/${year.year}`}>
      <div
        className="year-card__cover"
        style={{
          backgroundImage: year.cover_image_url
            ? `linear-gradient(180deg, rgba(8,10,14,.15), rgba(8,10,14,.8)), url(${year.cover_image_url})`
            : undefined,
        }}
      />
      <div className="year-card__body">
        <strong>{year.year}</strong>
        <span>{year.event_count} soirées</span>
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
          style={{ backgroundImage: `url(${photo.thumbnail_url})` }}
          aria-label={photo.alt_text || `Photo ${index + 1}`}
        />
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

function HomePage() {
  const [years, setYears] = useState([])
  const [events, setEvents] = useState([])

  useEffect(() => {
    fetchYears().then(setYears)
    fetchEvents().then((items) => setEvents(items.slice(0, 3)))
  }, [])

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <span>Revivez les nuits Sauroraa</span>
          <h1>Une galerie immersive pour les soirées qui marquent.</h1>
          <p>
            Explorez les archives photo, année après année, avec une navigation fluide pensée
            pour mettre les visuels au premier plan.
          </p>
          <div className="hero__actions">
            <Link to="/archives" className="button">
              Parcourir les archives
            </Link>
            <Link to="/a-propos" className="button button--ghost">
              Découvrir l’univers
            </Link>
          </div>
        </div>
        <div className="hero__panel">
          <p>Dernières soirées publiées</p>
          {events.map((event) => (
            <Link key={event.id} to={`/soiree/${event.slug}`} className="hero__event">
              <strong>{event.title}</strong>
              <span>{new Date(event.event_date).toLocaleDateString('fr-BE')}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionIntro
          eyebrow="Archives"
          title="Par année, par ambiance, par souvenir"
          text="Chaque archive rassemble les soirées publiées avec leur couverture, leur date et leur galerie."
          action={
            <Link to="/archives" className="button button--ghost">
              Voir toutes les années
            </Link>
          }
        />
        <div className="year-grid">
          {years.map((year) => (
            <YearCard key={year.year} year={year} />
          ))}
        </div>
      </section>
    </>
  )
}

function ArchivesPage() {
  const [years, setYears] = useState([])
  useEffect(() => {
    fetchYears().then(setYears)
  }, [])

  return (
    <section className="section">
      <SectionIntro
        eyebrow="Archives"
        title="Les années disponibles"
        text="Accédez rapidement à chaque saison de soirées Sauroraa."
      />
      <div className="year-grid">
        {years.map((year) => (
          <YearCard key={year.year} year={year} />
        ))}
      </div>
    </section>
  )
}

function YearPage() {
  const { year } = useParams()
  const [events, setEvents] = useState([])

  useEffect(() => {
    fetchEventsByYear(year).then(setEvents)
  }, [year])

  return (
    <section className="section">
      <SectionIntro
        eyebrow={`Archives ${year}`}
        title={`Soirées ${year}`}
        text="Toutes les soirées publiées pour cette année."
      />
      <div className="event-grid">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}

function EventPage() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [activePhoto, setActivePhoto] = useState(null)

  useEffect(() => {
    fetchEvent(slug).then(setEvent)
  }, [slug])

  if (!event) {
    return <section className="section"><p>Chargement de l’album…</p></section>
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
        <span>{new Date(event.event_date).toLocaleDateString('fr-BE')}</span>
        <h1>{event.title}</h1>
        <p>{event.location}</p>
        {event.description ? <div className="album-hero__description">{event.description}</div> : null}
      </div>
      <PhotoGrid photos={event.photos} onOpen={setActivePhoto} />
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

function AdminLoginPage({ onAuthenticated }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      const user = await loginAdmin(form)
      onAuthenticated(user)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.message || 'Connexion impossible.')
    }
  }

  return (
    <section className="section section--narrow">
      <form className="admin-card" onSubmit={handleSubmit}>
        <SectionIntro
          eyebrow="Espace privé"
          title="Connexion administration"
          text="Accès réservé à l’équipe Sauroraa."
        />
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button" type="submit">
          Se connecter
        </button>
      </form>
    </section>
  )
}

function AdminDashboardPage({ admin, onLogout, onAuthenticated }) {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!admin) return
    fetchAdminEvents().then(setEvents).catch(() => {})
  }, [admin])

  if (!admin) {
    return <AdminLoginPage onAuthenticated={onAuthenticated} />
  }

  async function handleDelete(id) {
    await deleteEvent(id)
    setEvents((current) => current.filter((item) => item.id !== id))
  }

  return (
    <section className="section">
      <div className="admin-toolbar">
        <SectionIntro
          eyebrow="Administration"
          title="Gestion des soirées"
          text="Création, édition, publication et préparation des albums."
        />
        <div className="admin-toolbar__actions">
          <button className="button button--ghost" type="button" onClick={() => navigate('/admin/new')}>
            Nouvelle soirée
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
            Déconnexion
          </button>
        </div>
      </div>
      <div className="admin-table">
        {events.map((event) => (
          <div key={event.id} className="admin-row">
            <div>
              <strong>{event.title}</strong>
              <p>{event.location}</p>
            </div>
            <span>{new Date(event.event_date).toLocaleDateString('fr-BE')}</span>
            <span>{event.is_published ? 'Publié' : 'Brouillon'}</span>
            <div className="admin-row__actions">
              <button className="button button--ghost" type="button" onClick={() => navigate(`/admin/events/${event.id}`)}>
                Éditer
              </button>
              <button className="button button--danger" type="button" onClick={() => handleDelete(event.id)}>
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function AdminEventEditPage({ admin, onAuthenticated }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(emptyEvent)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!admin) return
    fetchAdminEvents()
      .then((items) => {
        setEvents(items)
        const current = items.find((item) => String(item.id) === String(id))
        if (current) {
          setForm({
            ...current,
            cover_photo_id: current.cover_photo_id || '',
            is_published: Boolean(current.is_published),
          })
        }
      })
      .catch(() => {})
  }, [admin, id])

  if (!admin) {
    return <AdminLoginPage onAuthenticated={onAuthenticated} />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const payload = {
      ...form,
      cover_photo_id: form.cover_photo_id || null,
    }
    const result = await saveEvent(payload, id)
    const nextId = id || result?.id
    setStatus('Soirée enregistrée.')
    if (!id && nextId) navigate(`/admin/events/${nextId}`)
  }

  async function handleUpload(event) {
    const files = event.target.files
    if (!files?.length || !id) return
    await uploadPhotos(id, files)
    setStatus('Photos envoyées.')
    const items = await fetchAdminEvents()
    setEvents(items)
  }

  const current = events.find((item) => String(item.id) === String(id))
  const photos = current?.photos || []

  return (
    <section className="section">
      <form className="admin-form" onSubmit={handleSubmit}>
        <SectionIntro
          eyebrow="Administration"
          title={id ? 'Modifier une soirée' : 'Créer une soirée'}
          text="Préparez les métadonnées, le statut de publication et la galerie."
        />
        <div className="form-grid">
          <label>
            Titre
            <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          </label>
          <label>
            Slug URL
            <input value={form.slug || ''} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} />
          </label>
          <label>
            Date
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => setForm((prev) => ({ ...prev, event_date: e.target.value }))}
            />
          </label>
          <label>
            Lieu
            <input value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
          </label>
        </div>
        <label>
          Description
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
          Publier cette soirée
        </label>
        {id ? (
          <label className="upload-field">
            Ajouter des photos
            <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={handleUpload} />
          </label>
        ) : null}
        {photos.length ? (
          <div className="photo-grid photo-grid--admin">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className={`photo-tile ${String(form.cover_photo_id) === String(photo.id) ? 'photo-tile--active' : ''}`}
                onClick={() => setForm((prev) => ({ ...prev, cover_photo_id: photo.id }))}
                style={{ backgroundImage: `url(${photo.thumbnail_url})` }}
              />
            ))}
          </div>
        ) : null}
        {status ? <p className="form-success">{status}</p> : null}
        <div className="hero__actions">
          <button className="button" type="submit">
            Enregistrer
          </button>
          <button className="button button--ghost" type="button" onClick={() => navigate('/admin')}>
            Retour
          </button>
        </div>
      </form>
    </section>
  )
}

export default function App() {
  const [admin, setAdmin] = useState(null)

  useEffect(() => {
    fetchAdminMe().then(setAdmin).catch(() => setAdmin(null))
  }, [])

  return (
    <Layout admin={admin}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/archives" element={<ArchivesPage />} />
        <Route path="/archives/:year" element={<YearPage />} />
        <Route path="/soiree/:slug" element={<EventPage />} />
        <Route
          path="/a-propos"
          element={
            <StaticPage
              eyebrow="À propos"
              title="L’univers Sauroraa"
              text="Une direction artistique nocturne, immersive et pensée pour faire durer l’énergie des soirées au-delà de l’événement."
            />
          }
        />
        <Route
          path="/contact"
          element={
            <StaticPage
              eyebrow="Contact"
              title="Mentions et contact"
              text="Ajoutez ici les mentions légales, les droits à l’image, la politique de confidentialité et les coordonnées officielles."
            />
          }
        />
        <Route path="/admin/login" element={<AdminLoginPage onAuthenticated={setAdmin} />} />
        <Route
          path="/admin"
          element={<AdminDashboardPage admin={admin} onLogout={() => setAdmin(null)} onAuthenticated={setAdmin} />}
        />
        <Route path="/admin/new" element={<AdminEventEditPage admin={admin} onAuthenticated={setAdmin} />} />
        <Route path="/admin/events/:id" element={<AdminEventEditPage admin={admin} onAuthenticated={setAdmin} />} />
      </Routes>
    </Layout>
  )
}
