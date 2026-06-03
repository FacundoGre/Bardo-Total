import { SVGs } from "./motor.js";
import { guardarProgresoDB } from "./db.js";
import { cambiarVista, renderizarMiHub, mostrarConfirmacion, mostrarAlerta } from "./ui.js";

let avatarState = null;
let cambiosSinGuardar = false;
let jugadorEditando = null;

let activeDragElement = null; let dragCategory = null; 
let startMouseX = 0, startMouseY = 0, initialTransformX = 0, initialTransformY = 0;

// ==========================================
// TOOLTIP CUSTOMIZADO (El de la cajita negra)
// ==========================================
function asignarTooltip(boton, contenidoHTML) {
    const tooltip = document.getElementById("custom-tooltip");
    if(!tooltip) return;
    
    boton.onmouseover = (e) => {
        tooltip.innerHTML = contenidoHTML;
        tooltip.style.display = "block";
        tooltip.style.left = e.pageX + 15 + "px";
        tooltip.style.top = e.pageY + 15 + "px";
    };
    boton.onmousemove = (e) => {
        tooltip.style.left = e.pageX + 15 + "px";
        tooltip.style.top = e.pageY + 15 + "px";
    };
    boton.onmouseout = () => { tooltip.style.display = "none"; };
}
function quitarTooltip(boton) {
    boton.onmouseover = null; boton.onmousemove = null; boton.onmouseout = null;
    const tooltip = document.getElementById("custom-tooltip");
    if(tooltip) tooltip.style.display = "none";
}

function applyTransform(layerId, itemData) {
    const el = document.getElementById(`sas-layer-${layerId}`);
    if(el) { el.setAttribute('transform', `translate(${itemData.x}, ${itemData.y}) scale(${itemData.scale})`); el.style.transformOrigin = "50px 50px"; }
}

function updateVisuals() {
    if (!avatarState) return;
    document.getElementById('sas-layer-body').innerHTML = SVGs.body.replaceAll('{skinColor}', avatarState.skinColor);
    document.getElementById('sas-layer-face').innerHTML = SVGs.face[avatarState.items.face.id];

    ['clothes', 'pants', 'shoes', 'details'].forEach(layer => {
        let svgCode = SVGs[layer][avatarState.items[layer].id];
        svgCode = svgCode.replaceAll(`{${layer}Color}`, avatarState.colors[layer] || '#000').replaceAll('{skinColor}', avatarState.skinColor);
        document.getElementById(`sas-layer-${layer}`).innerHTML = svgCode; 
        applyTransform(layer, avatarState.items[layer]);
    });

    document.getElementById('sas-layer-hairBack').innerHTML = SVGs.hairBack[avatarState.items.hair.id].replaceAll('{hairColor}', avatarState.colors.hair);
    document.getElementById('sas-layer-hairFront').innerHTML = SVGs.hairFront[avatarState.items.hair.id].replaceAll('{hairColor}', avatarState.colors.hair);
    applyTransform('hairBack', avatarState.items.hair); applyTransform('hairFront', avatarState.items.hair);
}

function registrarCambio() {
    cambiosSinGuardar = true;
    updateVisuals();
}

