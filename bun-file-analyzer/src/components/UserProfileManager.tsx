/**
 * User Profile Manager UI Component with i18n Support
 * Integrates with accessibility controls and user preferences
 */

import React, { useState, useEffect } from 'react';
import { userProfileManager, type UserProfile, type UserPreferences } from '../api/user-profile-manager';

// Translation types and interfaces
interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

// Translation data
const translations: Translations = {
  en: {
    // General
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    create: 'Create',
    export: 'Export',
    import: 'Import',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    
    // Profile Manager
    profileManager: 'Profile Manager',
    selectProfile: 'Select Profile',
    createNewProfile: 'Create New Profile',
    noProfilesFound: 'No profiles found. Click "Create New Profile" to get started.',
    profileCreated: 'Profile created and logged in!',
    profileUpdated: 'Profile updated successfully!',
    profileDeleted: 'Profile deleted',
    profileExported: 'Profile exported successfully!',
    profileImported: 'Profile imported successfully!',
    
    // Profile Info
    profileInfo: 'Profile Info',
    displayName: 'Display Name',
    email: 'Email',
    username: 'Username',
    role: 'Role',
    bio: 'Bio',
    location: 'Location',
    createdAt: 'Created',
    lastLogin: 'Last Login',
    enterDisplayName: 'Enter display name',
    enterEmail: 'Enter email address',
    enterBio: 'Tell us about yourself...',
    enterLocation: 'City, Country',
    saveChanges: 'Save Changes',
    
    // Preferences
    preferences: 'Preferences',
    uiPreferences: 'UI Preferences',
    theme: 'Theme',
    language: 'Language',
    timezone: 'Timezone',
    dateFormat: 'Date Format',
    timeFormat: 'Time Format',
    defaultView: 'Default View',
    autoRefresh: 'Auto-refresh data',
    showNotifications: 'Show notifications',
    enableSounds: 'Enable sound effects',
    
    // Accessibility
    accessibility: 'Accessibility',
    accessibilityControls: 'Accessibility Controls',
    highContrast: 'High Contrast',
    largeText: 'Large Text',
    reducedMotion: 'Reduced Motion',
    darkMode: 'Dark Mode',
    focusIndicator: 'Focus Indicator',
    readingMode: 'Reading Mode',
    colorBlindness: 'Color Blindness',
    savedAccessibilitySettings: 'Saved Accessibility Settings',
    applyToAllProfiles: 'Apply to All Profiles',
    resetToDefault: 'Reset to Default',
    
    // Roles
    admin: 'Admin',
    user: 'User',
    guest: 'Guest',
    
    // Themes
    light: 'Light',
    dark: 'Dark',
    auto: 'Auto',
    
    // Status
    active: 'Active',
    never: 'Never',
    
    // Actions
    duplicate: 'Duplicate',
    logout: 'Logout',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    deleteSelected: 'Delete Selected',
    
    // Advanced
    advanced: 'Advanced',
    profileId: 'Profile ID',
    profileSize: 'Profile Size',
    lastBackup: 'Last Backup',
    copy: 'Copy',
    optimize: 'Optimize',
    backup: 'Backup',
    dangerZone: 'Danger Zone',
    clearAllData: 'Clear All Data',
    deleteProfileForever: 'Delete Profile Forever',
    
    // Stats
    usageStats: 'Usage Stats',
    logins: 'logins',
    daysActive: 'days active',
    featuresEnabled: 'features enabled',
    customSettings: 'custom settings',
    storageUsed: 'KB used',
    
    // Messages
    noProfileSelected: 'No profile selected',
    loggedInAs: 'Logged in as',
    noAccessibilityFeatures: 'No accessibility features enabled',
    confirmDeleteProfile: 'Are you sure you want to delete this profile?',
    confirmDeleteSelected: 'Are you sure you want to delete {count} profile(s)? This action cannot be undone.',
    confirmClearData: 'Are you sure you want to clear all profile data? This will reset preferences and personal information.',
    confirmDeleteForever: 'DANGER: This will permanently delete the current profile and all its data. This cannot be undone!',
    
    // Preference Overrides
    overrideUserPreferences: 'Override user preferences',
    preferencesOverridden: 'Preferences overridden',
    preferencesRestored: 'Preferences restored',
    temporaryOverride: 'Temporary override active',
    globalOverride: 'Global override active',
    profileOverride: 'Profile override active',
    overrideSettings: 'Override Settings',
    overrideAccessibility: 'Override Accessibility',
    overrideUI: 'Override UI',
    overrideNotifications: 'Override Notifications',
    clearAllOverrides: 'Clear All Overrides',
    overrideDuration: 'Override duration',
    overrideExpires: 'Override expires in',
    overridePermanent: 'Permanent override',
    overrideTemporary: 'Temporary override',
    saveOverrideProfile: 'Save Override Profile',
    loadOverrideProfile: 'Load Override Profile',
  },
  
  es: {
    // General
    loading: 'Cargando...',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    create: 'Crear',
    export: 'Exportar',
    import: 'Importar',
    close: 'Cerrar',
    search: 'Buscar',
    filter: 'Filtrar',
    sort: 'Ordenar',
    
    // Profile Manager
    profileManager: 'Gestor de Perfiles',
    selectProfile: 'Seleccionar Perfil',
    createNewProfile: 'Crear Nuevo Perfil',
    noProfilesFound: 'No se encontraron perfiles. Haz clic en "Crear Nuevo Perfil" para comenzar.',
    profileCreated: '¡Perfil creado e iniciado sesión!',
    profileUpdated: '¡Perfil actualizado exitosamente!',
    profileDeleted: 'Perfil eliminado',
    profileExported: '¡Perfil exportado exitosamente!',
    profileImported: '¡Perfil importado exitosamente!',
    
    // Profile Info
    profileInfo: 'Información del Perfil',
    displayName: 'Nombre para Mostrar',
    email: 'Correo Electrónico',
    username: 'Nombre de Usuario',
    role: 'Rol',
    bio: 'Biografía',
    location: 'Ubicación',
    createdAt: 'Creado',
    lastLogin: 'Último Inicio de Sesión',
    enterDisplayName: 'Ingresa el nombre para mostrar',
    enterEmail: 'Ingresa la dirección de correo',
    enterBio: 'Cuéntanos sobre ti...',
    enterLocation: 'Ciudad, País',
    saveChanges: 'Guardar Cambios',
    
    // Preferences
    preferences: 'Preferencias',
    uiPreferences: 'Preferencias de UI',
    theme: 'Tema',
    language: 'Idioma',
    timezone: 'Zona Horaria',
    dateFormat: 'Formato de Fecha',
    timeFormat: 'Formato de Hora',
    defaultView: 'Vista Predeterminada',
    autoRefresh: 'Auto-recargar datos',
    showNotifications: 'Mostrar notificaciones',
    enableSounds: 'Habilitar efectos de sonido',
    
    // Accessibility
    accessibility: 'Accesibilidad',
    accessibilityControls: 'Controles de Accesibilidad',
    highContrast: 'Alto Contraste',
    largeText: 'Texto Grande',
    reducedMotion: 'Movimiento Reducido',
    darkMode: 'Modo Oscuro',
    focusIndicator: 'Indicador de Enfoque',
    readingMode: 'Modo de Lectura',
    colorBlindness: 'Daltonismo',
    savedAccessibilitySettings: 'Configuraciones de Accesibilidad Guardadas',
    applyToAllProfiles: 'Aplicar a Todos los Perfiles',
    resetToDefault: 'Restablecer a Predeterminado',
    
    // Roles
    admin: 'Administrador',
    user: 'Usuario',
    guest: 'Invitado',
    
    // Themes
    light: 'Claro',
    dark: 'Oscuro',
    auto: 'Automático',
    
    // Status
    active: 'Activo',
    never: 'Nunca',
    
    // Actions
    duplicate: 'Duplicar',
    logout: 'Cerrar Sesión',
    selectAll: 'Seleccionar Todo',
    deselectAll: 'Deseleccionar Todo',
    deleteSelected: 'Eliminar Seleccionados',
    
    // Advanced
    advanced: 'Avanzado',
    profileId: 'ID del Perfil',
    profileSize: 'Tamaño del Perfil',
    lastBackup: 'Última Copia de Seguridad',
    copy: 'Copiar',
    optimize: 'Optimizar',
    backup: 'Copia de Seguridad',
    dangerZone: 'Zona de Peligro',
    clearAllData: 'Limpiar Todos los Datos',
    deleteProfileForever: 'Eliminar Perfil Permanentemente',
    
    // Stats
    usageStats: 'Estadísticas de Uso',
    logins: 'inicios de sesión',
    daysActive: 'días activo',
    featuresEnabled: 'características habilitadas',
    customSettings: 'configuraciones personalizadas',
    storageUsed: 'KB usados',
    
    // Messages
    noProfileSelected: 'Ningún perfil seleccionado',
    loggedInAs: 'Sesión iniciada como',
    noAccessibilityFeatures: 'No hay características de accesibilidad habilitadas',
    confirmDeleteProfile: '¿Estás seguro de que quieres eliminar este perfil?',
    confirmDeleteSelected: '¿Estás seguro de que quieres eliminar {count} perfil(es)? Esta acción no se puede deshacer.',
    confirmClearData: '¿Estás seguro de que quieres limpiar todos los datos del perfil? Esto restablecerá las preferencias e información personal.',
    confirmDeleteForever: '¡PELIGRO: Esto eliminará permanentemente el perfil actual y todos sus datos. ¡Esto no se puede deshacer!',
    
    // Preference Overrides
    overrideUserPreferences: 'Anular preferencias de usuario',
    preferencesOverridden: 'Preferencias anuladas',
    preferencesRestored: 'Preferencias restauradas',
    temporaryOverride: 'Anulación temporal activa',
    globalOverride: 'Anulación global activa',
    profileOverride: 'Anulación de perfil activa',
    overrideSettings: 'Configuración de Anulación',
    overrideAccessibility: 'Anular Accesibilidad',
    overrideUI: 'Anular UI',
    overrideNotifications: 'Anular Notificaciones',
    clearAllOverrides: 'Limpiar Todas las Anulaciones',
    overrideDuration: 'Duración de anulación',
    overrideExpires: 'La anulación expira en',
    overridePermanent: 'Anulación permanente',
    overrideTemporary: 'Anulación temporal',
    saveOverrideProfile: 'Guardar Perfil de Anulación',
    loadOverrideProfile: 'Cargar Perfil de Anulación',
  },
  
  fr: {
    // General
    loading: 'Chargement...',
    save: 'Enregistrer',
    cancel: 'Annuler',
    edit: 'Modifier',
    delete: 'Supprimer',
    create: 'Créer',
    export: 'Exporter',
    import: 'Importer',
    close: 'Fermer',
    search: 'Rechercher',
    filter: 'Filtrer',
    sort: 'Trier',
    
    // Profile Manager
    profileManager: 'Gestionnaire de Profil',
    selectProfile: 'Sélectionner un Profil',
    createNewProfile: 'Créer un Nouveau Profil',
    noProfilesFound: 'Aucun profil trouvé. Cliquez sur "Créer un Nouveau Profil" pour commencer.',
    profileCreated: 'Profil créé et connecté!',
    profileUpdated: 'Profil mis à jour avec succès!',
    profileDeleted: 'Profil supprimé',
    profileExported: 'Profil exporté avec succès!',
    profileImported: 'Profil importé avec succès!',
    
    // Profile Info
    profileInfo: 'Informations du Profil',
    displayName: "Nom d'Affichage",
    email: 'Email',
    username: "Nom d'Utilisateur",
    role: 'Rôle',
    bio: 'Biographie',
    location: 'Localisation',
    createdAt: 'Créé',
    lastLogin: 'Dernière Connexion',
    enterDisplayName: 'Entrez le nom d\'affichage',
    enterEmail: 'Entrez l\'adresse email',
    enterBio: 'Parlez-nous de vous...',
    enterLocation: 'Ville, Pays',
    saveChanges: 'Enregistrer les Modifications',
    
    // Preferences
    preferences: 'Préférences',
    uiPreferences: 'Préférences UI',
    theme: 'Thème',
    language: 'Langue',
    timezone: 'Fuseau Horaire',
    dateFormat: 'Format de Date',
    timeFormat: 'Format d\'Heure',
    defaultView: 'Vue par Défaut',
    autoRefresh: 'Actualiser automatiquement les données',
    showNotifications: 'Afficher les notifications',
    enableSounds: 'Activer les effets sonores',
    
    // Accessibility
    accessibility: 'Accessibilité',
    accessibilityControls: 'Contrôles d\'Accessibilité',
    highContrast: 'Contraste Élevé',
    largeText: 'Grand Texte',
    reducedMotion: 'Mouvement Réduit',
    darkMode: 'Mode Sombre',
    focusIndicator: 'Indicateur de Focus',
    readingMode: 'Mode de Lecture',
    colorBlindness: 'Daltonisme',
    savedAccessibilitySettings: 'Paramètres d\'Accessibilité Sauvegardés',
    applyToAllProfiles: 'Appliquer à Tous les Profils',
    resetToDefault: 'Réinitialiser par Défaut',
    
    // Roles
    admin: 'Administrateur',
    user: 'Utilisateur',
    guest: 'Invité',
    
    // Themes
    light: 'Clair',
    dark: 'Sombre',
    auto: 'Auto',
    
    // Status
    active: 'Actif',
    never: 'Jamais',
    
    // Actions
    duplicate: 'Dupliquer',
    logout: 'Déconnexion',
    selectAll: 'Tout Sélectionner',
    deselectAll: 'Tout Désélectionner',
    deleteSelected: 'Supprimer Sélectionnés',
    
    // Advanced
    advanced: 'Avancé',
    profileId: 'ID du Profil',
    profileSize: 'Taille du Profil',
    lastBackup: 'Dernière Sauvegarde',
    copy: 'Copier',
    optimize: 'Optimiser',
    backup: 'Sauvegarder',
    dangerZone: 'Zone de Danger',
    clearAllData: 'Effacer Toutes les Données',
    deleteProfileForever: 'Supprimer le Profil Définitivement',
    
    // Stats
    usageStats: 'Statistiques d\'Utilisation',
    logins: 'connexions',
    daysActive: 'jours actifs',
    featuresEnabled: 'fonctionnalités activées',
    customSettings: 'paramètres personnalisés',
    storageUsed: 'KB utilisés',
    
    // Messages
    noProfileSelected: 'Aucun profil sélectionné',
    loggedInAs: 'Connecté en tant que',
    noAccessibilityFeatures: 'Aucune fonctionnalité d\'accessibilité activée',
    confirmDeleteProfile: 'Êtes-vous sûr de vouloir supprimer ce profil?',
    confirmDeleteSelected: 'Êtes-vous sûr de vouloir supprimer {count} profil(s)? Cette action ne peut être annulée.',
    confirmClearData: 'Êtes-vous sûr de vouloir effacer toutes les données du profil? Cela réinitialisera les préférences et les informations personnelles.',
    confirmDeleteForever: 'DANGER: Ceci supprimera définitivement le profil actuel et toutes ses données. Ceci ne peut pas être annulé!',
    
    // Preference Overrides
    overrideUserPreferences: 'Remplacer les préférences utilisateur',
    preferencesOverridden: 'Préférences remplacées',
    preferencesRestored: 'Préférences restaurées',
    temporaryOverride: 'Remplacement temporaire actif',
    globalOverride: 'Remplacement global actif',
    profileOverride: 'Remplacement de profil actif',
    overrideSettings: 'Paramètres de Remplacement',
    overrideAccessibility: 'Remplacer l\'Accessibilité',
    overrideUI: 'Remplacer l\'UI',
    overrideNotifications: 'Remplacer les Notifications',
    clearAllOverrides: 'Effacer Tous les Remplacements',
    overrideDuration: 'Durée du remplacement',
    overrideExpires: 'Le remplacement expire dans',
    overridePermanent: 'Remplacement permanent',
    overrideTemporary: 'Remplacement temporaire',
    saveOverrideProfile: 'Sauvegarder le Profil de Remplacement',
    loadOverrideProfile: 'Charger le Profil de Remplacement',
  },
  
  de: {
    // General
    loading: 'Laden...',
    save: 'Speichern',
    cancel: 'Abbrechen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    create: 'Erstellen',
    export: 'Exportieren',
    import: 'Importieren',
    close: 'Schließen',
    search: 'Suchen',
    filter: 'Filtern',
    sort: 'Sortieren',
    
    // Profile Manager
    profileManager: 'Profil-Manager',
    selectProfile: 'Profil Auswählen',
    createNewProfile: 'Neues Profil Erstellen',
    noProfilesFound: 'Keine Profile gefunden. Klicken Sie auf "Neues Profil Erstellen" um zu beginnen.',
    profileCreated: 'Profil erstellt und angemeldet!',
    profileUpdated: 'Profil erfolgreich aktualisiert!',
    profileDeleted: 'Profil gelöscht',
    profileExported: 'Profil erfolgreich exportiert!',
    profileImported: 'Profil erfolgreich importiert!',
    
    // Profile Info
    profileInfo: 'Profil-Informationen',
    displayName: 'Anzeigename',
    email: 'E-Mail',
    username: 'Benutzername',
    role: 'Rolle',
    bio: 'Biografie',
    location: 'Standort',
    createdAt: 'Erstellt',
    lastLogin: 'Letzte Anmeldung',
    enterDisplayName: 'Anzeigename eingeben',
    enterEmail: 'E-Mail-Adresse eingeben',
    enterBio: 'Erzählen Sie uns über sich...',
    enterLocation: 'Stadt, Land',
    saveChanges: 'Änderungen Speichern',
    
    // Preferences
    preferences: 'Präferenzen',
    uiPreferences: 'UI-Präferenzen',
    theme: 'Thema',
    language: 'Sprache',
    timezone: 'Zeitzone',
    dateFormat: 'Datumsformat',
    timeFormat: 'Zeitformat',
    defaultView: 'Standardansicht',
    autoRefresh: 'Daten automatisch aktualisieren',
    showNotifications: 'Benachrichtigungen anzeigen',
    enableSounds: 'Soundeffekte aktivieren',
    
    // Accessibility
    accessibility: 'Barrierefreiheit',
    accessibilityControls: 'Barrierefreiheits-Steuerelemente',
    highContrast: 'Hoher Kontrast',
    largeText: 'Großer Text',
    reducedMotion: 'Reduzierte Bewegung',
    darkMode: 'Dunkler Modus',
    focusIndicator: 'Fokus-Indikator',
    readingMode: 'Lesemodus',
    colorBlindness: 'Farbenblindheit',
    savedAccessibilitySettings: 'Gespeicherte Barrierefreiheitseinstellungen',
    applyToAllProfiles: 'Auf Alle Profile Anwenden',
    resetToDefault: 'Auf Standard Zurücksetzen',
    
    // Roles
    admin: 'Administrator',
    user: 'Benutzer',
    guest: 'Gast',
    
    // Themes
    light: 'Hell',
    dark: 'Dunkel',
    auto: 'Auto',
    
    // Status
    active: 'Aktiv',
    never: 'Niemals',
    
    // Actions
    duplicate: 'Duplizieren',
    logout: 'Abmelden',
    selectAll: 'Alle Auswählen',
    deselectAll: 'Alle Abwählen',
    deleteSelected: 'Ausgewählte Löschen',
    
    // Advanced
    advanced: 'Erweitert',
    profileId: 'Profil-ID',
    profileSize: 'Profilgröße',
    lastBackup: 'Letzte Sicherung',
    copy: 'Kopieren',
    optimize: 'Optimieren',
    backup: 'Sichern',
    dangerZone: 'Gefahrenzone',
    clearAllData: 'Alle Daten Löschen',
    deleteProfileForever: 'Profil Endgültig Löschen',
    
    // Stats
    usageStats: 'Nutzungsstatistiken',
    logins: 'Anmeldungen',
    daysActive: 'Tage aktiv',
    featuresEnabled: 'Funktionen aktiviert',
    customSettings: 'benutzerdefinierte Einstellungen',
    storageUsed: 'KB verwendet',
    
    // Messages
    noProfileSelected: 'Kein Profil ausgewählt',
    loggedInAs: 'Angemeldet als',
    noAccessibilityFeatures: 'Keine Barrierefreiheitsfunktionen aktiviert',
    confirmDeleteProfile: 'Sind Sie sicher, dass Sie dieses Profil löschen möchten?',
    confirmDeleteSelected: 'Sind Sie sicher, dass Sie {count} Profil(e) löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
    confirmClearData: 'Sind Sie sicher, dass Sie alle Profildaten löschen möchten? Dies setzt Präferenzen und persönliche Informationen zurück.',
    confirmDeleteForever: 'GEFAHR: Dies löscht dauerhaft das aktuelle Profil und alle seine Daten. Dies kann nicht rückgängig gemacht werden!',
  },
  
  ja: {
    // General
    loading: '読み込み中...',
    save: '保存',
    cancel: 'キャンセル',
    edit: '編集',
    delete: '削除',
    create: '作成',
    export: 'エクスポート',
    import: 'インポート',
    close: '閉じる',
    search: '検索',
    filter: 'フィルター',
    sort: '並び替え',
    
    // Profile Manager
    profileManager: 'プロファイルマネージャー',
    selectProfile: 'プロファイルを選択',
    createNewProfile: '新しいプロファイルを作成',
    noProfilesFound: 'プロファイルが見つかりません。「新しいプロファイルを作成」をクリックして開始してください。',
    profileCreated: 'プロファイルが作成され、ログインしました！',
    profileUpdated: 'プロファイルが正常に更新されました！',
    profileDeleted: 'プロファイルが削除されました',
    profileExported: 'プロファイルが正常にエクスポートされました！',
    profileImported: 'プロファイルが正常にインポートされました！',
    
    // Profile Info
    profileInfo: 'プロファイル情報',
    displayName: '表示名',
    email: 'メールアドレス',
    username: 'ユーザー名',
    role: '役割',
    bio: '自己紹介',
    location: '場所',
    createdAt: '作成日',
    lastLogin: '最終ログイン',
    enterDisplayName: '表示名を入力',
    enterEmail: 'メールアドレスを入力',
    enterBio: '自己紹介を入力...',
    enterLocation: '都市、国',
    saveChanges: '変更を保存',
    
    // Preferences
    preferences: '設定',
    uiPreferences: 'UI設定',
    theme: 'テーマ',
    language: '言語',
    timezone: 'タイムゾーン',
    dateFormat: '日付形式',
    timeFormat: '時間形式',
    defaultView: 'デフォルトビュー',
    autoRefresh: 'データを自動更新',
    showNotifications: '通知を表示',
    enableSounds: 'サウンド効果を有効にする',
    
    // Accessibility
    accessibility: 'アクセシビリティ',
    accessibilityControls: 'アクセシビリティコントロール',
    highContrast: 'ハイコントラスト',
    largeText: '大きなテキスト',
    reducedMotion: '動きを減らす',
    darkMode: 'ダークモード',
    focusIndicator: 'フォーカスインジケーター',
    readingMode: '読み取りモード',
    colorBlindness: '色覚異常',
    savedAccessibilitySettings: '保存されたアクセシビリティ設定',
    applyToAllProfiles: 'すべてのプロファイルに適用',
    resetToDefault: 'デフォルトにリセット',
    
    // Roles
    admin: '管理者',
    user: 'ユーザー',
    guest: 'ゲスト',
    
    // Themes
    light: 'ライト',
    dark: 'ダーク',
    auto: '自動',
    
    // Status
    active: 'アクティブ',
    never: 'なし',
    
    // Actions
    duplicate: '複製',
    logout: 'ログアウト',
    selectAll: 'すべて選択',
    deselectAll: 'すべて選択解除',
    deleteSelected: '選択を削除',
    
    // Advanced
    advanced: '詳細',
    profileId: 'プロファイルID',
    profileSize: 'プロファイルサイズ',
    lastBackup: '最終バックアップ',
    copy: 'コピー',
    optimize: '最適化',
    backup: 'バックアップ',
    dangerZone: '危険ゾーン',
    clearAllData: 'すべてのデータをクリア',
    deleteProfileForever: 'プロファイルを完全に削除',
    
    // Stats
    usageStats: '使用統計',
    logins: 'ログイン',
    daysActive: '活動日数',
    featuresEnabled: '有効な機能',
    customSettings: 'カスタム設定',
    storageUsed: 'KB使用量',
    
    // Messages
    noProfileSelected: 'プロファイルが選択されていません',
    loggedInAs: 'ログイン中',
    noAccessibilityFeatures: 'アクセシビリティ機能が有効になっていません',
    confirmDeleteProfile: 'このプロファイルを削除してもよろしいですか？',
    confirmDeleteSelected: '{count}個のプロファイルを削除してもよろしいですか？この操作は元に戻せません。',
    confirmClearData: 'すべてのプロファイルデータをクリアしてもよろしいですか？これにより設定と個人情報がリセットされます。',
    confirmDeleteForever: '危険：これにより現在のプロファイルとすべてのデータが完全に削除されます。これは元に戻せません！',
  },
  
  zh: {
    // General
    loading: '加载中...',
    save: '保存',
    cancel: '取消',
    edit: '编辑',
    delete: '删除',
    create: '创建',
    export: '导出',
    import: '导入',
    close: '关闭',
    search: '搜索',
    filter: '筛选',
    sort: '排序',
    
    // Profile Manager
    profileManager: '个人资料管理器',
    selectProfile: '选择个人资料',
    createNewProfile: '创建新个人资料',
    noProfilesFound: '未找到个人资料。点击"创建新个人资料"开始。',
    profileCreated: '个人资料已创建并登录！',
    profileUpdated: '个人资料更新成功！',
    profileDeleted: '个人资料已删除',
    profileExported: '个人资料导出成功！',
    profileImported: '个人资料导入成功！',
    
    // Profile Info
    profileInfo: '个人资料信息',
    displayName: '显示名称',
    email: '电子邮件',
    username: '用户名',
    role: '角色',
    bio: '个人简介',
    location: '位置',
    createdAt: '创建时间',
    lastLogin: '最后登录',
    enterDisplayName: '输入显示名称',
    enterEmail: '输入电子邮件地址',
    enterBio: '介绍一下自己...',
    enterLocation: '城市，国家',
    saveChanges: '保存更改',
    
    // Preferences
    preferences: '偏好设置',
    uiPreferences: 'UI偏好设置',
    theme: '主题',
    language: '语言',
    timezone: '时区',
    dateFormat: '日期格式',
    timeFormat: '时间格式',
    defaultView: '默认视图',
    autoRefresh: '自动刷新数据',
    showNotifications: '显示通知',
    enableSounds: '启用声音效果',
    
    // Accessibility
    accessibility: '无障碍功能',
    accessibilityControls: '无障碍控制',
    highContrast: '高对比度',
    largeText: '大文本',
    reducedMotion: '减少动画',
    darkMode: '深色模式',
    focusIndicator: '焦点指示器',
    readingMode: '阅读模式',
    colorBlindness: '色盲',
    savedAccessibilitySettings: '已保存的无障碍设置',
    applyToAllProfiles: '应用到所有个人资料',
    resetToDefault: '重置为默认',
    
    // Roles
    admin: '管理员',
    user: '用户',
    guest: '访客',
    
    // Themes
    light: '浅色',
    dark: '深色',
    auto: '自动',
    
    // Status
    active: '活跃',
    never: '从未',
    
    // Actions
    duplicate: '复制',
    logout: '登出',
    selectAll: '全选',
    deselectAll: '取消全选',
    deleteSelected: '删除选中项',
    
    // Advanced
    advanced: '高级',
    profileId: '个人资料ID',
    profileSize: '个人资料大小',
    lastBackup: '最后备份',
    copy: '复制',
    optimize: '优化',
    backup: '备份',
    dangerZone: '危险区域',
    clearAllData: '清除所有数据',
    deleteProfileForever: '永久删除个人资料',
    
    // Stats
    usageStats: '使用统计',
    logins: '登录次数',
    daysActive: '活跃天数',
    featuresEnabled: '已启用功能',
    customSettings: '自定义设置',
    storageUsed: 'KB已使用',
    
    // Messages
    noProfileSelected: '未选择个人资料',
    loggedInAs: '登录为',
    noAccessibilityFeatures: '未启用无障碍功能',
    confirmDeleteProfile: '确定要删除此个人资料吗？',
    confirmDeleteSelected: '确定要删除{count}个个人资料吗？此操作无法撤销。',
    confirmClearData: '确定要清除所有个人资料数据吗？这将重置偏好设置和个人信息。',
    confirmDeleteForever: '危险：这将永久删除当前个人资料及其所有数据。此操作无法撤销！',
  },
};

