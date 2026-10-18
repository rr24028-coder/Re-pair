'use strict';

// ---------- Rutas ----------
// app.js vive en /scripts, así que la raíz del proyecto es la carpeta superior.
// Con esto las redirecciones funcionan igual desde /vistas/publicas y /vistas/privadas.
const ROOT = new URL('../', import.meta.url);
const RUTAS = {
    index: 'index.html',
    login: 'vistas/publicas/ingresar.html',
    panel: 'vistas/privadas/panel.html',
    equipos: 'vistas/privadas/equipos.html',
    ordenes: 'vistas/privadas/ordenes.html',
    diagnostico: 'vistas/privadas/diagnostico.html'
};

const irA = ruta => { location.href = new URL(RUTAS[ruta], ROOT).href; };

const ICONS = {
    "laptop": "<path d=\"M5 17V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12M2 17h20l-1 3H3l-1-3Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\" fill=\"none\"/>",
    "cpu": "<rect x=\"5\" y=\"5\" width=\"14\" height=\"14\" rx=\"2\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/><rect x=\"9\" y=\"9\" width=\"6\" height=\"6\" rx=\"1\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/><path d=\"M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/>",
    "hard-drive": "<path d=\"M5 4h14l3 10v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5L5 4Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/><path d=\"M2 14h20m-16 3h.01M10 17h.01\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/>",
    "wrench": "<path d=\"M14.5 6.5a5 5 0 0 0-6.7 6.7L3 18a2.1 2.1 0 0 0 3 3l4.8-4.8a5 5 0 0 0 6.7-6.7L14 13l-3-3 3.5-3.5Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/>",
    "file-text": "<path d=\"M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8l-6-6Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/><path d=\"M14 2v6h6M8 13h8m-8 4h6\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" fill=\"none\"/>",
    "receipt": "<path d=\"M4 3l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1v19l-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1V3Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/><path d=\"M8 7h8m-8 5h8m-8 5h4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" fill=\"none\"/>",
    "dollar-sign": "<path d=\"M12 2v20m5-16H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" fill=\"none\"/>",
    "user-check": "<circle cx=\"9\" cy=\"7\" r=\"4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/><path d=\"M2 21v-2a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v2m1-12 2 2 4-4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/>",
    "bar-chart-3": "<path d=\"M3 3v18h18M7 17v-5m5 5V7m5 10v-8\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" fill=\"none\"/>",
    "close": "<path d=\"m6 6 12 12M18 6 6 18\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" fill=\"none\"/>"
};

const $ = s => document.querySelector(s) || Object.assign(document.createElement('div'), {value: ''});
// Devuelve un arreglo real (no NodeList) para poder usar indexOf, forEach, etc.
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = n => `<svg class="icon" aria-hidden="true"><use href="#${n}"/></svg>`;
const money = n => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(n);
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;

const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const writeStore = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} };

let equipment = [];
let currentUser = null;

// Técnico al que se le asignan automáticamente todos los equipos y órdenes.
// Para cambiarlo, basta con editar este correo (debe ser una cuenta con rol "tecnico").
const TECNICO_PREDETERMINADO = 'prueba01@ues.edu.sv';

// Escuchas en tiempo real (onSnapshot). Se guarda la función para cancelar
// la escucha anterior si se vuelve a llamar, así nunca hay dos activas.
let unsubEquipos = null;
let unsubServicios = null;

function fetchEquipos(uid) {
    if (!uid) return;
    if (unsubEquipos) unsubEquipos();
    // Solo los equipos cuyo 'uid' coincide con el usuario actual
    const q = window.query(window.collection(window.db, "equipos"), window.where("uid", "==", uid));
    unsubEquipos = window.onSnapshot(q, (querySnapshot) => {
        equipment = [];
        querySnapshot.forEach((documento) => {
            equipment.push({ id: documento.id, ...documento.data() });
        });
        renderEquipment();
    }, (error) => {
        console.error("Error al escuchar equipos:", error);
    });
}

let services = [];

function fetchServicios() {
    if (unsubServicios) unsubServicios();
    unsubServicios = window.onSnapshot(window.collection(window.db, "servicios"), (querySnapshot) => {
        services = [];
        querySnapshot.forEach((documento) => {
            services.push({ id: documento.id, ...documento.data() });
        });
        renderServices();
    }, (error) => {
        console.error("Error al escuchar servicios:", error);
    });
}

let invoice = readStore('repear-invoice', []);
let finalized = readStore('repear-finalized', null);
const savedDraft = readStore('repear-draft', null);

const defs = $('#icon-defs');
if (defs.id) Object.entries(ICONS).forEach(([k, v]) => { if (!document.getElementById(k)) defs.insertAdjacentHTML('beforeend', `<symbol id="${k}" viewBox="0 0 24 24">${v}</symbol>`); });

