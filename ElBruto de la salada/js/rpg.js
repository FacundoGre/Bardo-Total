import { guardarProgresoDB } from "./db.js";
import { Arsenal, Armeria, Bestiario } from "./motor.js";
import { cambiarVista, renderizarMiHub } from "./ui.js";

// ==========================================
// SISTEMA DE TOOLTIP PERSONALIZADO
// ==========================================
function asignarTooltipPersonalizado(boton, contenidoHTML) {
    const tooltip = document.getElementById("custom-tooltip");
    
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
    boton.onmouseout = () => {
        tooltip.style.display = "none";
    };
}

// ==========================================
// EL MERCADO NEGRO
// ==========================================
export function initMercado(jugador) {
    cambiarVista('vista-mercado');
    document.getElementById('mercado-oro').innerText = jugador.oro;
    
    const ulArmas = document.getElementById('mercado-armas'); 
    ulArmas.innerHTML = "";
    Object.values(Arsenal).forEach(item => {
        const li = document.createElement("li");
        
        // 👇 TOOLTIP MÁGICO PARA EL MERCADO 👇
        let efectoTxt = "";
        if (item.efecto) {
            let descEfecto = `Inflige ${item.efecto.dañoTurno} de daño por ${item.efecto.turnos} turnos.`;
            efectoTxt = ` | <span data-tooltip="${descEfecto}" style="color:#ff77ff; cursor:help; text-decoration:underline dotted;">✨ ${item.efecto.tipo.toUpperCase()}</span>`;
        }

        li.innerHTML = `<strong>${item.nombre}</strong><br><span style="font-size:0.85em; color:#ccc;">⚔️ +${item.bonoDaño} Fue | 🏃 -${item.penalidadAgilidad} Agi${efectoTxt}</span><br><span style="color:gold;">💰 ${item.precio}</span> `;
        const btn = document.createElement("button"); 
        btn.className = "btn-accion"; 
        btn.innerText = "Comprar";
        btn.onclick = () => {
            comprarItem(jugador, 'arma', item);
            // Oculta el tooltip al hacer click
            const tooltipJuego = document.getElementById("custom-tooltip");
            if(tooltipJuego) tooltipJuego.style.display = "none";
        };
        li.appendChild(btn); 
        ulArmas.appendChild(li);
    });

    const ulArmaduras = document.getElementById('mercado-armaduras'); 
    ulArmaduras.innerHTML = "";
    Object.values(Armeria).forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${item.nombre}</strong><br><span style="font-size:0.85em; color:#ccc;">🛡️ ${item.mitigacion*100}% Def | 🏃 -${item.penalidadAgilidad} Agi</span><br><span style="color:gold;">💰 ${item.precio}</span> `;
        const btn = document.createElement("button"); 
        btn.className = "btn-accion"; 
        btn.innerText = "Comprar";
        btn.onclick = () => comprarItem(jugador, 'armadura', item);
        li.appendChild(btn); 
        ulArmaduras.appendChild(li);
    });

    const ulMascotas = document.getElementById('mercado-mascotas'); 
    ulMascotas.innerHTML = "";
    Object.values(Bestiario).forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${item.nombre}</strong><br><span style="font-size:0.85em; color:#ccc;">🐾 +${item.fuerza} Fue | ⚡ ${item.agilidad} Agi</span><br><span style="color:gold;">💰 ${item.precio}</span> `;
        const btn = document.createElement("button"); 
        btn.className = "btn-accion"; 
        btn.innerText = "Comprar";
        btn.onclick = () => comprarItem(jugador, 'mascota', item);
        li.appendChild(btn); 
        ulMascotas.appendChild(li);
    });
}
async function comprarItem(jugador, tipo, item) {
    if(jugador.oro < item.precio) return alert("¡No tienes suficiente oro para eso, escoria!");
    
    jugador.oro -= item.precio;
    if(tipo === 'arma') jugador.inventario.push(item);
    if(tipo === 'armadura') jugador.armaduras.push(item);
    if(tipo === 'mascota') jugador.mascotas.push(item);
    
    document.getElementById('mercado-oro').innerText = jugador.oro;
    await guardarProgresoDB(jugador);
    alert(`¡Has adquirido ${item.nombre}!`);
}

