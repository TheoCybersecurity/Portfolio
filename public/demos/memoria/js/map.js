// =============================================================================
//  js/map.js — Carte Leaflet + OpenStreetMap
//  Fonctionnalités :
//    - Clustering des unités au même endroit (popup multi-unités)
//    - Filtre par type d'unité (checkboxes)
//    - Couche compétence territoriale avec 4 modes de coloration
//    - Coloration par angle d'or (zones bien différenciées)
// =============================================================================

// preferCanvas:true — la couche « compétence territoriale » peut afficher des
// dizaines de milliers de polygones communaux (mode « Tous les départements ») :
// en SVG, autant de nœuds DOM → carte injouable sur mobile / appareil ancien
// (chaque zoom/déplacement recalcule tout le DOM). En canvas, tout est dessiné
// dans un seul <canvas> par pane → rendu fluide même avec beaucoup de features.
const map = L.map('map', { preferCanvas: true }).setView([46.6, 2.5], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    // Sur mobile, les tuiles OSM au-delà de z18 sont rarement dispo et forcent des
    // requêtes 404 + un surcoût de rendu : on plafonne l'affichage à 18 mais on
    // garde le zoom natif via maxNativeZoom.
    maxNativeZoom: 18,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Focus sur un point précis si des paramètres URL sont fournis
if (window.GN_FOCUS_LAT && window.GN_FOCUS_LNG) {
    map.setView([window.GN_FOCUS_LAT, window.GN_FOCUS_LNG], window.GN_FOCUS_ZOOM || 15);
}

// Easter egg — zoom maximal atteint
map.on('zoomend', function () {
    if (map.getZoom() >= map.getMaxZoom() && window.gnUnlockEgg) {
        gnUnlockEgg('zoom_max', '🔎 Zoom maximal atteint !', 2500);
    }
});

// Easter egg — cliquer sur 10 unités différentes dans la même session
const gnClickedUnits = new Set();
function gnTrackUnitClick(id) {
    gnClickedUnits.add(id);
    if (gnClickedUnits.size >= 10 && window.gnUnlockEgg) {
        gnUnlockEgg('explorateur_carte', '🧭 10 unités explorées sur la carte !', 3200);
    }
}

let circles         = [];
let competenceLayer = null;
let competenceCache = {};
let allUnits        = [];
let deptLayer       = null;

// =============================================================================
//  Couleurs
// =============================================================================

// Angle d'or : hue maximalement espacé pour des zones bien différenciées
function stableColor(key) {
    if (!key) return '#94a3b8';
    let h = 0;
    for (let i = 0; i < key.length; i++) {
        h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
    }
    const goldenRatio = 0.618033988749895;
    const hue = (Math.abs(h) * goldenRatio * 360) % 360;
    // Saturation et luminosité stables pour rester lisibles
    return `hsl(${Math.round(hue)}, 68%, 42%)`;
}

const TYPE_COLORS = {
    ggd:     '#1e3a8a',  // bleu marine profond
    cgd:     '#0ea5e9',  // bleu ciel — très distinct du marine
    edcf:    '#9333ea',  // violet vif
    brigade: '#16a34a',  // vert — toutes brigades (COB, BTA, filles)
    psig:    '#f97316',  // orange
    bn:      '#0d9488',  // teal/cyan
    pmo_bmo: '#c2410c',  // orange-rouge foncé
    pghm:    '#78350f',  // marron montagne
    srj:     '#4338ca',  // indigo
};

function colorForUnit(u) {
    // Toutes les brigades (COB mère, BTA mère, fille) = même vert
    if (u.unit_type === 'brigade') return TYPE_COLORS.brigade;
    return TYPE_COLORS[u.unit_type] || '#94a3b8';
}

// Rang hiérarchique pour la couleur des clusters (0 = priorité max)
const HIERARCHY_RANK = {
    ggd: 0, cgd: 1, edcf: 2, psig: 4, bn: 5, pmo_bmo: 8, pghm: 9, srj: 10
};
function hierarchyRank(u) {
    if (u.unit_type === 'brigade') return u.is_mere ? 3 : 9;
    return HIERARCHY_RANK[u.unit_type] ?? 11;
}

function radiusForCount(n) {
    return Math.max(7, Math.min(36, 7 + Math.sqrt(n) * 5));
}
function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// =============================================================================
//  Filtre par type d'unité
// =============================================================================

const activeTypes = new Set([
    'ggd','srj','pghm','edcf','pmo_bmo','bn','cgd','brigade',
    'psig'
]);

function getVirtualType(u) {
    // Toutes les brigades (mère COB, mère BTA, fille) = un seul type de filtre
    if (u.unit_type === 'brigade') return 'brigade';
    return u.unit_type;
}
function isTypeVisible(u) {
    return activeTypes.has(getVirtualType(u));
}

// =============================================================================
//  Clustering : grouper les unités au même endroit
// =============================================================================

function clusterByLocation(units) {
    const byLocation = new Map();
    units.forEach(u => {
        // Précision de 4 décimales ≈ 11 m — fusionne les unités vraiment colocalisées
        const key = `${parseFloat(u.latitude).toFixed(4)},${parseFloat(u.longitude).toFixed(4)}`;
        if (!byLocation.has(key)) byLocation.set(key, []);
        byLocation.get(key).push(u);
    });
    return byLocation;
}

// =============================================================================
//  Couche compétence territoriale
// =============================================================================

// Délai raisonnable au-delà duquel on abandonne un département plutôt que de
// bloquer indéfiniment le chargement progressif (juillet 2026, suite encore) —
// un aléa externe (rate limit ponctuel de geo.api.gouv.fr sur une rafale de
// 101 requêtes, coupure réseau...) sur UN SEUL département faisait geler tout
// le pool à N-1/N pour toujours : `fetch()` n'a par défaut aucun timeout côté
// navigateur, et un worker resté en attente d'une réponse qui ne vient jamais
// n'incrémente plus jamais son compteur `done`.
const GN_COMPETENCE_TIMEOUT_MS = 15000;

async function loadCompetence(dept) {
    if (!dept || dept === 'all') return null;
    if (competenceCache[dept]) return competenceCache[dept];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GN_COMPETENCE_TIMEOUT_MS);
    let r;
    try {
        r = await fetch(`${window.GN_COMPETENCE_API}?dept=${encodeURIComponent(dept)}`, { signal: controller.signal });
    } catch (e) {
        return null; // timeout (abort) ou coupure réseau — traité comme un échec silencieux
    } finally {
        clearTimeout(timer);
    }
    if (!r.ok) return null;
    const geojson = await r.json();
    if (geojson.error) return null;
    competenceCache[dept] = geojson;
    return geojson;
}