document.body.insertAdjacentHTML('beforeend', `
    <div class="toast" id="toast" role="status" aria-live="polite" hidden style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--surface);padding:12px 24px;border-radius:999px;z-index:100;font-size:13px;font-weight:600;box-shadow:0 8px 30px #0002;"></div>
    <dialog id="equipment-dialog" style="border:1px solid var(--border);border-radius:28px;background:var(--surface);color:var(--ink);padding:0;width:min(570px, calc(100% - 28px));box-shadow:0 30px 90px #06241655;">
        <div style="padding:24px 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);">
            <h2 id="equipment-dialog-title" style="font-size:22px;margin:0;">Registrar computador</h2>
        </div>
        <form id="equipment-form" novalidate style="padding:28px;">
            <input type="hidden" id="equipment-id">
            <div style="display:grid;gap:17px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;">
                    <div>
                        <label for="equipment-type" style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Tipo</label>
                        <select id="equipment-type" aria-describedby="equipment-type-error" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;"><option>Laptop</option><option>Desktop</option></select>
                        <p class="field-error" id="equipment-type-error" aria-live="polite" hidden style="margin-top:6px;font-size:12.5px;color:var(--peach-ink);"></p>
                    </div>
                    <div>
                        <label for="equipment-alias" style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Alias</label>
                        <input id="equipment-alias" required maxlength="40" autocomplete="off" placeholder="Ej.: Laptop de trabajo" aria-describedby="equipment-alias-error" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;">
                        <p class="field-error" id="equipment-alias-error" aria-live="polite" hidden style="margin-top:6px;font-size:12.5px;color:var(--peach-ink);"></p>
                    </div>
                </div>
                <div>
                        <label for="equipment-model" style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Marca y modelo</label>
                        <input id="equipment-model" required maxlength="60" autocomplete="off" placeholder="Ej.: Lenovo ThinkPad T14" aria-describedby="equipment-model-error" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;">
                        <p class="field-error" id="equipment-model-error" aria-live="polite" hidden style="margin-top:6px;font-size:12.5px;color:var(--peach-ink);"></p>
                    </div>
                <div>
                        <label for="equipment-serial" style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Número de serie</label>
                        <input id="equipment-serial" class="mono" required maxlength="30" autocomplete="off" placeholder="Ej.: C02G123456" aria-describedby="equipment-serial-error" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;">
                        <p class="field-error" id="equipment-serial-error" aria-live="polite" hidden style="margin-top:6px;font-size:12.5px;color:var(--peach-ink);"></p>
                    </div>
                <div>
                        <label for="equipment-specs" style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Especificaciones</label>
                        <input id="equipment-specs" required maxlength="120" autocomplete="off" placeholder="Ej.: Ryzen 7 · 32 GB RAM · SSD 1 TB" aria-describedby="equipment-specs-error" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;">
                        <p class="field-error" id="equipment-specs-error" aria-live="polite" hidden style="margin-top:6px;font-size:12.5px;color:var(--peach-ink);"></p>
                    </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:24px;">
                <button type="button" class="btn outline" data-close="equipment-dialog" style="background-color:#ddd;color:#333;">Cancelar</button>
                <button class="btn primary" id="equipment-save">Guardar equipo</button>
            </div>
        </form>
    </dialog>
    <dialog id="service-dialog" style="border:1px solid var(--border);border-radius:28px;background:var(--surface);color:var(--ink);padding:0;width:min(480px, calc(100% - 28px));box-shadow:0 30px 90px #06241655;">
        <div style="padding:24px 28px;border-bottom:1px solid var(--border);">
            <h2 style="font-size:22px;margin:0;">Nuevo servicio</h2>
        </div>
        <form id="service-form" style="padding:28px;">
            <div style="display:grid;gap:17px;">
                <div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;" for="service-name">Nombre del servicio</label><input id="service-name" required style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;"></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;" for="service-cost">Costo real ($)</label><input id="service-cost" type="number" min="0" step="0.01" required style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;"></div>
                    <div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;" for="service-markup">Recargo (%)</label><input id="service-markup" type="number" min="0" max="10000" step="0.01" value="100" required style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;"></div>
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:24px;">
                <button type="button" class="btn outline" data-close="service-dialog" style="background-color:#ddd;color:#333;">Cancelar</button>
                <button class="btn primary">Guardar servicio</button>
            </div>
        </form>
    </dialog>
`);

function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.hidden = true, 4000);
}

function badge(s) {
    return `<span class="badge ${s === 'Listo para entrega' ? 'ready' : s === 'Registrado' ? 'neutral' : ''}"><span class="dot"></span>${esc(s)}</span>`;
}

function renderEquipment() {
    const count = String(equipment.length).padStart(2, '0');
    if ($('#equipment-count').textContent) $('#equipment-count').textContent = count;
    if ($('#home-equipment-count').textContent) $('#home-equipment-count').textContent = count;

    if ($('#home-equipment').classList) {
        $('#home-equipment').innerHTML = equipment.slice(0, 3).map(e => 
            `<article class="panel equipment-card" style="padding:0;overflow:hidden;border-radius:24px;">
                <div style="position:relative;height:176px;padding:16px;display:flex;justify-content:space-between;background:var(--${e.type === 'Laptop' ? 'lime' : 'peach'}-soft);">
                    <div style="position:absolute;inset:0;margin:auto;width:88px;height:88px;border-radius:30px;background:var(--surface);color:var(--accent);box-shadow:0 18px 30px -16px #06241666;display:grid;place-items:center;">
                        <svg class="icon" style="width:40px;height:40px;"><use href="#${e.type === 'Laptop' ? 'laptop' : 'cpu'}"/></svg>
                    </div>
                    <div style="position:relative;z-index:2;margin-left:auto;">${badge(e.status)}</div>
                </div>
                <div style="margin:22px 24px 0;">
                    <h3 style="font-family:var(--head);font-size:19px;margin-bottom:4px;">${esc(e.model)}</h3>
                    <span class="mono muted">SN: ${esc(e.serial)}</span>
                </div>
                <div style="margin:18px 24px 0;font-size:12.5px;color:var(--muted);">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Especialista</span><span style="color:var(--ink);">${esc(e.specialist)}</span></div>
                </div>
                <a class="btn" href="equipos.html#mis-ordenes" style="margin:22px 24px 24px;border:none;background:var(--hover);color:var(--accent);width:calc(100% - 48px);text-align:center;">Ver mis órdenes</a>
            </article>`
        ).join('') || '<div style="padding:40px;text-align:center;color:var(--muted);">Aún no hay equipos registrados.</div>';
    }

    const searchInput = $('#equipment-search');
    if (searchInput.value !== undefined) {
        const q = searchInput.value.trim().toLowerCase();
        const matches = equipment.filter(e => [e.alias, e.model, e.serial, e.specs].join(' ').toLowerCase().includes(q));
        $('#filtered-count').textContent = `${matches.length} equipos`;
        $('#equipment-body').innerHTML = matches.map(e => 
            `<tr>
                <td><strong>${esc(e.alias)}</strong><small>${esc(e.model)} · <span class="mono">${esc(e.serial)}</span></small></td>
                <td>${esc(e.type)}</td>
                <td>${esc(e.specs)}</td>
                <td><button class="btn ghost small">Ver</button> <button class="btn small" style="background-color:#f0f0f0;color:#000;" data-edit="${esc(e.id)}">Editar</button></td>
            </tr>`
        ).join('') || '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--muted);">No se encontraron equipos.</td></tr>';
    }
}

// Buscador: filtra en memoria sobre `equipment` (ya descargado con onSnapshot),
// sin consultar a Firebase. renderEquipment() lee el texto de #equipment-search.
const equipmentSearch = document.getElementById('equipment-search');
if (equipmentSearch) equipmentSearch.addEventListener('input', renderEquipment);

