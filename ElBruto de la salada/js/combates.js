import { db, collection, query, orderBy, limit, getDocs, doc, getDoc } from "./firebase.js";
import { buscarOponentePorElo, actualizarHistorialDB, instanciarLuchadorDesdeDB, guardarProgresoDB } from "./db.js";
import { escribirLog, actualizarUI, bloquearBotones, pausar, renderizarMiHub } from "./ui.js";
import { miGladiador } from "./auth.js";
import { renderizarArmario } from "./rpg.js"; 
import { Luchador } from "./motor.js";
import { verificarObjetivos } from "./objetivos.js";

// 🛡️ CREA UN CLON LIMPIO PARA NO ROMPER EL INVENTARIO ORIGINAL
function clonarParaArena(luchador) {
    let c = new Luchador(luchador.nombre, luchador.vidaMaxima, luchador.fuerza, luchador.agilidadBase, luchador.velocidad);
    c.id = luchador.id; c.pasivas = [...luchador.pasivas]; c.inventario = [...luchador.inventario]; 
    c.mascotas = [...luchador.mascotas]; c.armaduraEquipada = luchador.armaduraEquipada; 
    c.vidaActual = c.vidaMaxima; c.estados = []; c.armaEquipada = null; c.mascotaActiva = null;
    c.avatar = luchador.avatar; c.division = luchador.division; c.elo = luchador.elo; 
    c.rachaActual = luchador.rachaActual; c.victorias = luchador.victorias; c.derrotas = luchador.derrotas;
    return c;
}

