import { iniciarEscuchaRanking, iniciarEscuchaHistorial, cerrarPerfil, cambiarVista, mostrarAlerta, abrirRankingCompleto, abrirCodice, iniciarMotorTooltips } from "./ui.js";
import { inicializarCreador, crearNuevoLuchador, modificarStat, caosTotal } from "./creador.js";
import { ejecutarCombatePropio, ejecutarDesafioCampeonPropio } from "./combates.js";
import { loginGoogle, registrarFantasma, loginGenerico, cerrarSesion, miGladiador } from "./auth.js";
import { initMercado, subirStatRPG } from "./rpg.js";
import { initEvento, pelearContraJefe, salirEvento } from "./eventos.js";
import { abrirPanelAdmin, bindAdminEvents } from "./admin.js";
import { inicializarSastreria, abrirSastreria, intentarSalirSastreria, guardarApariencia } from "./sastreria.js";
import { trasplantarAlma } from "./db.js"; // 👈 AGREGAR ESTA LÍNEA
import { db, doc, getDoc } from "./firebase.js";

iniciarEscuchaRanking();
iniciarEscuchaHistorial();
inicializarCreador();
inicializarSastreria();
iniciarMotorTooltips(); // TOOLTIPS CUSTOM

function enchufar(id, accion, tipoEvento = "click") {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.addEventListener(tipoEvento, accion);
    } else {
        console.warn(`Zapatilla: El elemento '${id}' no existe. Omitido.`);
    }
}

// 🔐 AUTH (Conectados a tu HTML personalizado)
enchufar("btn-login-google", loginGoogle);
enchufar("btn-login-entrar", () => {
    const id = document.getElementById("login-id").value.trim();
    const pass = document.getElementById("login-pass").value;
    if (id && pass) loginGenerico(id, pass);
    else mostrarAlerta("Llená los campos, cobarde.", "OK");
});
enchufar("btn-login-fantasma", () => {
    const id = document.getElementById("login-id").value.trim();
    const pass = document.getElementById("login-pass").value;
    if (id && pass) registrarFantasma(id, pass);
    else mostrarAlerta("Escribí un nombre de gladiador y contraseña.", "OK");
});
enchufar("btn-login-email", () => {
    const id = document.getElementById("login-id").value.trim();
    const pass = document.getElementById("login-pass").value;
    if (id.includes('@') && pass) import("./auth.js").then(m => m.registrarEmailReal(id, pass));
    else mostrarAlerta("Debes escribir un correo válido (con @) y contraseña.", "ENTENDIDO");
});
enchufar("btn-logout", cerrarSesion);

// 🛠️ CREADOR (Vista Forja)
enchufar("btn-fuerza-mas", () => modificarStat("fuerza", 1));
enchufar("btn-fuerza-menos", () => modificarStat("fuerza", -1));
enchufar("btn-agilidad-mas", () => modificarStat("agilidad", 1));
enchufar("btn-agilidad-menos", () => modificarStat("agilidad", -1));
enchufar("btn-velocidad-mas", () => modificarStat("velocidad", 1));
enchufar("btn-velocidad-menos", () => modificarStat("velocidad", -1));
enchufar("btn-caos", caosTotal);
enchufar("btn-crear", crearNuevoLuchador);

