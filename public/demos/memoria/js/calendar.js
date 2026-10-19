// =============================================================================
//  js/calendar.js — Calendrier mensuel + vue jour
//  Affiche les services (patrouilles/formations datées et horodatées). Les
//  services à cheval sur 2 jours apparaissent sur les 2 dates. Les jours
//  couverts par une mission (déploiement) sans aucun service ce jour-là
//  affichent un repère en pointillé (unité, pas d'horaire connu).
// =============================================================================

const monthNames = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const monthNamesShort = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
const dayNames   = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const dayNamesShort = ['L','M','M','J','V','S','D'];

let state = {
    // Valeur initiale sans effet réel : switchView(window.GN_DEFAULT_VIEW) tout
    // en bas de ce fichier écrase ce champ avant le premier rendu, en appliquant
    // aussi l'affichage des blocs et le style du bouton actif (préférences,
    // juillet 2026) — voir window.GN_DEFAULT_VIEW dans calendrier.php.
    view:        'month',    // 'month' | 'day' | 'year' | 'custom'
    cursor:      new Date(),
    services:    [],
    missions:    [],
    customStart: null,       // Date | null — bornes de la vue personnalisée
    customEnd:   null,
};

// ---------- Utilitaires ----------
function pad(n)       { return String(n).padStart(2, '0'); }
function ymd(d)       { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parseDT(s)   { return new Date(s.replace(' ', 'T')); }
function parseD(s)    { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function fmtTime(d)   { return pad(d.getHours()) + 'h' + pad(d.getMinutes()); }
function sameDay(a,b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
}
function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function typeLabel(s) { return s.type_nom || 'Renfort'; }
function fmtDayFR(d)  { return `${dayNames[(d.getDay()+6)%7]} ${d.getDate()} ${monthNames[d.getMonth()]}`; }

// ---------- Infobulle flottante au survol d'un service ----------
// Vue jour / mois : contenu du service survolé. Vue année/personnalisée : tous
// les services du jour survolé (le détail par service n'est pas affiché à cette
// échelle). Purement au survol — le clic garde son comportement (modale / page).
let gnTip = null;
function tipEl() {
    if (!gnTip) {
        gnTip = document.createElement('div');
        gnTip.className = 'gn-cal-tip';
        gnTip.hidden = true;
        document.body.appendChild(gnTip);
    }
    return gnTip;
}
function tipHide() { if (gnTip) gnTip.hidden = true; }
function tipMove(e) {
    const el = gnTip; if (!el || el.hidden) return;
    const pad = 16, r = el.getBoundingClientRect();
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + r.width  + 8 > window.innerWidth)  x = e.clientX - r.width  - pad;
    if (y + r.height + 8 > window.innerHeight) y = e.clientY - r.height - pad;
    el.style.left = Math.max(6, x) + 'px';
    el.style.top  = Math.max(6, y) + 'px';
}
function servicesOnDay(day) {
    const td = new Date(day); td.setHours(0,0,0,0);
    return state.services.filter(s => {
        const sd = new Date(s.debutD); sd.setHours(0,0,0,0);
        const sf = new Date(s.finD);   sf.setHours(0,0,0,0);
        return td >= sd && td <= sf;
    }).sort((a,b) => a.debutD - b.debutD);
}
function tipShowService(e, s) {
    const c = s.contenu && s.contenu.trim();
    tipEl().innerHTML =
        `<div class="gn-cal-tip-h">${esc(s.lieu_nom)} · ${fmtTime(s.debutD)}–${fmtTime(s.finD)}` +
        ` <span class="gn-cal-tip-badge">${esc(typeLabel(s))}</span></div>` +
        (c ? `<div class="gn-cal-tip-b">${esc(c)}</div>`
           : `<div class="gn-cal-tip-b gn-cal-tip-empty">Aucun contenu renseigné</div>`);
    gnTip.hidden = false; tipMove(e);
}
function tipShowDay(e, day) {
    const list = servicesOnDay(day);
    if (!list.length) { tipHide(); return; }
    tipEl().innerHTML =
        `<div class="gn-cal-tip-h">${fmtDayFR(day)} — ${list.length} service${list.length > 1 ? 's' : ''}</div>` +
        list.map(s => {
            const c = s.contenu && s.contenu.trim();
            return `<div class="gn-cal-tip-item"><strong>${fmtTime(s.debutD)}–${fmtTime(s.finD)}</strong> ` +
                   `${esc(s.lieu_nom)}` +
                   (c ? `<div class="gn-cal-tip-sub">${esc(c)}</div>` : '') + `</div>`;
        }).join('');
    gnTip.hidden = false; tipMove(e);
}
// Attache le survol-infobulle à un élément déjà en DOM. resolver(el) → un service
// (vue jour/mois) OU une Date (vue année). null/undefined → pas d'infobulle.
function attachTip(el, resolver) {
    el.addEventListener('mouseenter', e => {
        const v = resolver(el);
        if (!v) return;
        if (v instanceof Date) tipShowDay(e, v); else tipShowService(e, v);
    });
    el.addEventListener('mousemove', tipMove);
    el.addEventListener('mouseleave', tipHide);
}
window.addEventListener('scroll', tipHide, true);
document.addEventListener('click', tipHide, true);

// ---------- Chargement des services + missions de la plage ----------
async function loadServices(start, end) {
    const url = `${window.GN_API}?from=${ymd(start)}&to=${ymd(end)}`;
    const r = await fetch(url);
    const data = await r.json();
    state.services = (data.services || []).map(s => ({
        ...s,
        debutD: parseDT(s.debut),
        finD:   parseDT(s.fin),
    }));
    state.missions = data.missions || [];
}

// Pour chaque mission, les jours de sa plage qui n'ont aucun service : permet
// d'afficher un repère "mission sans service ce jour" (ex: déploiement futur
// dont les horaires ne sont pas encore connus).
function missionGapDays() {
    const daysWithService = new Set();
    state.services.forEach(s => {
        let cur = new Date(s.debutD); cur.setHours(0,0,0,0);
        const last = new Date(s.finD); last.setHours(0,0,0,0);
        while (cur <= last) {
            daysWithService.add(s.mission_id + '|' + ymd(cur));
            cur.setDate(cur.getDate() + 1);
        }
    });
    const gaps = []; // { day: Date, mission }
    state.missions.forEach(m => {
        let cur = parseD(m.date_debut);
        const last = parseD(m.date_fin);
        while (cur <= last) {
            if (!daysWithService.has(m.id + '|' + ymd(cur))) {
                gaps.push({ day: new Date(cur), mission: m });
            }
            cur.setDate(cur.getDate() + 1);
        }
    });
    return gaps;
}

// ---------- Vue mois ----------
async function renderMonth() {
    const c     = state.cursor;
    const year  = c.getFullYear();
    const month = c.getMonth();
    document.getElementById('period-label').textContent = `${monthNames[month]} ${year}`;

    // Charger ±7 jours pour couvrir les chevauchements en bord de mois
    const fetchStart = new Date(year, month, 1);   fetchStart.setDate(fetchStart.getDate() - 7);
    const fetchEnd   = new Date(year, month + 1, 0); fetchEnd.setDate(fetchEnd.getDate() + 7);
    await loadServices(fetchStart, fetchEnd);
    const gaps = missionGapDays();

    // Premier lundi de la grille (peut être avant le 1er du mois)
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0
    const grid     = new Date(year, month, 1 - firstDow);

    const today = new Date();
    let html = '<div class="calendar-grid">';
    dayNames.forEach(n => html += `<div class="calendar-day-name">${n}</div>`);

    for (let i = 0; i < 42; i++) {
        const day     = new Date(grid); day.setDate(grid.getDate() + i);
        const isOther = day.getMonth() !== month;
        const isToday = sameDay(day, today);

        // Services couvrant ce jour
        const dayServices = state.services.filter(s => {
            const sd = new Date(s.debutD); sd.setHours(0,0,0,0);
            const sf = new Date(s.finD);   sf.setHours(0,0,0,0);
            const td = new Date(day);      td.setHours(0,0,0,0);
            return td >= sd && td <= sf;
        });
        const dayGaps = gaps.filter(g => sameDay(g.day, day));

        html += `<div class="calendar-cell${isOther?' other-month':''}${isToday?' today':''}" data-date="${ymd(day)}">`;
        html += `<div class="day-num">${day.getDate()}</div>`;
        html += `<div class="day-missions">`;
        dayServices.slice(0, 3).forEach(s => {
            const cross    = !sameDay(s.debutD, s.finD);
            const isFuture = s.debutD > new Date();
            html += `<div class="day-mission-pill${cross?' cross-day':''}" data-id="${s.id}"
                         style="${isFuture ? 'border:1.5px dashed currentColor;opacity:.75;' : ''}">
                         ${fmtTime(s.debutD)} ${esc(s.lieu_nom)}
                     </div>`;
        });
        dayGaps.slice(0, 2).forEach(g => {
            html += `<div class="day-mission-pill" data-mission-id="${g.mission.id}"
                         title="${esc(g.mission.lieu_nom)} · mission sans service ce jour"
                         style="border:1.5px dashed currentColor;opacity:.6;background:transparent;color:var(--gris-500)">
                         ${esc(g.mission.lieu_nom)}
                     </div>`;
        });
        const overflow = (dayServices.length - 3) + (dayGaps.length - 2);
        if (overflow > 0) html += `<div class="day-mission-pill" style="background:var(--gris-400)">+${overflow}</div>`;
        html += '</div></div>';
    }
    html += '</div>';

    document.getElementById('month-view').innerHTML = html;

    // Clic cellule → vue jour | clic pill service → modale | clic pill mission → page mission
    document.querySelectorAll('.calendar-cell').forEach(cell => {
        cell.addEventListener('click', e => {
            const pill = e.target.closest('.day-mission-pill');
            if (pill && pill.dataset.id)         { openServiceModal(pill.dataset.id); return; }
            if (pill && pill.dataset.missionId)  { location.href = `missions?action=edit&id=${pill.dataset.missionId}`; return; }
            const [y, mo, d] = cell.dataset.date.split('-');
            state.cursor = new Date(+y, +mo - 1, +d);
            switchView('day');
        });
    });
    // Survol d'une pastille de service → infobulle avec le contenu du service
    document.querySelectorAll('#month-view .day-mission-pill[data-id]').forEach(pill => {
        attachTip(pill, p => state.services.find(x => String(x.id) === p.dataset.id));
    });
}

// ---------- Vues année / personnalisée (plage de dates) ----------
// Aperçu compact : un mini-calendrier par mois couvrant [start, end], une
// pastille par jour actif dans cette plage (pas de détail — cliquer un jour
// ouvre la vue Jour, cliquer l'en-tête d'un mois ouvre la vue Mois). Pour la
// vue personnalisée, les jours hors de la plage exacte choisie par
// l'utilisateur (même à l'intérieur d'un mois affiché en partie) sont grisés
// et jamais actifs, même s'ils ont des services — on ne montre que ce qui a
// été explicitement demandé.
async function renderMultiMonth(start, end, label) {
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth    = new Date(end.getFullYear(), end.getMonth(), 1);
    const monthCount  = (endMonth.getFullYear() - startMonth.getFullYear()) * 12
                      + (endMonth.getMonth() - startMonth.getMonth()) + 1;
    const lastDay     = new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 0);

    document.getElementById('period-label').textContent = label;

    const fetchStart = new Date(startMonth); fetchStart.setDate(fetchStart.getDate() - 7);
    const fetchEnd    = new Date(lastDay);   fetchEnd.setDate(fetchEnd.getDate() + 7);
    await loadServices(fetchStart, fetchEnd);

    const rangeStart = new Date(start); rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd   = new Date(end);   rangeEnd.setHours(0, 0, 0, 0);

    // Jours ayant au moins un service (couverture, comme dans la vue Mois),
    // restreint à la plage demandée.
    const activeDays = new Set();
    state.services.forEach(s => {
        let cur = new Date(s.debutD); cur.setHours(0, 0, 0, 0);
        const last = new Date(s.finD); last.setHours(0, 0, 0, 0);
        while (cur <= last) {
            if (cur >= rangeStart && cur <= rangeEnd) activeDays.add(ymd(cur));
            cur.setDate(cur.getDate() + 1);
        }
    });

    const today = new Date();
    let html = '<div class="multi-month-grid">';
    for (let mi = 0; mi < monthCount; mi++) {
        // new Date() normalise automatiquement un mois hors [0,11] (ex: novembre + 3
        // → février de l'année suivante) — pas besoin d'arithmétique modulo manuelle.
        const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + mi, 1);
        const year  = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const firstDow = (monthDate.getDay() + 6) % 7;
        const grid     = new Date(year, month, 1 - firstDow);

        html += `<div class="mini-month">
            <div class="mini-month-head" data-year="${year}" data-month="${month}">${monthNamesShort[month]} ${year}</div>
            <div class="mini-month-grid">`;
        dayNamesShort.forEach(n => html += `<div class="mini-day-name">${n}</div>`);
        for (let i = 0; i < 42; i++) {
            const day = new Date(grid); day.setDate(grid.getDate() + i);
            if (i >= 35 && day.getMonth() !== month) break; // pas de 6e ligne si inutile
            const isOther = day.getMonth() !== month;
            const dayNorm = new Date(day); dayNorm.setHours(0, 0, 0, 0);
            const outOfRange = dayNorm < rangeStart || dayNorm > rangeEnd;
            const isToday = sameDay(day, today);
            const active  = activeDays.has(ymd(day));
            html += `<div class="mini-day${isOther?' other-month':''}${outOfRange?' out-of-range':''}${isToday?' today':''}${active?' has-activity':''}" data-date="${ymd(day)}">${day.getDate()}${active?'<span class="mini-day-dot"></span>':''}</div>`;
        }
        html += '</div></div>';
    }
    html += '</div>';
    document.getElementById('multi-month-view').innerHTML = html;

    document.querySelectorAll('.mini-day').forEach(cell => {
        cell.addEventListener('click', () => {
            const [y, mo, d] = cell.dataset.date.split('-');
            state.cursor = new Date(+y, +mo - 1, +d);
            switchView('day');
        });
    });
    // Survol d'un jour actif → infobulle listant tous les services de ce jour
    document.querySelectorAll('.mini-day.has-activity').forEach(cell => {
        attachTip(cell, c => {
            const [y, mo, d] = c.dataset.date.split('-');
            return new Date(+y, +mo - 1, +d);
        });
    });
    document.querySelectorAll('.mini-month-head').forEach(head => {
        head.addEventListener('click', () => {
            state.cursor = new Date(+head.dataset.year, +head.dataset.month, 1);
            switchView('month');
        });
    });
}

