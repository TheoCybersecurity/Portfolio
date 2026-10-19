/* =========================================================================
   assets/js/demo.js
   Socle commun de la copie statique du site CVL LJF — St Valentin 2026.

   Rôle :
     1. Injecter le bandeau de démonstration et la navbar (identiques à
        navbar.php) sur toutes les pages, sans dupliquer le markup.
     2. Reproduire le système de toasts de toast_notifications.php.
     3. Fournir le "pattern Undo" (compte à rebours de 5 s avant envoi des
        e-mails) utilisé par manage_orders.php et delivery.php.

   Aucune requête réseau n'est effectuée : les actions sont simulées côté
   client sur un jeu de données fictif.
   ========================================================================= */

(function () {
  'use strict';

  // Page courante, utilisée pour surligner l'entrée active du menu.
  var CURRENT = (location.pathname.split('/').pop() || 'index.html');

  // -----------------------------------------------------------------------
  // 1. BANDEAU DE DÉMONSTRATION
  // -----------------------------------------------------------------------
  var BANNER = ''
    + '<div id="demo-banner">'
    +   '<div class="container d-flex flex-wrap align-items-center justify-content-center gap-2">'
    +     '<span class="demo-tag">Démo</span>'
    +     '<span class="demo-text">Réplique statique de l\'interface d\'administration &mdash; données fictives, aucune action réelle.</span>'
    +     '<a href="/projets/roses-cvl">&larr; Retour au portfolio</a>'
    +   '</div>'
    + '</div>';

  // -----------------------------------------------------------------------
  // 2. NAVBAR (réplique de navbar.php, rôle « admin » connecté)
  // -----------------------------------------------------------------------
  function navItem(href, icon, iconColor, label) {
    return ''
      + '<li class="nav-item' + (href === 'index.html' ? ' nav-item-home' : '') + '">'
      +   '<a class="nav-link" href="' + href + '">'
      +     '<i class="fas ' + icon + ' me-1 ' + iconColor + '"></i> '
      +     '<span class="link-text">' + label + '</span>'
      +   '</a>'
      + '</li>';
  }

  function dropItem(href, icon, iconColor, label, extraClass) {
    var active = (CURRENT === href) ? ' active' : '';
    return ''
      + '<li>'
      +   '<a class="dropdown-item' + (extraClass ? ' ' + extraClass : '') + active + '" href="' + href + '">'
      +     '<i class="fas ' + icon + ' me-2 ' + iconColor + '"></i> ' + label
      +   '</a>'
      + '</li>';
  }

  var NAVBAR = ''
    + '<nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm mb-4">'
    +   '<div class="container">'
    +     '<a class="navbar-brand fw-bold text-danger brand-bounce" href="#" id="brandLink"'
    +        ' title="Retour au portail principal" data-bs-toggle="modal" data-bs-target="#exitConfirmationModal">'
    +       '🌹 St Valentin 2026'
    +     '</a>'
    +     '<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">'
    +       '<span class="navbar-toggler-icon"></span>'
    +     '</button>'
    +     '<div class="collapse navbar-collapse" id="navbarNav">'
    +       '<ul class="navbar-nav ms-auto align-items-center">'
    +         navItem('index.html', 'fa-home', 'text-primary', 'Accueil')
    +         navItem('about.html', 'fa-info-circle', 'text-info', 'À propos')
    +         '<li class="nav-item dropdown nav-item-cvl">'
    +           '<a class="nav-link dropdown-toggle btn btn-outline-light ms-lg-2 px-3 border-0" href="#"'
    +              ' role="button" data-bs-toggle="dropdown" data-bs-display="static">'
    +             '<i class="fas fa-users-cog me-1 text-danger"></i> Espace CVL'
    +           '</a>'
    +           '<ul class="dropdown-menu dropdown-menu-end shadow border-0">'
    +             dropItem('manage_orders.html', 'fa-clipboard-list', 'text-primary', 'Gestion Commandes')
    +             dropItem('preparation.html', 'fa-boxes', 'text-warning', 'Mode Préparation')
    +             dropItem('delivery.html', 'fa-truck', 'text-success', 'Mode Distribution')
    +             dropItem('directory.html', 'fa-address-book', 'text-info', 'Annuaire du Lycée')
    +             '<li><hr class="dropdown-divider"></li>'
    +             dropItem('admin.html', 'fa-bolt', '', 'Super Admin', 'fw-bold text-danger')
    +           '</ul>'
    +         '</li>'
    +         '<li class="nav-item nav-item-user ms-lg-3 d-flex align-items-center justify-content-center">'
    +           '<span class="text-white">Bonjour, <strong class="text-info">Théo</strong></span>'
    +         '</li>'
    +       '</ul>'
    +     '</div>'
    +   '</div>'
    + '</nav>';

  // Modale de sortie (identique à navbar.php, redirigée vers le portfolio).
  var EXIT_MODAL = ''
    + '<div class="modal fade" id="exitConfirmationModal" tabindex="-1" aria-hidden="true">'
    +   '<div class="modal-dialog modal-dialog-centered">'
    +     '<div class="modal-content border-danger">'
    +       '<div class="modal-header bg-danger-subtle text-danger">'
    +         '<h5 class="modal-title">⚠️ Quitter le site ?</h5>'
    +         '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>'
    +       '</div>'
    +       '<div class="modal-body">'
    +         '<p>Vous êtes sur le point de quitter l\'application de commande <strong>St Valentin</strong> pour retourner vers le portail principal.</p>'
    +         '<p class="mb-0 text-muted small"><i class="fas fa-exclamation-triangle"></i> Si vous avez une commande en cours non validée, elle sera perdue.</p>'
    +       '</div>'
    +       '<div class="modal-footer bg-light">'
    +         '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler / Rester</button>'
    +         '<a href="/projets/roses-cvl" class="btn btn-danger fw-bold">Quitter vers le portail <i class="fas fa-external-link-alt ms-1"></i></a>'
    +       '</div>'
    +     '</div>'
    +   '</div>'
    + '</div>';

  // Conteneur de toasts (réplique de toast_notifications.php).
  var TOAST_CONTAINER = ''
    + '<div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1060;">'
    +   '<div id="js-toast-anchor"></div>'
    + '</div>';

  // Injection synchrone : le script est appelé juste après <body>, le rendu
  // se fait donc avant la première peinture (pas de flash de contenu).
  document.write(BANNER + NAVBAR);

  document.addEventListener('DOMContentLoaded', function () {
    document.body.insertAdjacentHTML('beforeend', EXIT_MODAL + TOAST_CONTAINER);

    // Tooltip sur la marque, comme dans navbar.php.
    var brand = document.getElementById('brandLink');
    if (brand && window.bootstrap) {
      new bootstrap.Tooltip(brand, { placement: 'bottom', trigger: 'hover' });
    }
  });

  // -----------------------------------------------------------------------
  // 3. TOASTS DYNAMIQUES (réplique de la fonction showToast() du site)
  // -----------------------------------------------------------------------
  window.showToast = function (message, type, undo) {
    var container = document.getElementById('js-toast-anchor');
    if (!container) return;

    var icon = '<i class="fas fa-check-circle text-success me-2"></i>';
    var barColor = '#198754';

    switch (type) {
      case 'danger':
      case 'error':
        icon = '<i class="fas fa-exclamation-circle text-danger me-2"></i>';
        barColor = '#dc3545';
        break;
      case 'warning':
        icon = '<i class="fas fa-exclamation-triangle text-warning me-2"></i>';
        barColor = '#ffc107';
        break;
      case 'info':
        icon = '<i class="fas fa-info-circle text-info me-2"></i>';
        barColor = 'rgba(255,255,255,0.8)';
        break;
    }

    var undoHtml = '';
    if (undo) {
      undoHtml = ''
        + '<div class="d-flex align-items-center pe-2 border-start border-secondary ms-auto ps-2">'
        +   '<button type="button" class="btn btn-sm btn-link text-white text-decoration-none fw-bold js-undo" style="font-size:0.85rem;">'
        +     '<i class="fas fa-undo me-1"></i>Annuler'
        +   '</button>'
        + '</div>';
    }

    var html = ''
      + '<div class="toast align-items-center border-0 mb-2 position-relative shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">'
      +   '<div class="d-flex">'
      +     '<div class="toast-body d-flex align-items-center">' + icon + ' ' + message + '</div>'
      +     undoHtml
      +     '<button type="button" class="btn-close btn-close-white me-2 m-auto' + (undo ? '' : ' ms-auto') + '" data-bs-dismiss="toast" aria-label="Close"></button>'
      +   '</div>'
      +   '<div class="progress-track"><div class="progress-fill" style="background-color:' + barColor + '; animation-duration: 5s;"></div></div>'
      + '</div>';

    var temp = document.createElement('div');
    temp.innerHTML = html.trim();
    var el = temp.firstChild;
    container.appendChild(el);

    if (undo) {
      el.querySelector('.js-undo').addEventListener('click', function () {
        undo();
        bootstrap.Toast.getOrCreateInstance(el).hide();
      });
    }

    var t = new bootstrap.Toast(el, { delay: 5000 });
    t.show();
    el.addEventListener('hidden.bs.toast', function () { el.remove(); });
  };

  // -----------------------------------------------------------------------
  // 4. COMPTE À REBOURS AVANT ENVOI D'E-MAIL (pattern « Undo » du site)
  //
  //    Sur le site réel, la validation d'un paiement ou d'une livraison
  //    laisse 5 secondes pour annuler avant que PHPMailer ne parte.
  //    On reproduit ici le même toast bloquant, avec barre de progression.
  // -----------------------------------------------------------------------
  window.startCountdown = function (opts) {
    var toastEl = document.getElementById(opts.toastId);
    if (!toastEl) { opts.onComplete(); return; }

    var toast = bootstrap.Toast.getOrCreateInstance(toastEl);
    var bar = document.getElementById(opts.progressId);
    var span = document.getElementById(opts.countdownId);
    var cancelBtn = document.getElementById(opts.cancelId);

    var seconds = 5;
    var timer = null;

    function stop() {
      clearInterval(timer);
      timer = null;
      toast.hide();
    }

    span.textContent = seconds;
    bar.style.transition = 'none';
    bar.style.width = '100%';
    toast.show();

    // Démarrage de l'animation au tick suivant pour que la transition prenne.
    requestAnimationFrame(function () {
      bar.style.transition = 'width 5s linear';
      bar.style.width = '0%';
    });

    timer = setInterval(function () {
      seconds--;
      span.textContent = seconds;
      if (seconds <= 0) {
        stop();
        opts.onComplete();
      }
    }, 1000);

    cancelBtn.onclick = function () {
      stop();
      if (opts.onCancel) opts.onCancel();
    };
  };

  // -----------------------------------------------------------------------
  // 5. UTILITAIRE : retrait animé d'une ligne (slide-out)
  //    Repris de preparation.php et delivery.php.
  // -----------------------------------------------------------------------
  window.slideOut = function (el, done) {
    if (!el) { if (done) done(); return; }
    el.style.transition = 'all 0.5s ease';
    el.style.transform = 'translateX(100%)';
    el.style.opacity = '0';
    el.style.height = '0';
    el.style.margin = '0';
    el.style.padding = '0';
    el.style.overflow = 'hidden';
    setTimeout(function () { if (done) done(); }, 500);
  };

  // -----------------------------------------------------------------------
  // 6. AVERTISSEMENT SUR LES ACTIONS NON SIMULÉES
  // -----------------------------------------------------------------------
  window.demoNotice = function (label) {
    showToast('<em>' + label + '</em> &mdash; action désactivée dans la démonstration.', 'info');
    return false;
  };
})();