// Clé de coloration selon le mode choisi
function getCompetenceKey(p, mode) {
    switch (mode) {
        case 'cob': return p.cob_bta_id ? 'cob_' + p.cob_bta_id : (p.id_service || '');
        case 'cgd': return p.cgd_id     ? 'cgd_' + p.cgd_id     : (p.id_service || '');
        case 'ggd': return p.ggd_id     ? 'ggd_' + p.ggd_id     : (p.id_service || '');
        default:    return p.id_service  || '';
    }
}

// Contenu du popup selon le mode — bug corrigé (juillet 2026) : quand la
// hiérarchie COB/CGD/GGD d'une commune n'a pas pu être résolue (nom de service
// data.gouv.fr sans correspondance dans gn_brigade, unité pas encore saisie
// par l'admin…), ces 3 cas retournaient une chaîne VIDE — le popup n'affichait
// alors plus que le nom de la commune et la légende générique "Compétence
// territoriale", sans aucune zone, ce qui donnait l'impression trompeuse que
// c'était ÇA la donnée affichée. Repli explicite sur le nom de brigade brut
// (déjà connu via gn_comp_territoriale) + mention que le rattachement de niveau
// supérieur n'est pas identifié, au lieu de rien afficher.
// Une commune sans ligne dans gn_comp_territoriale n'est pas une "compétence
// inconnue" — le CSV source (data.gouv.fr, "compétence territoriale
// gendarmerie ET police nationales") couvre TOUTE la France, mais l'import
// (tools/import_competence.php) ne garde que les lignes institution='GN' et
// ignore volontairement les lignes 'PN' : l'absence de ligne signifie donc de
// façon certaine que la commune est en zone Police Nationale, pas que la
// donnée manque (juillet 2026, suite — libellé corrigé en conséquence).
const PN_LABEL = '<div style="font-size:12px;color:#1e40af;margin-top:4px">👮 Zone Police Nationale</div>';

function getCompetencePopupExtra(p, mode) {
    if (!p.brigade) return PN_LABEL;
    const unresolved = (label) => `<div style="font-size:12px;color:#94a3b8;margin-top:4px">${esc(p.brigade)} — ${label} non identifiée</div>`;
    switch (mode) {
        case 'cob': return p.cob_nom
            ? `<div style="font-size:12px;color:#1d4ed8;margin-top:4px">${esc(p.cob_type)} : ${esc(p.cob_nom)}</div>` : unresolved('COB/BTA');
        case 'cgd': return p.cgd_nom
            ? `<div style="font-size:12px;color:#1d4ed8;margin-top:4px">CGD : ${esc(p.cgd_nom)}</div>` : unresolved('CGD');
        case 'ggd': return p.ggd_nom
            ? `<div style="font-size:12px;color:#002395;margin-top:4px">GGD : ${esc(p.ggd_nom)}</div>` : unresolved('GGD');
        default:
            return `<div style="font-size:13px;margin-top:2px">${esc(p.brigade)}</div>`;
    }
}