function renderYear() {
    const y = state.cursor.getFullYear();
    return renderMultiMonth(new Date(y, 0, 1), new Date(y, 11, 31), String(y));
}

function fmtDateFR(d) { return d.toLocaleDateString('fr-FR'); }

function renderCustom() {
    if (!state.customStart || !state.customEnd) return;
    return renderMultiMonth(
        state.customStart, state.customEnd,
        `${fmtDateFR(state.customStart)} – ${fmtDateFR(state.customEnd)}`
    );
}

// ---------- Vue jour ----------
async function renderDay() {
    const c         = state.cursor;
    const dateLabel = `${dayNames[(c.getDay() + 6) % 7]} ${c.getDate()} ${monthNames[c.getMonth()]} ${c.getFullYear()}`;
    document.getElementById('period-label').textContent = dateLabel;

    const before = new Date(c); before.setDate(before.getDate() - 1);
    const after  = new Date(c); after.setDate(after.getDate() + 1);
    await loadServices(before, after);
    const gaps = missionGapDays().filter(g => sameDay(g.day, c));

    let html = '<div class="day-view"><div class="hour-grid">';
    for (let h = 0; h < 24; h++) {
        html += `<div class="hour-label">${pad(h)}h</div><div class="hour-slot" data-h="${h}"></div>`;
    }
    html += '</div></div>';
    document.getElementById('day-view-container').innerHTML = html;

    const grid = document.querySelector('.hour-grid');
    if (grid) grid.style.position = 'relative';

    const dayStart = new Date(c); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(c); dayEnd.setHours(24, 0, 0, 0);
    const slotH    = 38; // hauteur d'un créneau en px (voir CSS .hour-slot)

    state.services.forEach(s => {
        const startInDay = s.debutD < dayStart ? dayStart : s.debutD;
        const endInDay   = s.finD   > dayEnd   ? dayEnd   : s.finD;
        if (endInDay <= dayStart || startInDay >= dayEnd) return;

        const startMin = (startInDay - dayStart) / 60000;
        const endMin   = (endInDay   - dayStart) / 60000;
        const duration = endMin - startMin;

        const div = document.createElement('div');
        div.className    = 'hour-mission';
        div.style.top    = (startMin / 60 * slotH) + 'px';
        div.style.height = Math.max(duration / 60 * slotH - 2, 24) + 'px';
        div.style.left   = '76px';
        div.style.right  = '8px';
        div.dataset.id   = s.id;

        const cross    = !sameDay(s.debutD, s.finD);
        const isFuture = s.debutD > new Date();
        if (isFuture) { div.style.borderStyle = 'dashed'; div.style.opacity = '0.75'; }
        div.textContent = `${fmtTime(s.debutD)}–${fmtTime(s.finD)}${cross ? ' (sur 2 jours)' : ''} · ${s.lieu_nom} (${typeLabel(s)})`;
        div.addEventListener('click', () => openServiceModal(s.id));
        attachTip(div, () => s);
        if (grid) grid.appendChild(div);
    });

    if (gaps.length) {
        const banner = document.createElement('div');
        banner.style.cssText = 'margin-top:12px;padding:10px 14px;background:var(--gris-50);border:1px dashed var(--gris-300);border-radius:8px;font-size:13px;color:var(--gris-600)';
        banner.innerHTML = gaps.map(g =>
            `Mission sans service ce jour : <a href="missions?action=edit&id=${g.mission.id}">${esc(g.mission.lieu_nom)}</a>`
        ).join('<br>');
        document.getElementById('day-view-container').appendChild(banner);
    }
}

