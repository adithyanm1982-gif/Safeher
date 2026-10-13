export const LANGS = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'hi', label: 'HI', name: 'हिन्दी' },
  { code: 'fr', label: 'FR', name: 'Français' }
];

const dict = {
  en: {
    home: 'Home', map: 'Map', tools: 'Tools', guardians: 'Guardians', settings: 'Settings',
    sos: 'SOS', holdSos: 'Hold 2s for SOS', cancel: 'Cancel', imSafe: "I'm safe",
    sosActive: 'SOS ACTIVE', sendingHelp: 'Alerting your guardians', graceTitle: 'Sending SOS in',
    online: 'Online', offline: 'Offline', gpsLost: 'GPS Lock Failed - Using Last Known Location',
    siren: 'Siren', torch: 'Torch', strobe: 'Strobe', fakeCall: 'Fake Call', walkHome: 'Walk Home',
    disguise: 'Disguise Mode', unlock: 'Unlock', enterPin: 'Enter PIN', wrongPin: 'Wrong PIN',
    save: 'Save', delete: 'Delete', edit: 'Edit', add: 'Add', name: 'Name', phone: 'Phone', whatsapp: 'WhatsApp',
    template: 'SMS template', theme: 'Theme', language: 'Language', light: 'Light', dark: 'Dark', contrast: 'High contrast',
    wipe: 'Emergency data wipe', wipeConfirm: 'This permanently erases everything on this device. Continue?',
    profile: 'Medical & profile', bloodGroup: 'Blood group', allergies: 'Allergies', notes: 'Medical notes',
    home_addr: 'Home address', work_addr: 'Work address', startWalk: 'Start walk', minutes: 'Minutes',
    safeZones: 'Safe zones', reports: 'Route safety', lighting: 'Lighting', crowd: 'Crowd', score: 'Safe score',
    submit: 'Submit report', queued: 'queued for sync', shake: 'Shake to SOS', voice: 'Voice keyphrase',
    power: 'Volume / focus sequence', pending: 'Pending sync', guardianLimit: 'Maximum 5 guardians'
  },
  es: {
    home: 'Inicio', map: 'Mapa', tools: 'Herramientas', guardians: 'Guardianes', settings: 'Ajustes',
    sos: 'SOS', holdSos: 'Mantén 2s para SOS', cancel: 'Cancelar', imSafe: 'Estoy a salvo',
    sosActive: 'SOS ACTIVO', sendingHelp: 'Alertando a tus guardianes', graceTitle: 'Enviando SOS en',
    online: 'En línea', offline: 'Sin conexión', gpsLost: 'Fallo de GPS - Usando última ubicación conocida',
    siren: 'Sirena', torch: 'Linterna', strobe: 'Estroboscopio', fakeCall: 'Llamada falsa', walkHome: 'Camino a casa',
    disguise: 'Modo disfraz', unlock: 'Desbloquear', enterPin: 'Ingresa PIN', wrongPin: 'PIN incorrecto',
    save: 'Guardar', delete: 'Eliminar', edit: 'Editar', add: 'Añadir', name: 'Nombre', phone: 'Teléfono', whatsapp: 'WhatsApp',
    template: 'Plantilla SMS', theme: 'Tema', language: 'Idioma', light: 'Claro', dark: 'Oscuro', contrast: 'Alto contraste',
    wipe: 'Borrado de emergencia', wipeConfirm: 'Esto borra todo en este dispositivo de forma permanente. ¿Continuar?',
    profile: 'Perfil médico', bloodGroup: 'Grupo sanguíneo', allergies: 'Alergias', notes: 'Notas médicas',
    home_addr: 'Dirección de casa', work_addr: 'Dirección de trabajo', startWalk: 'Iniciar camino', minutes: 'Minutos',
    safeZones: 'Zonas seguras', reports: 'Seguridad de ruta', lighting: 'Iluminación', crowd: 'Multitud', score: 'Puntuación',
    submit: 'Enviar reporte', queued: 'en cola para sincronizar', shake: 'Agitar para SOS', voice: 'Frase de voz',
    power: 'Secuencia de volumen / foco', pending: 'Pendiente de sincronizar', guardianLimit: 'Máximo 5 guardianes'
  },
  hi: {
    home: 'होम', map: 'नक्शा', tools: 'उपकरण', guardians: 'संरक्षक', settings: 'सेटिंग्स',
    sos: 'एसओएस', holdSos: 'एसओएस के लिए 2 सेकंड दबाएँ', cancel: 'रद्द करें', imSafe: 'मैं सुरक्षित हूँ',
    sosActive: 'एसओएस सक्रिय', sendingHelp: 'आपके संरक्षकों को सूचित किया जा रहा है', graceTitle: 'एसओएस भेजा जाएगा',
    online: 'ऑनलाइन', offline: 'ऑफ़लाइन', gpsLost: 'GPS विफल - अंतिम ज्ञात स्थान का उपयोग',
    siren: 'सायरन', torch: 'टॉर्च', strobe: 'स्ट्रोब', fakeCall: 'नकली कॉल', walkHome: 'घर तक पैदल',
    disguise: 'छद्म मोड', unlock: 'अनलॉक', enterPin: 'पिन दर्ज करें', wrongPin: 'गलत पिन',
    save: 'सहेजें', delete: 'हटाएँ', edit: 'संपादित', add: 'जोड़ें', name: 'नाम', phone: 'फ़ोन', whatsapp: 'व्हाट्सऐप',
    template: 'एसएमएस टेम्पलेट', theme: 'थीम', language: 'भाषा', light: 'लाइट', dark: 'डार्क', contrast: 'उच्च कंट्रास्ट',
    wipe: 'आपातकालीन डेटा मिटाएँ', wipeConfirm: 'यह इस डिवाइस का सारा डेटा हमेशा के लिए मिटा देगा। जारी रखें?',
    profile: 'चिकित्सा प्रोफ़ाइल', bloodGroup: 'रक्त समूह', allergies: 'एलर्जी', notes: 'चिकित्सा नोट्स',
    home_addr: 'घर का पता', work_addr: 'कार्यस्थल का पता', startWalk: 'यात्रा शुरू करें', minutes: 'मिनट',
    safeZones: 'सुरक्षित स्थान', reports: 'मार्ग सुरक्षा', lighting: 'रोशनी', crowd: 'भीड़', score: 'सुरक्षा स्कोर',
    submit: 'रिपोर्ट भेजें', queued: 'सिंक के लिए कतार में', shake: 'हिलाकर एसओएस', voice: 'आवाज़ वाक्यांश',
    power: 'वॉल्यूम / फ़ोकस अनुक्रम', pending: 'सिंक लंबित', guardianLimit: 'अधिकतम 5 संरक्षक'
  },
  fr: {
    home: 'Accueil', map: 'Carte', tools: 'Outils', guardians: 'Gardiens', settings: 'Réglages',
    sos: 'SOS', holdSos: 'Maintenir 2s pour SOS', cancel: 'Annuler', imSafe: 'Je suis en sécurité',
    sosActive: 'SOS ACTIF', sendingHelp: 'Alerte envoyée à vos gardiens', graceTitle: 'Envoi du SOS dans',
    online: 'En ligne', offline: 'Hors ligne', gpsLost: 'GPS indisponible - Dernière position connue',
    siren: 'Sirène', torch: 'Lampe', strobe: 'Stroboscope', fakeCall: 'Faux appel', walkHome: 'Retour à pied',
    disguise: 'Mode discret', unlock: 'Déverrouiller', enterPin: 'Saisir le PIN', wrongPin: 'PIN incorrect',
    save: 'Enregistrer', delete: 'Supprimer', edit: 'Modifier', add: 'Ajouter', name: 'Nom', phone: 'Téléphone', whatsapp: 'WhatsApp',
    template: 'Modèle SMS', theme: 'Thème', language: 'Langue', light: 'Clair', dark: 'Sombre', contrast: 'Contraste élevé',
    wipe: "Effacement d'urgence", wipeConfirm: 'Cela efface définitivement toutes les données de cet appareil. Continuer ?',
    profile: 'Profil médical', bloodGroup: 'Groupe sanguin', allergies: 'Allergies', notes: 'Notes médicales',
    home_addr: 'Adresse du domicile', work_addr: 'Adresse du travail', startWalk: 'Démarrer', minutes: 'Minutes',
    safeZones: 'Zones sûres', reports: 'Sécurité du trajet', lighting: 'Éclairage', crowd: 'Foule', score: 'Score',
    submit: 'Envoyer', queued: 'en attente de synchro', shake: 'Secouer pour SOS', voice: 'Phrase vocale',
    power: 'Séquence volume / focus', pending: 'Synchro en attente', guardianLimit: 'Maximum 5 gardiens'
  }
};

export function translate(lang, key) {
  return dict[lang]?.[key] ?? dict.en[key] ?? key;
}