// competenceLayer est un L.layerGroup (pas un L.geoJSON direct) — un
// sous-calque GeoJSON par département y est ajouté au fur et à mesure
// (juillet 2026, suite : mode "Tous les départements", voir plus bas), plutôt
// que de reconstruire un unique gros L.geoJSON à chaque fois.
function clearCompetenceLayer() {
    if (competenceLayer) { map.removeLayer(competenceLayer); competenceLayer = null; }
}

function addCompetenceGeoJSON(geojson, mode) {
    if (!geojson) return;
    if (!competenceLayer) {
        // L.layerGroup() n'a PAS de bringToBack() (contrairement à L.geoJSON/L.Path) —
        // appeler competenceLayer.bringToBack() ici levait un TypeError à chaque
        // premier chargement, interrompant la fonction avant l'ajout réel du calque
        // et avant que l'appelant ne désactive le spinner (juillet 2026, suite encore
        // — bug réel, trouvé via reproduction navigateur, aucun rapport avec le
        // réseau/cache malgré les symptômes similaires aux correctifs précédents).
        // Le repli sur l'arrière-plan se fait donc par sous-calque (voir plus bas),
        // chacun étant un vrai L.geoJSON qui supporte bringToBack().
        competenceLayer = L.layerGroup().addTo(map);
        if (deptLayer) deptLayer.bringToBack();
    }
    // Beaucoup de features (mode « Tous les départements » ≈ 35 000 communes) :
    //  - popup construit AU CLIC, pas 35 000 chaînes HTML pré-générées au chargement ;
    //  - effet de survol désactivé au-delà d'un seuil et sur mobile (chaque
    //    mouseover redessine tout le canvas de la couche → saccades ; pas de
    //    survol au doigt de toute façon).
    const nFeatures  = (geojson.features || []).length;
    const enableHover = !L.Browser.mobile && nFeatures <= 1500;
    const layer = L.geoJSON(geojson, {
        style: feature => {
            const key = getCompetenceKey(feature.properties, mode);
            return { color: '#fff', weight: 0.5, fillColor: stableColor(key), fillOpacity: 0.35 };
        },
        onEachFeature: (feature, lyr) => {
            lyr.on('click', function (e) {
                const p = feature.properties;
                L.popup({ maxWidth: 280 })
                    .setLatLng(e.latlng)
                    .setContent(`<div style="font-family:Inter,sans-serif;min-width:200px">
                        <div style="font-weight:700;font-size:13px">${esc(p.nom || '')}</div>
                        <div style="font-size:11px;color:#64748b;margin-bottom:4px">Compétence territoriale</div>
                        ${getCompetencePopupExtra(p, mode)}</div>`)
                    .openOn(map);
            });
            if (enableHover) {
                lyr.on('mouseover', function () { this.setStyle({ fillOpacity: 0.65 }); });
                lyr.on('mouseout',  function () { this.setStyle({ fillOpacity: 0.35 }); });
            }
        }
    });
    layer.addTo(competenceLayer);
    layer.bringToBack();
}

// Rendu "plein remplacement" — un seul département (garde le nom historique,
// toujours utilisé par le changement de mode de coloration ci-dessous).
function renderCompetence(geojson) {
    clearCompetenceLayer();
    const mode = document.getElementById('color-mode')?.value || 'brigade';
    addCompetenceGeoJSON(geojson, mode);
}

// Compteur de génération — invalidé à chaque changement de réglage pendant un
// chargement en cours (case décochée, département changé…) : les réponses
// tardives d'une génération périmée sont silencieusement ignorées au lieu de
// s'afficher après coup de façon incohérente.
let competenceGeneration = 0;

function gnSetCompetenceLoading(on) {
    const spinner = document.getElementById('competence-spinner');
    if (spinner) spinner.style.display = on ? '' : 'none';
}

