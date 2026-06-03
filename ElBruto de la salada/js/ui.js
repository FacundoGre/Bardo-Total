import { db, collection, query, orderBy, limit, onSnapshot, getDocs } from "./firebase.js";
import { obtenerMiPuestoRanking } from "./db.js";
import { calcularTitulo, renderizarSVG } from "./motor.js";
import { miGladiador } from "./auth.js";
import { PasivasDisponibles, Armeria, Arsenal, Bestiario } from "./motor.js";

export function cambiarVista(vistaId) {
    const vistas = document.querySelectorAll('.vista-juego');
    vistas.forEach(v => v.style.display = 'none');
    const vistaActiva = document.getElementById(vistaId);
    if (vistaActiva) vistaActiva.style.display = 'flex';
}

export function renderizarMiHub(jugador) {
    try {
        document.getElementById("hub-nombre").innerText = jugador.nombre;
        document.getElementById("hub-avatar").innerHTML = renderizarSVG(jugador.avatar);

        let divActual = jugador.division || "Plata";
        let claseDiv = `div-${divActual.toLowerCase()}`;
        const titulo = calcularTitulo(jugador.elo || 1200);
        document.getElementById("hub-titulo").innerHTML = `🏆 <span class="${claseDiv}">${titulo}</span>`;

        let totalPartidas = (jugador.victorias || 0) + (jugador.derrotas || 0);
        let winrate = totalPartidas > 0 ? Math.round(((jugador.victorias || 0) / totalPartidas) * 100) : 0;
        let cartelRacha = (jugador.rachaActual || 0) >= 2 ? ` | <span style="color:#ff3333; font-weight:bold;">🔥 ${jugador.rachaActual}</span>` : "";

        let cartelAnterior = "";
        if (jugador.divisionAnterior) {
            cartelAnterior = `<br><span style="color:#aaa; font-size:0.85em;">Temp. Pasada: <span class="div-${jugador.divisionAnterior.toLowerCase()}" style="font-weight:bold;">${jugador.divisionAnterior}</span> (${jugador.eloAnterior} Elo)</span>`;
        }

        document.getElementById("hub-record").innerHTML = `<span class="${claseDiv}" style="font-weight:bold;">${divActual}</span> | ${jugador.elo || 1200} Elo ${cartelRacha}<br>🏆 ${jugador.victorias || 0} | 💀 ${jugador.derrotas || 0} <span style="color:#aaa; font-size:0.9em;">(${winrate}% WR)</span>${cartelAnterior}`;

        document.getElementById("hub-oro").innerText = jugador.oro || 0;
        document.getElementById("hub-nivel").innerText = jugador.nivel || 1;
        document.getElementById("hub-xp").innerText = jugador.xp || 0;
        document.getElementById("hub-xp-max").innerText = (jugador.nivel || 1) * 100;

        const divPuntos = document.getElementById("hub-stats-upgrade");
        if (divPuntos) {
            if (jugador.puntosStat > 0) {
                divPuntos.style.display = "block";
                document.getElementById("hub-puntos-stat").innerText = jugador.puntosStat;
            } else { divPuntos.style.display = "none"; }
        }

        const divBuff = document.getElementById("hub-buff-container");
        if (divBuff) {
            if (jugador.buffPartidas > 0) {
                divBuff.style.display = "block";
                const countSpan = document.getElementById("hub-buff-count");
                if (countSpan) countSpan.innerText = jugador.buffPartidas;
            } else { divBuff.style.display = "none"; }
        }

        const btnAdmin = document.getElementById("btn-ir-admin");
        if (btnAdmin) {
            if (jugador.nombre === "Admin" || jugador.nombre === "bardo") btnAdmin.style.display = "inline-block";
            else btnAdmin.style.display = "none";
        }

        // 👇 NUEVAS ESTADÍSTICAS DEL HUB 👇
        let elFuerza = document.getElementById("hub-fuerza");
        if (elFuerza) elFuerza.innerText = jugador.fuerza || 0;

        let elAgilidad = document.getElementById("hub-agilidad");
        if (elAgilidad) elAgilidad.innerText = jugador.agilidadBase || 0;

        let elVel = document.getElementById("hub-velocidad");
        if (elVel) elVel.innerText = jugador.velocidad || 0;

        obtenerMiPuestoRanking(jugador.elo || 1200).then(puesto => {
            let medallaPuesto = puesto === 1 ? "🥇 #1" : puesto === 2 ? "🥈 #2" : puesto === 3 ? "🥉 #3" : `#${puesto}`;
            let elPuesto = document.getElementById("hub-puesto-ranking");
            if (elPuesto) elPuesto.innerHTML = `Posición Global: <b style="color:#fff;">${medallaPuesto}</b>`;
        });

        // 👇 DIBUJAR PASIVAS EN EL HUB 👇
        const divPasivas = document.getElementById("hub-pasivas-lista");
        if (divPasivas) {
            divPasivas.innerHTML = "";
            if (jugador.pasivas && jugador.pasivas.length > 0) {
                jugador.pasivas.forEach(pId => {
                    const info = PasivasDisponibles[pId];
                    if (info) {
                        // El 'title' es lo que hace que al pasar el mouse salga el cuadradito nativo con la descripción
                        divPasivas.innerHTML += `<div data-tooltip="${info.desc}" style="background:#222; border:1px solid #ff3333; border-radius:4px; padding:4px 10px; font-size:0.85em; color:#ff3333; cursor:help; box-shadow: 0 0 5px rgba(255,51,51,0.2);">🔮 ${info.nombre}</div>`;
                    }
                });
            } else {
                divPasivas.innerHTML = `<span style="color:#555; font-size:0.85em; font-style:italic;">Ninguna pasiva activa</span>`;
            }
        }

    } catch (e) { console.error("Error en el Hub:", e); }
}

