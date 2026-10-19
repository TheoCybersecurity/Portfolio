/* =========================================================
   Animations globales — Memoria
   Details accordion · Navigation history · Count-up · Banners
========================================================= */
(function () {
    'use strict';

    /* ----------------------------------------------------------
       2. Smooth <details> accordion
       Utilise la Web Animations API pour animer la hauteur.
    ---------------------------------------------------------- */
    document.querySelectorAll('details').forEach(function (details) {
        var summary = details.querySelector('summary');
        if (!summary) return;
        var anim = null, closing = false, expanding = false;

        summary.addEventListener('click', function (e) {
            e.preventDefault();
            details.style.overflow = 'hidden';
            if (closing || !details.open) { doOpen(); }
            else if (expanding || details.open) { doClose(); }
        });

        function doClose() {
            closing = true;
            var h0 = details.offsetHeight + 'px';
            var h1 = summary.offsetHeight + 'px';
            if (anim) anim.cancel();
            anim = details.animate({ height: [h0, h1] },
                { duration: 210, easing: 'ease-in' });
            anim.onfinish = function () {
                details.open = false; closing = false;
                details.style.height = details.style.overflow = '';
            };
            anim.oncancel = function () { closing = false; };
        }

        function doOpen() {
            details.style.height = details.offsetHeight + 'px';
            details.open = true;
            requestAnimationFrame(function () {
                expanding = true;
                var bodyH = 0;
                details.querySelectorAll(':scope > :not(summary)')
                    .forEach(function (c) { bodyH += c.offsetHeight; });
                var h0 = details.offsetHeight + 'px';
                var h1 = (summary.offsetHeight + bodyH) + 'px';
                if (anim) anim.cancel();
                anim = details.animate({ height: [h0, h1] },
                    { duration: 230, easing: 'cubic-bezier(.16,1,.3,1)' });
                anim.onfinish = function () {
                    expanding = false;
                    details.style.height = details.style.overflow = '';
                };
                anim.oncancel = function () { expanding = false; };
            });
        }
    });

    /* ----------------------------------------------------------
       3. Historique de navigation — bouton Retour intelligent (pile)
       ----------------------------------------------------------
       Ancienne version : ne mémorisait QUE « la page précédente ». Problème
       (signalé) : sur la fiche d'une mission, modifier un service / la mission
       fait un PRG qui recharge la MÊME page (avec un ?msg=… en plus) — cette
       page devenait alors sa propre « page précédente », et « ← Retour »
       bouclait sur elle-même au lieu de revenir à la liste des missions.

       Nouvelle version : une vraie pile de navigation en sessionStorage. Chaque
       page a une CLÉ normalisée (URL sans les paramètres transitoires : msg,
       edit_service, open, egg_*, ajax… et sans action=list qui est le défaut).
       - si la clé courante est déjà dans la pile → on y retronque (retour /
         rechargement / PRG sur la même page logique) et on rafraîchit son URL ;
       - sinon → on empile.
       La cible de [data-gn-back] est l'entrée juste en dessous du sommet (la
       page logique distincte précédente). À défaut, on garde le href par
       défaut du lien (repli sensé, propre à chaque page).
    ---------------------------------------------------------- */
    (function () {
        var TRANSIENT = ['msg', 'edit_service', 'open', 'ajax', 'first', 'saved',
                         'egg_first_mission', 'egg_ceremonie', 'egg'];
        function pageKey() {
            var p = new URLSearchParams(location.search);
            TRANSIENT.forEach(function (k) { p.delete(k); });
            if (p.get('action') === 'list') p.delete('action');
            // Un formulaire de création (?action=add) n'est jamais une destination
            // de « retour » utile : on le ramène à la clé de sa page liste, pour
            // qu'après création « ← Retour » saute la page d'ajout.
            if (p.get('action') === 'add') { p.delete('action'); p.delete('unit'); }
            var qs = p.toString();
            return location.pathname + (qs ? '?' + qs : '');
        }
        function fullUrl() { return location.pathname + location.search; }
        function load() {
            try { return JSON.parse(sessionStorage.getItem('gn_nav_stack')) || []; }
            catch (e) { return []; }
        }
        function save(st) {
            try { sessionStorage.setItem('gn_nav_stack', JSON.stringify(st.slice(-25))); }
            catch (e) {}
        }

        // Un formulaire de création (?action=add) est éphémère : il ne modifie
        // PAS la pile (ni empilement, ni réécriture d'URL d'une entrée existante)
        // — ainsi, après « Créer », « ← Retour » depuis la nouvelle fiche saute
        // la page d'ajout et revient là d'où on venait (liste, ou fiche unité).
        var ephemeral = new URLSearchParams(location.search).get('action') === 'add';
        var currKey = pageKey();
        var stack = load();

        if (!ephemeral) {
            var idx = -1;
            for (var i = stack.length - 1; i >= 0; i--) {
                if (stack[i].key === currKey) { idx = i; break; }
            }
            if (idx !== -1) {
                stack = stack.slice(0, idx + 1);
                stack[idx].url = fullUrl();
            } else {
                stack.push({ key: currKey, url: fullUrl() });
            }
            save(stack);
        }

        var depth = ephemeral ? 1 : 2;
        var backUrl = stack.length >= depth ? stack[stack.length - depth].url : null;
        document.querySelectorAll('[data-gn-back]').forEach(function (el) {
            if (backUrl) el.setAttribute('href', backUrl);
        });

        // Pour une page qui réécrit son URL via history.replaceState (unites.php
        // et son ?open=…) : resynchronise l'URL mémorisée de CETTE entrée de pile,
        // sans toucher à la logique « page précédente ».
        window.gnNavSync = function () {
            var st = load();
            if (st.length && st[st.length - 1].key === pageKey()) {
                st[st.length - 1].url = fullUrl();
                save(st);
            }
        };
    })();

    /* ----------------------------------------------------------
       3bis. Restauration de la position de scroll au retour sur une
       page liste — générique, sur toutes les pages (pas seulement
       missions.php) : modifier un élément tout en bas d'une longue
       liste (mission, service, unité…) ramenait sans ça systématiquement
       tout en haut de la page au retour, obligeant à re-scroller pour
       retrouver l'endroit où on était.
       Principe : à chaque départ de page (`pagehide`, déclenché par un
       clic sur un lien, une soumission de formulaire ou le bouton
       Précédent/Suivant du navigateur), on mémorise la position de
       scroll actuelle en sessionStorage, sous une clé propre à l'URL
       quittée. Au chargement d'une page, si une position est mémorisée
       pour CETTE URL exacte (même chemin + mêmes paramètres, ex :
       pagination `?p=2` distincte de la page 1), on y scrolle puis on
       oublie la valeur (usage unique — une visite normale, non précédée
       d'un aller-retour, part toujours du haut comme avant).
    ---------------------------------------------------------- */
    (function () {
        var scrollKey = 'gn_scroll_' + location.pathname + location.search;
        var saved = sessionStorage.getItem(scrollKey);
        if (saved !== null) {
            sessionStorage.removeItem(scrollKey);
            requestAnimationFrame(function () {
                window.scrollTo(0, parseInt(saved, 10) || 0);
            });
        }
        // pagehide plutôt que beforeunload : couvre aussi bien les clics sur un
        // lien/la soumission d'un formulaire que les boutons navigateur, sans
        // désactiver le cache arrière/avant (bfcache) comme le ferait beforeunload.
        window.addEventListener('pagehide', function () {
            sessionStorage.setItem(scrollKey, String(window.scrollY));
        });
    })();

    /* ----------------------------------------------------------
       4. Count-up pour les .stat-value contenant un entier pur
    ---------------------------------------------------------- */
    if ('IntersectionObserver' in window) {
        var countObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                var text = el.textContent.trim();
                var num = parseInt(text.replace(/[\s ]/g, ''), 10);
                if (isNaN(num) || num < 2 || text.length > 7) return;
                countObs.unobserve(el);
                var dur = Math.min(750, num * 10 + 220);
                var t0 = performance.now();
                (function step(now) {
                    var p = Math.min((now - t0) / dur, 1);
                    var ease = 1 - Math.pow(1 - p, 3);
                    el.textContent = Math.round(num * ease);
                    if (p < 1) requestAnimationFrame(step);
                    else el.textContent = text;
                })(t0);
            });
        }, { threshold: 0.6 });

        document.querySelectorAll('.stat-value').forEach(function (el) {
            countObs.observe(el);
        });
    }

    /* ----------------------------------------------------------
       5. Animation des bannières succès/erreur (inline styles)
    ---------------------------------------------------------- */
    document.querySelectorAll(
        '[style*="background:#f0fdf4"], [style*="background:#fef2f2"]'
    ).forEach(function (el) {
        el.style.animation = 'gn-slide-down .3s ease-out both';
    });

    /* ----------------------------------------------------------
       5bis. Disparition automatique des bannières de confirmation
       (.alert-success) après quelques secondes — une confirmation
       d'enregistrement n'a pas à rester à l'écran. Opt-out via
       [data-gn-sticky] pour les messages d'accueil / d'instruction.
    ---------------------------------------------------------- */
    document.querySelectorAll('.alert-success:not([data-gn-sticky])').forEach(function (el) {
        setTimeout(function () {
            el.style.transition = 'opacity .45s ease, transform .45s ease, max-height .45s ease, '
                + 'margin .45s ease, padding .45s ease, border-width .45s ease';
            el.style.overflow = 'hidden';
            el.style.maxHeight = el.scrollHeight + 'px';
            requestAnimationFrame(function () {
                el.style.opacity = '0';
                el.style.transform = 'translateY(-6px)';
                el.style.maxHeight = '0';
                el.style.marginTop = el.style.marginBottom = '0';
                el.style.paddingTop = el.style.paddingBottom = '0';
                el.style.borderWidth = '0';
            });
            el.addEventListener('transitionend', function () { el.remove(); }, { once: true });
        }, 5000);
    });

    /* ----------------------------------------------------------
       5ter. Grands tableaux → cartes empilées sur mobile
       Pour chaque table.data-table (≥ 3 colonnes), on recopie le
       texte de chaque <th> dans data-label du <td> correspondant ;
       le CSS (.rt-cards, @media ≤720px) transforme alors chaque
       ligne en carte « LABEL : valeur ». Aucun markup à modifier
       page par page. Opt-out : classe .rt-skip sur la <table>.
       window.gnCardifyTables(root) : à rappeler après une injection
       AJAX (administration.php).
    ---------------------------------------------------------- */
    (function () {
        function cardify(root) {
            (root || document).querySelectorAll('table.data-table:not(.rt-skip):not([data-rt-done])').forEach(function (t) {
                var ths = t.querySelectorAll(':scope > thead > tr > th');
                if (ths.length < 3) return;
                var labels = Array.prototype.map.call(ths, function (th) { return th.textContent.trim(); });
                Array.prototype.forEach.call(t.querySelectorAll(':scope > tbody > tr'), function (tr) {
                    var tds = tr.children;
                    if (tds.length === 1 && tds[0].colSpan > 1) return; // ligne de détail dépliée
                    for (var i = 0; i < tds.length; i++) {
                        if (labels[i] && !tds[i].hasAttribute('data-label')) tds[i].setAttribute('data-label', labels[i]);
                    }
                });
                t.classList.add('rt-cards');
                t.setAttribute('data-rt-done', '1');
            });
        }
        window.gnCardifyTables = cardify;
        cardify(document);
    })();

    /* ----------------------------------------------------------
       5quater. Normalisation sans accents — pour les recherches
       filtrées côté client (interface admin, etc.). "Trèbes" et
       "Trebes" doivent se comporter pareil, dans les deux sens.
       Indexation 1:1 conservée pour les caractères latins précomposés.
    ---------------------------------------------------------- */
    window.gnStripAccents = function (s) {
        return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };

    /* ----------------------------------------------------------
       6. Toast discret (bas-droite) — réutilisé par les easter eggs
    ---------------------------------------------------------- */
    window.gnToast = function (html, duration) {
        var el = document.createElement('div');
        el.className = 'gn-toast';
        el.innerHTML = html;
        document.body.appendChild(el);
        setTimeout(function () {
            el.classList.add('gn-toast-out');
            el.addEventListener('animationend', function () { el.remove(); }, { once: true });
        }, duration || 3200);
    };

    /* ----------------------------------------------------------
       6bis. Easter eggs — enregistrement serveur de la découverte
       (juillet 2026, suite ; toasts retirés septembre 2026).
       Les easter eggs sont désormais SILENCIEUX : plus aucun toast
       bas-droite. La seule trace visible est la page galerie
       (/easter_eggs), alimentée par api/easter_egg.php.
       gnRegisterEggFound est idempotent par navigateur (drapeau
       localStorage posé uniquement après un POST réussi) — un egg
       n'est donc envoyé qu'une seule fois, ce qui évite de noyer le
       journal d'activité (voir aussi includes/audit_log.php, qui
       exclut /api/easter_egg de son côté).
    ---------------------------------------------------------- */
    window.gnRegisterEggFound = function (key) {
        // DÉMO : le site réel enregistre la découverte via POST /api/easter_egg.
        // Ici, aucun backend — on se contente du drapeau localStorage.
        var flag = 'gn_egg_registered_' + key;
        try { localStorage.setItem(flag, '1'); } catch (e) {}
    };
    // Signature inchangée (les appelants passent encore html/duration) mais
    // ces arguments sont désormais ignorés — plus de toast.
    window.gnUnlockEgg = function (key) {
        gnRegisterEggFound(key);
    };

    /* ----------------------------------------------------------
       7. Easter egg — code Konami (↑ ↑ ↓ ↓ ← → ← → B A)
       Petit clin d'œil pour les réservistes curieux qui traînent
       dans les DevTools. Sans effet sur le fonctionnement de l'appli.
    ---------------------------------------------------------- */
    (function () {
        var seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
        var pos = 0;
        document.addEventListener('keydown', function (e) {
            var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            pos = (key === seq[pos]) ? pos + 1 : (key === seq[0] ? 1 : 0);
            if (pos === seq.length) {
                pos = 0;
                gnConfetti();
                gnUnlockEgg('konami', '🚔 <strong>Code Konami trouvé !</strong><br>Bravo, réserviste curieux.', 4000);
            }
        });
    })();

    /* ----------------------------------------------------------
       8. Confettis tricolores — factorisé (Konami + autres eggs)
    ---------------------------------------------------------- */
    window.gnConfetti = function () {
        var colors = ['#002395', '#fff', '#ED2939'];
        for (var i = 0; i < 60; i++) {
            var p = document.createElement('div');
            var c = colors[i % 3];
            p.style.cssText = 'position:fixed;top:-12px;width:8px;height:8px;z-index:2001;pointer-events:none;'
                + 'left:' + (Math.random() * 100) + 'vw;background:' + c + ';'
                + 'border-radius:' + (i % 2 ? '50%' : '1px') + ';'
                + 'transition:transform 2.2s cubic-bezier(.2,.6,.3,1), opacity 2.2s ease;'
                + 'transform:translateY(0) rotate(0deg);opacity:1';
            document.body.appendChild(p);
            (function (el) {
                requestAnimationFrame(function () {
                    el.style.transform = 'translateY(' + (100 + Math.random() * 20) + 'vh) rotate(' + (Math.random() * 540) + 'deg)';
                    el.style.opacity = '0';
                });
                setTimeout(function () { el.remove(); }, 2300);
            })(p);
        }
    };

    /* ----------------------------------------------------------
       10. Easter egg — mot-clé tapé au clavier ("gendarme")
    ---------------------------------------------------------- */
    (function () {
        var word = 'gendarme';
        var pos = 0;
        var jokes = [
            '👮 « Circulez, y a rien à voir » — sauf ce message caché.',
            '🚔 Papiers, s\'il vous plaît ! (Non, cette appli n\'en demande pas.)',
            '🇫🇷 Nul en France n\'est censé ignorer la loi… ni ce easter egg.',
        ];
        document.addEventListener('keydown', function (e) {
            if (e.key.length !== 1) return;
            var key = e.key.toLowerCase();
            pos = (key === word[pos]) ? pos + 1 : (key === word[0] ? 1 : 0);
            if (pos === word.length) {
                pos = 0;
                gnUnlockEgg('mot_cle_gendarme', jokes[Math.floor(Math.random() * jokes.length)], 4000);
            }
        });
    })();

    /* ----------------------------------------------------------
       11. Easter egg — clics rapides sur le blason du header ("gyrophare")
    ---------------------------------------------------------- */
    (function () {
        var icon = document.querySelector('.brand-icon');
        if (!icon) return;
        var count = 0, resetTimer = null;
        icon.style.cursor = 'pointer';
        icon.addEventListener('click', function () {
            count++;
            clearTimeout(resetTimer);
            resetTimer = setTimeout(function () { count = 0; }, 1500);
            if (count >= 7) {
                count = 0;
                var overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;z-index:2002;pointer-events:none;'
                    + 'animation:gn-gyrophare .9s steps(2,jump-none) 3';
                document.body.appendChild(overlay);
                overlay.addEventListener('animationend', function () { overlay.remove(); });
                gnUnlockEgg('gyrophare_blason', '🚨 <strong>Gyrophare activé !</strong><br>Réserviste zélé, on dirait.', 3000);
            }
        });
    })();

    /* ----------------------------------------------------------
       12. Easter egg — clics rapides sur le badge "Réserviste"
    ---------------------------------------------------------- */
    (function () {
        var badge = document.querySelector('.user-badge');
        if (!badge) return;
        var original = badge.textContent;
        var ranks = ['Général 5 étoiles', 'Maréchal de France', 'Chef suprême'];
        var count = 0, resetTimer = null, revertTimer = null;
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', function () {
            count++;
            clearTimeout(resetTimer);
            resetTimer = setTimeout(function () { count = 0; }, 1200);
            if (count >= 5) {
                count = 0;
                badge.textContent = ranks[Math.floor(Math.random() * ranks.length)];
                gnUnlockEgg('promotion_badge', '🎖️ Promotion honorifique temporaire accordée.', 2800);
                clearTimeout(revertTimer);
                revertTimer = setTimeout(function () { badge.textContent = original; }, 2800);
            }
        });
    })();

    /* ----------------------------------------------------------
       13. Easter egg — cap symbolique atteint sur "Total services"
       (célébré une seule fois par palier, mémorisé en localStorage)
    ---------------------------------------------------------- */
    (function () {
        var paliers = [100, 250, 500, 750, 1000, 1500, 2000];
        document.querySelectorAll('.stat-card').forEach(function (card) {
            var label = card.querySelector('.stat-label');
            var value = card.querySelector('.stat-value');
            if (!label || !value || !/total services/i.test(label.textContent)) return;
            var num = parseInt(value.textContent.replace(/[^\d]/g, ''), 10);
            if (isNaN(num)) return;
            paliers.forEach(function (p) {
                var key = 'gn_milestone_' + p;
                if (num >= p && !localStorage.getItem(key)) {
                    localStorage.setItem(key, '1');
                    setTimeout(function () {
                        gnConfetti();
                        gnUnlockEgg('cap_symbolique_services', '🏅 <strong>Cap symbolique franchi !</strong><br>' + p + ' services enregistrés.', 4200);
                    }, 500);
                }
            });
        });
    })();

    /* ----------------------------------------------------------
       14. Easter egg — bannière discrète le jour d'Halloween (31 octobre)
    ---------------------------------------------------------- */
    (function () {
        if (document.querySelector('.page-head') && (new Date().getMonth() === 9 && new Date().getDate() === 31)) {
            gnUnlockEgg('halloween', '🎃 Joyeux Halloween ! Pas de fantôme dans les brigades ce soir, on espère.', 4500);
        }
    })();

    /* ----------------------------------------------------------
       15. Easter egg — Vendredi 13
    ---------------------------------------------------------- */
    (function () {
        var d = new Date();
        if (d.getDay() === 5 && d.getDate() === 13) {
            gnUnlockEgg('vendredi_13', '🐈‍⬛ Vendredi 13 aujourd\'hui — portez chance, réserviste !', 4000);
        }
    })();

    /* ----------------------------------------------------------
       16. Easter egg — minuit pile
    ---------------------------------------------------------- */
    (function () {
        var h = new Date().getHours(), m = new Date().getMinutes();
        if (h === 0 && m < 5) {
            gnUnlockEgg('minuit', '🌙 Toujours de service à cette heure ? Bon courage.', 4000);
        }
    })();

    /* ----------------------------------------------------------
       17. Easter egg — triple-clic sur le titre du bandeau
    ---------------------------------------------------------- */
    (function () {
        var title = document.querySelector('.brand-title');
        if (!title) return;
        var facts = [
            '📜 La Gendarmerie Nationale a été officiellement créée en 1791, héritière de la maréchaussée.',
            '🐎 « Gendarme » vient de « gens d\'armes » — littéralement, des gens en armes au service du roi.',
            '🌍 La Gendarmerie est compétente sur environ 95 % du territoire français, principalement en zone rurale et périurbaine.',
            '🎖️ La réserve opérationnelle permet à des citoyens comme toi de servir ponctuellement aux côtés des militaires d\'active.',
        ];
        var count = 0, resetTimer = null;
        title.style.cursor = 'pointer';
        title.addEventListener('click', function () {
            count++;
            clearTimeout(resetTimer);
            resetTimer = setTimeout(function () { count = 0; }, 1200);
            if (count >= 3) {
                count = 0;
                gnUnlockEgg('triple_clic_titre', facts[Math.floor(Math.random() * facts.length)], 5000);
            }
        });
    })();

    /* ----------------------------------------------------------
       18. Easter egg — triple-clic sur le drapeau du footer
    ---------------------------------------------------------- */
    (function () {
        var flag = document.querySelector('.footer-flag');
        if (!flag) return;
        var count = 0, resetTimer = null;
        flag.style.cursor = 'pointer';
        flag.addEventListener('click', function () {
            count++;
            clearTimeout(resetTimer);
            resetTimer = setTimeout(function () { count = 0; }, 1200);
            if (count >= 3) {
                count = 0;
                flag.animate(
                    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
                    { duration: 600, easing: 'ease-in-out' }
                );
                gnUnlockEgg('triple_clic_drapeau', '🇫🇷 Liberté, Égalité, Fraternité.', 3000);
            }
        });
    })();

    /* ----------------------------------------------------------
       19. Easter egg — compteur de visites (fidélité)
    ---------------------------------------------------------- */
    (function () {
        var n = parseInt(localStorage.getItem('gn_visit_count') || '0', 10) + 1;
        localStorage.setItem('gn_visit_count', String(n));
        var paliers = { 10: 'Déjà 10 visites !', 50: '50 visites — assidu, le réserviste.', 100: '100 visites — on peut dire que tu es chez toi ici.' };
        if (paliers[n]) {
            setTimeout(function () { gnUnlockEgg('compteur_visites', '👋 ' + paliers[n], 3800); }, 700);
        }
    })();

    /* ----------------------------------------------------------
       20. Easter egg — inactivité prolongée (3 minutes sans interaction)
    ---------------------------------------------------------- */
    (function () {
        var timer = null;
        var shown = false;
        function reset() {
            clearTimeout(timer);
            if (shown) return;
            timer = setTimeout(function () {
                shown = true;
                gnUnlockEgg('inactivite_prolongee', '👀 Toujours là ?', 3500);
            }, 3 * 60 * 1000);
        }
        ['mousemove', 'keydown', 'scroll', 'click'].forEach(function (ev) {
            window.addEventListener(ev, reset, { passive: true });
        });
        reset();
    })();

    /* ----------------------------------------------------------
       21. Easter egg — mot-clé tapé "1789" (référence historique)
    ---------------------------------------------------------- */
    (function () {
        var word = '1789';
        var pos = 0;
        document.addEventListener('keydown', function (e) {
            var key = e.key.length === 1 ? e.key : '';
            pos = (key === word[pos]) ? pos + 1 : (key === word[0] ? 1 : 0);
            if (pos === word.length) {
                pos = 0;
                gnUnlockEgg('mot_cle_1789', '🏰 1789 — l\'année où tout a changé. La maréchaussée deviendra Gendarmerie Nationale deux ans plus tard.', 5000);
            }
        });
    })();

    /* ----------------------------------------------------------
       22. Easter egg — Ctrl+Maj+D : faux mode sombre temporaire (gag,
       pas un vrai réglage — revient tout seul après quelques secondes)
    ---------------------------------------------------------- */
    (function () {
        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
                e.preventDefault();
                document.documentElement.style.transition = 'filter .4s ease';
                document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
                gnUnlockEgg('mode_sombre', '🌗 Mode sombre... ou pas vraiment. Retour à la normale dans 4 secondes.', 3800);
                setTimeout(function () { document.documentElement.style.filter = ''; }, 4000);
            }
        });
    })();

    /* ----------------------------------------------------------
       23. Easter egg — triple-clic sur le bouton feedback flottant
       (avant l'ouverture normale du formulaire)
    ---------------------------------------------------------- */
    (function () {
        var btn = document.getElementById('gn-feedback-btn');
        if (!btn) return;
        var count = 0, resetTimer = null;
        btn.addEventListener('click', function () {
            count++;
            clearTimeout(resetTimer);
            resetTimer = setTimeout(function () { count = 0; }, 1200);
            if (count === 3) {
                gnUnlockEgg('triple_clic_feedback', '🕵️ Tu cherches des bugs cachés, ou des easter eggs ?', 3200);
            }
        });
    })();

    /* ----------------------------------------------------------
       24. Easter egg — marathonien (30 minutes d'affilée sur le site)
    ---------------------------------------------------------- */
    (function () {
        setTimeout(function () {
            gnUnlockEgg('marathonien', '🏃 30 minutes d\'affilée sur le site — marathonien !', 3500);
        }, 30 * 60 * 1000);
    })();

    /* ----------------------------------------------------------
       25. Easter egg — oiseau de nuit (entre 2h et 5h du matin)
    ---------------------------------------------------------- */
    (function () {
        var h = new Date().getHours();
        if (h >= 2 && h < 5) {
            gnUnlockEgg('oiseau_de_nuit', '🦉 Un oiseau de nuit dans les parages…', 3500);
        }
    })();

    /* ----------------------------------------------------------
       26. Easter egg — 1er mai (fête du Travail)
    ---------------------------------------------------------- */
    (function () {
        if (new Date().getMonth() === 4 && new Date().getDate() === 1) {
            gnUnlockEgg('fete_travail', '💐 Bonne fête du Travail, réserviste !', 3500);
        }
    })();

    /* ----------------------------------------------------------
       27. Easter egg — écran très étroit (< 400px)
    ---------------------------------------------------------- */
    (function () {
        if (window.innerWidth < 400) {
            gnUnlockEgg('mode_mobile_extreme', '📱 Écran étroit détecté — ça tient quand même !', 3200);
        }
    })();

    /* ----------------------------------------------------------
       28. Easter egg — zoom navigateur ≥ 150%
    ---------------------------------------------------------- */
    (function () {
        var ratio = window.devicePixelRatio * (window.outerWidth / window.innerWidth || 1);
        if (window.visualViewport && window.visualViewport.scale >= 1.5) {
            gnUnlockEgg('zoom_navigateur', '🔍 Zoom navigateur élevé détecté.', 3000);
        }
    })();

    /* ----------------------------------------------------------
       29. Easter egg — copier du texte (Ctrl+C)
    ---------------------------------------------------------- */
    (function () {
        document.addEventListener('copy', function () {
            gnUnlockEgg('copieur', '📋 Copié ! Tu prépares un rapport ?', 2800);
        });
    })();

    /* ----------------------------------------------------------
       30. Easter egg — clic droit (menu contextuel)
    ---------------------------------------------------------- */
    (function () {
        document.addEventListener('contextmenu', function () {
            gnUnlockEgg('clic_droit_curieux', '🖱️ Curieux, hein ?', 2500);
        }, { once: true });
    })();

    /* ----------------------------------------------------------
       31. Easter egg — rafraîchissements rapprochés (5 en moins de 10s)
    ---------------------------------------------------------- */
    (function () {
        var key = 'gn_refresh_burst';
        var now = Date.now();
        var data = JSON.parse(sessionStorage.getItem(key) || '{"count":0,"first":0}');
        if (now - data.first > 10000) { data = { count: 0, first: now }; }
        data.count++;
        if (data.count >= 5) {
            gnUnlockEgg('rafraichisseur_impatient', '⚡ Du calme, ça charge déjà vite !', 3000);
            data = { count: 0, first: now };
        }
        sessionStorage.setItem(key, JSON.stringify(data));
    })();

    /* ----------------------------------------------------------
       32. Easter egg — scroll jusqu'en bas d'une longue page
    ---------------------------------------------------------- */
    (function () {
        var done = false;
        window.addEventListener('scroll', function () {
            if (done) return;
            if (document.documentElement.scrollHeight < window.innerHeight * 2) return;
            if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
                done = true;
                gnUnlockEgg('explorateur_scroll', '📜 Tu es arrivé tout en bas de la page !', 3000);
            }
        }, { passive: true });
    })();

    /* ----------------------------------------------------------
       33. Easter egg — triple-clic sur le nom du département (bandeau)
    ---------------------------------------------------------- */
    (function () {
        var sub = document.querySelector('.brand-sub');
        if (!sub) return;
        var count = 0, resetTimer = null;
        sub.style.cursor = 'pointer';
        sub.addEventListener('click', function () {
            count++;
            clearTimeout(resetTimer);
            resetTimer = setTimeout(function () { count = 0; }, 1200);
            if (count >= 3) {
                count = 0;
                gnUnlockEgg('curieux_du_departement', '🗺️ Chaque département a son histoire.', 3000);
            }
        });
    })();

})();

/* Easter egg — message pour les réservistes qui ouvrent la console */
console.log(
    '%c🇫🇷 Memoria ',
    'background:#002395;color:#fff;font-weight:bold;padding:4px 8px;border-radius:4px 0 0 4px'
    + ';font-size:13px'
);
console.log(
    "Salut réserviste-développeur 👋 — si tu regardes ici, tu vas sûrement aimer le code Konami quelque part sur cette page."
);
if (window.gnRegisterEggFound) gnRegisterEggFound('console_message');