function servicePrice(s) { return round(s.cost * (1 + s.markup / 100)); }

function renderServices() {
    // Tabla del catálogo (finanzas.html)
    if ($('#services-body').classList) {
        $('#services-body').innerHTML = services.map(s =>
            `<tr>
                <td><strong>${esc(s.name)}</strong></td>
                <td><input type="number" min="0" step="0.01" value="${esc(s.cost)}" aria-label="Costo" data-service="${esc(s.id)}" data-field="cost"></td>
                <td><input type="number" min="0" max="10000" step="0.01" value="${esc(s.markup)}" aria-label="Recargo" data-service="${esc(s.id)}" data-field="markup"></td>
                <td class="mono">${money(servicePrice(s))}</td>
            </tr>`
        ).join('') || '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--muted);">Aún no hay servicios. Usa «Nuevo servicio» para crear el primero.</td></tr>';
    }

    if ($('#invoice-service').options) {
        $('#invoice-service').innerHTML = services.map(s => `<option value="${esc(s.id)}">${esc(s.name)} — ${money(servicePrice(s))}</option>`).join('')
            || '<option value="">No hay servicios en el catálogo</option>';
    }
}

// ---------- Validación del formulario de equipos ----------
const EQUIPMENT_TYPES = ['Laptop', 'Desktop'];
const EQUIPMENT_FIELDS = {
    alias:  { id: 'equipment-alias',  what: 'un alias',             min: 2, max: 40 },
    model:  { id: 'equipment-model',  what: 'la marca y el modelo', min: 2, max: 60 },
    serial: { id: 'equipment-serial', what: 'el número de serie',   min: 4, max: 30,
              pattern: /^[A-Za-z0-9][A-Za-z0-9\-_./]*$/,
              patternMsg: 'Usa solo letras, números y los símbolos - _ . / (sin espacios).' },
    specs:  { id: 'equipment-specs',  what: 'las especificaciones', min: 3, max: 120 }
};
const EQUIPMENT_FIELD_IDS = ['equipment-type', ...Object.values(EQUIPMENT_FIELDS).map(r => r.id)];

// Muestra (o quita, con mensaje vacío) el aviso de error de un campo.
function showFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(inputId + '-error');
    if (!input || !err) return;
    err.textContent = message || '';
    err.hidden = !message;
    if (message) {
        input.setAttribute('aria-invalid', 'true');
        input.style.borderColor = 'var(--peach-ink)';
    } else {
        input.removeAttribute('aria-invalid');
        input.style.borderColor = 'var(--border)';
    }
}

function readEquipmentForm() {
    const clean = v => v.replace(/\s+/g, ' ').trim();
    return {
        type: $('#equipment-type').value,
        alias: clean($('#equipment-alias').value),
        model: clean($('#equipment-model').value),
        serial: $('#equipment-serial').value.trim(),
        specs: clean($('#equipment-specs').value)
    };
}

// Devuelve { idDelCampo: 'mensaje' } solo con los campos que fallan.
function validateEquipment(data, id) {
    const errors = {};
    if (!EQUIPMENT_TYPES.includes(data.type)) errors['equipment-type'] = 'Elige Laptop o Desktop.';

    for (const [key, r] of Object.entries(EQUIPMENT_FIELDS)) {
        const value = data[key];
        if (!value) errors[r.id] = `Escribe ${r.what}.`;
        else if (value.length < r.min) errors[r.id] = `Escribe al menos ${r.min} caracteres.`;
        else if (value.length > r.max) errors[r.id] = `Usa ${r.max} caracteres como máximo.`;
        else if (r.pattern && !r.pattern.test(value)) errors[r.id] = r.patternMsg;
    }

    // Serie repetida entre los equipos del usuario (sin distinguir mayúsculas)
    if (!errors['equipment-serial'] &&
        equipment.some(e => String(e.serial ?? '').toLowerCase() === data.serial.toLowerCase() && e.id !== id)) {
        errors['equipment-serial'] = 'Ya registraste un equipo con ese número de serie.';
    }
    return errors;
}

function openEquipment(id) {
    const e = equipment.find(eq => eq.id === id);
    $('#equipment-form').reset();
    EQUIPMENT_FIELD_IDS.forEach(f => showFieldError(f, ''));
    $('#equipment-id').value = e?.id || '';
    $('#equipment-dialog-title').textContent = e ? 'Editar computador' : 'Registrar computador';
    if (e) {
        $('#equipment-type').value = e.type;
        $('#equipment-alias').value = e.alias;
        $('#equipment-model').value = e.model;
        $('#equipment-serial').value = e.serial;
        $('#equipment-specs').value = e.specs;
    }
    $('#equipment-dialog').showModal();
}

document.addEventListener('click', ev => {
    const target = ev.target.closest('button, [data-action], [data-edit]');
    if (!target) return;
    if (target.dataset.close) $('#' + target.dataset.close).close();
    if (target.dataset.action === 'new-equipment') openEquipment();
    if (target.id === 'new-service' || target.closest('#new-service')) {
        $('#service-form').reset();
        $('#service-dialog').showModal();
    }
    if (target.dataset.edit) openEquipment(target.dataset.edit);
    if (target.id === 'print-invoice') window.print();
    if (target.id === 'logout-btn' || target.closest('#logout-btn')) {
        loggingOut = true; // evita que el observador de sesión mande al login
        window.signOut(window.auth).then(() => irA('index'));
    }
});

// Al escribir o cambiar un campo se quita su aviso de error.
['input', 'change'].forEach(evt => {
    $('#equipment-form').addEventListener(evt, ev => {
        if (EQUIPMENT_FIELD_IDS.includes(ev.target.id)) showFieldError(ev.target.id, '');
    });
});