export function mostrarPerfil(data) {
    document.getElementById("modal-nombre").innerText = data.nombre;
    let elo = data.estadisticas?.elo || 1200; let div = data.estadisticas?.division || "Plata"; let racha = data.estadisticas?.rachaActual || 0;
    let claseDiv = `div-${div.toLowerCase()}`; const titulo = calcularTitulo(elo);

    document.getElementById("modal-avatar").innerHTML = renderizarSVG(data.avatar);
    document.getElementById("modal-titulo").innerHTML = `🏆 <span class="${claseDiv}">${titulo}</span>`;
    document.getElementById("modal-elo").innerText = elo;
    document.getElementById("modal-division").innerHTML = `<span class="${claseDiv}" style="font-weight:bold;">${div}</span>`;
    document.getElementById("modal-victorias").innerText = data.estadisticas?.victorias || 0;
    document.getElementById("modal-derrotas").innerText = data.estadisticas?.derrotas || 0;
    document.getElementById("modal-racha").innerText = racha > 0 ? `${racha} 🔥` : "0";

    document.getElementById("modal-fuerza").innerText = data.fuerza; document.getElementById("modal-agilidad").innerText = data.agilidad; document.getElementById("modal-velocidad").innerText = data.velocidad;
    document.getElementById("modal-armadura").innerText = data.armaduraEquipada ? data.armaduraEquipada.nombre : "Ninguna";
    document.getElementById("modal-armas").innerText = (data.inventario && data.inventario.length > 0) ? data.inventario.map(a => a.nombre).join(", ") : "A puño limpio";
    document.getElementById("modal-mascotas").innerText = (data.mascotas && data.mascotas.length > 0) ? data.mascotas.map(m => m.nombre).join(", ") : "Ninguna";
    document.getElementById("modal-pasivas").innerText = (data.pasivas && data.pasivas.length > 0) ? data.pasivas.join(", ").toUpperCase() : "Ninguna";

    document.getElementById("modal-perfil").style.display = "flex";
}

export function cerrarPerfil() { document.getElementById("modal-perfil").style.display = "none"; }

