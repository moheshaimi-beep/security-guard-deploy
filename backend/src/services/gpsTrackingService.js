/**
 * Service de tracking GPS en temps réel
 * Gère le suivi continu des agents pendant les événements
 */

const db = require('../models');
const { Op } = require('sequelize');

class GPSTrackingService {
  constructor(io) {
    this.io = io;
    this.activeTrackers = new Map(); // userId -> intervalId
    this.agentStatuses = new Map(); // userId -> {status, lastPosition, battery}
    this.geofenceAlerts = new Map(); // userId -> lastAlertTime
  }

  /**
   * Démarre le tracking pour un agent lors du check-in
   */
  async startTracking(userId, eventId, initialPosition) {
    try {
      console.log(`🚀 Démarrage tracking GPS pour user ${userId} sur événement ${eventId}`);

      // Vérifier si déjà en tracking
      if (this.activeTrackers.has(userId)) {
        console.log(`⚠️ Tracking déjà actif pour user ${userId}`);
        return;
      }

      // Récupérer les infos de l'événement (pour géofencing)
      const event = await db.Event.findByPk(eventId);
      if (!event) {
        throw new Error(`Événement ${eventId} introuvable`);
      }

      // Initialiser le statut de l'agent
      this.agentStatuses.set(userId, {
        status: 'active',
        lastPosition: initialPosition,
        battery: initialPosition.batteryLevel || 100,
        eventId,
        event: {
          latitude: event.latitude,
          longitude: event.longitude,
          radius: event.geoRadius || 100
        },
        startTime: new Date()
      });

      // Émettre la position initiale
      await this.emitPosition(userId, initialPosition);

      console.log(`✅ Tracking GPS démarré pour user ${userId}`);
    } catch (error) {
      console.error(`❌ Erreur démarrage tracking pour user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Mise à jour de la position GPS (appelée chaque seconde par le client)
   */
  async updatePosition(userId, positionData) {
    try {
      const agentStatus = this.agentStatuses.get(userId);
      if (!agentStatus) {
        console.warn(`⚠️ User ${userId} n'est pas en tracking actif`);
        return;
      }

      // Vérifier si l'événement est toujours actif
      const event = await db.Event.findByPk(agentStatus.eventId);
      if (!event || new Date() > new Date(event.endDate)) {
        console.log(`⏹️ Événement terminé, arrêt du tracking pour user ${userId}`);
        await this.stopTracking(userId);
        return;
      }

      // Sauvegarder la position dans la base de données
      await db.GeoTracking.create({
        userId,
        eventId: agentStatus.eventId,
        latitude: positionData.latitude,
        longitude: positionData.longitude,
        accuracy: positionData.accuracy,
        batteryLevel: positionData.batteryLevel,
        recordedAt: new Date(),
        isMoving: positionData.isMoving || false
      });

      // Mettre à jour le statut local
      agentStatus.lastPosition = positionData;
      agentStatus.battery = positionData.batteryLevel;

      // Vérifier le géofencing
      await this.checkGeofence(userId, positionData, agentStatus);

      // Vérifier le niveau de batterie
      await this.checkBatteryLevel(userId, positionData.batteryLevel);

      // Émettre la position en temps réel
      await this.emitPosition(userId, positionData);

    } catch (error) {
      console.error(`❌ Erreur mise à jour position user ${userId}:`, error);
    }
  }

