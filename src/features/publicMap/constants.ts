import type { CategoryConfig, PeriodReference, Period, ProblemCategory, PublicOperator } from './types'

export const OPERATORS: PublicOperator[] = ['MTN', 'Orange', 'Camtel']

/**
 * Les 5 types de problème possibles, mêmes identifiants que l'enum réel du
 * backend (voir types.ts) — labels repris tels quels du cahier des charges
 * ("ce sont les vrais choix du formulaire de l'app mobile").
 */
export const CATEGORIES: Record<ProblemCategory, CategoryConfig> = {
  outage: { label: 'Pas de réseau' },
  slow: { label: 'Internet lent' },
  unstable: { label: 'Réseau instable' },
  calls: { label: 'Appels impossibles' },
  sms: { label: 'SMS impossibles' },
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as ProblemCategory[]

/** Couleurs de marque pour les marqueurs de carte (fill = remplissage, stroke = bordure). */
export const OPERATOR_FILL: Record<PublicOperator, string> = {
  MTN: '#FFC72C',
  Orange: '#FF6B35',
  Camtel: '#4A9FE8',
}

export const OPERATOR_STROKE: Record<PublicOperator, string> = {
  MTN: '#E0A800',
  Orange: '#D4551E',
  Camtel: '#2E7DC9',
}

/** Couleur de texte des badges opérateur dans le fil de signalements. */
export const OPERATOR_BADGE_TEXT: Record<PublicOperator, string> = {
  MTN: '#4A3B00',
  Orange: '#4A1B0C',
  Camtel: '#042C53',
}

/** Fond des aires empilées du graphique d'évolution. */
export const OPERATOR_CHART_BG: Record<PublicOperator, string> = {
  MTN: 'rgba(255,199,44,0.55)',
  Orange: 'rgba(255,107,53,0.55)',
  Camtel: 'rgba(74,159,232,0.55)',
}

/** Petit décalage en degrés pour éviter la superposition exacte des points multi-opérateurs sur une même zone. */
export const OPERATOR_OFFSET: Record<PublicOperator, [lng: number, lat: number]> = {
  MTN: [-0.18, 0.12],
  Orange: [0.18, 0.12],
  Camtel: [0, -0.16],
}

/**
 * Jeux de données de référence par période — utilisés pour le comparatif
 * opérateurs (légende) et la courbe d'évolution, en l'absence pour l'instant
 * d'historique réel côté backend. Isolés ici pour être remplacés facilement
 * par un vrai appel réseau (voir useTrendData.ts).
 */
export const PERIOD_REFERENCE: Record<Period, PeriodReference> = {
  '24h': {
    operateurs: { MTN: 162, Orange: 128, Camtel: 96 },
    trendLabels: ['0h', '3h', '6h', '9h', '12h', '15h', '18h', '21h'],
    trendByOperator: {
      MTN: [4, 3, 8, 18, 26, 34, 41, 28],
      Orange: [3, 2, 6, 14, 20, 27, 33, 23],
      Camtel: [2, 2, 5, 10, 15, 20, 25, 17],
    },
  },
  '7j': {
    operateurs: { MTN: 940, Orange: 760, Camtel: 560 },
    trendLabels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    trendByOperator: {
      MTN: [122, 135, 129, 148, 159, 179, 168],
      Orange: [99, 109, 104, 120, 129, 145, 136],
      Camtel: [73, 80, 77, 88, 95, 106, 100],
    },
  },
  mois: {
    operateurs: { MTN: 4200, Orange: 3350, Camtel: 2480 },
    trendLabels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    trendByOperator: {
      MTN: [924, 1066, 1157, 1166],
      Orange: [738, 851, 923, 930],
      Camtel: [546, 630, 683, 689],
    },
  },
  annee: {
    operateurs: { MTN: 48600, Orange: 39200, Camtel: 29100 },
    trendLabels: ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep'],
    trendByOperator: {
      MTN: [3510, 3680, 3895, 4150, 4365, 4620, 4880, 5090, 5265],
      Orange: [2830, 2965, 3140, 3345, 3520, 3725, 3935, 4105, 4245],
      Camtel: [2100, 2205, 2335, 2490, 2620, 2775, 2930, 3050, 3155],
    },
  },
}

export const PERIODS: { value: Period; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7j', label: '7 jours' },
  { value: 'mois', label: 'Mois' },
  { value: 'annee', label: 'Année' },
]

/** Seuil de zoom au-delà duquel on bascule de la vue régions vers la vue départements. */
export const ZOOM_THRESHOLD = 7
export const MIN_ZOOM = 6
export const MAX_ZOOM = 10

export const MAX_FEED_ENTRIES = 15