$('#equipment-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const id = $('#equipment-id').value;
    const data = readEquipmentForm();

    const errors = validateEquipment(data, id);
    EQUIPMENT_FIELD_IDS.forEach(f => showFieldError(f, errors[f]));
    const firstInvalid = EQUIPMENT_FIELD_IDS.find(f => errors[f]);
    if (firstInvalid) {
        document.getElementById(firstInvalid).focus();
        return;
    }
    if (!currentUser) {
        toast('Tu sesión no está activa. Vuelve a ingresar.');
        return;
    }

    const payload = { uid: currentUser.uid, ...data }; // uid asocia el equipo al usuario logueado

    // Se desactiva el botón mientras guarda para no crear el equipo dos veces.
    const saveBtn = $('#equipment-save');
    saveBtn.disabled = true;
    try {
        if (id) {
            const equipoRef = window.doc(window.db, "equipos", id);
            await window.updateDoc(equipoRef, payload);
            toast('Equipo actualizado en la nube.');
        } else {
            payload.status = 'Registrado';
            payload.specialist = TECNICO_PREDETERMINADO;
            payload.service = 'Sin historial';
            await window.addDoc(window.collection(window.db, "equipos"), payload);
            toast('Equipo registrado con éxito en la nube.');
        }
        $('#equipment-dialog').close();
        // onSnapshot actualiza la lista solo; no hace falta volver a pedir los datos.
    } catch (error) {
        console.error("Error al guardar:", error);
        toast('Error al conectar con la base de datos.');
    } finally {
        saveBtn.disabled = false;
    }
});

if ($('#tabs').classList) {
    const TABS = [
        {
            t: 'Un especialista revisa cada componente', 
            p: 'Pruebas de estrés, temperatura y estabilidad. Cada observación queda en un reporte que podés leer cuando quieras.', 
            ic: 'cpu',
            v: `<div class="tp-row"><span>Temp. CPU (Estrés)</span><b class="mono" style="color: #e63946;">95 °C</b></div>
                <div class="tp-row"><span>Pasta térmica</span><b class="mono">Degradada</b></div>`
        },
        {
            t: 'Limpieza interna y pasta térmica nueva', 
            p: 'Retiramos el polvo de ventiladores y disipador, y renovamos la pasta térmica para que el equipo vuelva a rendir.', 
            ic: 'wrench',
            v: `<div class="tp-row"><span>Limpieza ventiladores</span><b class="mono" style="color: var(--lime);">Completado</b></div>
                <div class="tp-row"><span>Temp. post-mantenimiento</span><b class="mono" style="color: var(--lime);">58 °C</b></div>`
        },
        {
            t: 'Cada dólar, con su detalle', 
            p: 'El precio sale del costo del servicio más un recargo. Sin cargos escondidos.', 
            ic: 'dollar-sign',
            v: `<div class="tp-row"><span>Limpieza profunda</span><b class="mono">$35.00</b></div>
                <div class="tp-row"><span>Diagnóstico</span><b class="mono">$20.00</b></div>
                <div class="tp-row" style="border-top: 1px dashed var(--border); margin-top: 5px; padding-top: 5px;"><span>Total</span><b class="mono">$55.00</b></div>`
        }
    ];

    $('#tabs').addEventListener('click', e => { const btns = $$('.tab');
        const target = e.target.closest('.tab');
        if (!target) return;
        const i = btns.indexOf(target);
        btns.forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
        const p = $('#tab-panel');
        p.className = 'tp t' + i;
        
        // Inyectamos la tarjeta específica de cada tab
        p.innerHTML = `<div class="tp-copy"><h3>${TABS[i].t}</h3><p>${TABS[i].p}</p></div><div class="tp-visual"><div class="tp-card"><div class="tp-ic">${icon(TABS[i].ic)}</div>${TABS[i].v}</div></div>`;
    });
}

const flashMsg = sessionStorage.getItem('repear-flash');
if (flashMsg) {
    sessionStorage.removeItem('repear-flash');
    setTimeout(() => toast(flashMsg), 300);
}

// ---------- Solo correos institucionales ----------
const MENSAJE_DOMINIO = 'Usa tu correo institucional, que termina en @ues.edu.sv.';
const esCorreoPermitido = email => /^[^\s@]+@ues\.edu\.sv$/i.test(String(email ?? '').trim());

// Marca el campo como inválido mientras el correo no sea @ues.edu.sv;
// el navegador muestra el mensaje al enviar el formulario.
function exigirCorreoInstitucional(input) {
    if (!input) return;
    const revisar = () => input.setCustomValidity(!input.value || esCorreoPermitido(input.value) ? '' : MENSAJE_DOMINIO);
    input.addEventListener('input', revisar);
    revisar();
}
exigirCorreoInstitucional(document.getElementById('login-email'));
exigirCorreoInstitucional(document.getElementById('register-email'));

// Formularios de Autenticación Reales
const loginForm = $('#login-form');
if (loginForm.addEventListener) {
    loginForm.addEventListener('submit', async ev => {
        ev.preventDefault();
        const email = $('#login-email').value.trim().toLowerCase();
        if (!esCorreoPermitido(email)) { toast(MENSAJE_DOMINIO); return; }
        const password = $('#login-password').value;
        try {
            await window.signInWithEmailAndPassword(window.auth, email, password);
            // Si el login es correcto, el observador (abajo) lo mandará a panel.html
        } catch (error) {
            toast('Error: Credenciales incorrectas.');
        }
    });
}

// Toda cuenta nueva se guarda como "cliente".
// Las cuentas de técnico se crean directamente en Firebase:
// colección "usuarios", documento con el uid, campo rol: "tecnico".
let registering = false;
let loggingOut = false;
const registerForm = $('#register-form');
if (registerForm.addEventListener) {
    registerForm.addEventListener('submit', async ev => {
        ev.preventDefault();
        const email = $('#register-email').value.trim().toLowerCase();
        if (!esCorreoPermitido(email)) { toast(MENSAJE_DOMINIO); return; }
        const password = $('#register-password').value;

        // El observador de sesión se salta la redirección mientras se guarda el rol.
        registering = true;
        let user;
        try {
            const credential = await window.createUserWithEmailAndPassword(window.auth, email, password);
            user = credential.user;
        } catch (error) {
            registering = false;
            toast('Error al crear cuenta. Verifica tus datos o usa otro correo.');
            return;
        }

        try {
            await window.setDoc(window.doc(window.db, "usuarios", user.uid), {
                email: email,
                rol: 'cliente'
            });
        } catch (error) {
            // Sin documento de rol, la cuenta se trata como cliente.
            console.error("No se pudo guardar el perfil:", error);
        }
        irA('panel');
    });
}