  /**
   * Vérifie si l'agent est dans le périmètre autorisé
   */
  async checkGeofence(userId, position, agentStatus) {
    try {
      const { event } = agentStatus;
      
      // Si pas de coordonnées d'événement, pas de géofencing
      if (!event.latitude || !event.longitude) {
        return;
      }

      // Calculer la distance entre l'agent et le centre de l'événement
      const distance = this.calculateDistance(
        position.latitude,
        position.longitude,
        event.latitude,
        event.longitude
      );

      const isInsideGeofence = distance <= event.radius;

      // Si l'agent est sorti du périmètre
      if (!isInsideGeofence && agentStatus.status === 'active') {
        agentStatus.status = 'outside_geofence';

        // Éviter de spammer les alertes (max 1 alerte toutes les 5 minutes)
        const lastAlert = this.geofenceAlerts.get(userId);
        const now = Date.now();
        if (!lastAlert || (now - lastAlert) > 5 * 60 * 1000) {
          await this.sendGeofenceAlert(userId, distance, event.radius);
          this.geofenceAlerts.set(userId, now);
        }
      }

      // Si l'agent est revenu dans le périmètre
      if (isInsideGeofence && agentStatus.status === 'outside_geofence') {
        agentStatus.status = 'active';
        await this.sendGeofenceReturnAlert(userId);
      }

    } catch (error) {
      console.error(`❌ Erreur vérification géofencing pour user ${userId}:`, error);
    }
  }

  /**
   * Envoie une alerte de sortie de périmètre
   */
  async sendGeofenceAlert(userId, distance, radius) {
    try {
      const user = await db.User.findByPk(userId);
      const agentStatus = this.agentStatuses.get(userId);
      const event = await db.Event.findByPk(agentStatus.eventId);

      const alertData = {
        type: 'geofence_exit',
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        cin: user.cin,
        employeeId: user.employeeId,
        eventId: agentStatus.eventId,
        eventName: event.name,
        distance: Math.round(distance),
        allowedRadius: radius,
        timestamp: new Date(),
        message: `⚠️ L'agent ${user.firstName} ${user.lastName} (${user.employeeId}) a quitté le périmètre de l'événement "${event.name}" (${Math.round(distance)}m du centre, limite: ${radius}m)`
      };

      // Émettre vers tous les admins/superviseurs
      this.io.emit('tracking:geofence_alert', alertData);

      // Sauvegarder l'alerte dans la base de données
      await db.Notification.create({
        userId: null, // Notification système
        type: 'geofence_alert',
        title: 'Sortie de périmètre',
        message: alertData.message,
        data: alertData,
        priority: 'high'
      });

      console.log(`🚨 Alerte géofencing envoyée pour ${user.firstName} ${user.lastName}`);
    } catch (error) {
      console.error('❌ Erreur envoi alerte géofencing:', error);
    }
  }

  /**
   * Envoie une alerte de retour dans le périmètre
   */
  async sendGeofenceReturnAlert(userId) {
    try {
      const user = await db.User.findByPk(userId);
      const agentStatus = this.agentStatuses.get(userId);
      const event = await db.Event.findByPk(agentStatus.eventId);

      const alertData = {
        type: 'geofence_return',
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        eventName: event.name,
        timestamp: new Date(),
        message: `✅ L'agent ${user.firstName} ${user.lastName} est revenu dans le périmètre de l'événement "${event.name}"`
      };

      this.io.emit('tracking:geofence_alert', alertData);

      console.log(`✅ Retour géofencing pour ${user.firstName} ${user.lastName}`);
    } catch (error) {
      console.error('❌ Erreur envoi alerte retour géofencing:', error);
    }
  }

  /**
   * Vérifie le niveau de batterie et envoie une alerte si faible
   */
  async checkBatteryLevel(userId, batteryLevel) {
    try {
      const agentStatus = this.agentStatuses.get(userId);
      if (!agentStatus) return;

      // Alertes à 20%, 10% et 5%
      const thresholds = [20, 10, 5];
      const previousBattery = agentStatus.battery;

      for (const threshold of thresholds) {
        // Si la batterie vient de passer sous le seuil
        if (batteryLevel <= threshold && previousBattery > threshold) {
          await this.sendBatteryAlert(userId, batteryLevel);
          break;
        }
      }
    } catch (error) {
      console.error('❌ Erreur vérification batterie:', error);
    }
  }

