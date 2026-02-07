import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FiUsers, FiActivity, FiBattery, FiMapPin, FiClock, FiZap,
  FiWifi, FiWifiOff, FiMaximize2, FiMinimize2, FiFilter,
  FiSearch, FiRefreshCw, FiNavigation, FiAlertCircle, FiCheckCircle,
  FiMenu, FiX
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import api from '../services/api';
import useAuthStore from '../hooks/useAuth';

// Socket.IO URL
const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 
                   process.env.REACT_APP_SOCKET_URL || 
                   'https://security-guard-backend.onrender.com';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Composant pour recentrer la carte
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Icônes personnalisées agents - VERSION AMÉLIORÉE
const createAgentIcon = (isMoving, batteryLevel, role) => {
  const isSupervisor = role === 'supervisor';
  
  // Couleurs sophistiquées selon le rôle et l'état
  let mainColor, accentColor, gradientStart, gradientEnd;
  
  if (isSupervisor) {
    // Superviseur : Gradient violet/bleu
    gradientStart = '#8B5CF6'; // Violet
    gradientEnd = '#6366F1'; // Indigo
    mainColor = '#8B5CF6';
    accentColor = '#FCD34D'; // Or pour badge
  } else {
    // Agent : Couleur selon état
    if (batteryLevel < 20) {
      gradientStart = '#EF4444'; // Rouge
      gradientEnd = '#DC2626';
      mainColor = '#EF4444';
      accentColor = '#FCA5A5';
    } else if (!isMoving) {
      gradientStart = '#F59E0B'; // Orange
      gradientEnd = '#D97706';
      mainColor = '#F59E0B';
      accentColor = '#FCD34D';
    } else {
      gradientStart = '#10B981'; // Vert
      gradientEnd = '#059669';
      mainColor = '#10B981';
      accentColor = '#6EE7B7';
    }
  }
  
  const size = isSupervisor ? 54 : 44;
  const iconSize = isSupervisor ? 24 : 20;
  
  // SVG Icons professionnels
  const agentSVG = `
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="white">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  `;
  
  const supervisorSVG = `
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="white">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      <circle cx="12" cy="8" r="3" fill="${accentColor}"/>
    </svg>
  `;
  
  const icon = isSupervisor ? supervisorSVG : agentSVG;
  
  // Badge de rôle
  const roleBadge = isSupervisor ? `
    <div style="
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, ${accentColor}, #FBBF24);
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-size: 12px;
      z-index: 10;
    ">👑</div>
  ` : '';
  
  // Indicateur batterie faible
  const batteryWarning = batteryLevel < 20 && !isSupervisor ? `
    <div style="
      position: absolute;
      top: -6px;
      left: -6px;
      width: 20px;
      height: 20px;
      background: #EF4444;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
      animation: batteryBlink 1s infinite;
      z-index: 10;
    ">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
      </svg>
    </div>
  ` : '';
  
  // Effet de mouvement
  const movementEffect = isMoving ? `
    <div style="
      position: absolute;
      width: ${size + 24}px;
      height: ${size + 24}px;
      border: 3px solid ${mainColor};
      border-radius: 50%;
      animation: ripple 1.8s ease-out infinite;
      top: -12px;
      left: -12px;
    "></div>
    <div style="
      position: absolute;
      width: ${size + 12}px;
      height: ${size + 12}px;
      border: 2px solid ${accentColor};
      border-radius: 50%;
      animation: ripple 1.8s ease-out 0.6s infinite;
      top: -6px;
      left: -6px;
    "></div>
  ` : '';
  
  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      ${movementEffect}
      
      <!-- Marqueur principal -->
      <div style="
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%);
        border-radius: 50%;
        border: ${isSupervisor ? '4px' : '3px'} solid white;
        box-shadow: 
          0 8px 16px rgba(0,0,0,0.3),
          0 0 0 ${isSupervisor ? '4px' : '2px'} ${mainColor}40,
          inset 0 2px 8px rgba(255,255,255,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        ${isMoving ? 'animation: markerPulse 2s ease-in-out infinite;' : ''}
        transition: all 0.3s ease;
        z-index: 5;
      ">
        ${icon}
      </div>
      
      ${roleBadge}
      ${batteryWarning}
      
      <!-- Ombre portée animée -->
      <div style="
        position: absolute;
        width: ${size * 0.6}px;
        height: 8px;
        background: radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%);
        border-radius: 50%;
        bottom: -4px;
        left: 50%;
        transform: translateX(-50%);
        ${isMoving ? 'animation: shadowPulse 2s ease-in-out infinite;' : ''}
      "></div>
    </div>
    
    <style>
      @keyframes markerPulse {
        0%, 100% { transform: scale(1) translateY(0); }
        50% { transform: scale(1.12) translateY(-2px); }
      }
      @keyframes ripple {
        0% { 
          transform: scale(0.6); 
          opacity: 0.8; 
        }
        100% { 
          transform: scale(1.6); 
          opacity: 0; 
        }
      }
      @keyframes shadowPulse {
        0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.4; }
        50% { transform: translateX(-50%) scale(1.2); opacity: 0.2; }
      }
      @keyframes batteryBlink {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.15); }
      }
      .custom-agent-marker:hover {
        z-index: 1000 !important;
        transform: scale(1.15);
        transition: transform 0.2s ease;
      }
    </style>
  `;
  
  return L.divIcon({
    html,
    className: 'custom-agent-marker',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2 + 4],
    popupAnchor: [0, -(size/2 + 4)]
  });
};

const RealTimeTracking = () => {
  const { user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [agents, setAgents] = useState(new Map());
  const [stats, setStats] = useState({
    total: 0,
    moving: 0,
    stopped: 0,
    lowBattery: 0
  });
  const [mapCenter, setMapCenter] = useState([33.5731, -7.5898]); // Casablanca
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoCenter, setAutoCenter] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  const socketRef = useRef(null);
  const isMountedRef = useRef(true);
  const mapRef = useRef(null);

  // Responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowSidebar(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Charger événements
  useEffect(() => {
    loadEvents();
    return () => { isMountedRef.current = false; };
  }, []);

  const loadEvents = async () => {
    try {
      const response = await api.get('/events', {
        params: { status: 'active,scheduled' }
      });
      
      // Extraire correctement le tableau selon la structure de la réponse
      let allEvents = [];
      
      if (response.data) {
        // Si response.data.data existe et est un tableau
        if (Array.isArray(response.data.data)) {
          allEvents = response.data.data;
        }
        // Sinon si response.data.events existe et est un tableau
        else if (Array.isArray(response.data.events)) {
          allEvents = response.data.events;
        }
        // Sinon si response.data est directement un tableau
        else if (Array.isArray(response.data)) {
          allEvents = response.data;
        }
        // Sinon structure inconnue, extraire le premier tableau trouvé
        else if (typeof response.data === 'object') {
          const firstArrayValue = Object.values(response.data).find(val => Array.isArray(val));
          if (firstArrayValue) {
            allEvents = firstArrayValue;
          }
        }
      }
      
      console.log('📊 Événements chargés:', allEvents.length);
      
      // Filtrer : événements actifs OU qui commencent dans moins de 2h
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));
      
      const relevantEvents = allEvents.filter(event => {
        // Garder tous les événements actifs
        if (event.status === 'active') return true;
        
        // Pour les événements schedulés, garder seulement ceux qui commencent dans moins de 2h
        if (event.status === 'scheduled') {
          const eventStart = new Date(event.startDate);
          return eventStart <= twoHoursFromNow;
        }
        
        return false;
      });
      
      setEvents(relevantEvents);
      
      // Sélectionner automatiquement le premier événement actif, sinon le premier de la liste
      const activeEvent = relevantEvents.find(e => e.status === 'active');
      const defaultEvent = activeEvent || relevantEvents[0];
      
      if (defaultEvent) {
        setSelectedEvent(defaultEvent);
      }
    } catch (error) {
      console.error('Erreur chargement événements:', error);
      toast.error('Erreur chargement événements');
    } finally {
      setLoading(false);
    }
  };

  // Socket.IO connection
  useEffect(() => {
    if (!selectedEvent) return;

    console.log('🔌 Connexion Socket.IO:', SOCKET_URL);
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket.IO connecté');
      setConnected(true);
      toast.success('📡 Temps réel activé', { autoClose: 2000 });
      
      socket.emit('auth', {
        userId: user.id,
        role: user.role,
        eventId: selectedEvent.id,
        token: localStorage.getItem('token')
      });
    });

    socket.on('auth:success', () => {
      console.log('✅ Auth Socket.IO réussie');
      socket.emit('tracking:subscribe', selectedEvent.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO déconnecté');
      setConnected(false);
      toast.error('📡 Connexion perdue');
    });

    socket.on('tracking:position', (data) => {
      if (!isMountedRef.current) return;
      
      setAgents(prev => {
        const newAgents = new Map(prev);
        newAgents.set(data.userId, {
          ...data,
          lastUpdate: Date.now()
        });
        return newAgents;
      });
    });

    socket.on('tracking:positions', (positions) => {
      if (!isMountedRef.current) return;
      
      setAgents(prev => {
        const newAgents = new Map();
        positions.forEach(pos => {
          newAgents.set(pos.userId, {
            ...pos,
            lastUpdate: Date.now()
          });
        });
        return newAgents;
      });
    });

    socket.on('tracking:disabled', ({ message, detailedMessage }) => {
      toast.warning(detailedMessage || message, { autoClose: 5000 });
      setConnected(false);
    });

    socket.on('tracking:error', ({ message }) => {
      toast.error(message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [selectedEvent, user]);

  // Calculer stats
  useEffect(() => {
    const agentList = Array.from(agents.values());
    const moving = agentList.filter(a => a.isMoving).length;
    const total = agents.size;
    const stopped = total - moving;
    const lowBattery = agentList.filter(a => a.batteryLevel && a.batteryLevel < 20).length;
    
    setStats({ total, moving, stopped, lowBattery });

    if (autoCenter && agentList.length > 0) {
      const lats = agentList.map(a => a.latitude).filter(Boolean);
      const lngs = agentList.map(a => a.longitude).filter(Boolean);
      if (lats.length > 0 && lngs.length > 0) {
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        setMapCenter([avgLat, avgLng]);
      }
    }
  }, [agents, autoCenter]);

  // Filtrer agents avec useMemo
  const filteredAgents = React.useMemo(() => {
    return Array.from(agents.values()).filter(agent => {
      const matchesSearch = !searchTerm || 
        agent.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.user?.cin?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = 
        filterStatus === 'all' ||
        (filterStatus === 'moving' && agent.isMoving) ||
        (filterStatus === 'stopped' && !agent.isMoving);
      
      return matchesSearch && matchesFilter;
    });
  }, [agents, searchTerm, filterStatus]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const centerOnAgent = (agent) => {
    setSelectedAgent(agent);
    setMapCenter([agent.latitude, agent.longitude]);
    setAutoCenter(false);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header - Ultra moderne et responsive */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 text-white shadow-2xl z-20">
        <div className="px-3 py-2.5 md:px-6 md:py-4">
          {/* Top Row */}
          <div className="flex items-center justify-between gap-3 mb-2 md:mb-3">
            {/* Logo + Title */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <FiMapPin className="text-xl md:text-3xl flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base md:text-2xl font-bold truncate">GPS Temps Réel</h1>
                <p className="text-xs md:text-sm text-blue-100 truncate">
                  {selectedEvent ? selectedEvent.name : 'Sélectionnez un événement'}
                </p>
              </div>
            </div>
            
            {/* Status + Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Connexion Status */}
              <div className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-full text-xs md:text-sm font-medium ${
                connected ? 'bg-green-500/90' : 'bg-red-500/90'
              }`}>
                {connected ? <FiWifi size={14} /> : <FiWifiOff size={14} />}
                <span className="hidden md:inline">{connected ? 'Connecté' : 'Hors ligne'}</span>
              </div>
              
              {/* Fullscreen Desktop */}
              <button
                onClick={toggleFullscreen}
                className="hidden md:flex p-2 hover:bg-white/20 rounded-lg transition-colors"
                title={isFullscreen ? "Quitter plein écran" : "Plein écran"}
              >
                {isFullscreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
              </button>
            </div>
          </div>

          {/* Event Selector */}
          <div className="mb-2 md:mb-3">
            <select
              value={selectedEvent?.id || ''}
              onChange={(e) => {
                const evt = events.find(ev => ev.id === e.target.value);
                setSelectedEvent(evt);
              }}
              className="w-full px-3 py-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm md:text-base placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="" className="text-gray-900">Sélectionner un événement</option>
              {events.map(evt => (
                <option key={evt.id} value={evt.id} className="text-gray-900">
                  {evt.name} - {new Date(evt.startDate).toLocaleDateString('fr-FR')}
                </option>
              ))}
            </select>
          </div>

          {/* Stats Cards - Grid responsif */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-white/20">
              <div className="flex items-center justify-between">
                <FiUsers className="text-lg md:text-2xl" />
                <span className="text-xl md:text-3xl font-bold">{stats.total}</span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5 md:mt-1">Total</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-white/20">
              <div className="flex items-center justify-between">
                <FiActivity className="text-lg md:text-2xl text-green-300" />
                <span className="text-xl md:text-3xl font-bold">{stats.moving}</span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5 md:mt-1">En mouvement</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-white/20">
              <div className="flex items-center justify-between">
                <FiClock className="text-lg md:text-2xl text-orange-300" />
                <span className="text-xl md:text-3xl font-bold">{stats.stopped}</span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5 md:mt-1">Arrêtés</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-white/20">
              <div className="flex items-center justify-between">
                <FiBattery className="text-lg md:text-2xl text-red-300" />
                <span className="text-xl md:text-3xl font-bold">{stats.lowBattery}</span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5 md:mt-1">Batterie faible</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Sidebar + Map */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - Slide animée sur mobile */}
        <div className={`
          ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
          fixed md:relative z-30 h-full w-full md:w-80 lg:w-96 bg-white shadow-2xl 
          transition-transform duration-300 ease-in-out
        `}>
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="p-3 md:p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800 text-base md:text-lg flex items-center gap-2">
                  <FiUsers className="text-blue-600" />
                  Agents ({filteredAgents.length})
                </h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="md:hidden p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-2">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Filters - Pills */}
              <div className="flex gap-2 mb-2">
                {[
                  { value: 'all', label: 'Tous', icon: FiUsers },
                  { value: 'moving', label: 'Actifs', icon: FiActivity },
                  { value: 'stopped', label: 'Arrêtés', icon: FiClock }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setFilterStatus(value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterStatus === value
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Auto-center */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCenter}
                  onChange={(e) => setAutoCenter(e.target.checked)}
                  className="rounded w-4 h-4 text-blue-600"
                />
                <span className="text-xs md:text-sm text-gray-700">Centrage automatique</span>
              </label>
            </div>

            {/* Agents List */}
            <div className="flex-1 overflow-y-auto">
              {filteredAgents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FiAlertCircle className="mx-auto mb-3 text-gray-400" size={40} />
                  <p className="text-sm font-medium">Aucun agent actif</p>
                  <p className="text-xs text-gray-400 mt-1">Vérifiez la connexion</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredAgents.map(agent => (
                    <button
                      key={agent.userId}
                      onClick={() => centerOnAgent(agent)}
                      className={`w-full p-3 hover:bg-blue-50 transition-all text-left ${
                        selectedAgent?.userId === agent.userId ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar animé */}
                        <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${
                          agent.isMoving ? 'bg-gradient-to-br from-green-400 to-green-600 animate-pulse' : 'bg-gradient-to-br from-orange-400 to-orange-600'
                        } shadow-lg`}>
                          {agent.user?.role === 'supervisor' ? '👔' : '👤'}
                          {agent.isMoving && (
                            <div className="absolute -right-1 -top-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-ping"></div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-semibold text-gray-900 truncate text-sm md:text-base">
                              {agent.user?.firstName} {agent.user?.lastName}
                            </p>
                            {agent.isMoving ? (
                              <FiActivity className="text-green-600 flex-shrink-0" size={18} />
                            ) : (
                              <FiClock className="text-orange-600 flex-shrink-0" size={18} />
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <span className="bg-gray-100 px-2 py-0.5 rounded">{agent.user?.cin}</span>
                            {agent.batteryLevel && (
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${
                                agent.batteryLevel < 20 ? 'bg-red-100 text-red-700' : 'bg-gray-100'
                              }`}>
                                <FiBattery size={12} />
                                {agent.batteryLevel}%
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <FiClock size={11} />
                            {new Date(agent.lastUpdate).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {/* Floating Sidebar Toggle (Mobile) */}
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="absolute top-4 left-4 z-[1000] bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-full shadow-2xl md:hidden hover:scale-110 transition-transform"
            >
              <FiMenu size={22} />
            </button>
          )}

          {/* Floating Action Buttons */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            {/* Refresh */}
            <button
              onClick={() => {
                socketRef.current?.emit('tracking:subscribe', selectedEvent?.id);
                toast.info('🔄 Actualisation...');
              }}
              className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-all hover:scale-110"
            >
              <FiRefreshCw size={20} className="text-gray-700" />
            </button>
            
            {/* Center */}
            <button
              onClick={() => setAutoCenter(!autoCenter)}
              className={`p-3 rounded-full shadow-lg transition-all hover:scale-110 ${
                autoCenter ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiNavigation size={20} />
            </button>
          </div>

          {/* Map */}
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mx-auto mb-4"></div>
                  <FiMapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={32} />
                </div>
                <p className="text-gray-700 font-medium">Chargement de la carte...</p>
                <p className="text-sm text-gray-500 mt-1">Initialisation GPS</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={13}
              className="w-full h-full"
              zoomControl={true}
              ref={mapRef}
            >
              <RecenterMap center={mapCenter} />
              
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Event Location + Zone */}
              {selectedEvent?.latitude && selectedEvent?.longitude && (
                <>
                  <Circle
                    center={[selectedEvent.latitude, selectedEvent.longitude]}
                    radius={selectedEvent.geoRadius || 100}
                    pathOptions={{
                      color: '#3B82F6',
                      fillColor: '#3B82F6',
                      fillOpacity: 0.15,
                      weight: 2,
                      dashArray: '5, 5'
                    }}
                  />
                  <Marker position={[selectedEvent.latitude, selectedEvent.longitude]}>
                    <Popup>
                      <div className="text-center p-1">
                        <p className="font-bold text-blue-600 mb-1">📍 {selectedEvent.name}</p>
                        <p className="text-xs text-gray-600">{selectedEvent.location}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Zone: {selectedEvent.geoRadius || 100}m
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}

              {/* Agents Markers */}
              {filteredAgents.map(agent => (
                agent.latitude && agent.longitude && (
                  <Marker
                    key={agent.userId}
                    position={[agent.latitude, agent.longitude]}
                    icon={createAgentIcon(
                      agent.isMoving,
                      agent.batteryLevel || 100,
                      agent.user?.role
                    )}
                  >
                    <Popup>
                      <div className="min-w-[220px] p-2">
                        <div className="flex items-center gap-3 mb-3 pb-2 border-b">
                          <span className={`text-3xl ${
                            agent.isMoving ? 'animate-pulse' : ''
                          }`}>
                            {agent.user?.role === 'supervisor' ? '👔' : '👤'}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900">
                              {agent.user?.firstName} {agent.user?.lastName}
                            </p>
                            <p className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded inline-block mt-0.5">
                              {agent.user?.cin}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-gray-600 flex items-center gap-1">
                              <FiActivity size={14} />
                              Status
                            </span>
                            <span className={`font-semibold ${agent.isMoving ? 'text-green-600' : 'text-orange-600'}`}>
                              {agent.isMoving ? '🏃 En mouvement' : '⏸️ Arrêté'}
                            </span>
                          </div>
                          
                          {agent.speed !== undefined && (
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600 flex items-center gap-1">
                                <FiZap size={14} />
                                Vitesse
                              </span>
                              <span className="font-semibold">{(agent.speed * 3.6).toFixed(1)} km/h</span>
                            </div>
                          )}
                          
                          {agent.batteryLevel && (
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600 flex items-center gap-1">
                                <FiBattery size={14} />
                                Batterie
                              </span>
                              <span className={`font-semibold ${agent.batteryLevel < 20 ? 'text-red-600' : 'text-green-600'}`}>
                                {agent.batteryLevel}%
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <span className="text-gray-600 flex items-center gap-1">
                              <FiClock size={14} />
                              Dernière MAJ
                            </span>
                            <span className="font-semibold text-blue-700 text-xs">
                              {new Date(agent.lastUpdate).toLocaleTimeString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimeTracking;