async function simularCombateVisual(jugadorA, jugadorB) {
    let clonA = clonarParaArena(jugadorA);
    let clonB = clonarParaArena(jugadorB);

    document.getElementById("nombre1").innerText = clonA.nombre; document.getElementById("nombre2").innerText = clonB.nombre;
    actualizarUI(clonA, 1); actualizarUI(clonB, 2);
    document.getElementById("log-combate").innerHTML = "";
    const configSnap = await getDoc(doc(db, "servidor", "configAdmin"));
    const antiF5Activo = configSnap.exists() ? configSnap.data().antiF5 : false; 
    document.getElementById("btn-volver-hub").style.display = 'none';

    // 1. ARMAMOS LA CINTA DE REPRODUCCIÓN (0 demoras)
    let lineaDeTiempo = []; 
    const registrar = (msg, tipo, pausa = 1000) => {
        lineaDeTiempo.push({ msg, tipo, hpA: clonA.vidaActual, hpB: clonB.vidaActual, pausa });
    };

    registrar(`🔥 ¡COMIENZA EL COMBATE EN LA ARENA! 🔥`, 'sistema', 1000);

    if (clonA.armaduraEquipada) registrar(`🛡️ ${clonA.nombre} entra vistiendo ${clonA.armaduraEquipada.nombre}.`, 'sistema', 500);
    if (clonB.armaduraEquipada) registrar(`🛡️ ${clonB.nombre} entra vistiendo ${clonB.armaduraEquipada.nombre}.`, 'sistema', 1000);

    let [atacante, defensor] = clonA.calcularIniciativa() >= clonB.calcularIniciativa() ? [clonA, clonB] : [clonB, clonA];
    registrar(`⚡ ${atacante.nombre} toma la iniciativa.`, 'sistema', 1000);

    // BUCLE MATEMÁTICO (Sin await, termina en 1 milisegundo)
    while (clonA.vidaActual > 0 && clonB.vidaActual > 0) {
        let tipoAtacante = (atacante === clonA) ? 'jugador' : 'enemigo';
        let tipoDefensor = (defensor === clonA) ? 'jugador' : 'enemigo';

        let logsEstados = atacante.procesarEstados();
        if (logsEstados.length > 0) { 
            registrar(logsEstados.join("<br>"), tipoAtacante, 800);
            if (atacante.vidaActual <= 0) break; 
        }

        if (atacante.intentarSacarArma()) registrar(`🎒 ¡${atacante.nombre} saca ${atacante.armaEquipada.nombre}!`, 'sistema', 800);

        let armaTxt = atacante.armaEquipada ? ` con ${atacante.armaEquipada.nombre}` : " a puño limpio";
        let mensajeTurno = `⚔️ ${atacante.nombre} ataca${armaTxt}...<br>`;
        
        if (!atacante.golpea(defensor)) { 
            mensajeTurno += `💨 ¡Pero falla!`; 
        } else {
            let dañoBruto = atacante.calcularDaño();
            if (atacante.pasivas.includes('berserker') && atacante.vidaActual <= 25) {
                dañoBruto = Math.floor(dañoBruto * 1.5); mensajeTurno += `<span style="color:#ff3333; font-weight:bold;">😡 ¡MODO BERSERKER!</span><br>`;
            }
            if (atacante.esCritico()) { dañoBruto = Math.floor(dañoBruto * 1.5); mensajeTurno += `<span style="color:gold;">💥 ¡CRÍTICO!</span><br>`; }

            let dañoFinal = dañoBruto;
            if (defensor.armaduraEquipada) {
                dañoFinal = Math.max(1, Math.floor(dañoBruto * (1 - defensor.armaduraEquipada.mitigacion)));
                if (dañoFinal < dañoBruto) mensajeTurno += `🛡️ Armadura absorbe ${dañoBruto - dañoFinal} dmg.<br>`;
            }

            defensor.vidaActual -= dañoFinal; if (defensor.vidaActual < 0) defensor.vidaActual = 0;
            mensajeTurno += `🩸 Impacto de <strong>${dañoFinal}</strong> daño.`;

            if (defensor.pasivas.includes('espinas') && dañoFinal > 0) {
                atacante.vidaActual -= 3; if (atacante.vidaActual < 0) atacante.vidaActual = 0;
                mensajeTurno += `<br>🌵 ¡${atacante.nombre} se pincha con espinas por 3 dmg!`;
            }
            if (atacante.pasivas.includes('vampirismo') && dañoFinal > 0 && atacante.vidaActual > 0) {
                let cura = Math.max(1, Math.floor(dañoFinal * 0.3)); atacante.vidaActual = Math.min(atacante.vidaMaxima, atacante.vidaActual + cura);
                mensajeTurno += `<br>🧛‍♂️ Absorbe ${cura} HP!`;
            }
            if (atacante.armaEquipada && atacante.armaEquipada.efecto && atacante.vidaActual > 0) {
                if (defensor.pasivas.includes('sangre_fria')) {
                    mensajeTurno += `<br>❄️ ¡Sangre Fría inmuniza a ${defensor.nombre} contra el efecto de ${atacante.armaEquipada.efecto.tipo}!`;
                } else {
                    defensor.estados.push({ ...atacante.armaEquipada.efecto });
                    let ic = atacante.armaEquipada.efecto.tipo === 'veneno' ? '☠️' : '🔥';
                    mensajeTurno += `<br>${ic} Aplica ${atacante.armaEquipada.efecto.tipo}!`;
                }
            }
        }

        registrar(mensajeTurno, tipoAtacante, 1200);
        if (defensor.vidaActual <= 0 || atacante.vidaActual <= 0) break; 

        if (defensor.vidaActual > 0 && defensor.pasivas.includes('contraataque') && Math.random() <= 0.25) {
            let dañoContra = Math.max(1, Math.floor(defensor.fuerza * 0.8)); atacante.vidaActual -= dañoContra; if (atacante.vidaActual < 0) atacante.vidaActual = 0;
            registrar(`💢 ¡CONTRAATAQUE de ${defensor.nombre} por ${dañoContra} daño!`, tipoDefensor, 1200);
            if (atacante.vidaActual <= 0) break;
        }

        if (atacante.intentarLlamarMascota()) registrar(`🐺 ¡${atacante.nombre} llama a ${atacante.mascotaActiva.nombre}!`, 'sistema', 800);

        if (atacante.mascotaActiva) {
            let dañoMascota = atacante.mascotaActiva.atacar(defensor);
            if (dañoMascota > 0) {
                let msgMascota = `🐾 ${atacante.mascotaActiva.nombre} ataca por <strong>${dañoMascota}</strong> daño.`;
                if (defensor.pasivas.includes('espinas')) {
                    atacante.vidaActual -= 3; if (atacante.vidaActual < 0) atacante.vidaActual = 0;
                    msgMascota += `<br>🌵 ¡Tu mascota se pincha con espinas! (-3 HP a ${atacante.nombre})`;
                }
                registrar(msgMascota, (tipoAtacante === 'jugador' ? 'mascota' : 'enemigo'), 1000);
            }
            else registrar(`💨 ${atacante.mascotaActiva.nombre} ataca, pero falla.`, (tipoAtacante === 'jugador' ? 'mascota' : 'enemigo'), 1000);
            if (defensor.vidaActual <= 0 || atacante.vidaActual <= 0) break;
        }

        [atacante, defensor] = [defensor, atacante]; 
    }

    // =======================================================
    // 2. CONTROL DEL PROGRESO Y EL ANTI-F5 (PREPARACIÓN)
    // =======================================================
    let ganadorClon = clonA.vidaActual > 0 ? clonA : clonB; 
    let ganadorReal = ganadorClon.id === jugadorA.id ? jugadorA : jugadorB;
    let perdedorReal = ganadorClon.id === jugadorA.id ? jugadorB : jugadorA;

    // Foto del Elo original antes de que cambie
    let eloAntesGanador = ganadorReal.elo; 
    let eloAntesPerdedor = perdedorReal.elo;

    // Inicializamos variables de diferencia que usaremos al final
    let eloGanado = 0;
    let eloPerdido = 0;

    let multiG = ganadorReal.buffPartidas > 0 ? 2 : 1; let multiP = perdedorReal.buffPartidas > 0 ? 2 : 1;
    let oroG = (50 + Math.floor(Math.random() * 20)) * multiG; let xpG = 35 * multiG;
    let oroP = (15 + Math.floor(Math.random() * 10)) * multiP; let xpP = 10 * multiP;
    
    // Aplicamos Oro y XP a los objetos en memoria
    ganadorReal.oro += oroG; let subioG = ganadorReal.ganarXP(xpG);
    perdedorReal.oro += oroP; let subioP = perdedorReal.ganarXP(xpP);

    if (ganadorReal.buffPartidas > 0) ganadorReal.buffPartidas--;
    if (perdedorReal.buffPartidas > 0) perdedorReal.buffPartidas--;

    // 👇 Si el Anti-F5 está PRENDIDO, impactamos la Base de Datos YA MISMO
    if (antiF5Activo) {
        await actualizarHistorialDB(ganadorReal, perdedorReal);
        await guardarProgresoDB(ganadorReal); await guardarProgresoDB(perdedorReal);
        await verificarObjetivos(ganadorReal); await verificarObjetivos(perdedorReal);

        // Calculamos la diferencia ya modificado el .elo
        eloGanado = ganadorReal.elo - eloAntesGanador; 
        eloPerdido = eloAntesPerdedor - perdedorReal.elo;
    }

    // =======================================================
    // 3. REPRODUCCIÓN VISUAL (La película de la pelea)
    // =======================================================
    for (let accion of lineaDeTiempo) {
        escribirLog(accion.msg, accion.tipo);
        clonA.vidaActual = accion.hpA; clonB.vidaActual = accion.hpB; 
        actualizarUI(clonA, 1); actualizarUI(clonB, 2);
        await pausar(accion.pausa);
    }

    // 👇 Si el Anti-F5 está APAGADO, impactamos la Base de Datos RECIÉN ACÁ
    if (!antiF5Activo) {
        await actualizarHistorialDB(ganadorReal, perdedorReal);
        await guardarProgresoDB(ganadorReal); await guardarProgresoDB(perdedorReal);
        await verificarObjetivos(ganadorReal); await verificarObjetivos(perdedorReal);

        // Calculamos la diferencia tras terminar la simulación
        eloGanado = ganadorReal.elo - eloAntesGanador; 
        eloPerdido = eloAntesPerdedor - perdedorReal.elo;
    }

    // =======================================================
    // 4. IMPRESIÓN DE RESULTADOS EN EL LOG
    // =======================================================
    escribirLog(`🏆 ¡${ganadorReal.nombre.toUpperCase()} ES EL VENCEDOR!`, 'sistema');
    let txtBuffG = multiG > 1 ? ` <span style="color:#ff3333;">(FURIA x2!)</span>` : "";
    let txtBuffP = multiP > 1 ? ` <span style="color:#ff3333;">(FURIA x2!)</span>` : "";

    escribirLog(`📈 +${eloGanado} Elo | 💰 +${oroG} Oro | 🌟 +${xpG} XP${txtBuffG}`, 'sistema');
    if (subioG) escribirLog(`🎉 ¡${ganadorReal.nombre} SUBIÓ A NIVEL ${ganadorReal.nivel}!`, 'sistema');
    escribirLog(`📉 -${eloPerdido} Elo | 💰 +${oroP} Oro | 🌟 +${xpP} XP${txtBuffP}`, 'sistema');
    if (subioP) escribirLog(`🎉 ¡${perdedorReal.nombre} SUBIÓ A NIVEL ${perdedorReal.nivel}!`, 'sistema');
    
    if (miGladiador) { renderizarMiHub(miGladiador); renderizarArmario(miGladiador); }
    document.getElementById("btn-volver-hub").style.display = 'inline-block';
}

