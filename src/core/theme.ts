export const COLORS = {
  // Fonds
  bgPage:       '#F8FAFC',
  bgCard:       '#FFFFFF',
  bgSidebar:    '#0F172A',
  bgSidebarHover: '#1E293B',

  // Accent
  primary:      '#2563EB',
  primaryLight: '#EFF6FF',
  primaryDark:  '#1D4ED8',

  // Textes
  textDark:     '#1E293B',
  textMedium:   '#475569',
  textLight:    '#94A3B8',
  textWhite:    '#F8FAFC',
  textSidebar:  '#94A3B8',
  textSidebarActive: '#FFFFFF',

  // Bordures
  border:       '#E2E8F0',
  borderDark:   '#CBD5E1',

  // Statuts
  success:      '#10B981',
  successLight: '#ECFDF5',
  warning:      '#F59E0B',
  warningLight: '#FFFBEB',
  danger:       '#EF4444',
  dangerLight:  '#FEF2F2',

  // Opérateurs (couleurs officielles)
  mtn:          '#FCD116',
  mtnDark:      '#92700A',
  orange:       '#FF6600',
  orangeDark:   '#7C3200',
  camtel:       '#00A651',
  camtelDark:   '#004D25',

  // Types de problèmes
  outage:       '#EF4444',
  slow:         '#F59E0B',
  unstable:     '#8B5CF6',
  calls:        '#3B82F6',
  sms:          '#06B6D4',
}

export const SHADOWS = {
  card:   '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  cardHover: '0 4px 12px rgba(0,0,0,0.10)',
  sidebar: '2px 0 8px rgba(0,0,0,0.15)',
}

export const RADIUS = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
}

export const OPERATOR_CONFIG = {
  MTN:     { color: '#FCD116', textColor: '#1E293B', label: 'MTN' },
  Orange:  { color: '#FF6600', textColor: '#FFFFFF', label: 'Orange' },
  Camtel:  { color: '#00A651', textColor: '#FFFFFF', label: 'Camtel' },
}

export const ISSUE_CONFIG = {
  outage:   { color: '#EF4444', bg: '#FEF2F2', emoji: '🔴',
              fr: 'Pas de réseau',      en: 'No Service' },
  slow:     { color: '#F59E0B', bg: '#FFFBEB', emoji: '🟠',
              fr: 'Très lent',          en: 'Very Slow' },
  unstable: { color: '#8B5CF6', bg: '#F5F3FF', emoji: '🟡',
              fr: 'Instable',           en: 'Unstable' },
  calls:    { color: '#3B82F6', bg: '#EFF6FF', emoji: '🔵',
              fr: 'Appels impossibles', en: 'Dropped Calls' },
  sms:      { color: '#06B6D4', bg: '#ECFEFF', emoji: '📱',
              fr: 'SMS bloqués',        en: 'SMS Issues' },
}

export const TRANSLATIONS = {
  fr: {
    // Header
    online: 'En ligne', offline: 'Hors ligne',
    tagline: 'Surveillance citoyenne des réseaux télécoms · Cameroun',
    // Filtres
    filters: {
      all: 'Tous', outage: 'Pas de réseau', slow: 'Très lent',
      unstable: 'Instable', calls: 'Appels', sms: 'SMS'
    },
    // KPI
    kpi: {
      total: 'Total signalements', today: "Aujourd'hui",
      subscribers: 'Abonnés mobiles', incidents: 'Incidents actifs'
    },
    // Sections
    reportsMap: 'Carte des signalements',
    reportsByOperator: 'Signalements par opérateur',
    trend7days: 'Évolution 7 jours',
    liveReports: 'Signalements en direct',
    last20: '20 derniers signalements',
    // Temps relatif
    justNow: "À l'instant",
    ago: 'il y a',
    seconds: 's', minutes: 'min', hours: 'h',
    // Carte
    clickRegion: 'Cliquer une région pour filtrer',
    backToNational: '← Retour national',
    // Sidebar
    nav: {
      dashboard: 'Tableau de bord',
      reports: 'Rapports',
      map: 'Carte',
      operators: 'Opérateurs',
      alerts: 'Alertes',
      exports: 'Exports',
      settings: 'Paramètres',
    },
    // Login
    loginTitle: 'Espace Institutionnel ART',
    loginSubtitle: 'Tableau de bord partenaire',
    email: 'Adresse email',
    password: 'Mot de passe',
    loginBtn: 'Se connecter',
    loginError: 'Identifiants incorrects. Vérifiez votre email et mot de passe.',
    logout: 'Déconnexion',
  },
  en: {
    online: 'Online', offline: 'Offline',
    tagline: 'Citizen Telecom Network Monitoring · Cameroon',
    filters: {
      all: 'All', outage: 'No Service', slow: 'Very Slow',
      unstable: 'Unstable', calls: 'Calls', sms: 'SMS'
    },
    kpi: {
      total: 'Total Reports', today: 'Today',
      subscribers: 'Mobile Users', incidents: 'Active Incidents'
    },
    reportsMap: 'Reports Map',
    reportsByOperator: 'Reports by Operator',
    trend7days: '7-Day Trend',
    liveReports: 'Live Reports',
    last20: 'Last 20 reports',
    justNow: 'Just now',
    ago: '', seconds: 's ago', minutes: 'min ago', hours: 'h ago',
    clickRegion: 'Click a region to filter',
    backToNational: '← Back to national',
    nav: {
      dashboard: 'Dashboard',
      reports: 'Reports',
      map: 'Map',
      operators: 'Operators',
      alerts: 'Alerts',
      exports: 'Exports',
      settings: 'Settings',
    },
    loginTitle: 'Institutional Access',
    loginSubtitle: 'ART Partner Dashboard',
    email: 'Email address',
    password: 'Password',
    loginBtn: 'Sign in',
    loginError: 'Incorrect credentials. Please check your email and password.',
    logout: 'Sign out',
  }
}