// i18n hook
export const useTranslation = (language: string = 'en') => {
  const t = (key: string, params?: { [key: string]: string | number }) => {
    const translation = translations[language]?.[key] || translations['en'][key] || key;
    
    if (params) {
      return Object.keys(params).reduce((str, param) => {
        return str.replace(new RegExp(`{${param}}`, 'g'), String(params[param]));
      }, translation);
    }
    
    return translation;
  };

  const changeLanguage = (newLanguage: string) => {
    if (translations[newLanguage]) {
      localStorage.setItem('language', newLanguage);
      window.location.reload();
    }
  };

  const getCurrentLanguage = () => {
    return localStorage.getItem('language') || navigator.language.split('-')[0] || 'en';
  };

  const getAvailableLanguages = () => {
    return Object.keys(translations).map(code => ({
      code,
      name: new Intl.DisplayNames([code], { type: 'language' }).of(code) || code,
    }));
  };

  return {
    t,
    changeLanguage,
    getCurrentLanguage,
    getAvailableLanguages,
    currentLanguage: getCurrentLanguage(),
  };
};

interface UserProfileManagerProps {
  onProfileChange?: (profile: UserProfile) => void;
  onPreferencesChange?: (preferences: UserPreferences) => void;
  language?: string;
}

export const UserProfileManagerComponent: React.FC<UserProfileManagerProps> = ({
  onProfileChange,
  onPreferencesChange,
  language: propLanguage,
}) => {
  const { t, changeLanguage, getCurrentLanguage, getAvailableLanguages, currentLanguage } = useTranslation(propLanguage || getCurrentLanguage());
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'accessibility' | 'advanced'>('profile');
  
  // Preference Override State
  const [preferenceOverrides, setPreferenceOverrides] = useState<{
    global: Partial<UserPreferences>;
    accessibility: Partial<UserPreferences['accessibility']>;
    ui: Partial<UserPreferences['ui']>;
    notifications: Partial<UserPreferences['notifications']>;
    isActive: boolean;
    isTemporary: boolean;
    expiresAt?: Date;
  }>({
    global: {},
    accessibility: {},
    ui: {},
    notifications: {},
    isActive: false,
    isTemporary: false,
  });

  useEffect(() => {
    // Load current profile on mount
    const profile = userProfileManager.getCurrentProfile();
    if (profile) {
      setCurrentProfile(profile);
    }
    
    // Load saved overrides from localStorage
    const savedOverrides = localStorage.getItem('preferenceOverrides');
    if (savedOverrides) {
      try {
        const parsed = JSON.parse(savedOverrides);
        if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
          setPreferenceOverrides(parsed);
        } else {
          localStorage.removeItem('preferenceOverrides');
        }
      } catch (error) {
        console.warn('Failed to load preference overrides:', error);
      }
    }
  }, []);

  const handleCreateProfile = (userData: Partial<UserProfile>) => {
    const newProfile = userProfileManager.createProfile(userData);
    setCurrentProfile(newProfile);
    userProfileManager.login(newProfile.id);
    setIsCreatingProfile(false);
    onProfileChange?.(newProfile);
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    if (!currentProfile) return;
    
    const updatedProfile = userProfileManager.updateProfile(currentProfile.id, updates);
    if (updatedProfile) {
      setCurrentProfile(updatedProfile);
      onProfileChange?.(updatedProfile);
    }
  };

  const handleUpdatePreferences = (preferences: Partial<UserPreferences>) => {
    if (!currentProfile) return;
    
    const updatedProfile = userProfileManager.updatePreferences(currentProfile.id, preferences);
    if (updatedProfile) {
      setCurrentProfile(updatedProfile);
      onPreferencesChange?.(updatedProfile.preferences);
    }
  };

  // Preference Override Functions
  const togglePreferenceOverride = () => {
    const newOverrideState = {
      ...preferenceOverrides,
      isActive: !preferenceOverrides.isActive,
    };
    
    setPreferenceOverrides(newOverrideState);
    localStorage.setItem('preferenceOverrides', JSON.stringify(newOverrideState));
    
    // Apply or remove overrides
    if (!preferenceOverrides.isActive) {
      applyPreferenceOverrides();
    } else {
      removePreferenceOverrides();
    }
  };

  const applyPreferenceOverrides = () => {
    if (!currentProfile) return;
    
    // Apply overrides to current profile preferences
    const mergedPreferences = {
      ...currentProfile.preferences,
      ...preferenceOverrides.global,
      accessibility: {
        ...currentProfile.preferences.accessibility,
        ...preferenceOverrides.accessibility,
      },
      ui: {
        ...currentProfile.preferences.ui,
        ...preferenceOverrides.ui,
      },
      notifications: {
        ...currentProfile.preferences.notifications,
        ...preferenceOverrides.notifications,
      },
    };
    
    // Apply to DOM/UI
    Object.entries(mergedPreferences.accessibility).forEach(([key, value]) => {
      const feature = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      document.body.classList.toggle(feature, Boolean(value));
    });
    
    onPreferencesChange?.(mergedPreferences);
  };

  const removePreferenceOverrides = () => {
    if (!currentProfile) return;
    
    // Restore original preferences
    Object.entries(currentProfile.preferences.accessibility).forEach(([key, value]) => {
      const feature = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      document.body.classList.toggle(feature, Boolean(value));
    });
    
    onPreferencesChange?.(currentProfile.preferences);
  };

  const clearAllOverrides = () => {
    const clearedOverrides = {
      global: {},
      accessibility: {},
      ui: {},
      notifications: {},
      isActive: false,
      isTemporary: false,
    };
    
    setPreferenceOverrides(clearedOverrides);
    localStorage.removeItem('preferenceOverrides');
    removePreferenceOverrides();
  };

  const setTemporaryOverride = (duration: number) => {
    const expiresAt = new Date(Date.now() + duration * 60 * 1000); // duration in minutes
    const newOverrideState = {
      ...preferenceOverrides,
      isActive: true,
      isTemporary: true,
      expiresAt,
    };
    
    setPreferenceOverrides(newOverrideState);
    localStorage.setItem('preferenceOverrides', JSON.stringify(newOverrideState));
    applyPreferenceOverrides();
  };

  // Preference Override Toggle Component
  const PreferenceOverrideToggle: React.FC = () => {
    const timeUntilExpiry = preferenceOverrides.expiresAt 
      ? Math.max(0, Math.floor((preferenceOverrides.expiresAt.getTime() - Date.now()) / 60000))
      : 0;

    return (
      <div className="flex items-center gap-2">
        <button
          className={`toggle-user-preferences activate button image-only relative ${
            preferenceOverrides.isActive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-500 hover:bg-gray-600'
          } text-white rounded-lg p-2 transition-colors`}
          role="button"
          tabIndex={0}
          title={t('overrideUserPreferences')}
          aria-pressed={preferenceOverrides.isActive}
          aria-label={t('overrideUserPreferences')}
          onClick={togglePreferenceOverride}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              togglePreferenceOverride();
            }
          }}
        >
          <div className="glyph" style={{ width: '16px', height: '16px' }}>
            <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: '100%', height: '100%' }}>
              <path d="M8 2C4.686 2 2 4.686 2 8s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z"/>
              <circle cx="8" cy="8" r="2"/>
            </svg>
          </div>
          {preferenceOverrides.isActive && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </button>
        
        {preferenceOverrides.isActive && (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-orange-600">
              {preferenceOverrides.isTemporary ? t('temporaryOverride') : t('globalOverride')}
            </span>
            {preferenceOverrides.isTemporary && timeUntilExpiry > 0 && (
              <span className="text-gray-500">
                {t('overrideExpires')}: {timeUntilExpiry}m
              </span>
            )}
          </div>
        )}
        
        {preferenceOverrides.isActive && (
          <button
            onClick={clearAllOverrides}
            className="text-xs text-red-600 hover:text-red-700 underline"
            title={t('clearAllOverrides')}
          >
            {t('clearAllOverrides')}
          </button>
        )}
      </div>
    );
  };

  // Language selector component
  const LanguageSelector: React.FC = () => {
    const languages = getAvailableLanguages();
    
    return (
      <div className="relative">
        <select
          value={currentLanguage}
          onChange={(e) => changeLanguage(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
          aria-label={t('language')}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="user-profile-manager bg-white rounded-lg shadow-lg p-6">
      {/* Header with language selector and preference override */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">{t('profileManager')}</h2>
        <div className="flex items-center gap-4">
          <PreferenceOverrideToggle />
          <LanguageSelector />
        </div>
      </div>

      {/* Override Status Banner */}
      {preferenceOverrides.isActive && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-orange-800">
                {preferenceOverrides.isTemporary ? t('temporaryOverride') : t('globalOverride')}
              </span>
              <span className="text-sm text-orange-600">
                - {t('preferencesOverridden')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {preferenceOverrides.isTemporary && (
                <button
                  onClick={() => setTemporaryOverride(30)} // Extend by 30 minutes
                  className="text-xs text-orange-600 hover:text-orange-700 underline"
                >
                  Extend 30m
                </button>
              )}
              <button
                onClick={clearAllOverrides}
                className="text-xs text-red-600 hover:text-red-700 underline"
              >
                {t('clearAllOverrides')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile content based on state */}
      {!currentProfile ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">{t('noProfileSelected')}</p>
          <button
            onClick={() => setIsCreatingProfile(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {t('createNewProfile')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current profile info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">{currentProfile.displayName}</h3>
                <p className="text-sm text-gray-600">
                  {t('loggedInAs')} @{currentProfile.username}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === 'profile'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t('profileInfo')}
                </button>
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === 'preferences'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t('preferences')}
                </button>
                <button
                  onClick={() => setActiveTab('accessibility')}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === 'accessibility'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t('accessibility')}
                </button>
                <button
                  onClick={() => setActiveTab('advanced')}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === 'advanced'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t('advanced')}
                </button>
              </div>
            </div>
          </div>

          {/* Tab content */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800">{t('profileInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('displayName')}
                  </label>
                  <input
                    type="text"
                    value={currentProfile.displayName}
                    onChange={(e) => handleUpdateProfile({ displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('enterDisplayName')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    value={currentProfile.email}
                    onChange={(e) => handleUpdateProfile({ email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('enterEmail')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('role')}
                  </label>
                  <select
                    value={currentProfile.role}
                    onChange={(e) => handleUpdateProfile({ role: e.target.value as 'admin' | 'user' | 'guest' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">{t('user')}</option>
                    <option value="admin">{t('admin')}</option>
                    <option value="guest">{t('guest')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('location')}
                  </label>
                  <input
                    type="text"
                    value={currentProfile.location || ''}
                    onChange={(e) => handleUpdateProfile({ location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('enterLocation')}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('bio')}
                </label>
                <textarea
                  value={currentProfile.bio || ''}
                  onChange={(e) => handleUpdateProfile({ bio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={t('enterBio')}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => userProfileManager.logout()}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('logout')}
                </button>
                <button
                  onClick={() => {
                    const exportData = userProfileManager.exportProfile(currentProfile.id);
                    if (exportData) {
                      const blob = new Blob([exportData], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `profile-${currentProfile.username}-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  {t('export')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800">{t('uiPreferences')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('theme')}
                  </label>
                  <select
                    value={currentProfile.preferences.ui.theme}
                    onChange={(e) => handleUpdatePreferences({
                      ui: { ...currentProfile.preferences.ui, theme: e.target.value as 'light' | 'dark' | 'auto' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="light">{t('light')}</option>
                    <option value="dark">{t('dark')}</option>
                    <option value="auto">{t('auto')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('language')}
                  </label>
                  <select
                    value={currentProfile.preferences.ui.language}
                    onChange={(e) => handleUpdatePreferences({
                      ui: { ...currentProfile.preferences.ui, language: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ja">日本語</option>
                    <option value="zh">中文</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('timezone')}
                  </label>
                  <select
                    value={currentProfile.preferences.ui.timezone}
                    onChange={(e) => handleUpdatePreferences({
                      ui: { ...currentProfile.preferences.ui, timezone: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                    <option value="Asia/Shanghai">Asia/Shanghai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dateFormat')}
                  </label>
                  <select
                    value={currentProfile.preferences.ui.dateFormat}
                    onChange={(e) => handleUpdatePreferences({
                      ui: { ...currentProfile.preferences.ui, dateFormat: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={currentProfile.preferences.ui.autoRefresh}
                    onChange={(e) => handleUpdatePreferences({
                      ui: { ...currentProfile.preferences.ui, autoRefresh: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  {t('autoRefresh')}
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={currentProfile.preferences.ui.showNotifications}
                    onChange={(e) => handleUpdatePreferences({
                      ui: { ...currentProfile.preferences.ui, showNotifications: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  {t('showNotifications')}
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={currentProfile.preferences.ui.enableSounds}
                    onChange={(e) => handleUpdatePreferences({
                      ui: { ...currentProfile.preferences.ui, enableSounds: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  {t('enableSounds')}
                </label>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <h3 className="font-medium text-gray-800">{t('overrideSettings')}</h3>
              
              {/* Override Controls */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">{t('overrideUserPreferences')}</h4>
                <div className="space-y-4">
                  {/* Temporary Override Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('overrideTemporary')}
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTemporaryOverride(15)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        15m
                      </button>
                      <button
                        onClick={() => setTemporaryOverride(30)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        30m
                      </button>
                      <button
                        onClick={() => setTemporaryOverride(60)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        1h
                      </button>
                      <button
                        onClick={() => setTemporaryOverride(120)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        2h
                      </button>
                    </div>
                  </div>

                  {/* Permanent Override Toggle */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferenceOverrides.isActive && !preferenceOverrides.isTemporary}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newOverrideState = {
                              ...preferenceOverrides,
                              isActive: true,
                              isTemporary: false,
                              expiresAt: undefined,
                            };
                            setPreferenceOverrides(newOverrideState);
                            localStorage.setItem('preferenceOverrides', JSON.stringify(newOverrideState));
                            applyPreferenceOverrides();
                          } else {
                            togglePreferenceOverride();
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {t('overridePermanent')}
                      </span>
                    </label>
                  </div>

                  {/* Clear Overrides */}
                  <div className="pt-3 border-t">
                    <button
                      onClick={clearAllOverrides}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      disabled={!preferenceOverrides.isActive}
                    >
                      {t('clearAllOverrides')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Override Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Accessibility Overrides */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">{t('overrideAccessibility')}</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferenceOverrides.accessibility.highContrast || false}
                        onChange={(e) => {
                          const newOverrides = {
                            ...preferenceOverrides,
                            accessibility: {
                              ...preferenceOverrides.accessibility,
                              highContrast: e.target.checked,
                            },
                          };
                          setPreferenceOverrides(newOverrides);
                          localStorage.setItem('preferenceOverrides', JSON.stringify(newOverrides));
                          if (preferenceOverrides.isActive) applyPreferenceOverrides();
                        }}
                        className="mr-2"
                      />
                      {t('highContrast')}
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferenceOverrides.accessibility.largeText || false}
                        onChange={(e) => {
                          const newOverrides = {
                            ...preferenceOverrides,
                            accessibility: {
                              ...preferenceOverrides.accessibility,
                              largeText: e.target.checked,
                            },
                          };
                          setPreferenceOverrides(newOverrides);
                          localStorage.setItem('preferenceOverrides', JSON.stringify(newOverrides));
                          if (preferenceOverrides.isActive) applyPreferenceOverrides();
                        }}
                        className="mr-2"
                      />
                      {t('largeText')}
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferenceOverrides.accessibility.darkMode || false}
                        onChange={(e) => {
                          const newOverrides = {
                            ...preferenceOverrides,
                            accessibility: {
                              ...preferenceOverrides.accessibility,
                              darkMode: e.target.checked,
                            },
                          };
                          setPreferenceOverrides(newOverrides);
                          localStorage.setItem('preferenceOverrides', JSON.stringify(newOverrides));
                          if (preferenceOverrides.isActive) applyPreferenceOverrides();
                        }}
                        className="mr-2"
                      />
                      {t('darkMode')}
                    </label>
                  </div>
                </div>

                {/* UI Overrides */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">{t('overrideUI')}</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('theme')}
                      </label>
                      <select
                        value={preferenceOverrides.ui.theme || ''}
                        onChange={(e) => {
                          const newOverrides = {
                            ...preferenceOverrides,
                            ui: {
                              ...preferenceOverrides.ui,
                              theme: e.target.value as 'light' | 'dark' | 'auto' || undefined,
                            },
                          };
                          setPreferenceOverrides(newOverrides);
                          localStorage.setItem('preferenceOverrides', JSON.stringify(newOverrides));
                          if (preferenceOverrides.isActive) applyPreferenceOverrides();
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Default</option>
                        <option value="light">{t('light')}</option>
                        <option value="dark">{t('dark')}</option>
                        <option value="auto">{t('auto')}</option>
                      </select>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferenceOverrides.ui.showNotifications || false}
                        onChange={(e) => {
                          const newOverrides = {
                            ...preferenceOverrides,
                            ui: {
                              ...preferenceOverrides.ui,
                              showNotifications: e.target.checked,
                            },
                          };
                          setPreferenceOverrides(newOverrides);
                          localStorage.setItem('preferenceOverrides', JSON.stringify(newOverrides));
                          if (preferenceOverrides.isActive) applyPreferenceOverrides();
                        }}
                        className="mr-2"
                      />
                      {t('showNotifications')}
                    </label>
                  </div>
                </div>
              </div>

              {/* Override Status */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Override Status</h4>
                <div className="text-sm text-blue-700">
                  <p>Status: {preferenceOverrides.isActive ? 'Active' : 'Inactive'}</p>
                  <p>Type: {preferenceOverrides.isTemporary ? 'Temporary' : 'Permanent'}</p>
                  {preferenceOverrides.expiresAt && (
                    <p>Expires: {preferenceOverrides.expiresAt.toLocaleString()}</p>
                  )}
                  <p>Active Overrides: {Object.keys(preferenceOverrides.accessibility).filter(k => preferenceOverrides.accessibility[k as keyof typeof preferenceOverrides.accessibility]).length + 
                     Object.keys(preferenceOverrides.ui).filter(k => preferenceOverrides.ui[k as keyof typeof preferenceOverrides.ui]).length}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create profile modal */}
      {isCreatingProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('createNewProfile')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('displayName')}
                </label>
                <input
                  type="text"
                  id="new-display-name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('enterDisplayName')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('username')}
                </label>
                <input
                  type="text"
                  id="new-username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('username')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('email')}
                </label>
                <input
                  type="email"
                  id="new-email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('enterEmail')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('role')}
                </label>
                <select
                  id="new-role"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">{t('user')}</option>
                  <option value="admin">{t('admin')}</option>
                  <option value="guest">{t('guest')}</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsCreatingProfile(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  const displayName = (document.getElementById('new-display-name') as HTMLInputElement)?.value;
                  const username = (document.getElementById('new-username') as HTMLInputElement)?.value;
                  const email = (document.getElementById('new-email') as HTMLInputElement)?.value;
                  const role = (document.getElementById('new-role') as HTMLSelectElement)?.value as 'admin' | 'user' | 'guest';
                  
                  if (displayName && username) {
                    handleCreateProfile({ displayName, username, email, role });
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {t('create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  const handleLogin = (profileId: string) => {
    const profile = userProfileManager.login(profileId);
    if (profile) {
      setCurrentProfile(profile);
      onProfileChange?.(profile);
    }
  };

  const handleLogout = () => {
    userProfileManager.logout();
    setCurrentProfile(null);
    onProfileChange?.(null as any);
  };

  const handleExportProfile = () => {
    if (!currentProfile) return;
    
    const exportData = userProfileManager.exportProfile(currentProfile.id);
    if (exportData) {
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profile-${currentProfile.username}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportProfile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const profile = userProfileManager.importProfile(content);
      if (profile) {
        setCurrentProfile(profile);
        userProfileManager.login(profile.id);
        onProfileChange?.(profile);
      }
    };
    reader.readAsText(file);
  };

  if (!currentProfile) {
    return <ProfileSelector onLogin={handleLogin} onCreateNew={() => setIsCreatingProfile(true)} />;
  }

  return (
    <div className="user-profile-manager bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
            {currentProfile.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{currentProfile.displayName}</h2>
            <p className="text-sm text-gray-600">@{currentProfile.username} • {currentProfile.role}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {(['profile', 'preferences', 'accessibility'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'profile' && (
          <ProfileTab
            profile={currentProfile}
            onUpdate={handleUpdateProfile}
            onExport={handleExportProfile}
          />
        )}
        {activeTab === 'preferences' && (
          <PreferencesTab
            preferences={currentProfile.preferences}
            onUpdate={handleUpdatePreferences}
          />
        )}
        {activeTab === 'accessibility' && (
          <AccessibilityTab
            preferences={currentProfile.preferences}
            onUpdate={handleUpdatePreferences}
          />
        )}
      </div>
    </div>
  );
};

// Profile Selector Component
const ProfileSelector: React.FC<{
  onLogin: (profileId: string) => void;
  onCreateNew: () => void;
}> = ({ onLogin, onCreateNew }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    const allProfiles = userProfileManager.getAllProfiles();
    setProfiles(allProfiles);
  }, []);

  return (
    <div className="profile-selector bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Select Profile</h2>
      
      {profiles.length > 0 && (
        <div className="space-y-3 mb-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => onLogin(profile.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-sm">
                  {profile.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-800">{profile.displayName}</div>
                  <div className="text-sm text-gray-600">@{profile.username}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(profile.lastLogin).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button
        onClick={onCreateNew}
        className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
      >
        Create New Profile
      </button>
    </div>
  );
};

// Profile Tab Component
const ProfileTab: React.FC<{
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => void;
  onExport: () => void;
}> = ({ profile, onUpdate, onExport }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: profile.displayName,
    email: profile.email,
  });

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-900">{profile.displayName}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          {isEditing ? (
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-900">{profile.email || 'Not set'}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
          <p className="text-gray-900">@{profile.username}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
          <p className="text-gray-900 capitalize">{profile.role}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Created</label>
          <p className="text-gray-900">{new Date(profile.createdAt).toLocaleDateString()}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Login</label>
          <p className="text-gray-900">{new Date(profile.lastLogin).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({ displayName: profile.displayName, email: profile.email });
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Edit Profile
            </button>
            <button
              onClick={onExport}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Export Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Preferences Tab Component
const PreferencesTab: React.FC<{
  preferences: UserPreferences;
  onUpdate: (updates: Partial<UserPreferences>) => void;
}> = ({ preferences, onUpdate }) => {
  const [localPreferences, setLocalPreferences] = useState(preferences);

  const handleUpdate = (category: keyof UserPreferences, key: string, value: any) => {
    const updated = {
      ...localPreferences,
      [category]: {
        ...localPreferences[category],
        [key]: value,
      },
    };
    setLocalPreferences(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      {/* UI Preferences */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">UI Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
            <select
              value={localPreferences.ui.theme}
              onChange={(e) => handleUpdate('ui', 'theme', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={localPreferences.ui.language}
              onChange={(e) => handleUpdate('ui', 'language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
            <select
              value={localPreferences.ui.dateFormat}
              onChange={(e) => handleUpdate('ui', 'dateFormat', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default View</label>
            <select
              value={localPreferences.ui.defaultView}
              onChange={(e) => handleUpdate('ui', 'defaultView', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="treemap">Treemap</option>
              <option value="pie">Pie Chart</option>
              <option value="bars">Bar Chart</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Notifications</h3>
        <div className="space-y-3">
          {Object.entries({
            email: 'Email Notifications',
            push: 'Push Notifications',
            desktop: 'Desktop Notifications',
            sound: 'Sound Effects',
          }).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={localPreferences.notifications[key as keyof typeof localPreferences.notifications]}
                onChange={(e) => handleUpdate('notifications', key, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

// Accessibility Tab Component
const AccessibilityTab: React.FC<{
  preferences: UserPreferences;
  onUpdate: (updates: Partial<UserPreferences>) => void;
}> = ({ preferences, onUpdate }) => {
  const [localPreferences, setLocalPreferences] = useState(preferences);

  const handleUpdate = (key: string, value: any) => {
    const updated = {
      ...localPreferences,
      accessibility: {
        ...localPreferences.accessibility,
        [key]: value,
      },
    };
    setLocalPreferences(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">Accessibility Controls</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries({
            highContrast: '🔳 High Contrast',
            largeText: '🔍 Large Text',
            reducedMotion: '⏸️ Reduced Motion',
            darkMode: '🌙 Dark Mode',
          }).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleUpdate(key, !localPreferences.accessibility[key as keyof typeof localPreferences.accessibility])}
              className={`p-3 rounded-lg border-2 transition-all ${
                localPreferences.accessibility[key as keyof typeof localPreferences.accessibility]
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{label.split(' ')[0]}</div>
              <div className="text-xs font-medium">{label.split(' ').slice(1).join(' ')}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Advanced Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Focus Indicator</label>
            <select
              value={localPreferences.accessibility.focusIndicator}
              onChange={(e) => handleUpdate('focusIndicator', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="default">Default</option>
              <option value="thick">Thick</option>
              <option value="high-contrast">High Contrast</option>
              <option value="animated">Animated</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reading Mode</label>
            <select
              value={localPreferences.accessibility.readingMode}
              onChange={(e) => handleUpdate('readingMode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="normal">Normal</option>
              <option value="dyslexic">Dyslexic Font</option>
              <option value="line-spacing">Line Spacing</option>
              <option value="focus">Focus Mode</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color Blindness</label>
            <select
              value={localPreferences.accessibility.colorBlindness}
              onChange={(e) => handleUpdate('colorBlindness', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">None</option>
              <option value="protanopia">Protanopia</option>
              <option value="deuteranopia">Deuteranopia</option>
              <option value="tritanopia">Tritanopia</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileManagerComponent;
