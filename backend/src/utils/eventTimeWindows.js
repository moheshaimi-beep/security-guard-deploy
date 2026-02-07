/**
 * Utilitaires backend pour gérer les fenêtres temporelles des événements
 * 
 * Règles métier:
 * - Temps réel activé 2h avant le début jusqu'à la fin de l'événement
 * - Check-in autorisé 2h avant le début jusqu'à (début + tolérance retard)
 * - Check-out autorisé (fin - tolérance départ anticipé) jusqu'à (fin + tolérance départ tardif)
 * 
 * MODE TEST: Définir BYPASS_TIME_WINDOWS=true pour désactiver les validations temporelles
 */

// Mode bypass pour tests/développement
const BYPASS_TIME_WINDOWS = process.env.BYPASS_TIME_WINDOWS === 'true';

if (BYPASS_TIME_WINDOWS) {
  console.log('⚠️ MODE TEST ACTIVÉ - Validation fenêtres de temps DÉSACTIVÉE');
}

/**
 * Vérifie si le tracking GPS doit être actif pour un événement
 * @param {Object} event - L'événement avec startDate et endDate
 * @returns {boolean} True si le tracking doit être actif
 */
const isTrackingAllowed = (event) => {
  // MODE TEST: Toujours autoriser
  if (BYPASS_TIME_WINDOWS) {
    return true;
  }

  if (!event || !event.startDate || !event.endDate) {
    return false;
  }

  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  
  // 2 heures avant le début
  const preWindowStart = new Date(start.getTime() - 2 * 60 * 60 * 1000);
  
  // Le tracking est autorisé de 2h avant le début jusqu'à la fin
  const allowed = now >= preWindowStart && now <= end;
  
  return allowed;
};

/**
 * Vérifie si le check-in est autorisé
 * @param {Object} event - L'événement
 * @returns {boolean} True si le check-in est autorisé
 */
const isCheckInAllowed = (event) => {
  // MODE TEST: Toujours autoriser
  if (BYPASS_TIME_WINDOWS) {
    return true;
  }

  if (!event || !event.startDate || !event.endDate) {
    return false;
  }

  const now = new Date();
  const start = new Date(event.startDate);
  
  // 2 heures avant le début
  const preWindowStart = new Date(start.getTime() - 2 * 60 * 60 * 1000);
  
  // Tolérance de retard (par défaut 15 minutes si non définie)
  const lateThreshold = event.lateThreshold || 15;
  const checkInEnd = new Date(start.getTime() + lateThreshold * 60 * 1000);
  
  // Check-in autorisé de 2h avant le début jusqu'à (début + tolérance retard)
  return now >= preWindowStart && now <= checkInEnd;
};

/**
 * Vérifie si le check-out est autorisé
 * @param {Object} event - L'événement
 * @returns {boolean} True si le check-out est autorisé
 */
const isCheckOutAllowed = (event) => {
  // MODE TEST: Toujours autoriser
  if (BYPASS_TIME_WINDOWS) {
    return true;
  }

  if (!event || !event.endDate) {
    return false;
  }

  const now = new Date();
  const end = new Date(event.endDate);
  
  // Tolérance départ anticipé (par défaut 30 minutes avant la fin)
  const earlyCheckoutTolerance = event.earlyCheckoutTolerance || 30;
  const checkOutStart = new Date(end.getTime() - earlyCheckoutTolerance * 60 * 1000);
  
  // Tolérance départ tardif (par défaut 15 minutes après la fin)
  const lateCheckoutTolerance = event.lateCheckoutTolerance || 15;
  const checkOutEnd = new Date(end.getTime() + lateCheckoutTolerance * 60 * 1000);
  
  // Check-out autorisé de (fin - tolérance anticipé) jusqu'à (fin + tolérance tardif)
  return now >= checkOutStart && now <= checkOutEnd;
};

/**
 * Obtient le statut temporel d'un événement
 * @param {Object} event - L'événement
 * @returns {Object} Statut avec les flags
 */
const getEventTimeStatus = (event) => {
  if (!event || !event.startDate || !event.endDate) {
    return {
      isBeforeWindow: true,
      isInPreWindow: false,
      isDuringEvent: false,
      isNearEnd: false,
      isAfterEvent: false,
      canCheckIn: false,
      canCheckOut: false,
      canTrackGPS: false
    };
  }

  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  
  // 2 heures avant le début
  const preWindowStart = new Date(start.getTime() - 2 * 60 * 60 * 1000);
  
  // Tolérance de retard check-in (par défaut 15 minutes si non définie)
  const lateThreshold = event.lateThreshold || 15;
  const checkInEnd = new Date(start.getTime() + lateThreshold * 60 * 1000);
  
  // Tolérance check-out
  const earlyCheckoutTolerance = event.earlyCheckoutTolerance || 30;
  const lateCheckoutTolerance = event.lateCheckoutTolerance || 15;
  const checkOutStart = new Date(end.getTime() - earlyCheckoutTolerance * 60 * 1000);
  const checkOutEnd = new Date(end.getTime() + lateCheckoutTolerance * 60 * 1000);

  const isBeforeWindow = now < preWindowStart;
  const isInPreWindow = now >= preWindowStart && now < start;
  const isDuringEvent = now >= start && now <= end;
  const isAfterCheckInWindow = now > checkInEnd;
  const isInCheckOutWindow = now >= checkOutStart && now <= checkOutEnd;
  const isAfterCheckOutWindow = now > checkOutEnd;
  const isNearEnd = now >= checkOutStart && now <= end;
  const isAfterEvent = now > end;

  return {
    isBeforeWindow,
    isInPreWindow,
    isDuringEvent,
    isAfterCheckInWindow,
    isInCheckOutWindow,
    isAfterCheckOutWindow,
    isNearEnd,
    isAfterEvent,
    canCheckIn: isCheckInAllowed(event),
    canCheckOut: isCheckOutAllowed(event),
    canTrackGPS: isTrackingAllowed(event)
  };
};

/**
 * Filtre les événements pour ne garder que ceux en fenêtre de tracking
 * @param {Array} events - Liste d'événements
 * @returns {Array} Événements actifs pour le tracking
 */
const getActiveTrackingEvents = (events) => {
  if (!Array.isArray(events)) {
    return [];
  }

  return events.filter(event => {
    const timeStatus = getEventTimeStatus(event);
    return timeStatus.canTrackGPS;
  });
};

module.exports = {
  isTrackingAllowed,
  isCheckInAllowed,
  isCheckOutAllowed,
  getEventTimeStatus,
  getActiveTrackingEvents
};