export const GEOJSON_CAMEROON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { code: "CE", name: "Centre",       name_en: "Centre",    capital: "Yaoundé" },
      geometry: { type: "Polygon" as const, coordinates: [[[11.0,3.2],[12.0,3.2],[13.5,3.5],[14.5,4.0],[14.5,5.5],[13.0,5.8],[12.0,5.5],[11.5,5.0],[11.0,4.5],[10.5,4.0],[11.0,3.2]]] }
    },
    {
      type: "Feature" as const,
      properties: { code: "LT", name: "Littoral",     name_en: "Littoral",  capital: "Douala" },
      geometry: { type: "Polygon" as const, coordinates: [[[9.2,3.8],[10.5,3.8],[11.0,4.5],[10.5,5.5],[9.8,5.2],[9.2,4.8],[8.8,4.2],[9.2,3.8]]] }
    },
    {
      type: "Feature" as const,
      properties: { code: "OU", name: "Ouest",        name_en: "West",      capital: "Bafoussam" },
      geometry: { type: "Polygon" as const, coordinates: [[[9.8,5.2],[10.5,5.5],[11.0,5.8],[10.8,6.5],[10.2,6.8],[9.8,6.5],[9.5,6.0],[9.5,5.5],[9.8,5.2]]] }
    },
    {
      type: "Feature" as const,
      properties: { code: "NW", name: "Nord-Ouest",   name_en: "Northwest", capital: "Bamenda" },
      geometry: { type: "Polygon" as const, coordinates: [[[9.5,5.5],[9.8,6.5],[10.2,6.8],[10.0,7.2],[9.5,7.0],[9.0,6.5],[8.8,6.0],[9.0,5.5],[9.5,5.5]]] }
    },
    {
      type: "Feature" as const,
      properties: { code: "SW", name: "Sud-Ouest",    name_en: "Southwest", capital: "Buea" },
      geometry: { type: "Polygon" as const, coordinates: [[[8.5,4.0],[9.2,3.8],[9.2,4.8],[9.0,5.5],[8.8,6.0],[8.5,5.5],[8.3,4.5],[8.5,4.0]]] }
    },
    {
      type: "Feature" as const,
      properties: { code: "SU", name: "Sud",          name_en: "South",     capital: "Ebolowa" },
      geometry: { type: "Polygon" as const, coordinates: [[[9.2,2.2],[11.0,2.0],[12.0,2.2],[12.5,3.0],[11.5,3.5],[11.0,3.2],[10.0,3.2],[9.5,3.5],[9.0,3.5],[8.8,3.0],[9.2,2.2]]] }
    },
    {
      type: "Feature" as const,
      properties: { code: "ES", name: "Est",          name_en: "East",      capital: "Bertoua" },
      geometry: { type: "Polygon" as const, coordinates: [[[13.5,3.5],[16.0,3.5],[16.2,5.0],[15.0,5.5],[14.5,5.5],[14.5,4.0],[13.5,3.5]]] }
    },
    {
      type: "Feature" as const,
      properties: { code: "AD", name: "Adamaoua",     name_en: "Adamawa",   capital: "Ngaoundéré" },
      geometry: { type: "Polygon" as const, coordinates: [[[11.5,5.8],[13.0,5.8],[14.5,5.5],[15.0,5.5],[15.0,7.5],[14.0,7.8],[13.0,8.0],[12.0,7.5],[11.5,7.0],[11.0,6.5],[11.5,5.8]]] }
    },
    {
      type: "Feature" as const,
      properties: { code: "NO", name: "Nord",         name_en: "North",     capital: "Garoua" },
      geometry: { type: "Polygon" as const, coordinates: [[[12.0,7.5],[13.0,8.0],[14.0,7.8],[15.0,7.5],[15.2,9.0],[14.5,9.5],[13.5,9.5],[13.0,9.0],[12.5,8.5],[12.0,8.0],[12.0,7.5]]] }
    },
    {
      type: "Feature" as const,
      properties: { code: "EN", name: "Extrême-Nord", name_en: "Far North",  capital: "Maroua" },
      geometry: { type: "Polygon" as const, coordinates: [[[13.0,9.0],[13.5,9.5],[14.5,9.5],[15.2,9.0],[15.5,10.0],[15.2,11.0],[14.5,12.0],[13.5,12.5],[13.0,12.0],[13.5,11.0],[13.5,10.0],[13.0,9.0]]] }
    },
  ]
}
