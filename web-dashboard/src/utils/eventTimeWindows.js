/**
 * Utilitaires pour gérer les fenêtres temporelles des événements
 * 
 * Règles métier:
 * - Temps réel activé 2h avant le début jusqu'à la fin de l'événement
 * - Check-in autorisé 2h avant le début jusqu'à la fin
 * - Check-out autorisé 5 minutes avant la fin jusqu'à la fin
 */

/**
 * Calcule le statut temporel d'un événement
 * @param {Object} event - L'événement avec startDate et endDate
 * @returns {Object} Statut temporel avec les flags is*
 */
export const getEventTimeStatus = (event) => {
  if (!event || !event.startDate || !event.endDate) {
    return {
      isBeforeWindow: true,
      isInPreWindow: false,
      isDuringEvent: false,
      isNearEnd: false,
      isAfterEvent: false,
      canCheckIn: false,
      canCheckOut: false,
      canTrackGPS: false,
      minutesUntilStart: null,
      minutesUntilEnd: null,
      status: 'unknown'
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

  // Calcul des minutes restantes
  const minutesUntilStart = isBeforeWindow || isInPreWindow 
    ? Math.ceil((start - now) / (60 * 1000)) 
    : null;
  
  const minutesUntilEnd = !isAfterEvent 
    ? Math.ceil((end - now) / (60 * 1000)) 
    : null;

  // Règles métier
  const canCheckIn = (isInPreWindow || isDuringEvent) && !isAfterEvent;
  const canCheckOut = isNearEnd || (isDuringEvent && now >= checkOutStart);
  const canTrackGPS = (isInPreWindow || isDuringEvent) && !isAfterEvent;

  // Déterminer le statut
  let status;
  if (isAfterEvent) {
    status = 'finished';
  } else if (isDuringEvent) {
    status = 'active';
  } else if (isInPreWindow) {
    status = 'pre-window';
  } else {
    status = 'scheduled';
  }

  return {
    isBeforeWindow,
    isInPreWindow,
    isDuringEvent,
    isNearEnd,
    isAfterEvent,
    canCheckIn,
    canCheckOut,
    canTrackGPS,
    minutesUntilStart,
    minutesUntilEnd,
    status
  };
};

/**
 * Formate le temps restant en texte lisible
 * @param {number} minutes - Minutes restantes
 * @returns {string} Texte formaté
 */
export const formatTimeRemaining = (minutes) => {
  if (minutes === null || minutes === undefined) {
    return '';
  }

  if (minutes < 0) {
    return 'Terminé';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
};

/**
 * Génère un message d'aide pour l'utilisateur
 * @param {Object} timeStatus - Résultat de getEventTimeStatus
 * @returns {string} Message d'aide
 */
export const getHelpMessage = (timeStatus) => {
  if (!timeStatus) {
    return '';
  }

  const { isBeforeWindow, isInPreWindow, isDuringEvent, isNearEnd, isAfterEvent, minutesUntilStart, minutesUntilEnd } = timeStatus;

  if (isAfterEvent) {
    return '🔒 Événement terminé - Plus de pointage possible';
  }

  if (isBeforeWindow) {
    return `⏳ Pointage disponible dans ${formatTimeRemaining(minutesUntilStart)}`;
  }

  if (isInPreWindow) {
    return `✅ Pointage d'entrée autorisé - Événement dans ${formatTimeRemaining(minutesUntilStart)}`;
  }

  if (isDuringEvent) {
    if (isNearEnd) {
      return `⚠️ Événement se termine dans ${formatTimeRemaining(minutesUntilEnd)} - Check-out disponible`;
    }
    return `🟢 Événement en cours - ${formatTimeRemaining(minutesUntilEnd)} restantes`;
  }

  return '';
};

/**
 * Vérifie si le tracking GPS doit être actif pour un événement
 * @param {Object} event - L'événement
 * @param {boolean} isCheckedIn - Si l'utilisateur est pointé
 * @param {boolean} isCheckedOut - Si l'utilisateur est sorti
 * @returns {boolean} True si le tracking doit être actif
 */
export const shouldTrackGPS = (event, isCheckedIn, isCheckedOut) => {
  if (!event || !isCheckedIn || isCheckedOut) {
    return false;
  }

  const timeStatus = getEventTimeStatus(event);
  return timeStatus.canTrackGPS;
};

/**
 * Génère la couleur du badge selon le statut
 * @param {string} status - Le statut de l'événement
 * @returns {string} Classes CSS Tailwind
 */
export const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'active':
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    case 'pre-window':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'finished':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    case 'scheduled':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
};

/**
 * Génère le texte du badge selon le statut
 * @param {string} status - Le statut de l'événement
 * @returns {string} Texte du badge
 */
export const getStatusBadgeText = (status) => {
  switch (status) {
    case 'active':
      return 'En cours';
    case 'pre-window':
      return 'Bientôt disponible';
    case 'finished':
      return 'Terminé';
    case 'scheduled':
      return 'Planifié';
    default:
      return status;
  }
};