// Chargement progressif de TOUS les départements (juillet 2026, suite) —
// remplace l'ancien blocage pur et simple ("Sélectionne un département pour
// activer"). Optimisations : (1) plusieurs départements en vol à la fois
// (pool de taille CONCURRENCY) plutôt qu'un par un en séquence — la latence
// dominante est le géocodage/contours externes (geo.api.gouv.fr), pas le CPU
// local, donc paralléliser accélère très directement ; (2) chaque département
// s'affiche sur la carte dès qu'il arrive (addCompetenceGeoJSON), l'utilisateur
// voit la carte se remplir progressivement au lieu d'un long silence suivi
// d'un rendu unique — répond au symptôme observé ("laissé tourner, toujours
// rien affiché").
// Garde-fou : « Tous les départements » = ~35 000 polygones à télécharger et
// dessiner. Sur mobile / appareil ancien, on demande confirmation une fois.
let gnHeavyCompetenceOk = false;
function gnConfirmHeavyCompetence() {
    if (gnHeavyCompetenceOk) return true;
    if (!L.Browser.mobile && window.innerWidth > 720) { gnHeavyCompetenceOk = true; return true; }
    const ok = window.confirm(
        "Afficher la compétence territoriale de TOUS les départements télécharge et dessine "
        + "des dizaines de milliers de zones — ça peut être lent, voire bloquer, sur un téléphone "
        + "ou un appareil ancien.\n\nContinuer quand même ?");
    if (ok) gnHeavyCompetenceOk = true;
    return ok;
}