// ---------- Modale détail service ----------
async function openServiceModal(id) {
    const r = await fetch(`${window.GN_API}?id=${id}`);
    const s = await r.json();
    if (!s || !s.id) return;

    const d   = parseDT(s.debut);
    const f   = parseDT(s.fin);
    const dur   = (f - d) / 60000;
    const dh    = Math.floor(dur / 60);
    const dm    = dur % 60;

    document.getElementById('mission-modal-body').innerHTML = `
        <p style="margin-bottom:8px"><strong>Unité :</strong> ${esc(s.lieu_nom)} <span class="badge badge-bleu">${esc(s.lieu_type)}</span></p>
        <p style="margin-bottom:8px"><strong>Département :</strong> ${esc(s.dept_code)} — ${esc(s.dept_nom)}</p>
        <p style="margin-bottom:8px"><strong>Type :</strong> <span class="badge" style="background:${esc(s.type_couleur||'#16a34a')};color:#fff">${esc(typeLabel(s))}</span></p>
        <p style="margin-bottom:8px"><strong>Début :</strong> ${d.toLocaleDateString('fr-FR')} à ${fmtTime(d)}</p>
        <p style="margin-bottom:8px"><strong>Fin :</strong> ${f.toLocaleDateString('fr-FR')} à ${fmtTime(f)}</p>
        <p style="margin-bottom:12px"><strong>Durée :</strong> ${dh}h${dm ? String(dm).padStart(2,'0') : ''}</p>
        <p style="margin-bottom:4px"><strong>Contenu :</strong></p>
        <p style="white-space:pre-wrap;background:var(--gris-50);padding:12px;border-radius:8px;font-size:14px">${s.contenu ? esc(s.contenu.trim()) : '<em>Aucun contenu renseigné</em>'}</p>
    `;
    document.getElementById('modal-edit-link').href = `missions?action=edit&id=${s.mission_id}#service-${s.id}`;
    document.getElementById('mission-modal').classList.add('open');
}