// ---------- Órdenes de servicio ----------
// Colección "ordenes". Cada documento:
// { numero, clienteEmail, equipo, status, especialista, diagnostico, pruebas,
//   items: [{ serviceId, name, cost, markup, price, qty }], total, finalizada, creada }
// El precio de cada línea se guarda al añadirla: si luego cambia el catálogo, la factura no cambia.
let ordenes = [];
let unsubOrdenes = null;
let ordenActual = null; // orden abierta en diagnostico.html
const ordenIdURL = new URLSearchParams(location.search).get('orden');

const totalItems = items => round(items.reduce((t, i) => t + i.price * i.qty, 0));

// Número basado en la hora: el cliente no puede leer todas las órdenes,
// así que no se puede contar con un consecutivo. Es único en la práctica.
function siguienteNumeroOrden() {
    const d = new Date();
    return `ORD-${d.getFullYear()}-${String(Date.now()).slice(-6)}`;
}

function estadoOrden(o) {
    return `<span class="badge ${o.finalizada ? 'ready' : 'neutral'}"><span class="dot"></span>${esc(o.status || 'Registrado')}</span>`;
}

function fetchOrdenes() {
    if (unsubOrdenes) unsubOrdenes();
    unsubOrdenes = window.onSnapshot(window.collection(window.db, "ordenes"), snap => {
        ordenes = [];
        snap.forEach(d => ordenes.push({ id: d.id, ...d.data() }));
        renderOrdenes();
    }, error => {
        console.error("Error al escuchar órdenes:", error);
        const body = document.getElementById('orders-body');
        if (body) body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted);">No se pudieron cargar las órdenes.</td></tr>';
    });
}

function renderOrdenes() {
    const body = document.getElementById('orders-body');
    if (!body) return;
    // El técnico ve sus órdenes (y las que aún no tienen técnico asignado).
    const miCorreo = String(currentUser?.email || '').toLowerCase();
    const lista = ordenes
        .filter(o => !o.especialista || o.especialista === 'Sin asignar' || String(o.especialista).toLowerCase() === miCorreo)
        .sort((a, b) => (b.creada || 0) - (a.creada || 0));
    body.innerHTML = lista.map(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        const principal = items.length ? items[0].name + (items.length > 1 ? ` +${items.length - 1}` : '') : 'Sin servicios aún';
        return `<tr>
            <td class="mono">#${esc(o.numero)}</td>
            <td>${esc(o.clienteEmail)}</td>
            <td>${esc(o.equipo)}${o.problema ? `<small style="display:block;color:var(--muted);max-width:260px;">${esc(String(o.problema).slice(0, 90))}${String(o.problema).length > 90 ? '…' : ''}</small>` : ''}</td>
            <td>${esc(principal)}</td>
            <td>${estadoOrden(o)}</td>
            <td><a class="btn small" style="background-color:#f0f0f0;color:#000;" href="diagnostico.html?orden=${encodeURIComponent(o.id)}">Reporte y factura</a></td>
        </tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted);">Aún no hay órdenes. Usa «Nueva orden» para crear la primera.</td></tr>';
}

// --- Órdenes del cliente (equipos.html) ---
let ordenesCliente = [];
let unsubOrdenesCliente = null;

function fetchOrdenesCliente(uid) {
    if (!uid) return;
    if (unsubOrdenesCliente) unsubOrdenesCliente();
    const q = window.query(window.collection(window.db, "ordenes"), window.where("clienteUid", "==", uid));
    unsubOrdenesCliente = window.onSnapshot(q, snap => {
        ordenesCliente = [];
        snap.forEach(d => ordenesCliente.push({ id: d.id, ...d.data() }));
        renderOrdenesCliente();
    }, error => {
        console.error("Error al escuchar tus órdenes:", error);
        const body = document.getElementById('client-orders-body');
        if (body) body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted);">No se pudieron cargar tus órdenes.</td></tr>';
    });
}

function renderOrdenesCliente() {
    const body = document.getElementById('client-orders-body');
    if (!body) return;
    const lista = [...ordenesCliente].sort((a, b) => (b.creada || 0) - (a.creada || 0));
    body.innerHTML = lista.map(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        const listo = o.finalizada;
        return `<tr>
            <td class="mono">#${esc(o.numero)}</td>
            <td>${esc(o.equipo)}${o.problema ? `<small style="display:block;color:var(--muted);max-width:260px;">${esc(String(o.problema).slice(0, 90))}${String(o.problema).length > 90 ? '…' : ''}</small>` : ''}</td>
            <td>${esc(o.especialista || 'Sin asignar')}</td>
            <td>${estadoOrden(o)}</td>
            <td class="mono">${listo ? money(totalItems(items)) : '—'}</td>
            <td>${listo
                ? `<button class="btn small" style="background-color:#f0f0f0;color:#000;" data-ver-reporte="${esc(o.id)}">Ver reporte y factura</button>`
                : '<span class="muted" style="font-size:12.5px;">En proceso</span>'}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted);">Aún no tienes órdenes. Se crea una automáticamente al registrar un equipo.</td></tr>';
}

document.body.insertAdjacentHTML('beforeend', `
    <dialog id="client-report-dialog" style="border:1px solid var(--border);border-radius:28px;background:var(--surface);color:var(--ink);padding:0;width:min(640px, calc(100% - 28px));box-shadow:0 30px 90px #06241655;">
        <div style="padding:24px 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);">
            <h2 id="client-report-title" style="font-size:22px;margin:0;">Reporte</h2>
            <button type="button" class="btn outline small" data-close="client-report-dialog" style="background-color:#ddd;color:#333;">Cerrar</button>
        </div>
        <div id="client-report-body" style="padding:28px;display:grid;gap:18px;max-height:70vh;overflow:auto;"></div>
    </dialog>
`);