  /**
   * Envoie une alerte de batterie faible
   */
  async sendBatteryAlert(userId, batteryLevel) {
    try {
      const user = await db.User.findByPk(userId);
      const agentStatus = this.agentStatuses.get(userId);
      const event = await db.Event.findByPk(agentStatus.eventId);

      const alertData = {
        type: 'low_battery',
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        cin: user.cin,
        employeeId: user.employeeId,
        batteryLevel,
        eventId: agentStatus.eventId,
        eventName: event.name,
        timestamp: new Date(),
        message: `🔋 Batterie faible pour ${user.firstName} ${user.lastName}: ${batteryLevel}%`
      };

      this.io.emit('tracking:battery_alert', alertData);

      console.log(`🔋 Alerte batterie faible pour ${user.firstName} ${user.lastName}: ${batteryLevel}%`);
    } catch (error) {
      console.error('❌ Erreur envoi alerte batterie:', error);
    }
  }

  /**
   * Émet la position en temps réel via Socket.IO
   */
  async emitPosition(userId, positionData) {
    try {
      const user = await db.User.findByPk(userId);
      const agentStatus = this.agentStatuses.get(userId);

      if (!user || !agentStatus) return;

      const payload = {
        userId,
        eventId: agentStatus.eventId,
        latitude: positionData.latitude,
        longitude: positionData.longitude,
        accuracy: positionData.accuracy,
        batteryLevel: positionData.batteryLevel,
        timestamp: new Date(),
        isMoving: positionData.isMoving || false,
        status: agentStatus.status,
        user: {
          id: user.id,
          cin: user.cin,
          firstName: user.firstName,
          lastName: user.lastName,
          employeeId: user.employeeId,
          role: user.role,
          phone: user.phone
        }
      };

      // Émettre vers la room de l'événement
      this.io.to(`event:${agentStatus.eventId}`).emit('tracking:position_update', payload);

      // Émettre aussi vers une room globale pour les admins
      this.io.to('tracking:admin').emit('tracking:position_update', payload);

    } catch (error) {
      console.error('❌ Erreur émission position:', error);
    }
  }

  /**
   * Arrête le tracking pour un agent (check-out ou fin événement)
   */
  async stopTracking(userId) {
    try {
      console.log(`⏹️ Arrêt tracking GPS pour user ${userId}`);

      const agentStatus = this.agentStatuses.get(userId);
      if (agentStatus) {
        agentStatus.status = 'completed';
        
        // Émettre un événement de fin de tracking
        this.io.to(`event:${agentStatus.eventId}`).emit('tracking:agent_stopped', {
          userId,
          timestamp: new Date()
        });

        this.agentStatuses.delete(userId);
      }

      this.geofenceAlerts.delete(userId);

      console.log(`✅ Tracking arrêté pour user ${userId}`);
    } catch (error) {
      console.error(`❌ Erreur arrêt tracking pour user ${userId}:`, error);
    }
  }

  /**
   * Récupère l'historique des déplacements d'un agent
   */
  async getAgentTrackingHistory(userId, eventId, startDate, endDate) {
    try {
      const whereClause = {
        userId,
        eventId
      };

      if (startDate && endDate) {
        whereClause.recordedAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const positions = await db.GeoTracking.findAll({
        where: whereClause,
        order: [['recordedAt', 'ASC']],
        include: [{
          model: db.User,
          attributes: ['id', 'firstName', 'lastName', 'cin', 'employeeId']
        }]
      });

      return positions;
    } catch (error) {
      console.error('❌ Erreur récupération historique:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les agents actuellement en tracking pour un événement
   */
  getActiveAgents(eventId) {
    const activeAgents = [];
    
    for (const [userId, status] of this.agentStatuses.entries()) {
      if (status.eventId === eventId) {
        activeAgents.push({
          userId,
          status: status.status,
          battery: status.battery,
          lastPosition: status.lastPosition,
          startTime: status.startTime
        });
      }
    }

    return activeAgents;
  }

  /**
   * Calcule la distance entre deux points GPS (formule Haversine)
   * @returns distance en mètres
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  }

  /**
   * Nettoie les tracking actifs (appelé au démarrage du serveur)
   */
  async cleanup() {
    console.log('🧹 Nettoyage des tracking actifs...');
    this.activeTrackers.clear();
    this.agentStatuses.clear();
    this.geofenceAlerts.clear();
    console.log('✅ Tracking nettoyé');
  }
}

module.exports = GPSTrackingService;