export function iniciarEscuchaRanking() {
    const q = query(collection(db, "luchadores"), orderBy("estadisticas.elo", "desc"), limit(10));
    onSnapshot(q, (snapshot) => {
        const lista = document.getElementById("lista-ranking"); lista.innerHTML = "";
        if (snapshot.empty) { lista.innerHTML = "<li>Aún no hay gladiadores.</li>"; return; }
        let posicion = 1;
        snapshot.forEach((doc) => {
            const data = doc.data(); let medalla = `#${posicion}`;
            if (posicion === 1) medalla = "🥇"; if (posicion === 2) medalla = "🥈"; if (posicion === 3) medalla = "🥉";
            let rachaTxt = data.estadisticas?.rachaActual >= 3 ? ` <span style="color:#ff3333; font-size:0.9em;">(🔥${data.estadisticas.rachaActual})</span>` : "";
            let claseDiv = `div-${(data.estadisticas?.division || "Plata").toLowerCase()}`;
            const li = document.createElement("li"); li.innerHTML = `<span class="puesto-ranking">${medalla}</span> `;
            const spanNombre = document.createElement("span"); spanNombre.className = "nombre-clickeable"; spanNombre.innerText = data.nombre;
            spanNombre.addEventListener("click", () => mostrarPerfil(data));
            li.appendChild(spanNombre);
            const spanResto = document.createElement("span");
            spanResto.innerHTML = `${rachaTxt}<br><span style="font-size: 0.85em; color: #888;"><span class="${claseDiv}" style="font-weight:bold;">${data.estadisticas.division}</span> | ${data.estadisticas.elo} Elo</span>`;
            li.appendChild(spanResto); lista.appendChild(li); posicion++;
        });
    });
}

export function iniciarEscuchaHistorial() {
    const q = query(collection(db, "combates"), orderBy("fecha", "desc"), limit(10));
    onSnapshot(q, (snapshot) => {
        const lista = document.getElementById("lista-combates"); lista.innerHTML = "";
        if (snapshot.empty) { lista.innerHTML = "<li>Aún no hay combates.</li>"; return; }
        snapshot.forEach((doc) => {
            const data = doc.data(); const eloGanado = data.eloGanadorDespues - data.eloGanadorAntes;
            const li = document.createElement("li");
            li.innerHTML = `⚔️ <strong>${data.ganador}</strong> venció a ${data.perdedor} <br><span class="ganancia-elo">(+${eloGanado} Elo)</span>`;
            lista.appendChild(li);
        });
    });
}

export function escribirLog(mensaje, tipo = 'sistema', contenedorId = "log-combate") {
    const logDiv = document.getElementById(contenedorId);
    if (!logDiv) return;
    const estaEnElFondo = logDiv.scrollHeight - logDiv.clientHeight <= logDiv.scrollTop + 50;
    const div = document.createElement("div"); div.className = `log-msg log-${tipo}`; div.innerHTML = mensaje;
    logDiv.appendChild(div);
    if (estaEnElFondo) logDiv.scrollTop = logDiv.scrollHeight;
}

export function actualizarUI(jugador, numPanel) {
    const hpDiv = document.getElementById(`hp${numPanel}`);
    if (hpDiv) hpDiv.style.width = `${Math.max(0, (jugador.vidaActual / jugador.vidaMaxima) * 100)}%`;
    const txtHp = document.getElementById(`texto-hp${numPanel}`);
    if (txtHp) txtHp.innerText = `${Math.max(0, Math.floor(jugador.vidaActual))}/${jugador.vidaMaxima} HP`;

    let claseDiv = `div-${jugador.division.toLowerCase()}`;
    const titulo = calcularTitulo(jugador.elo);
    const titleDiv = document.getElementById(`titulo${numPanel}`);
    if (titleDiv) titleDiv.innerHTML = `🏆 <span class="${claseDiv}">${titulo}</span>`;
    const avatarDiv = document.getElementById(`avatar${numPanel}`);
    if (avatarDiv) avatarDiv.innerHTML = renderizarSVG(jugador.avatar);

    let cartelRacha = jugador.rachaActual >= 2 ? ` | <span style="color:#ff3333; font-weight:bold;">🔥 ${jugador.rachaActual}</span>` : "";
    const recDiv = document.getElementById(`record${numPanel}`);
    if (recDiv) recDiv.innerHTML = `<span class="${claseDiv}" style="font-weight:bold;">${jugador.division}</span> | ${jugador.elo} Elo ${cartelRacha}<br>🏆 ${jugador.victorias} | 💀 ${jugador.derrotas}`;
}

