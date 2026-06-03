import { Luchador, SVGs } from "./motor.js";
import { guardarLuchadorEnDB } from "./db.js";
import { auth } from "./firebase.js";

let creadorStats = { fuerza: 5, agilidad: 5, velocidad: 5 }; 
let puntosDisponibles = 10;

let avatarState = {
    skinColor: '#8d5524',
    colors: { hair: '#111111', clothes: '#aa0000', pants: '#3b4d61', shoes: '#d0006e' },
    items: {
        face: { id: 1 }, hair: { id: 6, x: 0, y: 0, scale: 1 }, clothes: { id: 1, x: 0, y: 0, scale: 1 },
        pants: { id: 2, x: 0, y: 0, scale: 1 }, shoes: { id: 2, x: 0, y: 0, scale: 1 }, details: { id: 1, x: 0, y: 0, scale: 1 }
    }
};

function actualizarUICreador() {
    document.getElementById("puntos-restantes").innerText = puntosDisponibles;
    document.getElementById("val-fuerza").innerText = creadorStats.fuerza;
    document.getElementById("val-agilidad").innerText = creadorStats.agilidad;
    document.getElementById("val-velocidad").innerText = creadorStats.velocidad;
}

export function modificarStat(stat, modificador) {
    if (modificador === 1 && puntosDisponibles > 0) { creadorStats[stat]++; puntosDisponibles--; } 
    else if (modificador === -1 && creadorStats[stat] > 5) { creadorStats[stat]--; puntosDisponibles++; }
    actualizarUICreador();
}

function applyTransform(layerId, itemData) {
    const el = document.getElementById(`layer-${layerId}`);
    if(el) { el.setAttribute('transform', `translate(${itemData.x}, ${itemData.y}) scale(${itemData.scale})`); el.style.transformOrigin = "50px 50px"; }
}

function updateVisuals() {
    document.getElementById('layer-body').innerHTML = SVGs.body.replaceAll('{skinColor}', avatarState.skinColor);
    document.getElementById('layer-face').innerHTML = SVGs.face[avatarState.items.face.id];

    ['clothes', 'pants', 'shoes', 'details'].forEach(layer => {
        let svgCode = SVGs[layer][avatarState.items[layer].id];
        svgCode = svgCode.replaceAll(`{${layer}Color}`, avatarState.colors[layer] || '#000').replaceAll('{skinColor}', avatarState.skinColor);
        document.getElementById(`layer-${layer}`).innerHTML = svgCode; applyTransform(layer, avatarState.items[layer]);
    });

    document.getElementById('layer-hairBack').innerHTML = SVGs.hairBack[avatarState.items.hair.id].replaceAll('{hairColor}', avatarState.colors.hair);
    document.getElementById('layer-hairFront').innerHTML = SVGs.hairFront[avatarState.items.hair.id].replaceAll('{hairColor}', avatarState.colors.hair);
    applyTransform('hairBack', avatarState.items.hair); applyTransform('hairFront', avatarState.items.hair);
}

function changeItem(category, id) {
    avatarState.items[category].id = parseInt(id);
    if(avatarState.items[category].x !== undefined) { avatarState.items[category].x = 0; avatarState.items[category].y = 0; avatarState.items[category].scale = 1; }
    updateVisuals();
}

