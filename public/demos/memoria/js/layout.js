/* =========================================================================
   js/layout.js — DÉMO STATIQUE
   Reproduit includes/header.php et includes/footer.php du site réel.
   Le markup ci-dessous est copié à l'identique ; seules les valeurs
   dynamiques (nom, département, page active) sont figées, et les liens
   PHP sans extension deviennent des fichiers .html.
   ========================================================================= */
(function () {
    'use strict';

    var CURRENT = (location.pathname.split('/').pop() || 'index.html');

    // Correspondance page -> clé $active_page du site réel
    var PAGES = [
        ['index.html',          'dashboard',   'Tableau de bord'],
        ['missions.html',       'missions',    'Missions'],
        ['calendrier.html',     'calendrier',  'Calendrier'],
        ['carte.html',          'carte',       'Carte'],
        ['unites.html',         'unites',      'Unités'],
        ['statistiques.html',   'stats',       'Statistiques'],
        ['recherche.html',      'recherche',   'Recherche'],
        ['documents.html',      'documents',   'Documents'],
        ['departement.html',    'departement', 'Mon département'],
        ['profil.html',         'profil',      'Mon profil']
    ];

    function navLinks() {
        return PAGES.map(function (p) {
            return '<a href="' + p[0] + '" class="' + (CURRENT === p[0] ? 'active' : '') + '">' + p[2] + '</a>';
        }).join('\n        ');
    }

    var adminActive = (CURRENT === 'administration.html' || CURRENT === 'feedback_admin.html');

    var BANNER =
        '<div class="demo-banner">' +
          '<span class="demo-banner-tag">Démo</span>' +
          '<span>Réplique statique du site réel — données fictives, aucun enregistrement.</span>' +
          '<a href="/projets/memoria">← Retour au portfolio</a>' +
        '</div>';

    var HEADER =
    '<header class="site-header">' +
    '<div class="tricolore">' +
        '<div class="tricolore-bleu"></div>' +
        '<div class="tricolore-blanc"></div>' +
        '<div class="tricolore-rouge"></div>' +
    '</div>' +
        '<div class="header-inner">' +
            '<div class="brand">' +
                '<div class="brand-icon">' +
                    '<img src="img/Logo_Memoria_icon.png" alt="Logo Memoria" width="40" height="40" style="object-fit:contain">' +
                '</div>' +
                '<div>' +
                    '<img src="img/Logo_Memoria_texte.png" alt="Memoria" class="brand-title">' +
                    '<div class="brand-sub">Suivi Opérationnel Réserve · Gendarmerie Nationale</div>' +
                '</div>' +
            '</div>' +
            '<div class="user-block">' +
                '<span class="user-name">GND Théo MARESCAL</span>' +
                '<span class="user-badge">Réserviste</span>' +
                '<a href="#" class="logout-link" title="Se déconnecter" onclick="return gnDemoBlock(\'Déconnexion\')">⏻&nbsp;Déconnexion</a>' +
            '</div>' +
        '</div>' +

        '<nav class="main-nav" aria-label="Navigation principale">' +
        navLinks() +
        '<div class="nav-dropdown">' +
            '<button type="button" class="nav-dropdown-toggle ' + (adminActive ? 'active' : '') + '" onclick="gnToggleAdminMenu(event)">' +
                'Admin <span class="nav-dropdown-arrow">▾</span>' +
            '</button>' +
            '<div class="nav-dropdown-menu" id="admin-dropdown-menu">' +
                '<a href="administration.html" class="' + (CURRENT === 'administration.html' ? 'active' : '') + '">Administration</a>' +
                '<a href="feedback_admin.html" class="' + (CURRENT === 'feedback_admin.html' ? 'active' : '') + '">Feedback</a>' +
            '</div>' +
        '</div>' +
        '<a href="administration.html" class="nav-admin-inline ' + (CURRENT === 'administration.html' ? 'active' : '') + '">Administration</a>' +
        '<a href="feedback_admin.html" class="nav-admin-inline ' + (CURRENT === 'feedback_admin.html' ? 'active' : '') + '">Feedback</a>' +
        '</nav>' +
    '</header>' +
    '<main class="container">';

    document.write(BANNER + HEADER);

    // Menu déroulant « Admin » — copie du script de header.php
    document.addEventListener('DOMContentLoaded', function () {
        var menu = document.getElementById('admin-dropdown-menu');
        var btn  = document.querySelector('.nav-dropdown-toggle');
        if (!menu || !btn) return;
        function position() {
            var r  = btn.getBoundingClientRect();
            var mw = menu.offsetWidth || 190;
            menu.style.top  = Math.round(r.bottom + 4) + 'px';
            menu.style.left = Math.round(Math.max(8, Math.min(r.left, window.innerWidth - mw - 8))) + 'px';
        }
        function close() { menu.classList.remove('open'); btn.classList.remove('open'); }
        window.gnCloseAdminMenu = close;
        window.gnToggleAdminMenu = function (e) {
            e.stopPropagation();
            var open = !menu.classList.contains('open');
            if (open) position();
            menu.classList.toggle('open', open);
            btn.classList.toggle('open', open);
        };
        document.addEventListener('click', function (e) { if (!e.target.closest('.nav-dropdown')) close(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
        window.addEventListener('scroll', function () { if (menu.classList.contains('open')) close(); }, { passive: true });
        window.addEventListener('resize', close);
    });

    // ---------------------------------------------------------------------
    // FOOTER — copie de includes/footer.php
    // ---------------------------------------------------------------------
    var FOOTER =
    '<footer class="site-footer">' +
        '<div class="footer-inner">' +
            '<div class="footer-flag">' +
                '<span class="ff ff-b"></span><span class="ff ff-w"></span><span class="ff ff-r"></span>' +
            '</div>' +
            '<p class="footer-text">' +
                '<strong>Site non agréé DGGN.</strong> ' +
                'Outil personnel développé par un réserviste de la gendarmerie nationale, ' +
                "travaillant dans l'informatique et passionné par la gendarmerie et la programmation." +
            '</p>' +
            '<p class="footer-meta">' +
                'Les informations enregistrées sont strictement personnelles et ne représentent ' +
                'en aucun cas une communication officielle de la Gendarmerie Nationale.' +
            '</p>' +
            '<p class="footer-links">' +
                '<a href="mentions_legales.html">Mentions légales &amp; protection des données</a>' +
                '<span class="sep">·</span>' +
                '<a href="cgu.html">Conditions générales d’utilisation</a>' +
                '<span class="sep">·</span>' +
                '<a href="a_propos.html">À propos</a>' +
            '</p>' +
        '</div>' +
    '</footer>' +

    '<button type="button" id="gn-feedback-btn" title="Donner un avis ou signaler un bug"' +
            ' style="position:fixed;right:18px;bottom:18px;width:44px;height:44px;border-radius:50%;' +
                   'background:var(--bleu);color:#fff;border:none;box-shadow:0 2px 10px rgba(0,0,0,.25);' +
                   'font-size:19px;cursor:pointer;z-index:40;display:flex;align-items:center;justify-content:center;' +
                   'transition:transform .15s,box-shadow .15s"' +
            ' onclick="document.getElementById(\'gn-feedback-modal\').classList.add(\'open\')"' +
            ' onmouseover="this.style.transform=\'scale(1.08)\'" onmouseout="this.style.transform=\'\'">💬</button>' +

    '<div class="modal-overlay" id="gn-feedback-modal">' +
        '<div class="modal">' +
            '<div class="modal-head">' +
                '<span class="modal-title">Feedback</span>' +
                '<button class="modal-close" type="button" onclick="document.getElementById(\'gn-feedback-modal\').classList.remove(\'open\')">×</button>' +
            '</div>' +
            '<form onsubmit="return gnDemoBlock(\'Envoi du feedback\')">' +
                '<div class="modal-body">' +
                    '<div class="form-grid">' +
                        '<div class="form-field form-full">' +
                            '<label>Type</label>' +
                            '<div style="display:flex;gap:20px;margin-top:4px">' +
                                '<label style="display:flex;align-items:center;gap:6px;font-weight:500;cursor:pointer">' +
                                    '<input type="radio" name="type" value="retour" checked> 💬 Retour d\'expérience' +
                                '</label>' +
                                '<label style="display:flex;align-items:center;gap:6px;font-weight:500;cursor:pointer">' +
                                    '<input type="radio" name="type" value="bug"> 🐛 Signaler un bug' +
                                '</label>' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-field form-full">' +
                            '<label for="gn-fb-sujet">Sujet</label>' +
                            '<input type="text" id="gn-fb-sujet" name="sujet" maxlength="200" placeholder="En une phrase…">' +
                        '</div>' +
                        '<div class="form-field form-full">' +
                            '<label for="gn-fb-message">Message</label>' +
                            '<textarea id="gn-fb-message" name="message" rows="4" placeholder="Décris ton retour ou le bug rencontré (étapes pour le reproduire si possible)…" style="width:100%;resize:vertical"></textarea>' +
                        '</div>' +
                    '</div>' +
                    '<p style="font-size:12px;color:var(--gris-400);margin-top:8px">' +
                        '<a href="feedback.html" style="color:var(--bleu-texte)">Voir mes retours précédents →</a>' +
                    '</p>' +
                '</div>' +
                '<div class="modal-footer">' +
                    '<button type="button" class="btn" onclick="document.getElementById(\'gn-feedback-modal\').classList.remove(\'open\')">Annuler</button>' +
                    '<button class="btn btn-primary" type="submit">Envoyer</button>' +
                '</div>' +
            '</form>' +
        '</div>' +
    '</div>';

    // -----------------------------------------------------------------------
    // MODALE DE BIENVENUE — affichée une seule fois par visiteur (première
    // page consultée, quelle qu'elle soit), pour rappeler que ceci est une
    // réplique du site réel avec des données entièrement fictives.
    // -----------------------------------------------------------------------
    var WELCOME_MODAL = ''
        + '<div class="modal-overlay" id="gn-welcome-modal">'
        +   '<div class="modal">'
        +     '<div class="modal-head">'
        +       '<span class="modal-title">Bienvenue sur cette démonstration</span>'
        +       '<button class="modal-close" type="button" onclick="document.getElementById(\'gn-welcome-modal\').classList.remove(\'open\')">×</button>'
        +     '</div>'
        +     '<div class="modal-body">'
        +       '<p style="margin-bottom:10px">Ce site est une <strong>réplique</strong> du vrai site \'Memoria\', réalisée pour le portfolio de Théo Marescal.</p>'
        +       '<p style="margin-bottom:0">Toutes les données affichées (missions, unités, statistiques, documents…) sont <strong>entièrement fictives</strong>. Aucune information réelle, aucun enregistrement, aucun lien avec l\'application de production.</p>'
        +     '</div>'
        +     '<div class="modal-footer">'
        +       '<button class="btn btn-primary" type="button" onclick="gnDismissWelcome()">J\'ai compris</button>'
        +     '</div>'
        +   '</div>'
        + '</div>';

    window.gnDismissWelcome = function () {
        var el = document.getElementById('gn-welcome-modal');
        if (el) el.classList.remove('open');
        try { localStorage.setItem('gn_demo_welcome_seen', '1'); } catch (e) {}
    };

    // Injection du footer juste avant la fermeture du body, puis chargement
    // des animations globales (js/app.js = bloc <script> de footer.php).
    window.addEventListener('DOMContentLoaded', function () {
        document.body.insertAdjacentHTML('beforeend', FOOTER + WELCOME_MODAL);
        document.getElementById('gn-feedback-modal').addEventListener('click', function (e) {
            if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
        });
        document.getElementById('gn-welcome-modal').addEventListener('click', function (e) {
            if (e.target === e.currentTarget) gnDismissWelcome();
        });

        var alreadySeen = false;
        try { alreadySeen = !!localStorage.getItem('gn_demo_welcome_seen'); } catch (e) {}
        if (!alreadySeen) {
            requestAnimationFrame(function () {
                document.getElementById('gn-welcome-modal').classList.add('open');
            });
        }

        var s = document.createElement('script');
        s.src = 'js/app.js';
        document.body.appendChild(s);
    });

    /* Toute action qui, sur le site réel, écrirait en base ou enverrait un
       mail est neutralisée ici et signalée par un toast. */
    window.gnDemoBlock = function (label) {
        var el = document.createElement('div');
        el.className = 'gn-toast';
        el.innerHTML = '<strong>' + label + '</strong><br>Action désactivée dans la démonstration.';
        document.body.appendChild(el);
        setTimeout(function () {
            el.classList.add('gn-toast-out');
            el.addEventListener('animationend', function () { el.remove(); }, { once: true });
        }, 3200);
        return false;
    };
})();
