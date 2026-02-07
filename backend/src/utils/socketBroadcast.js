/**
 * Utilitaire pour broadcast automatique des changements via Socket.IO
 * Émet des événements temps réel quand les données changent
 */

let ioInstance = null;

/**
 * Initialiser l'instance Socket.IO
 * @param {object} io - Instance Socket.IO depuis server.js
 */
const initSocketBroadcast = (io) => {
  ioInstance = io;
  console.log('✅ Socket Broadcast initialisé pour mises à jour temps réel');
};

/**
 * Broadcast un changement de données à tous les clients connectés
 * 
 * @param {string} entity - Type d'entité ('events', 'users', 'assignments', 'attendance', etc.)
 * @param {string} action - Action ('created', 'updated', 'deleted')
 * @param {object} data - Données modifiées
 * @param {object} options - Options de broadcast (room, userId, etc.)
 */
const broadcastChange = (entity, action, data, options = {}) => {
  if (!ioInstance) {
    console.warn('⚠️ Socket.IO non initialisé - broadcast ignoré');
    return;
  }

  const eventName = `${entity}:${action}`;
  
  try {
    // Broadcast global (tous les clients)
    if (options.broadcast === 'all') {
      ioInstance.emit(eventName, data);
      console.log(`📡 Broadcast global: ${eventName}`, { 
        id: data.id, 
        name: data.name || data.eventName || data.cin 
      });
    }
    // Broadcast à une room spécifique (ex: event-123)
    else if (options.room) {
      ioInstance.to(options.room).emit(eventName, data);
      console.log(`📡 Broadcast room [${options.room}]: ${eventName}`, {
        id: data.id
      });
    }
    // Broadcast à un utilisateur spécifique
    else if (options.userId) {
      const userSocket = Array.from(ioInstance.sockets.sockets.values())
        .find(socket => socket.userId === options.userId);
      
      if (userSocket) {
        userSocket.emit(eventName, data);
        console.log(`📡 Broadcast user [${options.userId}]: ${eventName}`);
      }
    }
    // Broadcast par défaut (tous les clients connectés et authentifiés)
    else {
      ioInstance.emit(eventName, data);
      console.log(`📡 Broadcast: ${eventName}`, {
        id: data.id,
        name: data.name || data.eventName || data.cin
      });
    }
  } catch (error) {
    console.error(`❌ Erreur broadcast ${eventName}:`, error);
  }
};

/**
 * Helpers pour chaque type d'entité
 */
const broadcastEvent = {
  created: (data, options) => broadcastChange('events', 'created', data, options),
  updated: (data, options) => broadcastChange('events', 'updated', data, options),
  deleted: (data, options) => broadcastChange('events', 'deleted', data, options),
};

const broadcastUser = {
  created: (data, options) => broadcastChange('users', 'created', data, options),
  updated: (data, options) => broadcastChange('users', 'updated', data, options),
  deleted: (data, options) => broadcastChange('users', 'deleted', data, options),
};

const broadcastAssignment = {
  created: (data, options) => broadcastChange('assignments', 'created', data, options),
  updated: (data, options) => broadcastChange('assignments', 'updated', data, options),
  deleted: (data, options) => broadcastChange('assignments', 'deleted', data, options),
};

const broadcastAttendance = {
  created: (data, options) => broadcastChange('attendance', 'created', data, options),
  updated: (data, options) => broadcastChange('attendance', 'updated', data, options),
  deleted: (data, options) => broadcastChange('attendance', 'deleted', data, options),
};

const broadcastZone = {
  created: (data, options) => broadcastChange('zones', 'created', data, options),
  updated: (data, options) => broadcastChange('zones', 'updated', data, options),
  deleted: (data, options) => broadcastChange('zones', 'deleted', data, options),
};

const broadcastPosition = {
  updated: (data, options) => broadcastChange('positions', 'updated', data, options),
};

module.exports = {
  initSocketBroadcast,
  broadcastChange,
  broadcastEvent,
  broadcastUser,
  broadcastAssignment,
  broadcastAttendance,
  broadcastZone,
  broadcastPosition,
};
