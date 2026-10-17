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
        <form id="equipment-form" style="padding:28px;">
            <input type="hidden" id="equipment-id">
            <div style="display:grid;gap:17px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Tipo</label><select id="equipment-type" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;"><option>Laptop</option><option>Desktop</option></select></div>
                    <div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Alias</label><input id="equipment-alias" required style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;"></div>
                </div>
                <div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Marca y modelo</label><input id="equipment-model" required style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;"></div>
                <div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Número de serie</label><input id="equipment-serial" class="mono" required style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;"></div>
                <div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:7px;">Especificaciones</label><input id="equipment-specs" required style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;"></div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:24px;">
                <button type="button" class="btn outline" data-close="equipment-dialog" style="background-color:#ddd;color:#333;">Cancelar</button>
                <button class="btn primary">Guardar equipo</button>
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
                <button class="btn" style="margin:22px 24px 24px;border:none;background:var(--hover);color:var(--accent);width:calc(100% - 48px);">${e.status === 'Listo para entrega' ? 'Ver reporte' : 'Ver ficha'}</button>
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
                <td>${esc(e.service)}<small>${esc(e.status)}</small></td>
                <td><button class="btn ghost small">Ver</button> <button class="btn small" style="background-color:#f0f0f0;color:#000;" data-edit="${esc(e.id)}">Editar</button></td>
            </tr>`
        ).join('') || '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--muted);">No se encontraron equipos.</td></tr>';
    }
}

// Buscador: filtra en memoria sobre `equipment` (ya descargado con onSnapshot),
// sin consultar a Firebase. renderEquipment() lee el texto de #equipment-search.
const equipmentSearch = document.getElementById('equipment-search');
if (equipmentSearch) equipmentSearch.addEventListener('input', renderEquipment);

function servicePrice(s) { return round(s.cost * (1 + s.markup / 100)); }

function renderServices() {
    if ($('#home-services').classList) {
        $('#home-services').innerHTML = services.map(s => 
            `<div style="display:flex;gap:16px;padding:24px 0;border-bottom:1px solid #ffffff1f;color:#F0FAE6;">
                <div style="width:46px;height:46px;border-radius:15px;background:#ffffff14;color:var(--lime);display:grid;place-items:center;flex-shrink:0;">
                    ${icon(s.icon || 'wrench')}
                </div>
                <div>
                    <h3 style="font-size:21px;font-family:var(--head);">${esc(s.name)}</h3>
                    <p style="font-size:14px;color:#F0FAE6a8;margin-top:6px;line-height:1.5;">${esc(s.description)}</p>
                </div>
            </div>`
        ).join('') || '<div style="padding:40px;text-align:center;color:#F0FAE6a8;">Aún no hay servicios en el catálogo.</div>';
    }

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
        $('#invoice-service').innerHTML = services.map(s => `<option value="${esc(s.id)}">${esc(s.name)} — ${money(servicePrice(s))}</option>`).join('');
    }
}

function openEquipment(id) {
    const e = equipment.find(eq => eq.id === id);
    $('#equipment-form').reset();
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

$('#equipment-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const id = $('#equipment-id').value;
    const serial = $('#equipment-serial').value.trim();
    
    if (equipment.some(e => e.serial.toLowerCase() === serial.toLowerCase() && e.id !== id)) {
        toast('Ese número de serie ya está registrado.');
        return;
    }

    const data = {
        uid: currentUser.uid, // <-- ESTO ES CLAVE, asocia el equipo al usuario logueado
        type: $('#equipment-type').value,
        alias: $('#equipment-alias').value.trim(),
        model: $('#equipment-model').value.trim(),
        serial: serial,
        specs: $('#equipment-specs').value.trim()
    };

    try {
        if (id) {
            const equipoRef = window.doc(window.db, "equipos", id);
            await window.updateDoc(equipoRef, data);
            toast('Equipo actualizado en la nube.');
        } else {
            data.status = 'Registrado';
            data.specialist = 'Sin asignar';
            data.service = 'Sin historial';
            await window.addDoc(window.collection(window.db, "equipos"), data);
            toast('Equipo registrado con éxito en la nube.');
        }
        $('#equipment-dialog').close();
        // onSnapshot actualiza la lista solo; no hace falta volver a pedir los datos.
    } catch (error) {
        console.error("Error al guardar:", error);
        toast('Error al conectar con la base de datos.');
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
        },
        {
            t: 'Sabé en qué paso va tu equipo', 
            p: 'Consultá el estado de cada orden y quién la atiende. Al terminar, el reporte y la factura te esperan en el mismo lugar.', 
            ic: 'laptop',
            v: `<div class="tp-row"><span>Orden #ORD-2026-104</span><b class="mono">Ryzen 7</b></div>
                <div class="tp-row"><span>Estado actual</span><span class="badge ready" style="font-size: 11px; padding: 2px 6px;"><span class="dot"></span>Listo</span></div>`
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

// Formularios de Autenticación Reales
const loginForm = $('#login-form');
if (loginForm.addEventListener) {
    loginForm.addEventListener('submit', async ev => {
        ev.preventDefault();
        const email = $('#login-email').value;
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
        const email = $('#register-email').value;
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

// Observador Global de Sesión con control de vistas por rol
const PRIVATE_PAGES = ['home', 'equipment', 'orders', 'diagnostic', 'finance'];
const CLIENT_BLOCKED_PAGES = ['orders', 'diagnostic', 'finance'];

window.onAuthStateChanged(window.auth, async (user) => {
    if (loggingOut) return; // el cierre de sesión redirige por su cuenta a index.html
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
            irA('panel');
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
            if (page === 'equipment') {
                irA('diagnostico');
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