function getRandomHex() { return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'); }

export function caosTotal() {
    const skinTones = ['#ffcba4', '#e8b896', '#c68642', '#8d5524', '#3d2210', '#6b705c'];
    avatarState.skinColor = skinTones[Math.floor(Math.random() * skinTones.length)];
    document.getElementById('skinColor').value = avatarState.skinColor;

    ['hair', 'clothes', 'pants', 'shoes'].forEach(cat => {
        avatarState.colors[cat] = getRandomHex(); document.getElementById(cat+'Color').value = avatarState.colors[cat];
        avatarState.items[cat] = { id: Math.floor(Math.random() * 6) + 1, x: 0, y: 0, scale: 1 };
    });
    
    avatarState.items.face.id = Math.floor(Math.random() * 5) + 1; avatarState.items.details = { id: Math.floor(Math.random() * 5) + 1, x: 0, y: 0, scale: 1 };
    updateVisuals();
}

let activeDragElement = null; let dragCategory = null; let startMouseX = 0, startMouseY = 0, initialTransformX = 0, initialTransformY = 0;

export function inicializarCreador() {
    document.querySelectorAll('.btn-cambio-ropa').forEach(btn => { btn.addEventListener('click', (e) => changeItem(e.target.dataset.cat, e.target.dataset.id)); });

    ['skinColor', 'hairColor', 'clothesColor', 'pantsColor', 'shoesColor'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            if(id === 'skinColor') avatarState.skinColor = e.target.value; else avatarState.colors[id.replace('Color','')] = e.target.value;
            updateVisuals();
        });
    });

    const svgContainer = document.getElementById('avatar-svg');
    svgContainer.addEventListener('mousedown', (e) => {
        const targetGroup = e.target.closest('.draggable'); if (!targetGroup) return;
        activeDragElement = targetGroup; dragCategory = targetGroup.id.replace('layer-', '');
        if(dragCategory === 'hairFront' || dragCategory === 'hairBack') dragCategory = 'hair';
        startMouseX = e.clientX; startMouseY = e.clientY; initialTransformX = avatarState.items[dragCategory].x; initialTransformY = avatarState.items[dragCategory].y;
    });

    window.addEventListener('mousemove', (e) => {
        if (!activeDragElement || !dragCategory) return;
        avatarState.items[dragCategory].x = initialTransformX + (e.clientX - startMouseX) * 0.3; avatarState.items[dragCategory].y = initialTransformY + (e.clientY - startMouseY) * 0.3;
        updateVisuals();
    });
    window.addEventListener('mouseup', () => { activeDragElement = null; dragCategory = null; });

    svgContainer.addEventListener('wheel', (e) => {
        const targetGroup = e.target.closest('.draggable'); if (!targetGroup) return; e.preventDefault();
        let cat = targetGroup.id.replace('layer-', ''); if(cat === 'hairFront' || cat === 'hairBack') cat = 'hair';
        avatarState.items[cat].scale = Math.max(0.2, Math.min(3, avatarState.items[cat].scale + (e.deltaY > 0 ? -0.05 : 0.05)));
        updateVisuals();
    });

    updateVisuals();
}

export async function crearNuevoLuchador() {
    if (puntosDisponibles > 0) {
        alert("❌ El Gremio exige tu máximo potencial. ¡Gasta todos tus puntos de estadística antes de alistarte!");
        return;
    }
    const input = document.getElementById("input-nombre"); let nombre = input.value.trim();
    if (!nombre) { alert("❌ El nombre no puede estar vacío."); return; }
    if (!auth.currentUser) { alert("❌ Sesión no válida. Recarga la página."); return; }
    
    // Convertimos el estado actual del avatar en JSON puro para la BD
    const avatarData = JSON.parse(JSON.stringify(avatarState));
    
    // Nace 100% limpio
    const nuevoLuchador = new Luchador(nombre, 100, creadorStats.fuerza, creadorStats.agilidad, creadorStats.velocidad, 0, 0, null, 1200, "Plata", 0, avatarData);
    
    const exito = await guardarLuchadorEnDB(nuevoLuchador, auth.currentUser.uid);
    if (exito) {
        input.value = ""; creadorStats = { fuerza: 5, agilidad: 5, velocidad: 5 }; puntosDisponibles = 10;
        actualizarUICreador(); 
        alert(`¡${nombre} se ha unido a la arena!`);
        window.location.reload(); 
    } else {
        alert("Hubo un error de conexión al guardar tu guerrero.");
    }
}