// ==========================================
// EL ARMARIO (Inventario Personal)
// ==========================================
export function renderizarArmario(jugador) {
    const div = document.getElementById("hub-armario");
    div.innerHTML = "";
    if (jugador.inventario.length === 0 && jugador.armaduras.length === 0 && jugador.mascotas.length === 0) {
        div.innerHTML = "<p style='color:#555; width:100%; text-align:center;'>No tienes nada. Gana oro en la arena.</p>"; return;
    }
    
    // ==========================================
    // 🗡️ ARMAS
    // ==========================================
    jugador.inventario.forEach((armaGuardada) => {
        // Buscamos la versión OFICIAL del arma en motor.js
        const arma = Object.values(Arsenal).find(a => a.nombre === armaGuardada.nombre);
        if (!arma) return; // Si la borraste del juego, ni la muestra

        const equipada = jugador.armaEquipada?.nombre === arma.nombre;
        const btn = document.createElement("button");
        btn.className = equipada ? "btn-accion btn-campeon" : "btn-accion";
        btn.innerText = `🗡️ ${arma.nombre}`;
        
        let textoHover = `<strong style="color:gold;">${arma.nombre}</strong><br>⚔️ Daño: +${arma.bonoDaño}<br>🏃 Agilidad: -${arma.penalidadAgilidad}`;
        if(arma.efecto) textoHover += `<br><span style="color:#ff4757;">✨ Efecto: ${arma.efecto.tipo.toUpperCase()}</span>`;
        
        btn.setAttribute("data-tooltip", textoHover);

        btn.onclick = async () => {
            // Equipamos la versión OFICIAL (arma), no la desactualizada (armaGuardada)
            jugador.armaEquipada = equipada ? null : arma;
            await guardarProgresoDB(jugador); 
            renderizarMiHub(jugador); 
            renderizarArmario(jugador);
            
            const tooltipJuego = document.getElementById("custom-tooltip");
            if(tooltipJuego) tooltipJuego.style.display = "none"; 
        };
        div.appendChild(btn);
    });
    
    // ==========================================
    // 🛡️ ARMADURAS
    // ==========================================
    jugador.armaduras.forEach((armaduraGuardada) => {
        const armadura = Object.values(Armeria).find(a => a.nombre === armaduraGuardada.nombre);
        if (!armadura) return;

        const equipada = jugador.armaduraEquipada?.nombre === armadura.nombre;
        const btn = document.createElement("button");
        btn.className = equipada ? "btn-accion btn-campeon" : "btn-accion";
        btn.innerText = `🛡️ ${armadura.nombre}`;
        
        let textoHover = `<strong style="color:gold;">${armadura.nombre}</strong><br>🛡️ Defensa: ${armadura.mitigacion*100}% absorción<br>🏃 Agilidad: -${armadura.penalidadAgilidad}`;
        btn.setAttribute("data-tooltip", textoHover);
        
        btn.onclick = async () => {
            jugador.armaduraEquipada = equipada ? null : armadura;
            await guardarProgresoDB(jugador); 
            renderizarMiHub(jugador); 
            renderizarArmario(jugador);
            
            const tooltipJuego = document.getElementById("custom-tooltip");
            if(tooltipJuego) tooltipJuego.style.display = "none";
        };
        div.appendChild(btn);
    });

    // ==========================================
    // 🐺 MASCOTAS
    // ==========================================
    jugador.mascotas.forEach((mascotaGuardada) => {
        const mascota = Object.values(Bestiario).find(m => m.nombre === mascotaGuardada.nombre);
        if (!mascota) return;

        const equipada = jugador.mascotaActiva?.nombre === mascota.nombre;
        const btn = document.createElement("button");
        btn.className = equipada ? "btn-accion btn-campeon" : "btn-accion";
        btn.innerText = `🐺 ${mascota.nombre}`;
        
        let textoHover = `<strong style="color:gold;">${mascota.nombre}</strong><br>🐾 Daño Base: ${mascota.fuerza}<br>⚡ Agilidad de ataque: ${mascota.agilidad}`;
        btn.setAttribute("data-tooltip", textoHover);
        
        btn.onclick = async () => {
            jugador.mascotaActiva = equipada ? null : mascota;
            await guardarProgresoDB(jugador); 
            renderizarMiHub(jugador); 
            renderizarArmario(jugador);
            
            const tooltipJuego = document.getElementById("custom-tooltip");
            if(tooltipJuego) tooltipJuego.style.display = "none";
        };
        div.appendChild(btn);
    });
}

// ==========================================
// SUBIDA DE NIVEL
// ==========================================
export async function subirStatRPG(jugador, stat) {
    if (jugador.puntosStat <= 0) return;
    jugador.puntosStat--;
    if(stat === 'fuerza') jugador.fuerza++;
    if(stat === 'agilidad') jugador.agilidadBase++;
    if(stat === 'velocidad') jugador.velocidad++;
    await guardarProgresoDB(jugador);
    renderizarMiHub(jugador);
}