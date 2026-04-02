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

const aboutHighlights = [
  'Collectif d’evenements electroniques underground en Belgique',
  'Structure professionnelle nee en 2025',
  'Vision independante, moderne et creative de l’evenementiel',
  'Production d’experiences immersives son, lumiere et image',
]

const aboutTeam = [
  { name: 'Loris', role: 'President & Directeur Technique' },
  { name: 'Julien', role: 'Vice-President & Directeur Artistique' },
  { name: 'Alec', role: 'Tresorier & Directeur Logistique' },
  { name: 'Alexandre', role: 'Gestion Artistes' },
]

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

function formatEventDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('fr-BE')
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
        <p>Archives photo des soirées Sauroraa.</p>
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
        <p>{formatEventDate(event.event_date)}</p>
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
  const featuredEvent = events[0] || null
  const secondaryEvents = events.slice(1, 4)

  useEffect(() => {
    fetchYears().then(setYears)
    fetchEvents().then((items) => setEvents(items.slice(0, 4)))
  }, [])

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <span>Revivez les nuits Sauroraa</span>
          <h1>Les archives qui prolongent l’univers Sauroraa.</h1>
          <p>
            Une plateforme photo pensée pour parcourir les soirées passées avec une vraie
            presence visuelle, une navigation simple, et une mise en avant claire des albums.
          </p>
          <div className="hero__actions">
            <Link to="/archives" className="button">
              Parcourir les archives
            </Link>
            <Link to="/a-propos" className="button button--ghost">
              Découvrir l’univers
            </Link>
          </div>
          <div className="hero__metrics">
            <div>
              <strong>{years.length}</strong>
              <span>Annees</span>
            </div>
            <div>
              <strong>{events.length}</strong>
              <span>Albums recents</span>
            </div>
            <div>
              <strong>2026</strong>
              <span>Archive active</span>
            </div>
          </div>
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
                <span>Derniere publication</span>
                <h2>{featuredEvent.title}</h2>
                <p>{featuredEvent.location}</p>
                <Link className="button button--ghost" to={`/soiree/${featuredEvent.slug}`}>
                  Ouvrir l’album
                </Link>
              </div>
              <div className="hero__list">
                {secondaryEvents.map((event) => (
                  <Link key={event.id} to={`/soiree/${event.slug}`} className="hero__event">
                    <div>
                      <strong>{event.title}</strong>
                      <small>{event.location}</small>
                    </div>
                    <span>{formatEventDate(event.event_date)}</span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>Aucune soiree publiee pour le moment.</strong>
              <p>Les prochains albums apparaitront ici des qu’ils seront disponibles.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <SectionIntro
          eyebrow="Archives"
          title="Des archives pensees comme un vrai catalogue visuel"
          text="Chaque annee rassemble les soirees publiees avec leur couverture, leur date, leur lieu et un acces rapide a l’album."
          action={
            <Link to="/archives" className="button button--ghost">
              Voir toutes les années
            </Link>
          }
        />
        {years.length ? (
          <div className="year-grid">
            {years.map((year) => (
              <YearCard key={year.year} year={year} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>Aucune archive n’est encore publiee.</strong>
            <p>Publiez une premiere soiree depuis l’administration pour alimenter la home.</p>
          </div>
        )}
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
      {years.length ? (
        <div className="year-grid">
          {years.map((year) => (
            <YearCard key={year.year} year={year} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>Aucune annee disponible.</strong>
          <p>Les archives apparaitront ici automatiquement apres publication.</p>
        </div>
      )}
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
      {events.length ? (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>Aucune soiree publiee sur cette annee.</strong>
          <p>La page se remplira automatiquement des qu’une soiree sera publiee.</p>
        </div>
      )}
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
    return (
      <section className="section">
        <div className="empty-state">
          <strong>Chargement de l’album…</strong>
          <p>Les photos et informations de la soiree arrivent.</p>
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
        <span>{formatEventDate(event.event_date)}</span>
        <h1>{event.title}</h1>
        <p>{event.location}</p>
        {event.description ? <div className="album-hero__description">{event.description}</div> : null}
      </div>
      {event.photos?.length ? (
        <PhotoGrid photos={event.photos} onOpen={setActivePhoto} />
      ) : (
        <div className="empty-state">
          <strong>Aucune photo n’est encore disponible pour cet album.</strong>
          <p>Ajoutez des images depuis l’administration pour publier la galerie.</p>
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

function AboutPage() {
  return (
    <section className="section">
      <SectionIntro
        eyebrow="A propos"
        title="Sauroraa, collectif d’evenements electroniques underground"
        text="D’apres les informations publiques de sauroraa.be, Sauroraa est une structure professionnelle nee en Belgique en 2025, fondee par trois passionnes de musique electronique, avec une ambition immersive, independante et creative."
      />
      <div className="content-grid">
        <article className="content-card">
          <h3>Identite</h3>
          <p>
            Sauroraa ne se limite pas a l’organisation de soirees. Le collectif conçoit des
            experiences ou le son, la lumiere et l’image se rencontrent pour construire un
            univers nocturne fort, coherent et culturellement marque.
          </p>
          <div className="tag-list">
            {aboutHighlights.map((item) => (
              <span key={item} className="info-tag">
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="content-card">
          <h3>Mission</h3>
          <p>
            La mission de Sauroraa est de produire des evenements immersifs, valoriser des
            artistes visionnaires et connecter les publics autour d’experiences sensibles et
            memorables. Le collectif produit aussi du contenu visuel et digital pour des projets
            a fort impact culturel.
          </p>
          <p>
            Basee en Wallonie, la structure etend son activite a travers toute la Belgique avec
            une ambition europeenne.
          </p>
        </article>
      </div>

      <section className="inner-section">
        <SectionIntro
          eyebrow="Equipe"
          title="Une equipe soudee entre vision creative et logistique"
          text="L’equipe publique presentee sur sauroraa.be met en avant une organisation claire entre direction technique, artistique, logistique et gestion artistes."
        />
        <div className="team-grid">
          {aboutTeam.map((member) => (
            <article key={member.name} className="team-card">
              <strong>{member.name}</strong>
              <span>{member.role}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

function ContactPage() {
  return (
    <section className="section">
      <SectionIntro
        eyebrow="Contact"
        title="Contact, mentions et informations utiles"
        text="Pour toute question, proposition, booking ou demande de collaboration, l’adresse de contact publique de Sauroraa est disponible ci-dessous."
      />
      <div className="content-grid">
        <article className="content-card">
          <h3>Contact principal</h3>
          <p>
            Vous pouvez contacter l’equipe Sauroraa pour les demandes generales, partenariats,
            bookings, contenus visuels et informations liees aux evenements.
          </p>
          <a className="button" href="mailto:contact@sauroraa.be">
            contact@sauroraa.be
          </a>
          <div className="contact-list">
            <div>
              <strong>Email</strong>
              <span>contact@sauroraa.be</span>
            </div>
            <div>
              <strong>Objet du site</strong>
              <span>Archives photo officielles des soirees Sauroraa</span>
            </div>
            <div>
              <strong>Zone d’activite</strong>
              <span>Wallonie et Belgique</span>
            </div>
          </div>
        </article>

        <article className="content-card">
          <h3>Mentions et droits a l’image</h3>
          <p>
            Les contenus photo publies sur cette plateforme sont lies aux evenements Sauroraa.
            Toute demande relative a l’image, au retrait d’un contenu, a une rectification ou a
            une utilisation non autorisee peut etre adressee directement a l’equipe via l’email
            de contact.
          </p>
          <p>
            Une page juridique plus detaillee pourra etre completee ensuite avec les mentions
            legales, la politique de confidentialite et les conditions de publication des medias.
          </p>
        </article>
      </div>
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
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

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

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.location.toLowerCase().includes(search.toLowerCase()) ||
      event.slug.toLowerCase().includes(search.toLowerCase())

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
      <div className="admin-stats">
        <article className="stat-card">
          <span>Soirees</span>
          <strong>{events.length}</strong>
        </article>
        <article className="stat-card">
          <span>Publiees</span>
          <strong>{publishedCount}</strong>
        </article>
        <article className="stat-card">
          <span>Brouillons</span>
          <strong>{draftCount}</strong>
        </article>
        <article className="stat-card">
          <span>Photos</span>
          <strong>{totalPhotos}</strong>
        </article>
      </div>
      <div className="admin-filters">
        <label>
          Rechercher
          <input
            type="search"
            placeholder="Titre, lieu ou slug"
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
            Tout
          </button>
          <button
            className={`button button--ghost${filter === 'published' ? ' button--selected' : ''}`}
            type="button"
            onClick={() => setFilter('published')}
          >
            Publiees
          </button>
          <button
            className={`button button--ghost${filter === 'draft' ? ' button--selected' : ''}`}
            type="button"
            onClick={() => setFilter('draft')}
          >
            Brouillons
          </button>
        </div>
      </div>
      <div className="admin-table">
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <strong>Aucune soiree ne correspond au filtre actuel.</strong>
            <p>Commencez par creer une nouvelle soiree ou modifiez votre recherche.</p>
          </div>
        ) : filteredEvents.map((event) => (
          <div key={event.id} className="admin-row">
            <div>
              <strong>{event.title}</strong>
              <p>{event.location}</p>
              <small>{event.slug}</small>
            </div>
            <span>{formatEventDate(event.event_date)}</span>
            <span>{event.is_published ? 'Publié' : 'Brouillon'}</span>
            <div className="admin-row__actions">
              <Link className="button button--ghost" to={`/soiree/${event.slug}`}>
                Voir
              </Link>
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
        ) : <p className="form-hint">Enregistrez d’abord la soiree pour activer l’upload des photos.</p>}
        <div className="admin-stats admin-stats--compact">
          <article className="stat-card">
            <span>Photos</span>
            <strong>{photos.length}</strong>
          </article>
          <article className="stat-card">
            <span>Publication</span>
            <strong>{form.is_published ? 'Oui' : 'Non'}</strong>
          </article>
          <article className="stat-card">
            <span>Couverture</span>
            <strong>{form.cover_photo_id ? 'Definie' : 'A choisir'}</strong>
          </article>
        </div>
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
        <Route path="/a-propos" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
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
