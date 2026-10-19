/* =========================================================================
   js/demo-api.js — DÉMO STATIQUE
   Le site réel interroge ses endpoints PHP (/api/missions, /api/hierarchy,
   /api/competence, /api/address_search, /api/brigade_lookup, /api/route).
   Ici il n'y a pas de backend : on intercepte window.fetch et on renvoie un
   jeu de données fictif au même format JSON. js/calendar.js et js/map.js sont
   donc des copies conformes du site réel, inchangées.
   ========================================================================= */
(function () {
    'use strict';

    // ---------------------------------------------------------------------
    // Missions et services fictifs (mêmes données que la page Missions)
    // ---------------------------------------------------------------------
    var MISSIONS = [
        { id:103, date_debut:'2026-10-03', date_fin:'2026-10-04', type_nom:'Renfort',   type_couleur:'#22c55e', unit_type:'brigade', unit_id:14, lieu_nom:'Castelnaudary', lieu_type:'BTA' },
        { id:102, date_debut:'2026-09-21', date_fin:'2026-09-21', type_nom:'Formation', type_couleur:'#8b5cf6', unit_type:'srj',     unit_id:1,  lieu_nom:'Service Réserve Jeunesse de Carcassonne', lieu_type:'SRJ' },
        { id:101, date_debut:'2026-09-14', date_fin:'2026-09-16', type_nom:'Renfort',   type_couleur:'#22c55e', unit_type:'brigade', unit_id:11, lieu_nom:'Carcassonne', lieu_type:'BP' },
        { id:201, date_debut:'2026-08-21', date_fin:'2026-08-22', type_nom:'Renfort',   type_couleur:'#22c55e', unit_type:'brigade', unit_id:21, lieu_nom:'Narbonne', lieu_type:'BP' },
        { id:202, date_debut:'2026-07-19', date_fin:'2026-07-19', type_nom:'Renfort',   type_couleur:'#22c55e', unit_type:'brigade', unit_id:12, lieu_nom:'Trèbes', lieu_type:'BP' },
        { id:203, date_debut:'2026-07-14', date_fin:'2026-07-14', type_nom:'Cérémonie', type_couleur:'#f59e0b', unit_type:'srj',     unit_id:1,  lieu_nom:'Service Réserve Jeunesse de Carcassonne', lieu_type:'SRJ' },
        { id:204, date_debut:'2026-07-03', date_fin:'2026-07-05', type_nom:'Renfort',   type_couleur:'#22c55e', unit_type:'brigade', unit_id:21, lieu_nom:'Narbonne', lieu_type:'BP' },
        { id:205, date_debut:'2026-04-21', date_fin:'2026-04-25', type_nom:'Renfort',   type_couleur:'#22c55e', unit_type:'pmo_bmo', unit_id:1,  lieu_nom:'Peloton motorisé de Narbonne', lieu_type:'PMO' },
        { id:206, date_debut:'2026-04-02', date_fin:'2026-04-02', type_nom:'Formation', type_couleur:'#8b5cf6', unit_type:'srj',     unit_id:1,  lieu_nom:'Service Réserve Jeunesse de Carcassonne', lieu_type:'SRJ' },
        { id:207, date_debut:'2026-03-14', date_fin:'2026-03-16', type_nom:'Renfort',   type_couleur:'#22c55e', unit_type:'brigade', unit_id:32, lieu_nom:'Quillan', lieu_type:'BP' },
        { id:208, date_debut:'2026-02-01', date_fin:'2026-02-02', type_nom:'Renfort',   type_couleur:'#22c55e', unit_type:'psig',    unit_id:1,  lieu_nom:'PSIG de Carcassonne', lieu_type:'PSIG' }
    ];

    var SERVICES = [
        { id:104, mission_id:103, debut:'2026-10-03 06:00:00', fin:'2026-10-03 14:00:00', contenu:'Renfort brigade — surveillance générale.', lieu_nom:'Castelnaudary', lieu_type:'BTA', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:105, mission_id:103, debut:'2026-10-04 14:00:00', fin:'2026-10-04 22:00:00', contenu:'Renfort brigade — interventions et patrouilles.', lieu_nom:'Castelnaudary', lieu_type:'BTA', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:103, mission_id:102, debut:'2026-09-21 08:30:00', fin:'2026-09-21 17:00:00', contenu:"Formation continue — actualisation des techniques d'intervention.", lieu_nom:'Service Réserve Jeunesse de Carcassonne', lieu_type:'SRJ', type_nom:'Formation', type_couleur:'#8b5cf6', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:101, mission_id:101, debut:'2026-09-14 14:00:00', fin:'2026-09-14 22:00:00', contenu:"Patrouille de sécurisation en centre-ville, marché hebdomadaire.\nRAS, effectif complet.", lieu_nom:'Carcassonne', lieu_type:'BP', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:102, mission_id:101, debut:'2026-09-15 20:00:00', fin:'2026-09-16 04:00:00', contenu:'Service de nuit — contrôles routiers RD118.', lieu_nom:'Carcassonne', lieu_type:'BP', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:202, mission_id:201, debut:'2026-08-21 06:00:00', fin:'2026-08-21 14:00:00', contenu:'Patrouille littoral — plages et parkings, forte affluence.', lieu_nom:'Narbonne', lieu_type:'BP', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[{type:'Contrôle routier', contenu:'RD168 — 22 véhicules contrôlés, 2 amendes.'}] },
        { id:201, mission_id:201, debut:'2026-08-22 14:00:00', fin:'2026-08-22 22:00:00', contenu:"Sécurisation du festival — dispositif estival, deux interpellations pour ivresse publique.\nBonne coordination avec la police municipale.", lieu_nom:'Narbonne', lieu_type:'BP', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[{type:'Interpellation', contenu:'Ivresse publique manifeste, conduite au poste.'},{type:'Assistance', contenu:'Personne égarée raccompagnée.'}] },
        { id:203, mission_id:202, debut:'2026-07-19 20:00:00', fin:'2026-07-20 02:00:00', contenu:'Dispositif fête locale — surveillance abords et sorties de bal.', lieu_nom:'Trèbes', lieu_type:'BP', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:204, mission_id:203, debut:'2026-07-14 09:00:00', fin:'2026-07-14 12:30:00', contenu:"Cérémonie du 14 juillet — service d'honneur.", lieu_nom:'Service Réserve Jeunesse de Carcassonne', lieu_type:'SRJ', type_nom:'Cérémonie', type_couleur:'#f59e0b', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:205, mission_id:204, debut:'2026-07-03 14:00:00', fin:'2026-07-03 22:00:00', contenu:'Renfort estival — patrouilles pédestres centre-ville.', lieu_nom:'Narbonne', lieu_type:'BP', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:206, mission_id:204, debut:'2026-07-04 14:00:00', fin:'2026-07-04 22:00:00', contenu:'Renfort estival — marché nocturne.', lieu_nom:'Narbonne', lieu_type:'BP', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:207, mission_id:204, debut:'2026-07-05 14:00:00', fin:'2026-07-05 22:00:00', contenu:'Renfort estival — patrouilles pédestres centre-ville.', lieu_nom:'Narbonne', lieu_type:'BP', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:208, mission_id:205, debut:'2026-04-21 08:00:00', fin:'2026-04-21 16:00:00', contenu:'Surveillance autoroutière A61 — contrôles de vitesse.', lieu_nom:'Peloton motorisé de Narbonne', lieu_type:'PMO', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:209, mission_id:205, debut:'2026-04-22 08:00:00', fin:'2026-04-22 16:00:00', contenu:'Surveillance autoroutière A61 — accident matériel, régulation.', lieu_nom:'Peloton motorisé de Narbonne', lieu_type:'PMO', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[{type:'Accident', contenu:'Accident matériel PK 42, régulation du trafic pendant 40 min.'}] },
        { id:210, mission_id:205, debut:'2026-04-24 08:00:00', fin:'2026-04-24 16:00:00', contenu:'Escorte convoi exceptionnel.', lieu_nom:'Peloton motorisé de Narbonne', lieu_type:'PMO', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:211, mission_id:205, debut:'2026-04-25 08:00:00', fin:'2026-04-25 16:00:00', contenu:'Contrôles routiers RD6113.', lieu_nom:'Peloton motorisé de Narbonne', lieu_type:'PMO', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:212, mission_id:206, debut:'2026-04-02 08:30:00', fin:'2026-04-02 17:00:00', contenu:'Formation — recueil de plainte et procédure simplifiée.', lieu_nom:'Service Réserve Jeunesse de Carcassonne', lieu_type:'SRJ', type_nom:'Formation', type_couleur:'#8b5cf6', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:213, mission_id:207, debut:'2026-03-14 14:00:00', fin:'2026-03-14 22:00:00', contenu:'Renfort week-end — secteur haute vallée.', lieu_nom:'Quillan', lieu_type:'BP', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:214, mission_id:207, debut:'2026-03-15 14:00:00', fin:'2026-03-15 22:00:00', contenu:'Renfort week-end — patrouilles secteur rural.', lieu_nom:'Quillan', lieu_type:'BP', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:215, mission_id:207, debut:'2026-03-16 06:00:00', fin:'2026-03-16 14:00:00', contenu:'Renfort — surveillance générale.', lieu_nom:'Quillan', lieu_type:'BP', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:216, mission_id:208, debut:'2026-02-01 20:00:00', fin:'2026-02-02 04:00:00', contenu:'Patrouille de nuit — secteur périurbain.', lieu_nom:'PSIG de Carcassonne', lieu_type:'PSIG', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] },
        { id:217, mission_id:208, debut:'2026-02-02 20:00:00', fin:'2026-02-03 04:00:00', contenu:'Patrouille de nuit — contrôles et surveillance.', lieu_nom:'PSIG de Carcassonne', lieu_type:'PSIG', type_nom:'Renfort', type_couleur:'#22c55e', dept_code:'11', dept_nom:'Aude', interventions:[] }
    ];

    // ---------------------------------------------------------------------
    // Annuaire fictif des unités de l'Aude (format /api/hierarchy)
    // ---------------------------------------------------------------------
    var UNITS = [
        { unit_type:'ggd',     type_label:'GGD',     is_mere:null, id:1,  nom:"Groupement de gendarmerie départementale de l'Aude", ville:'Carcassonne',   latitude:43.2105, longitude:2.3547, departement_code:'11', nb_missions:0 },
        { unit_type:'cgd',     type_label:'CGD',     is_mere:null, id:1,  nom:'Compagnie de Carcassonne',  ville:'Carcassonne',    latitude:43.2130, longitude:2.3491, departement_code:'11', nb_missions:0 },
        { unit_type:'cgd',     type_label:'CGD',     is_mere:null, id:2,  nom:'Compagnie de Narbonne',     ville:'Narbonne',       latitude:43.1839, longitude:3.0039, departement_code:'11', nb_missions:0 },
        { unit_type:'cgd',     type_label:'CGD',     is_mere:null, id:3,  nom:'Compagnie de Limoux',       ville:'Limoux',         latitude:43.0578, longitude:2.2179, departement_code:'11', nb_missions:0 },
        { unit_type:'brigade', type_label:'COB',     is_mere:true, id:10, nom:'COB de Carcassonne',        ville:'Carcassonne',    latitude:43.2168, longitude:2.3556, departement_code:'11', nb_missions:0 },
        { unit_type:'brigade', type_label:'BP',      is_mere:false,id:11, nom:'Carcassonne',               ville:'Carcassonne',    latitude:43.2130, longitude:2.3491, departement_code:'11', nb_missions:9,  brigade_mere_nom:'COB de Carcassonne', brigade_mere_type:'COB' },
        { unit_type:'brigade', type_label:'BP',      is_mere:false,id:12, nom:'Trèbes',                    ville:'Trèbes',         latitude:43.2094, longitude:2.4419, departement_code:'11', nb_missions:3,  brigade_mere_nom:'COB de Carcassonne', brigade_mere_type:'COB' },
        { unit_type:'brigade', type_label:'BP',      is_mere:false,id:13, nom:'Capendu',                   ville:'Capendu',        latitude:43.1889, longitude:2.5081, departement_code:'11', nb_missions:0,  brigade_mere_nom:'COB de Carcassonne', brigade_mere_type:'COB' },
        { unit_type:'brigade', type_label:'BTA',     is_mere:true, id:14, nom:'Castelnaudary',             ville:'Castelnaudary',  latitude:43.3195, longitude:1.9515, departement_code:'11', nb_missions:4 },
        { unit_type:'brigade', type_label:'COB',     is_mere:true, id:20, nom:'COB de Narbonne',           ville:'Narbonne',       latitude:43.1871, longitude:3.0028, departement_code:'11', nb_missions:0 },
        { unit_type:'brigade', type_label:'BP',      is_mere:false,id:21, nom:'Narbonne',                  ville:'Narbonne',       latitude:43.1839, longitude:3.0039, departement_code:'11', nb_missions:11, brigade_mere_nom:'COB de Narbonne', brigade_mere_type:'COB' },
        { unit_type:'brigade', type_label:'BP',      is_mere:false,id:22, nom:'Sigean',                    ville:'Sigean',         latitude:43.0286, longitude:2.9736, departement_code:'11', nb_missions:1,  brigade_mere_nom:'COB de Narbonne', brigade_mere_type:'COB' },
        { unit_type:'brigade', type_label:'BTA',     is_mere:true, id:23, nom:'Lézignan-Corbières',        ville:'Lézignan-Corbières', latitude:43.1997, longitude:2.7597, departement_code:'11', nb_missions:2 },
        { unit_type:'brigade', type_label:'COB',     is_mere:true, id:30, nom:'COB de Limoux',             ville:'Limoux',         latitude:43.0561, longitude:2.2151, departement_code:'11', nb_missions:0 },
        { unit_type:'brigade', type_label:'BP',      is_mere:false,id:31, nom:'Limoux',                    ville:'Limoux',         latitude:43.0578, longitude:2.2179, departement_code:'11', nb_missions:2,  brigade_mere_nom:'COB de Limoux', brigade_mere_type:'COB' },
        { unit_type:'brigade', type_label:'BP',      is_mere:false,id:32, nom:'Quillan',                   ville:'Quillan',        latitude:42.8768, longitude:2.1809, departement_code:'11', nb_missions:5,  brigade_mere_nom:'COB de Limoux', brigade_mere_type:'COB' },
        { unit_type:'psig',    type_label:'PSIG',    is_mere:null, id:1,  nom:'PSIG de Carcassonne',       ville:'Carcassonne',    latitude:43.2200, longitude:2.3600, departement_code:'11', nb_missions:6 },
        { unit_type:'psig',    type_label:'PSIG',    is_mere:null, id:2,  nom:'PSIG de Narbonne',          ville:'Narbonne',       latitude:43.1900, longitude:3.0100, departement_code:'11', nb_missions:0 },
        { unit_type:'pmo_bmo', type_label:'PMO/BMO', is_mere:null, id:1,  nom:'Peloton motorisé de Narbonne', ville:'Narbonne', latitude:43.1900, longitude:3.0120, departement_code:'11', nb_missions:7 },
        { unit_type:'srj',     type_label:'SRJ',     is_mere:null, id:1,  nom:'Service Réserve Jeunesse de Carcassonne', ville:'Carcassonne', latitude:43.2160, longitude:2.3550, departement_code:'11', nb_missions:8 },
        { unit_type:'edcf',    type_label:'EDCF',    is_mere:null, id:1,  nom:"Escadron Départemental de Contrôle des Flux de l'Aude", ville:'Carcassonne', latitude:43.2090, longitude:2.3620, departement_code:'11', nb_missions:0 },
        { unit_type:'bn',      type_label:'BN',      is_mere:null, id:1,  nom:'Brigade nautique de Leucate', ville:'Leucate', latitude:42.9046, longitude:3.0503, departement_code:'11', nb_missions:0 }
    ];

    window.GN_DEMO = { missions: MISSIONS, services: SERVICES, units: UNITS };

    // ---------------------------------------------------------------------
    // Interception de fetch() : seules les URL d'API du site réel sont
    // détournées. Les appels externes (tuiles OSM, geo.api.gouv.fr) passent.
    // ---------------------------------------------------------------------
    function jsonResponse(obj) {
        return Promise.resolve(new Response(JSON.stringify(obj), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        }));
    }

    function ymd(d) { return d.toISOString().slice(0, 10); }

    var realFetch = window.fetch.bind(window);

    window.fetch = function (input, init) {
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        if (url.indexOf('/api/') === -1) return realFetch(input, init);

        var qs = url.indexOf('?') >= 0 ? url.slice(url.indexOf('?') + 1) : '';
        var p  = new URLSearchParams(qs);

        // --- /api/missions?id=… : un service précis -----------------------
        if (url.indexOf('/api/missions') >= 0 && p.has('id')) {
            var id = parseInt(p.get('id'), 10);
            var s  = SERVICES.filter(function (x) { return x.id === id; })[0];
            return s ? jsonResponse(s) : jsonResponse({ error: 'not_found' });
        }

        // --- /api/missions?from=…&to=… : plage de dates -------------------
        if (url.indexOf('/api/missions') >= 0) {
            var from = p.get('from'), to = p.get('to');
            var svcs = SERVICES, miss = [];
            if (from && to) {
                var toNext = new Date(to + 'T00:00:00');
                toNext.setDate(toNext.getDate() + 1);
                var toNextStr = ymd(toNext);
                svcs = SERVICES.filter(function (s) {
                    return s.fin.slice(0, 10) >= from && s.debut.slice(0, 10) < toNextStr;
                });
                miss = MISSIONS.filter(function (m) {
                    return m.date_fin >= from && m.date_debut <= to;
                });
            }
            svcs = svcs.slice().sort(function (a, b) { return a.debut < b.debut ? -1 : 1; });
            return jsonResponse({ services: svcs, missions: miss });
        }

        // --- /api/hierarchy : annuaire des unités -------------------------
        if (url.indexOf('/api/hierarchy') >= 0) {
            return jsonResponse({ units: UNITS });
        }

        // --- /api/unites_search?q=… : recherche d'unité --------------------
        if (url.indexOf('/api/unites_search') >= 0) {
            var q = (p.get('q') || '').trim().toLowerCase();
            var res = !q ? [] : UNITS.filter(function (u) {
                return u.nom.toLowerCase().indexOf(q) >= 0
                    || (u.ville || '').toLowerCase().indexOf(q) >= 0
                    || (u.type_label || '').toLowerCase().indexOf(q) >= 0;
            }).map(function (u) {
                return {
                    type: u.unit_type,
                    sigle: (u.unit_type === 'brigade' && !u.is_mere) ? 'BP' : u.type_label,
                    nom: u.nom,
                    ville: u.ville,
                    code_unite: null,
                    href: 'unites.html?action=detail&type=' + u.unit_type + '&id=' + u.id
                };
            });
            return jsonResponse({ results: res });
        }

        // --- Endpoints non simulés ----------------------------------------
        // /api/competence  : jusqu'à 35 000 polygones communaux servis par le
        //                    vrai backend (fichiers cache) — hors démo.
        // /api/address_search, /api/brigade_lookup, /api/route : proxys
        //                    serveur vers la BAN et OSRM — hors démo.
        if (url.indexOf('/api/competence') >= 0) {
            if (window.gnDemoBlock) gnDemoBlock('Compétences territoriales');
            return jsonResponse({ features: [], type: 'FeatureCollection' });
        }
        if (window.gnDemoBlock) gnDemoBlock('Appel API');
        return jsonResponse({ error: 'demo', results: [], features: [] });
    };
})();
