/**
 * Utilitaires backend pour gérer les fenêtres temporelles des événements
 * 
 * Règles métier:
 * - Temps réel activé 2h avant le début jusqu'à la fin de l'événement
 * - Check-in autorisé 2h avant le début jusqu'à la fin
 * - Check-out autorisé 5 minutes avant la fin jusqu'à la fin
 */

/**
 * Vérifie si le tracking GPS doit être actif pour un événement
 * @param {Object} event - L'événement avec startDate et endDate
 * @returns {boolean} True si le tracking doit être actif
 */
const isTrackingAllowed = (event) => {
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
  if (!event || !event.startDate || !event.endDate) {
    return false;
  }

  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  
  // 2 heures avant le début
  const preWindowStart = new Date(start.getTime() - 2 * 60 * 60 * 1000);
  
  // Check-in autorisé de 2h avant le début jusqu'à la fin
  return now >= preWindowStart && now <= end;
};

/**
 * Vérifie si le check-out est autorisé
 * @param {Object} event - L'événement
 * @returns {boolean} True si le check-out est autorisé
 */
const isCheckOutAllowed = (event) => {
  if (!event || !event.endDate) {
    return false;
  }

  const now = new Date();
  const end = new Date(event.endDate);
  
  // 5 minutes avant la fin
  const checkOutStart = new Date(end.getTime() - 5 * 60 * 1000);
  
  // Check-out autorisé de 5 min avant la fin jusqu'à la fin
  return now >= checkOutStart && now <= end;
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
  
  // 5 minutes avant la fin
  const checkOutStart = new Date(end.getTime() - 5 * 60 * 1000);

  const isBeforeWindow = now < preWindowStart;
  const isInPreWindow = now >= preWindowStart && now < start;
  const isDuringEvent = now >= start && now <= end;
  const isNearEnd = now >= checkOutStart && now <= end;
  const isAfterEvent = now > end;

  return {
    isBeforeWindow,
    isInPreWindow,
    isDuringEvent,
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