export function inicializarSastreria() {
    document.querySelectorAll('.btn-sas').forEach(btn => { 
        
        btn.addEventListener('click', (e) => {
            let req = e.target.dataset.req;
            if (req && jugadorEditando && !jugadorEditando.cosmeticos.includes(req)) {
                let pista = e.target.dataset.info || "Objeto bloqueado por los dioses.";
                return mostrarAlerta(`🔒 OBJETO BLOQUEADO\n\n${pista}`, "ENTENDIDO"); 
            }

            let cat = e.target.dataset.cat;
            avatarState.items[cat].id = parseInt(e.target.dataset.id);
            if(avatarState.items[cat].x !== undefined) { 
                avatarState.items[cat].x = 0; avatarState.items[cat].y = 0; avatarState.items[cat].scale = 1; 
            }
            registrarCambio();
        }); 
    });

    ['skinColor', 'hairColor', 'clothesColor', 'pantsColor', 'shoesColor'].forEach(id => {
        const input = document.getElementById(`sas-${id}`);
        if(input) {
            input.addEventListener('input', (e) => {
                if(id === 'skinColor') avatarState.skinColor = e.target.value; 
                else avatarState.colors[id.replace('Color','')] = e.target.value;
                registrarCambio();
            });
        }
    });

    const svgContainer = document.getElementById('sas-avatar-svg');
    if(svgContainer) {
        svgContainer.addEventListener('mousedown', (e) => {
            const targetGroup = e.target.closest('.sas-draggable'); if (!targetGroup) return;
            activeDragElement = targetGroup; 
            dragCategory = targetGroup.id.replace('sas-layer-', '');
            if(dragCategory === 'hairFront' || dragCategory === 'hairBack') dragCategory = 'hair';
            
            activeDragElement.classList.add('is-dragging'); 
            
            startMouseX = e.clientX; startMouseY = e.clientY; 
            initialTransformX = avatarState.items[dragCategory].x; 
            initialTransformY = avatarState.items[dragCategory].y;
        });

        window.addEventListener('mousemove', (e) => {
            if (!activeDragElement || !dragCategory) return;
            avatarState.items[dragCategory].x = initialTransformX + (e.clientX - startMouseX) * 0.3; 
            avatarState.items[dragCategory].y = initialTransformY + (e.clientY - startMouseY) * 0.3;
            registrarCambio();
        });
        
        window.addEventListener('mouseup', () => { 
            if(activeDragElement) activeDragElement.classList.remove('is-dragging');
            activeDragElement = null; dragCategory = null; 
        });
        
        svgContainer.addEventListener('mouseleave', () => { 
            if(activeDragElement) activeDragElement.classList.remove('is-dragging');
            activeDragElement = null; dragCategory = null; 
        });

        svgContainer.addEventListener('wheel', (e) => {
            const targetGroup = e.target.closest('.sas-draggable'); if (!targetGroup) return; e.preventDefault();
            let cat = targetGroup.id.replace('sas-layer-', ''); if(cat === 'hairFront' || cat === 'hairBack') cat = 'hair';
            avatarState.items[cat].scale = Math.max(0.2, Math.min(3, avatarState.items[cat].scale + (e.deltaY > 0 ? -0.05 : 0.05)));
            registrarCambio();
        });
    }
}

export function abrirSastreria(jugador) {
    if (!jugador) return;
    jugadorEditando = jugador;
    avatarState = JSON.parse(JSON.stringify(jugador.avatar));
    cambiosSinGuardar = false;
    
    document.querySelectorAll('.btn-sas').forEach(btn => {
        let req = btn.dataset.req;
        if (req) {
            // Le borramos el atributo "title" horrible por las dudas
            btn.removeAttribute("title"); 

            if (jugadorEditando.cosmeticos.includes(req)) {
                // DESBLOQUEADO
                if(btn.innerText.includes('🔒')) btn.innerText = btn.innerText.replace('🔒', '✨');
                btn.style.opacity = "1";
                
                // 👇 Le removemos el atributo del tooltip global para que no muestre nada
                btn.removeAttribute("data-tooltip"); 
            } else {
                // BLOQUEADO: Le metemos la info al tooltip global
                if(btn.innerText.includes('✨')) btn.innerText = btn.innerText.replace('✨', '🔒');
                if(!btn.innerText.includes('🔒')) btn.innerText = '🔒 ' + btn.innerText;
                btn.style.opacity = "0.4";
                
                let info = btn.dataset.info || "Requisito desconocido.";
                
                // 👇 Le inyectamos el atributo mágico del nuevo motor
                btn.setAttribute("data-tooltip", `<strong style="color:gold;">Requisito:</strong><br>${info}`);
            }
        }
    });

    document.getElementById("sas-skinColor").value = avatarState.skinColor;
    document.getElementById("sas-hairColor").value = avatarState.colors.hair;
    document.getElementById("sas-clothesColor").value = avatarState.colors.clothes;
    document.getElementById("sas-pantsColor").value = avatarState.colors.pants;
    document.getElementById("sas-shoesColor").value = avatarState.colors.shoes;

    updateVisuals();
    cambiarVista('vista-sastreria');
}

export async function guardarApariencia() {
    if (!jugadorEditando || !avatarState) return;
    
    jugadorEditando.avatar = JSON.parse(JSON.stringify(avatarState)); 
    await guardarProgresoDB(jugadorEditando); 
    
    cambiosSinGuardar = false;
    renderizarMiHub(jugadorEditando); 
    
    mostrarAlerta("¡La nueva apariencia ha sido guardada en los hilos del destino!", "GENIAL", () => {
        cambiarVista('vista-hub');
    });
}

export function intentarSalirSastreria() {
    if (cambiosSinGuardar) {
        mostrarConfirmacion("Hiciste cortes y costuras nuevas. ¿Seguro que quieres salir SIN GUARDAR?", () => {
            cambiarVista('vista-hub');
        });
    } else {
        cambiarVista('vista-hub');
    }
}