export async function ejecutarCombatePropio() {
    if(!miGladiador) return;
    document.getElementById("btn-volver-hub").style.display = 'none';
    document.getElementById("log-combate").innerHTML = "<p style='text-align:center;'>Buscando un rival digno en la arena...</p>";
    bloquearBotones(true); 
    const rival = await buscarOponentePorElo(miGladiador.elo, miGladiador.id);
    if (!rival) { alert("Eres el único en la arena. Espera a que lleguen más gladiadores."); bloquearBotones(false); document.getElementById("btn-volver-hub").style.display = 'inline-block'; return; }
    await simularCombateVisual(miGladiador, rival);
    bloquearBotones(false);
}

export async function ejecutarDesafioCampeonPropio() {
    if(!miGladiador) return;
    document.getElementById("btn-volver-hub").style.display = 'none';
    document.getElementById("log-combate").innerHTML = "<p style='text-align:center;'>Buscando al Campeón Absoluto...</p>"; 
    bloquearBotones(true);
    try {
        const qCamp = query(collection(db, "luchadores"), orderBy("estadisticas.elo", "desc"), limit(1));
        const snapCamp = await getDocs(qCamp);
        if(snapCamp.empty) { alert("Aún no hay campeones."); bloquearBotones(false); document.getElementById("btn-volver-hub").style.display = 'inline-block'; return; }
        const campeon = instanciarLuchadorDesdeDB(snapCamp.docs[0]);
        if(campeon.id === miGladiador.id) { alert("¡Tú eres el Campeón Actual! Relájate en tu trono."); bloquearBotones(false); document.getElementById("btn-volver-hub").style.display = 'inline-block'; return; }
        await simularCombateVisual(miGladiador, campeon);
    } catch (e) { console.error("Error:", e); }
    bloquearBotones(false);
}