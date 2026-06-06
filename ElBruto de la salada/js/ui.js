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

        const divPasivas = document.getElementById("hub-pasivas-lista");
        if (divPasivas) {
            divPasivas.innerHTML = "";
            if (jugador.pasivas && jugador.pasivas.length > 0) {
                jugador.pasivas.forEach(pId => {
                    const info = PasivasDisponibles[pId];
                    if (info) {
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
    const trailDiv = document.getElementById(`hp-trail${numPanel}`); 
    const healDiv = document.getElementById(`hp-heal${numPanel}`); 
    const pct = Math.max(0, (jugador.vidaActual / jugador.vidaMaxima) * 100);
    
    // --- LÓGICA DE BARRA ---
    if (hpDiv) {
        if (parseFloat(hpDiv.style.width) < pct) {
            if (healDiv) { 
                healDiv.style.width = `${pct - parseFloat(hpDiv.style.width)}%`;
                setTimeout(() => { healDiv.style.width = "0%"; }, 500);
            }
        }
        hpDiv.style.width = `${pct}%`;
    }
    
    if (trailDiv) {
        setTimeout(() => { trailDiv.style.width = `${pct}%`; }, 400); 
    }

    // --- ALARMA LOW HP (Latido) ---
    const avatarImg = document.getElementById(`avatar${numPanel}`);
    if (avatarImg) {
        const panel = avatarImg.closest('.panel-luchador'); 
        if (panel) {
            if (pct < 20 && pct > 0) panel.classList.add('anim-low-hp');
            else panel.classList.remove('anim-low-hp');
        }
    }

    const txtHp = document.getElementById(`texto-hp${numPanel}`);
    if (txtHp) txtHp.innerText = `${Math.max(0, Math.floor(jugador.vidaActual))}/${jugador.vidaMaxima} HP`;

    let claseDiv = `div-${jugador.division.toLowerCase()}`;
    const titulo = calcularTitulo(jugador.elo);
    const titleDiv = document.getElementById(`titulo${numPanel}`);
    if (titleDiv) titleDiv.innerHTML = `🏆 <span class="${claseDiv}">${titulo}</span>`;
    
    const avatarDiv = document.getElementById(`avatar${numPanel}`);
    if (avatarDiv) {
        avatarDiv.innerHTML = renderizarSVG(jugador.avatar);
        
        // 👇 ACA ESTÁ LA MAGIA ARREGLADA: Los vivos se limpian, los muertos se quedan muertos 👇
        if (jugador.vidaActual > 0) {
            avatarDiv.classList.remove('anim-muerte', 'anim-atacar-izq', 'anim-atacar-der', 'anim-daño', 'anim-cura', 'anim-esquivar-izq', 'anim-esquivar-der');
        } else {
            avatarDiv.classList.remove('anim-atacar-izq', 'anim-atacar-der', 'anim-daño', 'anim-cura', 'anim-esquivar-izq', 'anim-esquivar-der');
            avatarDiv.classList.add('anim-muerte');
        }
    }

    let cartelRacha = jugador.rachaActual >= 2 ? ` | <span style="color:#ff3333; font-weight:bold;">🔥 ${jugador.rachaActual}</span>` : "";
    const recDiv = document.getElementById(`record${numPanel}`);
    if (recDiv) recDiv.innerHTML = `<span class="${claseDiv}" style="font-weight:bold;">${jugador.division}</span> | ${jugador.elo} Elo ${cartelRacha}<br>🏆 ${jugador.victorias} | 💀 ${jugador.derrotas}`;
}

export async function pausar(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

export function bloquearBotones(estado) {
    const btn1 = document.getElementById("btn-pelear"); if (btn1) btn1.disabled = estado;
    const btn2 = document.getElementById("btn-desafiar"); if (btn2) btn2.disabled = estado;
}

export function mostrarAlerta(mensaje, textoBoton = "OK", callback = null) {
    const modal = document.getElementById("modal-confirmacion");
    
    const inputPrompt = document.getElementById("modal-conf-input");
    if (inputPrompt) inputPrompt.style.display = "none";

    document.getElementById("modal-conf-texto").innerHTML = mensaje; 
    
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
    
    const inputPrompt = document.getElementById("modal-conf-input");
    if (inputPrompt) inputPrompt.style.display = "none";

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
    
    btnSi.addEventListener("click", () => { 
        modal.style.display = "none"; 
        callbackAccion(); 
    });
    btnNo.addEventListener("click", () => { 
        modal.style.display = "none"; 
    });
}

export function mostrarPrompt(mensaje, placeholder = "") {
    return new Promise((resolve) => {
        const modal = document.getElementById("modal-confirmacion");
        document.getElementById("modal-conf-texto").innerText = mensaje;
        
        const inputPrompt = document.getElementById("modal-conf-input");
        if (inputPrompt) {
            inputPrompt.value = "";             
            inputPrompt.placeholder = placeholder;
            inputPrompt.style.display = "block"; 
            setTimeout(() => inputPrompt.focus(), 50); 
        }

        const btnSiViejo = document.getElementById("modal-conf-si");
        const btnNoViejo = document.getElementById("modal-conf-no");
        
        btnSiViejo.replaceWith(btnSiViejo.cloneNode(true));
        btnNoViejo.replaceWith(btnNoViejo.cloneNode(true));
        
        const btnSi = document.getElementById("modal-conf-si");
        const btnNo = document.getElementById("modal-conf-no");
        
        btnSi.innerText = "Aceptar";
        btnNo.style.display = "inline-block";
        btnNo.innerText = "Cancelar"; 
        modal.style.display = "flex";

        const manejarEnter = (evento) => {
            if (evento.key === "Enter") {
                evento.preventDefault(); 
                btnSi.click(); 
            }
        };

        if (inputPrompt) {
            inputPrompt.addEventListener("keydown", manejarEnter);
        }
        
        btnSi.addEventListener("click", () => {
            modal.style.display = "none";
            const valorIngresado = inputPrompt ? inputPrompt.value : "";
            if (inputPrompt) {
                inputPrompt.removeEventListener("keydown", manejarEnter); 
                inputPrompt.style.display = "none";
            }
            btnSi.innerText = "Sí"; 
            btnNo.innerText = "No";  
            resolve(valorIngresado); 
        });
        
        btnNo.addEventListener("click", () => {
            modal.style.display = "none";
            if (inputPrompt) {
                inputPrompt.removeEventListener("keydown", manejarEnter); 
                inputPrompt.style.display = "none";
            }
            btnSi.innerText = "Sí"; 
            btnNo.innerText = "No";  
            resolve(null); 
        });
    });
}

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

function obtenerLigaSVG(division) {
    let divLow = division.toLowerCase();
    let svg = "";
    
    switch(divLow) {
        case 'hierro':
            svg = `<svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 2px #2c3e50);"><path d="M21 11c0-2.5-2-5-5-5H8c-2.5 0-5 2.5-5 5v2h18v-2zm-9 4H8v6h4v-6z" fill="#7f8c8d"/></svg>`;
            break;
        case 'bronce':
            svg = `<svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 2px #a0522d);"><circle cx="12" cy="12" r="10" fill="#cd7f32"/><circle cx="12" cy="12" r="7" fill="#8b4513"/><circle cx="12" cy="12" r="3" fill="#cd7f32"/></svg>`;
            break;
        case 'plata':
            svg = `<svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 3px #aaa);"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="#bdc3c7"/><path d="M12 3v18c4-1 7-5 7-10V6l-7-3z" fill="#95a5a6"/></svg>`;
            break;
        case 'oro':
            svg = `<svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 4px #ffaa00);"><path d="M5 16h14l-2-9-4 3-2-6-2 6-4-3-2 9zm-2 2h18v2H3v-2z" fill="#f1c40f"/></svg>`;
            break;
        case 'platino':
            svg = `<svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 5px #00e5ff);"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#00e5ff"/></svg>`;
            break;
        case 'diamante':
            svg = `<svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px; filter:drop-shadow(0 0 5px #2980b9);"><path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5l5.5 5H6.5L12 5.5z" fill="#3498db"/></svg>`;
            break;
        case 'leyenda':
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
        }); 

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

export function abrirCodice() {
    const contenedor = document.getElementById("contenido-codice");
    let htmlWiki = "";

    const estiloCard = "background:#1a1a1a; border:1px solid #333; border-radius:8px; padding:15px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display:flex; flex-direction:column; justify-content:center;";
    const estiloGrid = "display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; margin-bottom: 30px;";

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

    htmlWiki += `
        <h3 style="color:#44ff44; font-size:1.5em; border-bottom:1px solid #44ff44; padding-bottom:5px; margin-top:25px;">⚔️ Arsenal de Armas</h3>
        <div style="${estiloGrid}">
    `;
    for (const key in Arsenal) {
        let a = Arsenal[key];
        let efectoTxt = "";
        
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

export function iniciarMotorTooltips() {
    const tooltip = document.getElementById("custom-tooltip");
    if(!tooltip) return;

    document.addEventListener("mouseover", (e) => {
        const target = e.target.closest("[data-tooltip]");
        if(target) {
            tooltip.innerHTML = target.getAttribute("data-tooltip");
            tooltip.style.display = "block";
        }
    });

    document.addEventListener("mousemove", (e) => {
        if(tooltip.style.display === "block") {
            tooltip.style.left = (e.pageX + 15) + "px";
            tooltip.style.top = (e.pageY + 15) + "px";
        }
    });

    document.addEventListener("mouseout", (e) => {
        const target = e.target.closest("[data-tooltip]");
        if(target) tooltip.style.display = "none";
    });
}

// ==========================================
// 🎬 SISTEMA DE ANIMACIONES VISUALES (JUICE)
// ==========================================
export function animarAvatar(numPanel, animacion) {
    const avatar = document.getElementById(`avatar${numPanel}`);
    if (!avatar) return;
    
    if (avatar.classList.contains('anim-muerte')) return;

    avatar.classList.remove('anim-atacar-izq', 'anim-atacar-der', 'anim-daño', 'anim-cura', 'anim-esquivar-izq', 'anim-esquivar-der');
    void avatar.offsetWidth; 
    avatar.classList.add(animacion);
}

export function animarShake() {
    const arena = document.querySelector(".arena");
    if (!arena) return;
    arena.classList.remove("anim-shake");
    void arena.offsetWidth;
    arena.classList.add("anim-shake");
}

export function flashCritico() {
    const flash = document.getElementById("pantalla-flash");
    if (!flash) return;
    flash.classList.remove("anim-flash");
    void flash.offsetWidth;
    flash.classList.add("anim-flash");
}

export function mostrarTextoFlotante(numPanel, texto, tipo = "float-dmg") {
    const avatar = document.getElementById(`avatar${numPanel}`);
    if (!avatar) return;
    
    const span = document.createElement("span");
    span.className = `floating-text ${tipo}`;
    span.innerHTML = texto;
    
    const offsetX = (Math.random() - 0.5) * 60;
    span.style.marginLeft = `${offsetX}px`;
    avatar.parentElement.appendChild(span);
    setTimeout(() => span.remove(), 1200);
}

export function mostrarVFX(numPanel, emoji) {
    const avatar = document.getElementById(`avatar${numPanel}`);
    if (!avatar) return;
    
    const span = document.createElement("span");
    span.className = `hit-vfx`;
    span.innerHTML = emoji;
    avatar.parentElement.appendChild(span);
    setTimeout(() => span.remove(), 500);
}

export function mostrarCombo(numPanel, hits) {
    const avatar = document.getElementById(`avatar${numPanel}`);
    if (!avatar) return;
    const span = document.createElement("span");
    span.className = `combo-text`;
    span.innerHTML = `<span style="font-size:0.5em; color:#fff;">COMBO</span><br>x${hits}`;
    
    span.style.left = numPanel === 1 ? "-20px" : "80%";
    
    avatar.parentElement.appendChild(span);
    setTimeout(() => span.remove(), 800);
}

export function lanzarChispas(numPanel, cantidad = 10) {
    const avatar = document.getElementById(`avatar${numPanel}`);
    if (!avatar) return;

    for (let i = 0; i < cantidad; i++) {
        const spark = document.createElement("div");
        spark.style.cssText = `
            position: absolute; width: 6px; height: 6px; background: ${Math.random() > 0.5 ? '#ffaa00' : '#ff3333'};
            z-index: 200; pointer-events: none;
        `;
        avatar.parentElement.appendChild(spark);

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 10 + 5;
        let x = 50, y = 50, vx = Math.cos(angle) * velocity, vy = Math.sin(angle) * velocity;

        let frame = setInterval(() => {
            x += vx; y += vy; vy += 0.5; // Gravedad
            spark.style.left = `${x}%`; spark.style.top = `${y}%`;
            spark.style.opacity -= 0.05;
            if (spark.style.opacity <= 0) { clearInterval(frame); spark.remove(); }
        }, 20);
    }
}

// ==========================================
// 🎵 MOTOR DE AUDIO CENTRAL (BRUTO 64 NATIVO)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Generador de texturas de audio digital rústico
function generate64Buffer(type, duration, customSR = 12000) {
    const sampleRate = audioCtx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    
    const skip = Math.floor(sampleRate / customSR);
    let lastVal = 0;

    for (let i = 0; i < bufferSize; i++) {
        if (i % skip === 0) {
            const t = i / sampleRate;
            
            if (type === 'clean_punch') {
                const crack = (Math.random() * 2 - 1) * Math.exp(-350 * t) * 1.2;
                const body = Math.sin(2 * Math.PI * (90 + 140 * Math.exp(-40 * t)) * t) * Math.exp(-28 * t);
                const thump = Math.sin(2 * Math.PI * 55 * t) * Math.exp(-18 * t) * 0.8;
                const mix = crack + body + thump;
                lastVal = Math.tanh(mix * 2.8);

            } else if (type === 'vamp_core') {
                const freqMod = 120 + Math.sin(2 * Math.PI * 12 * t) * 60 + Math.sin(2 * Math.PI * 27 * t) * 20;
                const core = Math.sin(2 * Math.PI * freqMod * t);
                const undertone = Math.sin(2 * Math.PI * 70 * t) * 0.35;
                const grit = (Math.random() * 2 - 1) * 0.25;
                lastVal = (core + undertone + grit) * Math.exp(-2.8 * t);

            } else if (type === 'pure_wind') {
                const noise = (Math.random() * 2 - 1);
                const shape = Math.sin(Math.PI * Math.min(t / 0.12, 1));
                lastVal = noise * shape * Math.exp(-5 * t);

            } else if (type === 'critical_combo') {
                const air = (Math.random() * 2 - 1) * Math.exp(-120 * t) * 0.8;
                const crack = (Math.random() * 2 - 1) * Math.exp(-220 * t);
                const resonance = Math.sin(2 * Math.PI * 900 * t) * Math.exp(-80 * t) * 0.25;
                const thud = Math.sin(2 * Math.PI * (55 + 50 * Math.exp(-18 * t)) * t) * Math.exp(-10 * t);
                lastVal = Math.tanh(air + crack + resonance + (thud * 1.6));

            } else if (type === 'ko_brass') {
                const f1 = Math.sin(2 * Math.PI * 115 * t);
                const f2 = Math.sin(2 * Math.PI * 165 * t) * 0.6;
                const f3 = Math.sin(2 * Math.PI * 230 * t) * 0.4;
                lastVal = (f1 + f2 + f3) * Math.exp(-2.2 * t);

            } else if (type === 'ko_thud') {
                lastVal = Math.sin(2 * Math.PI * 45 * t) * Math.exp(-7 * t) * 1.5;
            }
        }
        data[i] = Math.max(-0.95, Math.min(0.95, lastVal * 1.5));
    }
    return buffer;
}

// Banco de memoria de texturas cargadas al inicio
const Bank = {
    punch: generate64Buffer('clean_punch', 0.25, 12000),
    vamp: generate64Buffer('vamp_core', 0.5, 12000),
    wind: generate64Buffer('pure_wind', 0.3, 12000),
    criticalCombo: generate64Buffer('critical_combo', 0.3, 22000), 
    ko_brass: generate64Buffer('ko_brass', 1.2, 12000),
    ko_thud: generate64Buffer('ko_thud', 0.8, 12000)
};

/**
 * Procesador de Nodos Dinámicos N64
 */
export function playSFX({ buffer, pitch, pitchEnd = null, duration, filterFreq, filterEnd = null, filterType = 'lowpass', vol, delay = 0, eco = false, swooshSweep = false }) {
    setTimeout(() => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const ahora = audioCtx.currentTime;

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        
        source.playbackRate.setValueAtTime(pitch, ahora);
        if (pitchEnd) {
            source.playbackRate.exponentialRampToValueAtTime(pitchEnd, ahora + duration);
        }

        const filter = audioCtx.createBiquadFilter();
        filter.type = filterType;
        
        if (swooshSweep) {
            filter.Q.setValueAtTime(5, ahora); 
            filter.frequency.setValueAtTime(350, ahora);
            filter.frequency.exponentialRampToValueAtTime(1900, ahora + duration * 0.3);
            filter.frequency.exponentialRampToValueAtTime(200, ahora + duration);
        } else {
            const endFreq = filterEnd !== null ? filterEnd : Math.max(40, filterFreq * 0.1);
            filter.frequency.setValueAtTime(filterFreq, ahora);
            filter.frequency.exponentialRampToValueAtTime(filterFreq * 0.4, ahora + duration * 0.3);
            filter.frequency.exponentialRampToValueAtTime(endFreq, ahora + duration);
            filter.Q.setValueAtTime(5, ahora);
        }

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.001, ahora);
        gain.gain.linearRampToValueAtTime(vol, ahora + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + duration);

        source.connect(filter);
        filter.connect(gain);

        if (eco) {
            const delayNode = audioCtx.createDelay();
            const feedback = audioCtx.createGain();
            delayNode.delayTime.setValueAtTime(0.06, ahora);
            feedback.gain.setValueAtTime(0.45, ahora);
            filter.connect(delayNode);
            delayNode.connect(feedback);
            feedback.connect(delayNode);
            delayNode.connect(gain);
        }

        gain.connect(audioCtx.destination);
        source.start(ahora);
        source.stop(ahora + duration);
    }, delay);
}

export const SFX = {
    golpe: () => {
        playSFX({ buffer: Bank.wind, pitch: 2.2, vol: 0.3, duration: 0.03, filterFreq: 5000 });
        playSFX({ buffer: Bank.punch, pitch: 1.35, vol: 0.8, duration: 0.06, filterFreq: 3000 });
        playSFX({ buffer: Bank.punch, pitch: 0.95, vol: 1.4, duration: 0.11, filterFreq: 1400 });
        playSFX({ buffer: Bank.punch, pitch: 0.55, vol: 1.7, duration: 0.16, filterFreq: 450, delay: 6 });
    },
    
    cura: () => {
        playSFX({ buffer: Bank.vamp, pitch: 0.6, vol: 1.0, duration: 0.45, filterFreq: 850, eco: true });
        playSFX({ buffer: Bank.punch, pitch: 1.3, vol: 0.4, duration: 0.12, filterFreq: 1100, delay: 40 });
    },
    
    esquive: () => {
        playSFX({
            buffer: Bank.wind,
            pitch: 1.3,
            pitchEnd: 0.6,
            vol: 1.7,
            duration: 0.20,
            filterFreq: 2000,
            filterType: 'bandpass',
            swooshSweep: true
        });
        playSFX({
            buffer: Bank.wind,
            pitch: 0.7,
            vol: 0.3,
            duration: 0.15,
            filterFreq: 700,
            delay: 15
        });
    },
    
    critico: () => {
        // 1. Aire inicial veloz (ffff...)
        playSFX({ buffer: Bank.wind, pitch: 3.0, vol: 0.25, duration: 0.03, filterFreq: 6000 });

        // 2. KRAK-THOOM desfasado por tu delay táctico de 16ms
        playSFX({
            buffer: Bank.criticalCombo,
            pitch: 1.0,
            vol: 2.0,
            duration: 0.22,
            filterFreq: 4200, 
            filterEnd: 150,   
            delay: 16         
        });
    },
    
    muerte: () => {
        playSFX({ buffer: Bank.punch, pitch: 0.5, vol: 1.5, duration: 0.6, filterFreq: 400, eco: true });
        playSFX({ buffer: Bank.ko_thud, pitch: 0.3, vol: 0.9, duration: 0.8, filterFreq: 300, delay: 30, eco: true });
        playSFX({ buffer: Bank.ko_brass, pitch: 0.75, pitchEnd: 0.5, vol: 1.1, duration: 1.2, filterFreq: 900, delay: 180, eco: true });
        playSFX({ buffer: Bank.vamp, pitch: 0.25, vol: 0.45, duration: 1.0, filterFreq: 300, delay: 220, eco: true });
    }
};