async function loadAllCompetenceProgressive(myGen) {
    const mode  = document.getElementById('color-mode')?.value || 'brigade';
    const hint  = document.getElementById('competence-hint');
    const codes = Array.from(document.querySelectorAll('#dept-filter option'))
        .map(o => o.value)
        .filter(v => v && v !== 'all');
    const total = codes.length;
    let done = 0, ok = 0;
    gnSetCompetenceLoading(true);
    hint.textContent = `Chargement… 0 / ${total} départements`;

    const CONCURRENCY = 6;
    let nextIdx = 0;
    async function worker() {
        while (nextIdx < codes.length) {
            if (myGen !== competenceGeneration) return; // annulé entretemps
            const code = codes[nextIdx++];
            const geojson = await loadCompetence(code);
            if (myGen !== competenceGeneration) return;
            if (geojson) { addCompetenceGeoJSON(geojson, mode); ok++; }
            done++;
            hint.textContent = `Chargement… ${done} / ${total} départements`;
        }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (myGen !== competenceGeneration) return;
    gnSetCompetenceLoading(false);
    hint.textContent = `${ok} / ${total} départements chargés.`;
}

// =============================================================================
//  Chargement et rendu des unités
// =============================================================================

async function loadAndRender() {
    circles.forEach(c => map.removeLayer(c));
    circles = [];

    const filter = document.getElementById('dept-filter').value;
    const data   = await fetch(window.GN_HIERARCHY_API).then(r => r.json());
    allUnits = (data.units || []).filter(u => {
        if (!u.latitude || !u.longitude) return false;
        if (filter !== 'all' && u.departement_code !== filter) return false;
        return true;
    });

    renderUnits();
}

// Libellé du badge pour une unité (COB / BTA / BT pour les brigades)
function brigadeLabel(u) {
    if (u.unit_type !== 'brigade') return u.type_label;
    if (u.is_mere) return u.type_label; // 'COB' ou 'BTA'
    return 'BP';
}

// Ligne d'appartenance COB pour les brigades filles uniquement
function buildBrigadeExtra(u) {
    if (u.unit_type !== 'brigade' || u.is_mere || !u.brigade_mere_nom) return '';
    return `<div style="font-size:12px;color:#166534;margin-bottom:4px">${esc(u.brigade_mere_type || 'COB')} : ${esc(u.brigade_mere_nom)}</div>`;
}

function renderUnits() {
    circles.forEach(c => map.removeLayer(c));
    circles = [];

    const visible = allUnits.filter(isTypeVisible);
    if (!visible.length) { updateLegend(); return; }

    // Grouper par position géographique
    const clusters = clusterByLocation(visible);
    const bounds   = [];

    for (const [locKey, group] of clusters) {
        // Trier par rang hiérarchique (le plus élevé en premier pour la couleur)
        group.sort((a, b) => hierarchyRank(a) - hierarchyRank(b));
        const primary        = group[0];
        const [lat, lng]     = locKey.split(',').map(Number);
        const totalMissions  = group.reduce((s, u) => s + u.nb_missions, 0);

        // La couleur encode le TYPE d'unité (cohérent avec la légende et les filtres).
        // La TAILLE encode le nombre de missions (voir sous-titre de la page).
        const fillColor = colorForUnit(primary);
        const radius    = radiusForCount(totalMissions);

        const c = L.circleMarker([lat, lng], {
            radius:      radius,
            color:       '#ffffff',
            weight:      2,
            fillColor:   fillColor,
            fillOpacity: 0.85,
        }).addTo(map);

        if (group.length === 1) {
            // Popup unité unique
            const u = primary;
            const brigadeExtra = buildBrigadeExtra(u);
            c.bindPopup(`
                <div style="font-family:Inter,sans-serif;min-width:200px">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                        <span style="background:${colorForUnit(u)};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;white-space:nowrap">${esc(brigadeLabel(u))}</span>
                        <span style="font-weight:700;font-size:14px">${esc(u.nom)}</span>
                    </div>
                    ${brigadeExtra}
                    <div style="font-size:13px;font-weight:600;color:#374151">${totalMissions} mission${totalMissions > 1 ? 's' : ''}</div>
                    <div style="margin-top:8px">
                        <a href="unites?action=detail&type=${esc(u.unit_type)}&id=${u.id}" style="color:#002395">Voir le détail →</a>
                    </div>
                </div>`, { offset: L.point(0, -radius) });
            c.off('click'); c.on('click', function () { c.openPopup(); gnTrackUnitClick(u.unit_type + '_' + u.id); });
        } else {
            // Popup cluster multi-unités
            const items = group.map(u => {
                const brigadeExtra = buildBrigadeExtra(u);
                return `
                <div style="padding:6px 0;border-bottom:1px solid #e2e8f0">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                        <span style="background:${colorForUnit(u)};color:#fff;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:700;white-space:nowrap">${esc(brigadeLabel(u))}</span>
                        <strong style="font-size:13px">${esc(u.nom)}</strong>
                    </div>
                    ${brigadeExtra}
                    <div style="font-size:12px;color:#64748b">
                        ${u.nb_missions} mission${u.nb_missions > 1 ? 's' : ''}
                        · <a href="unites?action=detail&type=${esc(u.unit_type)}&id=${u.id}" style="color:#002395">Détail →</a>
                    </div>
                </div>`;
            }).join('');
            c.bindPopup(`
                <div style="font-family:Inter,sans-serif;min-width:240px">
                    <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#002395">
                        ${group.length} unités à cet emplacement
                    </div>
                    ${items}
                    <div style="font-size:13px;font-weight:700;margin-top:8px">
                        ${totalMissions} mission${totalMissions > 1 ? 's' : ''} au total
                    </div>
                </div>`, { maxWidth: 340, offset: L.point(0, -radius) });
            c.off('click'); c.on('click', function () {
                c.openPopup();
                group.forEach(function (u) { gnTrackUnitClick(u.unit_type + '_' + u.id); });
            });
        }

        circles.push(c);
        bounds.push([lat, lng]);
    }

    // fitBounds seulement si pas de focus URL
    if (bounds.length && !window.GN_FOCUS_LAT) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
    updateLegend();
}

// =============================================================================
//  Légende
// =============================================================================

function updateLegend() {
    if (window._gnLegend) map.removeControl(window._gnLegend);
    window._gnLegend = L.control({ position: 'bottomright' });
    window._gnLegend.onAdd = function () {
        const div = L.DomUtil.create('div', 'map-legend');
        // Ordre aligné sur l'arborescence de unites.php : GGD → SRJ → PGHM → EDCF →
        // PMO/BMO → BN → CGD → BP → PSIG (BSL/BGMAR supprimées, hors gendarmerie
        // départementale — BN reclassée sous EDCF — juillet 2026)
        div.innerHTML = `
            <strong style="font-size:12px">Types d'unités</strong>
            <div class="legend-item"><span class="legend-circle" style="background:#1e3a8a"></span> GGD</div>
            <div class="legend-item"><span class="legend-circle" style="background:#4338ca"></span> SRJ</div>
            <div class="legend-item"><span class="legend-circle" style="background:#78350f"></span> PGHM</div>
            <div class="legend-item"><span class="legend-circle" style="background:#9333ea"></span> EDCF</div>
            <div class="legend-item"><span class="legend-circle" style="background:#c2410c"></span> PMO/BMO</div>
            <div class="legend-item"><span class="legend-circle" style="background:#0d9488"></span> BN</div>
            <div class="legend-item"><span class="legend-circle" style="background:#0ea5e9"></span> CGD</div>
            <div class="legend-item"><span class="legend-circle" style="background:#16a34a"></span> BP</div>
            <div class="legend-item"><span class="legend-circle" style="background:#f97316"></span> PSIG</div>`;
        return div;
    };
    window._gnLegend.addTo(map);
}

// =============================================================================
//  Événements
// =============================================================================

document.getElementById('toggle-competence').addEventListener('change', async function () {
    const filter  = document.getElementById('dept-filter').value;
    const hint    = document.getElementById('competence-hint');
    const modeRow = document.getElementById('color-mode-row');
    competenceGeneration++;
    const myGen = competenceGeneration;
    if (!this.checked) {
        clearCompetenceLayer();
        gnSetCompetenceLoading(false);
        hint.textContent = '';
        if (modeRow) modeRow.style.visibility = 'hidden';
        return;
    }
    if (modeRow) modeRow.style.visibility = 'visible';
    if (filter === 'all') {
        if (!gnConfirmHeavyCompetence()) {
            this.checked = false;
            if (modeRow) modeRow.style.visibility = 'hidden';
            return;
        }
        clearCompetenceLayer();
        await loadAllCompetenceProgressive(myGen);
        return;
    }
    hint.textContent = 'Chargement…';
    gnSetCompetenceLoading(true);
    const geojson = await loadCompetence(filter);
    if (myGen !== competenceGeneration) return; // décoché/changé entretemps
    renderCompetence(geojson);
    gnSetCompetenceLoading(false);
    hint.textContent = geojson ? '' : 'Données indisponibles.';
});

document.getElementById('dept-filter').addEventListener('change', async function () {
    const hint    = document.getElementById('competence-hint');
    const toggle  = document.getElementById('toggle-competence');
    const modeRow = document.getElementById('color-mode-row');
    competenceGeneration++;
    const myGen = competenceGeneration;
    if (toggle.checked) {
        if (this.value === 'all' && !gnConfirmHeavyCompetence()) {
            toggle.checked = false;
            clearCompetenceLayer();
            gnSetCompetenceLoading(false);
            if (modeRow) modeRow.style.visibility = 'hidden';
            return;
        }
        clearCompetenceLayer();
        if (this.value === 'all') {
            await loadAllCompetenceProgressive(myGen);
        } else {
            hint.textContent = 'Chargement…';
            gnSetCompetenceLoading(true);
            const geojson = await loadCompetence(this.value);
            if (myGen !== competenceGeneration) return;
            renderCompetence(geojson);
            gnSetCompetenceLoading(false);
            hint.textContent = geojson ? '' : 'Données indisponibles.';
        }
    } else {
        hint.textContent = '';
    }
    if (modeRow) modeRow.style.visibility = toggle.checked ? 'visible' : 'hidden';
    loadAndRender();
});

document.getElementById('color-mode')?.addEventListener('change', function () {
    const filter = document.getElementById('dept-filter').value;
    const toggle = document.getElementById('toggle-competence');
    if (!toggle.checked) return;
    competenceGeneration++;
    clearCompetenceLayer();
    if (filter === 'all') {
        // Tous les GeoJSON déjà téléchargés sont en cache (competenceCache) —
        // un simple re-rendu local suffit, aucun nouvel appel réseau.
        const mode = this.value;
        Object.values(competenceCache).forEach(g => addCompetenceGeoJSON(g, mode));
    } else {
        const cached = competenceCache[filter];
        if (cached) renderCompetence(cached);
    }
});

// Filtres type d'unité
document.querySelectorAll('.unit-type-cb').forEach(cb => {
    cb.addEventListener('change', function () {
        if (this.checked) activeTypes.add(this.value);
        else              activeTypes.delete(this.value);
        renderUnits();
    });
});

// =============================================================================
//  Limites des départements français
// =============================================================================

async function loadDeptBoundaries() {
    try {
        const r = await fetch('https://geo.api.gouv.fr/departements?fields=code,nom,contour&format=geojson');
        if (!r.ok) return;
        const geojson = await r.json();
        deptLayer = L.geoJSON(geojson, {
            style: {
                color:       '#1e293b',
                weight:      2,
                fillOpacity: 0,
                opacity:     0.8,
                dashArray:   '4 3',
            },
            onEachFeature: (feature, layer) => {
                const p = feature.properties;
                layer.bindTooltip(
                    `<strong>${esc(p.code || '')}</strong> ${esc(p.nom || '')}`,
                    { sticky: true, className: 'dept-tooltip' }
                );
            }
        });
        deptLayer.addTo(map);
        deptLayer.bringToBack();
    } catch (e) {
        // API indisponible — on continue sans les limites
    }
}

// =============================================================================
//  Géolocalisation de l'utilisateur (temps réel)
// =============================================================================

let geoWatchId        = null;
let geoMarker         = null;
let geoAccuracyCircle = null;

function gnStopGeolocation() {
    if (geoWatchId !== null) { navigator.geolocation.clearWatch(geoWatchId); geoWatchId = null; }
    if (geoMarker)         { map.removeLayer(geoMarker);         geoMarker = null; }
    if (geoAccuracyCircle) { map.removeLayer(geoAccuracyCircle); geoAccuracyCircle = null; }
    const btn = document.getElementById('geoloc-btn');
    if (btn) { btn.classList.remove('active'); btn.textContent = '📍 Me localiser'; }
}

function gnStartGeolocation() {
    const btn = document.getElementById('geoloc-btn');
    if (!('geolocation' in navigator)) {
        alert("La géolocalisation n'est pas disponible sur ce navigateur.");
        return;
    }
    btn.classList.add('active');
    btn.textContent = '📍 Localisation…';
    if (window.gnUnlockEgg) gnUnlockEgg('geolocalisation_activee', '📍 Te voilà repéré !', 2800);
    let firstFix = true;

    function onPos(pos) {
        const { latitude, longitude, accuracy } = pos.coords;
        btn.textContent = '📍 Me localiser (actif)';
        if (!geoMarker) {
            geoMarker = L.circleMarker([latitude, longitude], {
                radius: 8, color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1,
            }).addTo(map).bindPopup('Votre position');
            geoAccuracyCircle = L.circle([latitude, longitude], {
                radius: accuracy, color: '#2563eb', weight: 1, fillColor: '#2563eb', fillOpacity: .08,
            }).addTo(map);
        } else {
            geoMarker.setLatLng([latitude, longitude]);
            geoAccuracyCircle.setLatLng([latitude, longitude]).setRadius(accuracy);
        }
        if (firstFix) { map.setView([latitude, longitude], 14); firstFix = false; }
    }

    // Un premier fix rapide via getCurrentPosition (déclenche l'invite de
    // permission dans le geste utilisateur), puis un suivi temps réel via
    // watchPosition. Retombe sur une précision standard (GPS non requis) si la
    // haute précision échoue — fréquent sur mobile quand le GPS est coupé.
    let triedLowAccuracy = false;
    function onErr(err) {
        // code 1 = PERMISSION_DENIED · 2 = POSITION_UNAVAILABLE · 3 = TIMEOUT
        if ((err.code === 2 || err.code === 3) && !triedLowAccuracy) {
            triedLowAccuracy = true;
            if (geoWatchId !== null) { navigator.geolocation.clearWatch(geoWatchId); geoWatchId = null; }
            startWatch(false);
            return;
        }
        let msg;
        if (err.code === 1) {
            msg = "Accès à votre position refusé.\n\nAutorisez la localisation pour ce site "
                + "(icône 🔒 / ⓘ dans la barre d'adresse → Autorisations → Position), "
                + "et vérifiez que la localisation est activée dans les réglages du téléphone.";
        } else if (err.code === 2) {
            msg = "Position indisponible. Activez le GPS / la localisation de l'appareil et réessayez.";
        } else if (err.code === 3) {
            msg = "La localisation a mis trop de temps à répondre. Réessayez, de préférence près d'une fenêtre ou à l'extérieur.";
        } else {
            msg = 'Géolocalisation indisponible : ' + err.message;
        }
        alert(msg);
        gnStopGeolocation();
    }

    function startWatch(highAccuracy) {
        geoWatchId = navigator.geolocation.watchPosition(onPos, onErr, {
            enableHighAccuracy: highAccuracy, maximumAge: 5000, timeout: highAccuracy ? 15000 : 30000,
        });
    }

    navigator.geolocation.getCurrentPosition(onPos, function () { /* l'erreur sera gérée par le watch */ },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 });
    startWatch(true);
}