document.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-ver-reporte]');
    if (!btn) return;
    const o = ordenesCliente.find(x => x.id === btn.dataset.verReporte);
    if (!o || !o.finalizada) return;
    const items = Array.isArray(o.items) ? o.items : [];
    $('#client-report-title').textContent = `Orden #${o.numero}`;
    $('#client-report-body').innerHTML = `
        <p style="margin:0;"><strong>Equipo:</strong> ${esc(o.equipo)} · <strong>Técnico:</strong> ${esc(o.especialista || '—')}</p>
        ${o.problema ? `<div><h3 style="margin:0 0 6px;">Problema reportado</h3><p style="margin:0;white-space:pre-wrap;">${esc(o.problema)}</p></div>` : ''}
        <div>
            <h3 style="margin:0 0 6px;">Diagnóstico del técnico</h3>
            <p style="margin:0;white-space:pre-wrap;">${esc(o.diagnostico || 'Sin observaciones.')}</p>
            ${o.pruebas ? `<p style="margin:10px 0 0;white-space:pre-wrap;color:var(--muted);">${esc(o.pruebas)}</p>` : ''}
        </div>
        <div>
            <h3 style="margin:0 0 6px;">Servicios facturados</h3>
            ${items.map(i => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--border);"><span>${esc(i.name)} × ${esc(i.qty)}</span><span class="mono">${money(i.price * i.qty)}</span></div>`).join('')}
            <div style="display:flex;justify-content:space-between;padding-top:12px;font-weight:700;"><span>Total</span><span class="mono">${money(totalItems(items))}</span></div>
        </div>
        <p style="margin:0;font-size:12.5px;color:var(--muted);">Documento de ejemplo. No es un comprobante fiscal.</p>`;
    $('#client-report-dialog').showModal();
});

// --- Generar orden (cliente) ---
document.body.insertAdjacentHTML('beforeend', `
    <dialog id="client-order-dialog" style="border:1px solid var(--border);border-radius:28px;background:var(--surface);color:var(--ink);padding:0;width:min(520px, calc(100% - 28px));box-shadow:0 30px 90px #06241655;">
        <div style="padding:24px 28px;border-bottom:1px solid var(--border);">
            <h2 style="font-size:22px;margin:0;">Generar orden de servicio</h2>
        </div>
        <form id="client-order-form" novalidate style="padding:28px;">
            <div style="display:grid;gap:17px;">
                <div>
                    <label for="client-order-equipo" style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Equipo</label>
                    <select id="client-order-equipo" aria-describedby="client-order-equipo-error" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;"></select>
                    <p class="field-error" id="client-order-equipo-error" aria-live="polite" hidden style="margin-top:6px;font-size:12.5px;color:var(--peach-ink);"></p>
                </div>
                <div>
                    <label for="client-order-problema" style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Descripción del problema</label>
                    <textarea id="client-order-problema" rows="5" maxlength="500" placeholder="Ej.: Se calienta mucho, el ventilador hace ruido y se apaga solo." aria-describedby="client-order-problema-error" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;resize:vertical;font:inherit;"></textarea>
                    <p class="field-error" id="client-order-problema-error" aria-live="polite" hidden style="margin-top:6px;font-size:12.5px;color:var(--peach-ink);"></p>
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:24px;">
                <button type="button" class="btn outline" data-close="client-order-dialog" style="background-color:#ddd;color:#333;">Cancelar</button>
                <button class="btn primary" id="client-order-save">Enviar orden</button>
            </div>
        </form>
    </dialog>
`);

const CLIENT_ORDER_FIELDS = ['client-order-equipo', 'client-order-problema'];

document.addEventListener('click', ev => {
    if (!ev.target.closest('[data-action="new-client-order"]')) return;
    if (!currentUser) { toast('Tu sesión no está activa. Vuelve a ingresar.'); return; }
    if (!equipment.length) { toast('Primero registra un equipo para poder generar una orden.'); return; }
    $('#client-order-form').reset();
    CLIENT_ORDER_FIELDS.forEach(f => showFieldError(f, ''));
    $('#client-order-equipo').innerHTML = equipment.map(e =>
        `<option value="${esc(e.id)}">${esc(e.alias)} — ${esc(e.model)}</option>`).join('');
    $('#client-order-dialog').showModal();
});

['input', 'change'].forEach(evt => {
    $('#client-order-form').addEventListener(evt, ev => {
        if (CLIENT_ORDER_FIELDS.includes(ev.target.id)) showFieldError(ev.target.id, '');
    });
});

$('#client-order-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const e = equipment.find(x => x.id === $('#client-order-equipo').value);
    const problema = $('#client-order-problema').value.replace(/[ \t]+/g, ' ').trim();
    const errors = {};
    if (!e) errors['client-order-equipo'] = 'Elige uno de tus equipos.';
    if (problema.length < 10) errors['client-order-problema'] = 'Describe el problema con al menos 10 caracteres.';
    else if (problema.length > 500) errors['client-order-problema'] = 'Usa 500 caracteres como máximo.';
    CLIENT_ORDER_FIELDS.forEach(f => showFieldError(f, errors[f]));
    const primero = CLIENT_ORDER_FIELDS.find(f => errors[f]);
    if (primero) { document.getElementById(primero).focus(); return; }
    if (!currentUser) { toast('Tu sesión no está activa. Vuelve a ingresar.'); return; }

    const guardar = $('#client-order-save');
    guardar.disabled = true;
    try {
        await window.addDoc(window.collection(window.db, "ordenes"), {
            numero: siguienteNumeroOrden(),
            clienteEmail: String(currentUser.email || '').toLowerCase(),
            clienteUid: currentUser.uid,
            equipoId: e.id,
            equipo: `${e.model} (${e.alias})`,
            problema,
            status: 'Registrado',
            especialista: TECNICO_PREDETERMINADO, // asignación automática
            diagnostico: '',
            pruebas: '',
            items: [],
            total: 0,
            finalizada: false,
            creada: Date.now()
        });
        $('#client-order-dialog').close();
        toast('Orden enviada al técnico.');
    } catch (error) {
        console.error("Error al generar la orden:", error);
        toast('No se pudo generar la orden.');
    } finally {
        guardar.disabled = false;
    }
});

// --- Nueva orden (ordenes.html) ---
const ORDER_FIELD_IDS = ['order-email', 'order-equipo'];
document.addEventListener('click', ev => {
    if (!ev.target.closest('[data-action="new-order"]')) return;
    $('#order-form').reset();
    ORDER_FIELD_IDS.forEach(f => showFieldError(f, ''));
    $('#order-dialog').showModal();
});
['input', 'change'].forEach(evt => {
    $('#order-form').addEventListener(evt, ev => {
        if (ORDER_FIELD_IDS.includes(ev.target.id)) showFieldError(ev.target.id, '');
    });
});
$('#order-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const email = $('#order-email').value.trim().toLowerCase();
    const equipo = $('#order-equipo').value.replace(/\s+/g, ' ').trim();
    const errors = {};
    if (!esCorreoPermitido(email)) errors['order-email'] = MENSAJE_DOMINIO;
    if (equipo.length < 2) errors['order-equipo'] = 'Escribe la marca y el modelo del equipo.';
    ORDER_FIELD_IDS.forEach(f => showFieldError(f, errors[f]));
    const primero = ORDER_FIELD_IDS.find(f => errors[f]);
    if (primero) { document.getElementById(primero).focus(); return; }
    if (!currentUser) { toast('Tu sesión no está activa. Vuelve a ingresar.'); return; }

    const guardar = $('#order-save');
    guardar.disabled = true;
    try {
        // Si el cliente ya tiene cuenta, se enlaza la orden con su uid para que pueda verla.
        let clienteUid = null;
        try {
            const res = await window.getDocs(window.query(window.collection(window.db, "usuarios"), window.where("email", "==", email)));
            if (!res.empty) clienteUid = res.docs[0].id;
        } catch (e) { console.error("No se pudo buscar al cliente:", e); }

        await window.addDoc(window.collection(window.db, "ordenes"), {
            numero: siguienteNumeroOrden(),
            clienteEmail: email,
            clienteUid,
            equipo,
            status: 'Registrado',
            especialista: TECNICO_PREDETERMINADO, // asignación automática
            diagnostico: '',
            pruebas: '',
            items: [],
            total: 0,
            finalizada: false,
            creada: Date.now()
        });
        $('#order-dialog').close();
        toast('Orden creada.'); // la lista se actualiza sola con onSnapshot
    } catch (error) {
        console.error("Error al crear la orden:", error);
        toast('No se pudo crear la orden.');
    } finally {
        guardar.disabled = false;
    }
});

// --- Diagnóstico y factura de una orden (diagnostico.html?orden=ID) ---
async function cargarOrden() {
    if (!ordenIdURL) { irA('ordenes'); return; }
    try {
        const snap = await window.getDoc(window.doc(window.db, "ordenes", ordenIdURL));
        if (!snap.exists()) {
            toast('No se encontró esa orden.');
            setTimeout(() => irA('ordenes'), 1500);
            return;
        }
        ordenActual = { id: snap.id, ...snap.data() };
        ordenActual.items = Array.isArray(ordenActual.items) ? ordenActual.items : [];
        $('#diagnosis').value = ordenActual.diagnostico || '';
        $('#stress-test').value = ordenActual.pruebas || '';
        renderOrden();
    } catch (error) {
        console.error("Error al cargar la orden:", error);
        toast('No se pudo cargar la orden.');
    }
}

function renderOrden() {
    const o = ordenActual;
    if (!o) return;
    $('#diag-crumb').textContent = `Diagnóstico #${o.numero}`;
    $('#diag-cliente').textContent = o.clienteEmail || '—';
    $('#diag-equipo').textContent = o.equipo || '—';
    $('#diag-numero').textContent = `#${o.numero}`;
    $('#diag-especialista').textContent = o.especialista || 'Sin asignar';
    $('#diag-problema').textContent = o.problema || 'El cliente no describió el problema.';
    const badgeEl = $('#diag-badge');
    badgeEl.className = 'badge' + (o.finalizada ? ' ready' : '');
    badgeEl.innerHTML = `<span class="dot"></span>${o.finalizada ? 'Listo para entrega' : 'Borrador'}`;

    $('#diag-editor').hidden = !!o.finalizada;
    $('#order-report').hidden = !o.finalizada;
    renderItemsOrden();
    if (o.finalizada) renderReporte();
}