// ---------- Navigation ----------
function switchView(view) {
    state.view = view;
    document.getElementById('month-view').style.display          = view === 'month' ? 'block' : 'none';
    document.getElementById('day-view-container').style.display  = view === 'day'   ? 'block' : 'none';
    document.getElementById('multi-month-view').style.display    = (view === 'year' || view === 'custom') ? 'block' : 'none';
    document.getElementById('custom-range-picker').style.display = view === 'custom' ? 'flex' : 'none';
    document.getElementById('view-month').classList.toggle('btn-primary',  view === 'month');
    document.getElementById('view-day').classList.toggle('btn-primary',   view === 'day');
    document.getElementById('view-year').classList.toggle('btn-primary',  view === 'year');
    document.getElementById('view-custom').classList.toggle('btn-primary', view === 'custom');
    // Une plage personnalisée n'a de sens que si l'utilisateur a choisi ses deux
    // dates — tant que ce n'est pas fait, on affiche juste le sélecteur, rien à
    // charger (render() serait un no-op de toute façon, renderCustom() le gère).
    render();
}
// Easter eggs (juillet 2026, suite) — vérifiés à chaque render() plutôt que sur
// chaque évènement individuel, plus simple et couvre tous les chemins qui
// modifient state.cursor/customStart/customEnd (navigation, "Aujourd'hui",
// application de la plage personnalisée...).
function gnCheckCalendarEggs() {
    if (state.customStart && state.customEnd) {
        const days = (state.customEnd - state.customStart) / 86400000;
        if (days > 365 && window.gnUnlockEgg) {
            gnUnlockEgg('grande_plage', '🔭 Plus d\'un an dans la vue personnalisée — vue sur le long terme !', 3500);
        }
    }
    if (state.view === 'day') {
        const tenYearsAhead = new Date();
        tenYearsAhead.setFullYear(tenYearsAhead.getFullYear() + 10);
        if (state.cursor > tenYearsAhead && window.gnUnlockEgg) {
            gnUnlockEgg('voyage_futur', '🚀 Plus de 10 ans dans le futur — voyage temporel réussi !', 3500);
        }
    }
}