document.getElementById('geoloc-btn')?.addEventListener('click', function () {
    if (geoWatchId !== null) gnStopGeolocation();
    else gnStartGeolocation();
});
window.addEventListener('pagehide', gnStopGeolocation);

// =============================================================================
//  Initialisation
// =============================================================================

// Masquer le sélecteur de coloration au départ (visible seulement quand compétence ON)
const _modeRow = document.getElementById('color-mode-row');
if (_modeRow) _modeRow.style.visibility = 'hidden';

loadDeptBoundaries();
loadAndRender();

// =============================================================================
//  Recherche d'adresse, brigade compétente, itinéraire (juillet 2026, suite encore)
// =============================================================================

let addressMarker = null;
let routeLine      = null;
let gnAddressDebounce = null;

const addressInput    = document.getElementById('address-search');
const addressDropdown = document.getElementById('address-search-dropdown');

function gnCloseRoutePanel() {
    document.getElementById('route-panel').style.display = 'none';
    if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
}
window.gnCloseRoutePanel = gnCloseRoutePanel;

async function gnAddressSearch(q) {
    if (q.trim().length < 3) { addressDropdown.style.display = 'none'; return; }
    try {
        const r = await fetch('/api/address_search?q=' + encodeURIComponent(q));
        const d = await r.json();
        const results = d.results || [];
        if (!results.length) {
            addressDropdown.innerHTML = '<div style="padding:8px 10px;font-size:13px;color:var(--gris-400)">Aucune adresse trouvée.</div>';
        } else {
            addressDropdown.innerHTML = results.map((res, idx) => `
                <div class="address-option" data-idx="${idx}" style="padding:8px 10px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--gris-100)">${esc(res.label)}</div>
            `).join('');
            addressDropdown._results = results;
        }
        addressDropdown.style.display = '';
    } catch (e) { addressDropdown.style.display = 'none'; }
}