function renderItemsOrden() {
    const items = ordenActual.items;
    $('#invoice-items').innerHTML = items.map((i, idx) =>
        `<div class="invoice-item">
            <div>
                <strong>${esc(i.name)}</strong>
                <small>Costo base: ${money(i.cost)} · Cantidad: ${esc(i.qty)}</small>
            </div>
            <span class="mono">${money(i.price * i.qty)}</span>
            <button class="btn ghost icon-btn" type="button" data-remove-item="${idx}" aria-label="Quitar ${esc(i.name)}">${icon('close')}</button>
        </div>`
    ).join('') || '<p class="empty-items">Aún no hay servicios en la factura.</p>';
    $('#invoice-total').textContent = money(totalItems(items));
}

function renderReporte() {
    const o = ordenActual;
    $('#report-numero').textContent = `#${o.numero}`;
    $('#report-cliente').textContent = o.clienteEmail || '—';
    $('#report-equipo').textContent = o.equipo || '—';
    $('#report-diagnostico').textContent = o.diagnostico || 'Sin observaciones.';
    $('#report-pruebas').textContent = o.pruebas || '';
    $('#report-items').innerHTML = o.items.map(i =>
        `<div class="invoice-item"><span>${esc(i.name)} × ${esc(i.qty)}</span><span class="mono">${money(i.price * i.qty)}</span></div>`
    ).join('');
    $('#report-total').textContent = money(totalItems(o.items));
}

// Guarda el texto del formulario y las líneas de factura (más lo que se pase en `extra`).
async function guardarOrden(extra = {}, mensaje = '') {
    if (!ordenActual) return false;
    const finalizada = extra.finalizada ?? ordenActual.finalizada;
    const datos = {
        diagnostico: $('#diagnosis').value.trim(),
        pruebas: $('#stress-test').value.trim(),
        items: ordenActual.items,
        total: totalItems(ordenActual.items),
        status: finalizada ? 'Listo para entrega' : 'En diagnóstico',
        finalizada,
        ...extra
    };
    try {
        await window.updateDoc(window.doc(window.db, "ordenes", ordenActual.id), datos);
        Object.assign(ordenActual, datos);
        if (mensaje) toast(mensaje);
        return true;
    } catch (error) {
        console.error("Error al guardar la orden:", error);
        toast('No se pudo guardar la orden.');
        return false;
    }
}

async function añadirItem() {
    if (!ordenActual) return;
    const servicio = services.find(s => s.id === $('#invoice-service').value);
    if (!servicio) { toast('Elige un servicio del catálogo.'); return; }
    const existente = ordenActual.items.find(i => i.serviceId === servicio.id);
    if (existente) existente.qty += 1;
    else ordenActual.items.push({
        serviceId: servicio.id,
        name: servicio.name,
        cost: servicio.cost,
        markup: servicio.markup,
        price: servicePrice(servicio),
        qty: 1
    });
    renderItemsOrden();
    await guardarOrden();
}