function render() {
    gnCheckCalendarEggs();
    if      (state.view === 'month')  renderMonth();
    else if (state.view === 'year')   renderYear();
    else if (state.view === 'custom') renderCustom();
    else                               renderDay();
}

document.getElementById('prev-period').addEventListener('click', () => {
    if (state.view === 'month') {
        state.cursor.setMonth(state.cursor.getMonth() - 1);
    } else if (state.view === 'year') {
        state.cursor.setFullYear(state.cursor.getFullYear() - 1);
    } else if (state.view === 'custom' && state.customStart && state.customEnd) {
        // Décale la plage vers l'arrière, en conservant sa durée exacte.
        const durationMs = state.customEnd - state.customStart;
        const newEnd   = new Date(state.customStart); newEnd.setDate(newEnd.getDate() - 1);
        const newStart = new Date(newEnd.getTime() - durationMs);
        state.customStart = newStart; state.customEnd = newEnd;
        document.getElementById('custom-start').value = ymd(newStart);
        document.getElementById('custom-end').value   = ymd(newEnd);
    } else {
        state.cursor.setDate(state.cursor.getDate() - 1);
    }
    render();
});
document.getElementById('next-period').addEventListener('click', () => {
    if (state.view === 'month') {
        state.cursor.setMonth(state.cursor.getMonth() + 1);
    } else if (state.view === 'year') {
        state.cursor.setFullYear(state.cursor.getFullYear() + 1);
    } else if (state.view === 'custom' && state.customStart && state.customEnd) {
        const durationMs = state.customEnd - state.customStart;
        const newStart = new Date(state.customEnd); newStart.setDate(newStart.getDate() + 1);
        const newEnd   = new Date(newStart.getTime() + durationMs);
        state.customStart = newStart; state.customEnd = newEnd;
        document.getElementById('custom-start').value = ymd(newStart);
        document.getElementById('custom-end').value   = ymd(newEnd);
    } else {
        state.cursor.setDate(state.cursor.getDate() + 1);
    }
    render();
});
document.getElementById('today-btn').addEventListener('click', () => {
    if (state.view === 'custom') return; // pas de "aujourd'hui" pertinent pour une plage choisie
    state.cursor = new Date();
    render();
});
document.getElementById('view-month').addEventListener('click',  () => switchView('month'));
document.getElementById('view-day').addEventListener('click',    () => switchView('day'));
document.getElementById('view-year').addEventListener('click',   () => switchView('year'));
document.getElementById('view-custom').addEventListener('click', () => switchView('custom'));

document.getElementById('custom-apply').addEventListener('click', () => {
    const errEl   = document.getElementById('custom-error');
    const startV  = document.getElementById('custom-start').value;
    const endV    = document.getElementById('custom-end').value;
    errEl.textContent = '';
    if (!startV || !endV) { errEl.textContent = 'Choisis les deux dates.'; return; }
    const start = parseD(startV), end = parseD(endV);
    if (end < start) { errEl.textContent = 'La date de fin doit être après la date de début.'; return; }
    state.customStart = start;
    state.customEnd   = end;
    render();
});

// Fermer la modale en cliquant sur le fond
document.getElementById('mission-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

switchView(window.GN_DEFAULT_VIEW || 'month');