addressInput.addEventListener('input', function () {
    clearTimeout(gnAddressDebounce);
    const q = this.value;
    gnAddressDebounce = setTimeout(() => gnAddressSearch(q), 300);
});
addressInput.addEventListener('blur', () => setTimeout(() => { addressDropdown.style.display = 'none'; }, 150));

addressDropdown.addEventListener('mousedown', function (e) {
    const opt = e.target.closest('.address-option');
    if (!opt) return;
    e.preventDefault();
    const res = addressDropdown._results[parseInt(opt.dataset.idx, 10)];
    addressDropdown.style.display = 'none';
    addressInput.value = res.label;
    gnSelectAddress(res);
});

function gnSelectAddress(res) {
    if (addressMarker) map.removeLayer(addressMarker);
    map.setView([res.lat, res.lon], 15);
    addressMarker = L.marker([res.lat, res.lon]).addTo(map);
    addressMarker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:200px">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px">${esc(res.label)}</div>
            <div id="addr-brigade-result" style="font-size:12px;color:#374151;margin-bottom:8px"></div>
            <div style="display:flex;gap:6px">
                <button type="button" class="btn btn-sm" style="font-size:11px" onclick="gnLookupBrigade('${esc(res.citycode || '')}')">Quelle brigade ?</button>
                <button type="button" class="btn btn-sm btn-primary" style="font-size:11px" onclick="gnRouteTo(${res.lat}, ${res.lon})">Itinéraire</button>
            </div>
        </div>
    `, { offset: L.point(0, -10) }).openPopup();
}
window.gnSelectAddress = gnSelectAddress;

async function gnLookupBrigade(citycode) {
    const target = document.getElementById('addr-brigade-result');
    if (!citycode) { if (target) target.textContent = 'Code commune inconnu.'; return; }
    if (target) target.textContent = '⏳ Recherche…';
    try {
        const r = await fetch('/api/brigade_lookup?citycode=' + encodeURIComponent(citycode));
        const d = await r.json();
        if (!target) return;
        if (d.error || !d.brigade_officielle) {
            target.textContent = 'Aucune brigade gendarmerie trouvée pour cette commune (police nationale ?).';
        } else {
            let html = `<strong>${esc(d.brigade_officielle)}</strong>`;
            if (d.cob_nom) html += `<br>${esc(d.cob_nom)}`;
            if (d.cgd_nom) html += ` · ${esc(d.cgd_nom)}`;
            if (d.ggd_nom) html += ` · ${esc(d.ggd_nom)}`;
            target.innerHTML = html;
        }
    } catch (e) { if (target) target.textContent = 'Erreur réseau.'; }
}
window.gnLookupBrigade = gnLookupBrigade;

function gnFormatDistance(m) {
    return m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m';
}
function gnFormatDuration(s) {
    const min = Math.round(s / 60);
    if (min < 60) return min + ' min';
    return Math.floor(min / 60) + ' h ' + (min % 60).toString().padStart(2, '0') + ' min';
}

async function gnRouteTo(toLat, toLon) {
    if (!geoMarker) {
        alert('Active « 📍 Me localiser » pour calculer un itinéraire depuis ta position actuelle.');
        return;
    }
    const from = geoMarker.getLatLng();
    const panel   = document.getElementById('route-panel');
    const summary = document.getElementById('route-summary');
    const stepsEl = document.getElementById('route-steps');
    panel.style.display = '';
    summary.textContent = '⏳ Calcul de l\'itinéraire…';
    stepsEl.innerHTML = '';
    try {
        const r = await fetch(`/api/route?from_lat=${from.lat}&from_lon=${from.lng}&to_lat=${toLat}&to_lon=${toLon}`);
        const d = await r.json();
        if (d.error || !d.geometry) {
            summary.textContent = "Itinéraire indisponible.";
            return;
        }
        summary.textContent = `${gnFormatDistance(d.distance)} — ${gnFormatDuration(d.duration)}`;
        stepsEl.innerHTML = d.steps.map(s => `
            <div style="padding:5px 0;border-bottom:1px solid var(--gris-100)">
                ${esc(s.instruction)}
                ${s.distance > 0 ? `<span style="color:var(--gris-400)"> — ${gnFormatDistance(s.distance)}</span>` : ''}
            </div>`).join('');

        if (routeLine) map.removeLayer(routeLine);
        const latlngs = d.geometry.coordinates.map(c => [c[1], c[0]]);
        routeLine = L.polyline(latlngs, { color: '#2563eb', weight: 5, opacity: 0.75 }).addTo(map);
        map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
    } catch (e) { summary.textContent = 'Erreur réseau lors du calcul de l\'itinéraire.'; }
}
window.gnRouteTo = gnRouteTo;
