import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 
                   'https://security-guard-backend.onrender.com';

/**
 * Hook personnalisé pour le tracking GPS en temps réel
 * Envoie la position GPS chaque seconde pendant un événement actif
 */
const useGPSTracking = (isCheckedIn, eventId) => {
  const [isTracking, setIsTracking] = useState(false);
  const [lastPosition, setLastPosition] = useState(null);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Démarrer le tracking seulement si l'utilisateur est check-in
    if (isCheckedIn && eventId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isCheckedIn, eventId]);

  const startTracking = () => {
    console.log('🚀 Démarrage du tracking GPS...');
    setIsTracking(true);

    // Connexion Socket.IO
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connecté pour tracking GPS');
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Erreur connexion Socket.IO:', err);
      setError('Erreur de connexion au serveur de tracking');
    });

    socketRef.current = socket;

    // Vérifier si la géolocalisation est disponible
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    // Options de géolocalisation haute précision
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    // Surveiller la position en continu
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const positionData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          isMoving: position.coords.speed > 0.5 // Considéré en mouvement si > 0.5 m/s
        };

        setLastPosition(positionData);
        setError(null);
      },
      (err) => {
        console.error('❌ Erreur géolocalisation:', err);
        let errorMessage = 'Erreur de géolocalisation';
        
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Permission de géolocalisation refusée';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Position indisponible';
            break;
          case err.TIMEOUT:
            errorMessage = 'Délai dépassé pour obtenir la position';
            break;
          default:
            errorMessage = 'Erreur inconnue de géolocalisation';
        }
        
        setError(errorMessage);
      },
      options
    );

    // Envoyer la position toutes les secondes
    intervalRef.current = setInterval(() => {
      if (lastPosition) {
        sendPosition(lastPosition);
      }
    }, 1000); // Chaque seconde

    console.log('✅ Tracking GPS démarré');
  };

  const stopTracking = () => {
    console.log('⏹️ Arrêt du tracking GPS...');
    
    // Arrêter la surveillance de position
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Arrêter l'intervalle d'envoi
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Déconnecter Socket.IO
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsTracking(false);
    setLastPosition(null);
    
    console.log('✅ Tracking GPS arrêté');
  };

  const sendPosition = async (position) => {
    try {
      // Récupérer le niveau de batterie (si disponible)
      let batteryLevel = 100;
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        batteryLevel = Math.round(battery.level * 100);
      }

      const payload = {
        ...position,
        batteryLevel,
        eventId
      };

      // Envoyer via API HTTP
      await api.post('/tracking/update-position', payload);

      // Émettre aussi via Socket.IO pour temps réel immédiat
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('tracking:update_position', payload);
      }

    } catch (err) {
      console.error('❌ Erreur envoi position:', err);
      // Ne pas afficher d'erreur à l'utilisateur pour ne pas le spammer
      // L'erreur sera visible dans les logs seulement
    }
  };

  return {
    isTracking,
    lastPosition,
    error,
    stopTracking
  };
};

export default useGPSTracking;
