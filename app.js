'use strict';

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

const $ = s => document.querySelector(s) || Object.assign(document.createElement('div'), {value: ''});const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = n => `<svg class="icon" aria-hidden="true"><use href="#${n}"/></svg>`;
const money = n => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(n);
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;

const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const writeStore = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} };

let equipment = [];
let currentUser = null;

async function fetchEquipos(uid) {
    try {
        // Creamos una consulta: Traer equipos SOLO donde el 'uid' coincida con el usuario actual
        const q = window.query(window.collection(window.db, "equipos"), window.where("uid", "==", uid));
        const querySnapshot = await window.getDocs(q);
        
        equipment = [];
        querySnapshot.forEach((documento) => {
            equipment.push({ id: documento.id, ...documento.data() });
        });
        renderEquipment();
    } catch (error) {
        console.error("Error al cargar equipos:", error);
    }
}

let services = [];
let vat = 13; 

async function fetchServicios() {
    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "servicios"));
        services = [];
        querySnapshot.forEach((doc) => {
            services.push({ id: doc.id, ...doc.data() });
        });
        renderServices();
    } catch (error) {
        console.error(error);
    }
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
            <button class="btn ghost icon-btn" data-close="equipment-dialog" style="padding:8px;border-radius:50%;width:36px;height:36px;display:grid;place-items:center;">${icon('close')}</button>
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
                <button type="button" class="btn" data-close="equipment-dialog">Cancelar</button>
                <button class="btn primary">Guardar equipo</button>
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
                <td><button class="btn ghost small">Ver</button> <button class="btn small" data-edit="${esc(e.id)}">Editar</button></td>
            </tr>`
        ).join('') || '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--muted);">No se encontraron equipos.</td></tr>';
    }
}

function servicePrice(s) { return round(s.cost * (1 + s.markup / 100)); }

function renderServices() {
    if ($('#home-services').classList) {
        $('#home-services').innerHTML = services.slice(0, 3).map(s => 
            `<div style="display:flex;gap:16px;padding:28px 0;border-bottom:1px solid #ffffff1f;color:#F0FAE6;">
                <div style="width:46px;height:46px;border-radius:15px;background:#ffffff14;color:var(--lime);display:grid;place-items:center;">${icon(s.icon || 'wrench')}</div>
                <div><h3 style="font-size:21px;font-family:var(--head);">${esc(s.name)}</h3><p style="font-size:14px;color:#F0FAE6a8;margin-top:4px;">${esc(s.description)}</p></div>
                <div style="margin-left:auto;text-align:right;">
                    <span style="font-family:var(--head);font-weight:700;font-size:32px;color:#fff;">${money(servicePrice(s))}</span>
                    <small style="display:block;font-family:var(--mono);font-size:11px;color:#F0FAE699;">+ ${vat}% IVA</small>
                </div>
            </div>`
        ).join('');
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
    if (target.dataset.edit) openEquipment(target.dataset.edit);
    if (target.id === 'print-invoice') window.print();
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
        fetchEquipos();
    } catch (error) {
        console.error("Error al guardar:", error);
        toast('Error al conectar con la base de datos.');
    }
});

if ($('#tabs').classList) {
    const TABS = [
        {t:'Un especialista revisa cada componente', p:'Pruebas de estrés, temperatura y estabilidad. Cada observación queda en un reporte que podés leer cuando quieras.', a:'diagnostico.html'},
        {t:'Limpieza interna y pasta térmica nueva', p:'Retiramos el polvo de ventiladores y disipador, y renovamos la pasta térmica para que el equipo vuelva a rendir.', a:'finanzas.html'},
        {t:'Cada dólar, con su detalle', p:'El precio sale del costo del servicio más un recargo, y el IVA se calcula sobre el subtotal. Sin cargos escondidos.', a:'finanzas.html'},
        {t:'Sabé en qué paso va tu equipo', p:'Consultá el estado de cada orden y quién la atiende. Al terminar, el reporte y la factura te esperan en el mismo lugar.', a:'ordenes.html'}
    ];
    $('#tabs').addEventListener('click', e => {         const btns = $$('.tab');
        const target = e.target.closest('.tab');
        if (!target) return;
        const i = btns.indexOf(target);
        btns.forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
        const p = $('#tab-panel');
        p.className = 'tp t' + i;
        p.innerHTML = `<div class="tp-copy"><h3>${TABS[i].t}</h3><p>${TABS[i].p}</p><a class="btn primary" href="${TABS[i].a}">Explorar<svg class="icon"><use href="#arrow"/></svg></a></div><div class="tp-visual"><div class="tp-card"><div class="tp-ic">${icon('wrench')}</div><div class="tp-row"><span>Estado actual</span><b class="mono">Simulado</b></div></div></div>`;
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
            // Si el login es correcto, el observador (abajo) lo mandará a index.html
        } catch (error) {
            toast('Error: Credenciales incorrectas.');
        }
    });
}

const registerForm = $('#register-form');
if (registerForm.addEventListener) {
    registerForm.addEventListener('submit', async ev => {
        ev.preventDefault();
        const email = $('#register-email').value;
        const password = $('#register-password').value;
        try {
            await window.createUserWithEmailAndPassword(window.auth, email, password);
            // El usuario se crea e ingresa automáticamente
        } catch (error) {
            toast('Error al crear cuenta. Quizás el correo ya está en uso.');
        }
    });
}

window.onAuthStateChanged(window.auth, (user) => {
    const isAuthPage = document.body.dataset.page === 'login' || document.body.dataset.page === 'register';
    
    if (user) {
        currentUser = user; // Guardamos quién es el usuario
        if (isAuthPage) {
            location.href = 'index.html'; // Si está logueado y abre /ingresar, mandarlo al panel
        } else {
            fetchEquipos(user.uid); // Descargar SOLO sus equipos
            fetchServicios(); // Descargar el catálogo (es público)
        }
    } else {
        currentUser = null;
        if (!isAuthPage) {
            location.href = 'ingresar.html'; // Si NO está logueado y quiere ver equipos, expulsarlo al login
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
        fetchServicios();
    } catch (error) {
        toast('Error al guardar en la base de datos.');
    }
});

fetchEquipos();
fetchServicios();