// 🏕️ HUB & ARENA
// 🏕️ HUB & ARENA
enchufar("btn-pelear", async () => { 
    // 👇 ADUANA Y ANTI-F5
    try {
        const configSnap = await getDoc(doc(db, "servidor", "configAdmin"));
        if(configSnap.exists()) {
            const reglas = configSnap.data();
            
            // Regla 1: Temporadas
            if(reglas.seasonActiva && reglas.fechaSeason) {
                const hoy = new Date().toISOString().split('T')[0]; 
                if(hoy >= reglas.fechaSeason) return mostrarAlerta("⚔️ LA TEMPORADA HA FINALIZADO...", "Aceptar el destino");
            }

            // Regla 2: Anti-F5 (Reloj en vivo)
            if(reglas.antiF5) {
                let tiempoPasado = Date.now() - miGladiador.timestampUltimaPelea;
                if(tiempoPasado < 15000) {
                    let espera = Math.ceil((15000 - tiempoPasado) / 1000);
                    
                    // Tiramos la alerta personalizada
                    mostrarAlerta(`⏳ Los Dioses están limpiando la sangre de tu última batalla.<br><br>Aguarda <b id="contador-f5" style="color:#ffaa00; font-size:1.5em;">${espera}</b> segundos.`, "Aceptar");
                    
                    // Magia del contador: Descuenta cada 1 segundo
                    let intervalo = setInterval(() => {
                        espera--;
                        let span = document.getElementById("contador-f5");
                        if(span) span.innerText = espera;
                        
                        if(espera <= 0) {
                            clearInterval(intervalo);
                            // Cierra la alerta solo
                            document.getElementById("modal-confirmacion").style.display = "none";
                        }
                    }, 1000);

                    return; // Frenamos acá, no entra a pelear
                }
            }
        }
    } catch(e) { console.warn("Aduana divina offline...", e); }

    const img = document.getElementById("titulo-arena-img");
    if(img) img.src = "recursos/pelearapida-titulo.svg"; 
    cambiarVista('vista-arena'); 
    ejecutarCombatePropio(); 
});

enchufar("btn-desafiar", async () => {
    // 👇 ADUANA (Misma protección para el desafío)
    try {
        const configSnap = await getDoc(doc(db, "servidor", "configAdmin"));
        if (configSnap.exists()) {
            const reglas = configSnap.data();
            if (reglas.seasonActiva && reglas.fechaSeason) {
                const hoy = new Date().toISOString().split('T')[0];
                if (hoy >= reglas.fechaSeason) {
                    return mostrarAlerta("⚔️ LA TEMPORADA HA FINALIZADO ⚔️\nLos Dioses están calculando los rangos finales. La Arena permanecerá cerrada.", "Aceptar el destino");
                }
            }
        }
    } catch (e) { console.warn("Aduana divina offline, dejando pasar...", e); }
    // 👆 FIN ADUANA

    const img = document.getElementById("titulo-arena-img");
    if (img) img.src = "recursos/desafiar-titulo.svg";
    cambiarVista('vista-arena');
    ejecutarDesafioCampeonPropio();
});

enchufar("btn-volver-hub", () => { cambiarVista('vista-hub'); document.getElementById("btn-volver-hub").style.display = 'none'; });
enchufar("btn-cerrar-perfil", cerrarPerfil);

// 🛒 RPG & MERCADO
enchufar("btn-ir-mercado", () => initMercado(miGladiador));
enchufar("btn-salir-mercado", () => cambiarVista('vista-hub'));
enchufar("btn-up-fuerza", () => subirStatRPG(miGladiador, 'fuerza'));
enchufar("btn-up-agilidad", () => subirStatRPG(miGladiador, 'agilidad'));
enchufar("btn-up-velocidad", () => subirStatRPG(miGladiador, 'velocidad'));

// 🐉 EVENTOS (Jefe Mundial)
enchufar("btn-ir-evento", initEvento);
enchufar("btn-atacar-jefe", pelearContraJefe);
enchufar("btn-salir-evento", salirEvento);

// ✂️ SASTRERÍA
enchufar("btn-ir-sastreria", () => abrirSastreria(miGladiador));
enchufar("btn-sas-volver", intentarSalirSastreria);
enchufar("btn-sas-guardar", guardarApariencia);

// 👁️ MODO DIOS
enchufar("titulo-campamento", abrirPanelAdmin, "dblclick");
enchufar("btn-salir-admin", () => { cambiarVista('vista-hub'); });
bindAdminEvents();

enchufar("btn-ver-ranking", () => abrirRankingCompleto(miGladiador.id));
enchufar("btn-cerrar-ranking-top", () => document.getElementById("modal-ranking-completo").style.display = "none");

enchufar("btn-abrir-codice", abrirCodice);
enchufar("btn-cerrar-codice", () => document.getElementById("modal-codice").style.display = "none");