async function quitarItem(idx) {
    if (!ordenActual || !ordenActual.items[idx]) return;
    ordenActual.items.splice(idx, 1);
    renderItemsOrden();
    await guardarOrden();
}

async function finalizarOrden() {
    if (!ordenActual) return;
    if (!ordenActual.items.length) {
        toast('Añade al menos un servicio antes de generar la factura.');
        return;
    }
    if (await guardarOrden({ finalizada: true, finalizadaEn: Date.now() }, 'Factura generada. La orden quedó lista para entrega.')) {
        renderOrden();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

async function reabrirOrden() {
    if (!ordenActual) return;
    if (await guardarOrden({ finalizada: false }, 'Orden reabierta para editar.')) {
        $('#diagnosis').value = ordenActual.diagnostico || '';
        $('#stress-test').value = ordenActual.pruebas || '';
        renderOrden();
    }
}

document.addEventListener('click', ev => {
    const quitar = ev.target.closest('[data-remove-item]');
    if (quitar) { quitarItem(Number(quitar.dataset.removeItem)); return; }
    const boton = ev.target.closest('button');
    if (!boton) return;
    if (boton.id === 'add-item') añadirItem();
    else if (boton.id === 'save-draft') guardarOrden({}, 'Borrador guardado.').then(ok => ok && renderOrden());
    else if (boton.id === 'finalize-order') finalizarOrden();
    else if (boton.id === 'reopen-order') reabrirOrden();
});

// Observador Global de Sesión con control de vistas por rol
const PRIVATE_PAGES = ['home', 'equipment', 'orders', 'catalog', 'diagnostic', 'finance'];
const CLIENT_BLOCKED_PAGES = ['orders', 'diagnostic', 'finance'];

window.onAuthStateChanged(window.auth, async (user) => {
    if (loggingOut) return; // el cierre de sesión redirige por su cuenta a index.html

    // Solo se admiten correos @ues.edu.sv: cualquier otra sesión se cierra y vuelve al login.
    if (user && !esCorreoPermitido(user.email)) {
        loggingOut = true;
        sessionStorage.setItem('repear-flash', MENSAJE_DOMINIO);
        window.signOut(window.auth).finally(() => irA('login'));
        return;
    }
    const page = document.body.dataset.page;
    const isAuthPage = page === 'login' || page === 'register';
    const isPrivatePage = PRIVATE_PAGES.includes(page);

    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const hideLink = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };

    if (user) {
        currentUser = user;
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        if (loginBtn) loginBtn.style.display = 'none';

        if (registering) return; // el registro guarda el rol y redirige por su cuenta
        if (isAuthPage) {
            // Al ingresar, el técnico va directo a Órdenes; el cliente, al panel.
            let rolLogin = 'cliente';
            try {
                const docLogin = await window.getDoc(window.doc(window.db, "usuarios", user.uid));
                if (docLogin.exists()) rolLogin = docLogin.data().rol;
            } catch (error) {
                console.error("Error al obtener el rol:", error);
            }
            irA(rolLogin === 'tecnico' ? 'ordenes' : 'panel');
            return;
        }
        if (!isPrivatePage) return;

        // Rol: sin documento en "usuarios" se trata como cliente.
        // Si la lectura falla, no se restringe nada y la página carga normal.
        let rol = null;
        try {
            const userDoc = await window.getDoc(window.doc(window.db, "usuarios", user.uid));
            rol = userDoc.exists() ? userDoc.data().rol : 'cliente';
        } catch (error) {
            console.error("Error al obtener el rol:", error);
        }

        if (rol === 'tecnico') {
            hideLink('nav-equipos');
            hideLink('btn-registrar-header'); // Ocultar el botón Registrar para técnicos
            hideLink('btn-registrar-catalogo');
            hideLink('nav-inicio'); // el técnico siempre empieza en Órdenes
            // El logo y la migaja "Inicio" también lo llevan a Órdenes.
            document.querySelectorAll('.brand, #breadcrumbs a[href="panel.html"]').forEach(el => { el.href = 'ordenes.html'; });
            if (page === 'equipment' || page === 'home') {
                irA('ordenes');
                return;
            }
        } else if (rol) {
            hideLink('nav-ordenes');
            hideLink('nav-diagnostico');
            hideLink('nav-finanzas');
            if (CLIENT_BLOCKED_PAGES.includes(page)) {
                irA('equipos');
                return;
            }
        }

        fetchEquipos(user.uid);
        fetchServicios();
        if (page === 'orders') fetchOrdenes();
        if (page === 'equipment' && rol !== 'tecnico') fetchOrdenesCliente(user.uid);
        if (page === 'diagnostic') cargarOrden();
    } else {
        currentUser = null;
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-flex';

        // Expulsar al login solo si intenta entrar a una página privada
        if (isPrivatePage) {
            irA('login');
        }
    }
});

$('#service-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const name = $('#service-name').value.trim();
    if (!name) {
        toast('Escribí el nombre del servicio.');
        return;
    }
    
    const nuevoServicio = {
        name: name,
        cost: $('#service-cost').valueAsNumber,
        markup: $('#service-markup').valueAsNumber,
        description: 'Servicio de diagnóstico y mantenimiento.',
        icon: 'wrench'
    };

    try {
        await window.addDoc(window.collection(window.db, "servicios"), nuevoServicio);
        $('#service-dialog').close();
        toast('Servicio agregado al catálogo en la nube.');
        // onSnapshot actualiza la tabla solo.
    } catch (error) {
        console.error("Error al guardar servicio:", error);
        toast('Error al guardar en la base de datos.');
    }
});

// Editar costo o recargo directamente en la tabla de finanzas.
// Se guarda en Firestore y onSnapshot recalcula el precio de venta.
document.addEventListener('change', async ev => {
    const input = ev.target.closest('input[data-service]');
    if (!input) return;
    const value = input.valueAsNumber;
    if (Number.isNaN(value) || value < 0) {
        toast('Escribe un número válido.');
        renderServices();
        return;
    }
    try {
        await window.updateDoc(window.doc(window.db, "servicios", input.dataset.service), { [input.dataset.field]: value });
    } catch (error) {
        console.error("Error al actualizar servicio:", error);
        toast('No se pudo actualizar el servicio.');
    }
});