export async function pausar(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

export function bloquearBotones(estado) {
    const btn1 = document.getElementById("btn-pelear"); if (btn1) btn1.disabled = estado;
    const btn2 = document.getElementById("btn-desafiar"); if (btn2) btn2.disabled = estado;
}

// ==========================================
// MODALES CUSTOMIZADOS (Reemplazo de alert y confirm)
// ==========================================
export function mostrarAlerta(mensaje, textoBoton = "OK", callback = null) {
    const modal = document.getElementById("modal-confirmacion");
    document.getElementById("modal-conf-texto").innerHTML = mensaje; // 👈 innerHTML
    const btnSiViejo = document.getElementById("modal-conf-si");
    const btnNo = document.getElementById("modal-conf-no");
    btnSiViejo.replaceWith(btnSiViejo.cloneNode(true));
    const btnSi = document.getElementById("modal-conf-si");
    btnSi.innerText = textoBoton;
    btnNo.style.display = "none";
    modal.style.display = "flex";
    btnSi.addEventListener("click", () => {
        modal.style.display = "none";
        btnSi.innerText = "Sí";
        btnNo.style.display = "inline-block";
        if (callback) callback();
    });
}

export function mostrarConfirmacion(mensaje, callbackAccion) {
    const modal = document.getElementById("modal-confirmacion");
    document.getElementById("modal-conf-texto").innerText = mensaje;
    const btnSiViejo = document.getElementById("modal-conf-si");
    const btnNoViejo = document.getElementById("modal-conf-no");
    btnSiViejo.replaceWith(btnSiViejo.cloneNode(true));
    btnNoViejo.replaceWith(btnNoViejo.cloneNode(true));
    const btnSi = document.getElementById("modal-conf-si");
    const btnNo = document.getElementById("modal-conf-no");
    btnSi.innerText = "Sí";
    btnNo.style.display = "inline-block";
    modal.style.display = "flex";
    btnSi.addEventListener("click", () => { modal.style.display = "none"; callbackAccion(); });
    btnNo.addEventListener("click", () => { modal.style.display = "none"; });
}

// 🛠️ FÁBRICA DE MEDALLAS CUSTOM (Glossy y limpias)
function obtenerMedallaSVG(puesto) {
    let color, oscuro, texto;
    if(puesto === 1) { color = "#FFD700"; oscuro = "#B8860B"; texto = "1"; }
    else if(puesto === 2) { color = "#E0E0E0"; oscuro = "#808080"; texto = "2"; }
    else { color = "#CD7F32"; oscuro = "#8B4513"; texto = "3"; }

    return `
    <svg width="35" height="45" viewBox="0 0 30 40" style="vertical-align: middle; filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.6)); margin-right: 5px;">
        <path d="M 5 0 L 15 15 L 25 0 L 20 20 L 10 20 Z" fill="#b30000" stroke="#4a0000" stroke-width="1"/>
        <circle cx="15" cy="24" r="12" fill="${oscuro}"/>
        <circle cx="15" cy="24" r="10" fill="${color}"/>
        <path d="M 7 20 Q 15 15 23 20 A 10 10 0 0 0 7 20" fill="rgba(255,255,255,0.5)"/>
        <text x="15" y="29.5" font-family="'Cinzel', Impact, sans-serif" font-size="14" font-weight="900" fill="#111" text-anchor="middle">${texto}</text>
    </svg>`;
}

// ⚔️ FÁBRICA DE LIGAS (Las 7 Divisiones del Bardo)
function obtenerLigaSVG(division) {
    let divLow = division.toLowerCase();
    let svg = "";
    
    switch(divLow) {
        case 'hierro':
            // Yunque de hierro oscuro
            svg = `<svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 2px #2c3e50);"><path d="M21 11c0-2.5-2-5-5-5H8c-2.5 0-5 2.5-5 5v2h18v-2zm-9 4H8v6h4v-6z" fill="#7f8c8d"/></svg>`;
            break;
        case 'bronce':
            // Escudo redondo de bronce
            svg = `<svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 2px #a0522d);"><circle cx="12" cy="12" r="10" fill="#cd7f32"/><circle cx="12" cy="12" r="7" fill="#8b4513"/><circle cx="12" cy="12" r="3" fill="#cd7f32"/></svg>`;
            break;
        case 'plata':
            // Escudo heráldico de plata
            svg = `<svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 3px #aaa);"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="#bdc3c7"/><path d="M12 3v18c4-1 7-5 7-10V6l-7-3z" fill="#95a5a6"/></svg>`;
            break;
        case 'oro':
            // Corona dorada
            svg = `<svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 4px #ffaa00);"><path d="M5 16h14l-2-9-4 3-2-6-2 6-4-3-2 9zm-2 2h18v2H3v-2z" fill="#f1c40f"/></svg>`;
            break;
        case 'platino':
            // Estrella rúnica cian
            svg = `<svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 5px #00e5ff);"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#00e5ff"/></svg>`;
            break;
        case 'diamante':
            // Gema facetada azul
            svg = `<svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 5px #2980b9);"><path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5l5.5 5H6.5L12 5.5z" fill="#3498db"/></svg>`;
            break;
        case 'leyenda':
            // Llama oscura / Emblema magenta legendario
            svg = `<svg width="20" height="20" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 6px #ff00ff);"><path d="M12 2c-3 4-5 7-5 11 0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-7-5-11zm0 14c-1.66 0-3-1.34-3-3 0-2 1.5-4 3-6 1.5 2 3 4 3 6 0 1.66-1.34 3-3 3z" fill="#f0f"/><path d="M12 12c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" fill="#fff"/></svg>`;
            break;
        default:
            svg = `<svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px;"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="#777"/></svg>`;
    }
    return svg;
}

export async function abrirRankingCompleto(miId) {
    const modal = document.getElementById("modal-ranking-completo");
    const lista = document.getElementById("lista-ranking-completo");
    const podium = document.getElementById("podium-top3");
    
    lista.innerHTML = "<p style='text-align:center; color:#aaa;'>Consultando a los Dioses...</p>";
    podium.innerHTML = "";
    modal.style.display = "flex";

    try {
        const q = query(collection(db, "luchadores"), orderBy("estadisticas.elo", "desc"), limit(100));
        const snap = await getDocs(q);
        
        lista.innerHTML = "";
        let posicion = 1;
        
        snap.forEach((doc) => {
            const data = doc.data();
            let claseDiv = `div-${(data.estadisticas?.division || "Plata").toLowerCase()}`;
            
            let victorias = data.estadisticas?.victorias || 0;
            let derrotas = data.estadisticas?.derrotas || 0;
            let total = victorias + derrotas;
            let wr = total > 0 ? Math.round((victorias / total) * 100) : 0;
            
            let esMio = (miId && doc.id === miId);
            let badgeMia = esMio ? `<span class="badge-mia">TÚ</span>` : "";

            // --- RENDER DEL PODIO CON MEDALLAS SVG (Top 3) ---
            if (posicion <= 3) {
                const pod = document.createElement("div");
                pod.className = `podium-item podium-${posicion} ${esMio ? 'fila-mia' : ''}`;
                pod.onclick = () => { modal.style.display = "none"; mostrarPerfil(data); };
                
                let medallaSVG = obtenerMedallaSVG(posicion);
                let colorNombre = posicion === 1 ? '#ffaa00' : posicion === 2 ? '#fff' : '#cd7f32';
                let miniAvatar = `<div style="width: 70px; height: 70px; margin: 0 auto -5px auto; z-index: 5; position: relative; filter: drop-shadow(0 5px 5px rgba(0,0,0,0.5));">${renderizarSVG(data.avatar)}</div>`;
                
                pod.innerHTML = `
                    ${miniAvatar}
                    <div style="display:flex; justify-content:center; align-items:center; margin-bottom: 3px;">
                        ${medallaSVG}
                    </div>
                    <div style="font-size: 1.1em; font-weight: 900; color: ${colorNombre}; text-shadow: 1px 1px 3px #000; letter-spacing: 1px;">${data.nombre}</div>
                    <div style="font-size: 0.8em; margin: 3px 0;"><span class="${claseDiv}" style="text-transform: uppercase; display:flex; align-items:center; justify-content:center;">${obtenerLigaSVG(data.estadisticas?.division || "Plata")} ${data.estadisticas?.division || "Plata"}</span></div>
                    <div style="font-size: 1.1em; color: #eee; margin-bottom: 5px; font-weight: bold;">${data.estadisticas?.elo || 1200} Elo</div>
                    <div style="font-size: 0.75em; color: #aaa;">${wr}% WR</div>
                    <div class="podium-caja">#${posicion}</div>
                `;
                podium.appendChild(pod);
            } 
            // --- RENDER DE LA LISTA EN GRILLA (4 al 100) ---
            else {
                const li = document.createElement("li"); 
                li.className = `fila-ranking ${esMio ? 'fila-mia' : ''}`;
                li.onclick = () => { modal.style.display = "none"; mostrarPerfil(data); };

                li.innerHTML = `
                    <div style="font-family: monospace; font-size: 1.3em; color: #666; font-weight: bold; text-align: center;">
                        #${posicion}
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                        <span style="font-weight: 900; color: #fff; font-size: 1.15em; text-shadow: 1px 1px 2px #000; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${data.nombre}</span> 
                        ${badgeMia}
                    </div>
                    
                    <div style="text-align: center; line-height: 1.3;">
                        <span class="${claseDiv}" style="font-size: 0.85em; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display:flex; align-items:center; justify-content:center; gap: 4px;">
                            ${obtenerLigaSVG(data.estadisticas?.division || "Plata")} 
                            ${data.estadisticas?.division || "Plata"}
                        </span><br>
                        <span style="color: #ffaa00; font-size: 1.2em; font-weight: 900;">${data.estadisticas?.elo || 1200}</span>
                    </div>
                    
                    <div style="text-align: right; font-size: 0.85em; color: #aaa; line-height: 1.3;">
                        <div style="color: #ddd; font-weight: bold;">${wr}% WR</div>
                        <div>(${victorias}/${derrotas})</div>
                    </div>
                `;
                lista.appendChild(li); 
            }
            posicion++;
        }); // 👈 ¡ESTO ES LO QUE FALTABA! ACÁ SE CIERRA EL BUCLE

        const inputBuscador = document.getElementById("buscador-ranking");
        if (inputBuscador) {
            inputBuscador.value = ""; 
            inputBuscador.oninput = (e) => {
                const termino = e.target.value.toLowerCase();
                const todosLosItems = document.querySelectorAll(".fila-ranking, .podium-item");
                
                todosLosItems.forEach(item => {
                    const textoContenido = item.innerText.toLowerCase();
                    if (textoContenido.includes(termino)) item.style.display = ""; 
                    else item.style.display = "none";
                });
            };
        }

    } catch(e) { 
        lista.innerHTML = "<p style='color:red; text-align:center;'>Error al leer los pergaminos.</p>"; 
    }
}

// ==========================================
// 📖 EL CÓDICE (WIKI DEL JUEGO)
// ==========================================
export function abrirCodice() {
    const contenedor = document.getElementById("contenido-codice");
    let htmlWiki = "";

    // Estilos base para las tarjetas
    const estiloCard = "background:#1a1a1a; border:1px solid #333; border-radius:8px; padding:15px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display:flex; flex-direction:column; justify-content:center;";
    const estiloGrid = "display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; margin-bottom: 30px;";

    // 1. PASIVAS (Tarjetas Rojas)
    htmlWiki += `
        <h3 style="color:#ff3333; font-size:1.5em; border-bottom:1px solid #ff3333; padding-bottom:5px;">🔮 Pasivas Míticas</h3>
        <div style="${estiloGrid}">
    `;
    for (const key in PasivasDisponibles) {
        let p = PasivasDisponibles[key];
        htmlWiki += `
            <div style="${estiloCard} border-left: 4px solid #ff3333;">
                <b style="color:#ffaa00; font-size:1.2em; margin-bottom:5px;">${p.nombre}</b>
                <span style="color:#ccc; font-size:0.95em; line-height:1.4;">${p.desc}</span>
            </div>`;
    }
    htmlWiki += `</div>`;

    // 2. ARSENAL (Tarjetas Verdes)
    htmlWiki += `
        <h3 style="color:#44ff44; font-size:1.5em; border-bottom:1px solid #44ff44; padding-bottom:5px; margin-top:25px;">⚔️ Arsenal de Armas</h3>
        <div style="${estiloGrid}">
    `;
    for (const key in Arsenal) {
        let a = Arsenal[key];
        let efectoTxt = "";
        
        // Si el arma tiene un efecto, armamos el tooltip dinámico
        if (a.efecto) {
            let descEfecto = `Inflige ${a.efecto.dañoTurno} de daño por ${a.efecto.turnos} turnos.`;
            efectoTxt = `
    <div data-tooltip="${descEfecto}" style="margin-top:10px; font-size:0.85em; color:#ff77ff; background:#331133; padding:5px; border-radius:4px; text-align:center; cursor:help; box-shadow: inset 0 0 5px rgba(255,0,255,0.2);">
        ✨ Aplica: <b style="text-decoration: underline dotted;">${a.efecto.tipo.toUpperCase()}</b>
    </div>`;
        }
        
        htmlWiki += `
            <div style="${estiloCard} border-left: 4px solid #44ff44;">
                <b style="color:#fff; font-size:1.2em; margin-bottom:10px; text-align:center;">${a.nombre}</b>
                <div style="display:flex; justify-content:space-between; font-size:0.95em; border-top:1px solid #333; padding-top:8px;">
                    <span style="color:#aaa;">Daño: <b style="color:#ffaa00;">+${a.bonoDaño}</b></span>
                    <span style="color:#aaa;">Agilidad: <b style="color:#ff4444;">-${a.penalidadAgilidad}</b></span>
                </div>
                ${efectoTxt}
            </div>`;
    }
    htmlWiki += `</div>`;

    // 3. BESTIARIO (Tarjetas Azules)
    htmlWiki += `
        <h3 style="color:#4444ff; font-size:1.5em; border-bottom:1px solid #4444ff; padding-bottom:5px;">🐺 Bestiario</h3>
        <div style="${estiloGrid}">
    `;
    for (const key in Bestiario) {
        let m = Bestiario[key];
        htmlWiki += `
            <div style="${estiloCard} border-left: 4px solid #4444ff;">
                <b style="color:#fff; font-size:1.2em; margin-bottom:10px; text-align:center;">${m.nombre}</b>
                <div style="display:flex; justify-content:space-between; font-size:0.95em; border-top:1px solid #333; padding-top:8px;">
                    <span style="color:#aaa;">Fuerza: <b style="color:#ffaa00;">${m.fuerza}</b></span>
                    <span style="color:#aaa;">Agilidad: <b style="color:#44ff44;">${m.agilidad}</b></span>
                </div>
            </div>`;
    }
    htmlWiki += `</div>`;

    contenedor.innerHTML = htmlWiki;
    document.getElementById("modal-codice").style.display = "flex";
}

// ==========================================
// 🎯 MOTOR GLOBAL DE TOOLTIPS
// ==========================================
export function iniciarMotorTooltips() {
    const tooltip = document.getElementById("custom-tooltip"); // 👈 VOLVIÓ AL ID ORIGINAL
    if(!tooltip) return;

    // Cuando el mouse ENTRA a un elemento
    document.addEventListener("mouseover", (e) => {
        const target = e.target.closest("[data-tooltip]");
        if(target) {
            tooltip.innerHTML = target.getAttribute("data-tooltip");
            tooltip.style.display = "block";
        }
    });

    // Cuando el mouse SE MUEVE adentro del elemento
    document.addEventListener("mousemove", (e) => {
        if(tooltip.style.display === "block") {
            tooltip.style.left = (e.pageX + 15) + "px";
            tooltip.style.top = (e.pageY + 15) + "px";
        }
    });

    // Cuando el mouse SALE del elemento
    document.addEventListener("mouseout", (e) => {
        const target = e.target.closest("[data-tooltip]");
        if(target) tooltip.style.display = "none";
    });
}