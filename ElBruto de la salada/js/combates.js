import { db, collection, query, orderBy, limit, getDocs, doc, getDoc } from "./firebase.js";
import { buscarOponentePorElo, actualizarHistorialDB, instanciarLuchadorDesdeDB, guardarProgresoDB } from "./db.js";
import { escribirLog, actualizarUI, bloquearBotones, pausar, renderizarMiHub, animarAvatar, animarShake, mostrarTextoFlotante, flashCritico, mostrarVFX, mostrarCombo, SFX } from "./ui.js";
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

    // BUCLE MATEMÁTICO DATA-DRIVEN (Con Hooks, sin awaits, para la cinta de reproducción)
    while (clonA.vidaActual > 0 && clonB.vidaActual > 0) {
        let tipoAtacante = (atacante === clonA) ? 'jugador' : 'enemigo';
        let tipoDefensor = (defensor === clonA) ? 'jugador' : 'enemigo';

        let logsEstados = atacante.procesarEstados();
        if (logsEstados.length > 0) { 
            registrar(logsEstados.join("<br>"), tipoAtacante, 800);
            if (atacante.vidaActual <= 0) break; 
        }

        if (atacante.intentarSacarArma()) registrar(`🎒 ¡${atacante.nombre} saca ${atacante.armaEquipada.nombre}!`, 'sistema', 800);
        
        // CHEQUEO DE EFECTOS DE CONTROL (STUN)
        let estaStuneado = false;
        atacante.estados.forEach(estado => {
            if (estado.chanceStun && Math.random() <= estado.chanceStun) {
                estaStuneado = true;
                registrar(`❄️ ¡${atacante.nombre} está inmovilizado por ${estado.tipo} y pierde su turno!`, 'sistema', 1200);
            }
        });

        if (estaStuneado) {
            [atacante, defensor] = [defensor, atacante]; 
            continue; // Salta al siguiente turno automáticamente
        }

        let armaTxt = atacante.armaEquipada ? ` con ${atacante.armaEquipada.nombre}` : " a puño limpio";
        let mensajeTurno = `⚔️ ${atacante.nombre} ataca${armaTxt}...<br>`;
        
        if (!atacante.golpea(defensor)) { 
            mensajeTurno += `💨 ¡Pero falla!`; 
        } else {
            let dañoBruto = atacante.calcularDaño();
            
            // 👇 NUEVO: SISTEMA DE PIEDAD (LOSER'S BUFF) 👇
            let rachaMala = atacante.estadisticasExtra?.rachaDerrotas || 0;
            if (rachaMala >= 5) {
                // Matemática: 0.02 * (1.5 elevado a la cantidad de derrotas extra)
                let multiPiedad = 0.02 * Math.pow(1.5, (rachaMala - 5)); 
                let bonoPity = Math.floor(dañoBruto * multiPiedad);
                dañoBruto += bonoPity;
                mensajeTurno += `<span style="color:#00e5ff; font-style:italic;">🌟 [Furia del Caído: +${Math.round(multiPiedad*100)}% Daño extra]</span><br>`;
            }
            // 👆 FIN SISTEMA DE PIEDAD 👆

            // 🌟 HOOK: Modificar Daño Bruto (Ej: Berserker)
            let logsExtraAtaque = [];
            dañoBruto = atacante.ejecutarHookRetorno('modificarDañoBruto', dañoBruto, logsExtraAtaque);
            if (logsExtraAtaque.length > 0) mensajeTurno += logsExtraAtaque.join("");

            if (atacante.esCritico()) { dañoBruto = Math.floor(dañoBruto * 1.5); mensajeTurno += `<span style="color:gold;">💥 ¡CRÍTICO!</span><br>`; }

            let dañoFinal = dañoBruto;
            if (defensor.armaduraEquipada) {
                dañoFinal = Math.max(1, Math.floor(dañoBruto * (1 - defensor.armaduraEquipada.mitigacion)));
                if (dañoFinal < dañoBruto) mensajeTurno += `🛡️ Armadura absorbe ${dañoBruto - dañoFinal} dmg.<br>`;
            }

            defensor.vidaActual -= dañoFinal; if (defensor.vidaActual < 0) defensor.vidaActual = 0;
            mensajeTurno += `🩸 Impacto de <strong>${dañoFinal}</strong> daño.`;

            // 🌟 HOOKS: Reacción al daño (Ej: Vampirismo, Espinas)
            let logsEfectosDeDaño = [];
            defensor.ejecutarHookAccion('alRecibirDaño', dañoFinal, atacante, logsEfectosDeDaño);
            atacante.ejecutarHookAccion('alHacerDaño', dañoFinal, defensor, logsEfectosDeDaño);
            if (logsEfectosDeDaño.length > 0) {
                mensajeTurno += logsEfectosDeDaño.join("");
            }

            // Aplicar Efectos de Estado
            if (atacante.armaEquipada && atacante.armaEquipada.efecto && atacante.vidaActual > 0) {
                // 🌟 HOOK: Inmunidades (Ej: Sangre Fría)
                if (defensor.ejecutarHookRetorno('esInmuneEstados', false)) {
                    mensajeTurno += `<br>❄️ ¡La pasiva de ${defensor.nombre} bloquea el efecto de ${atacante.armaEquipada.efecto.tipo}!`;
                } else {
                    defensor.estados.push({ ...atacante.armaEquipada.efecto });
                    let ic = atacante.armaEquipada.efecto.tipo === 'veneno' ? '☠️' : atacante.armaEquipada.efecto.tipo === 'sangrado' ? '🩸' : '🌀';
                    mensajeTurno += `<br>${ic} Aplica ${atacante.armaEquipada.efecto.tipo}!`;
                }
            }
        }

        registrar(mensajeTurno, tipoAtacante, 1200);
        if (defensor.vidaActual <= 0 || atacante.vidaActual <= 0) break; 

        // 🌟 HOOK: Contraataques luego de sufrir un ataque
        let logsContraataque = [];
        defensor.ejecutarHookAccion('despuesDeSerAtacado', atacante, logsContraataque);
        if (logsContraataque.length > 0) {
            registrar(logsContraataque.join("<br>"), tipoDefensor, 1200);
            if (atacante.vidaActual <= 0) break;
        }

        if (atacante.intentarLlamarMascota()) registrar(`🐺 ¡${atacante.nombre} llama a ${atacante.mascotaActiva.nombre}!`, 'sistema', 800);

        if (atacante.mascotaActiva) {
            let dañoMascota = atacante.mascotaActiva.atacar(defensor);
            if (dañoMascota > 0) {
                let msgMascota = `🐾 ${atacante.mascotaActiva.nombre} ataca por <strong>${dañoMascota}</strong> daño.`;
                
                // 🌟 HOOK: Defensa contra mascotas (Ej: Espinas vs Mascota)
                let logsDefensaMascota = [];
                defensor.ejecutarHookAccion('alRecibirDañoMascota', dañoMascota, atacante, logsDefensaMascota);
                if (logsDefensaMascota.length > 0) {
                    msgMascota += logsDefensaMascota.join("");
                }
                registrar(msgMascota, (tipoAtacante === 'jugador' ? 'mascota' : 'enemigo'), 1000);
            }
            else registrar(`💨 ${atacante.mascotaActiva.nombre} ataca, pero falla.`, (tipoAtacante === 'jugador' ? 'mascota' : 'enemigo'), 1000);
            
            if (defensor.vidaActual <= 0 || atacante.vidaActual <= 0) break;
        }

        [atacante, defensor] = [defensor, atacante]; 
    }

    // =======================================================
    // 2. CONTROL DEL PROGRESO Y TELEMETRÍA DE OBJETIVOS
    // =======================================================
    let ganadorClon = clonA.vidaActual > 0 ? clonA : clonB; 
    let ganadorReal = ganadorClon.id === jugadorA.id ? jugadorA : jugadorB;
    let perdedorReal = ganadorClon.id === jugadorA.id ? jugadorB : jugadorA;

    // Foto del Elo original antes de que cambie
    let eloAntesGanador = ganadorReal.elo; 
    let eloAntesPerdedor = perdedorReal.elo;

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

    // 📊 RECOLECCIÓN DE DATOS UNIVERSAL (Autoconfigurable y Extendida)
    if (!ganadorReal.estadisticasExtra) ganadorReal.estadisticasExtra = {};
    if (!perdedorReal.estadisticasExtra) perdedorReal.estadisticasExtra = {};

    // --- RACHA DE DERROTAS ---
    perdedorReal.estadisticasExtra.rachaDerrotas = (perdedorReal.estadisticasExtra.rachaDerrotas || 0) + 1;
    ganadorReal.estadisticasExtra.rachaDerrotas = 0; // Se resetea al ganar

    // --- EVENTOS Y JEFES (Preparando el terreno) ---
    // (Si el rival tiene una propiedad esJefe en el futuro, el sensor ya está listo)
    if (perdedorReal.esJefe) {
        ganadorReal.estadisticasExtra.jefesAsesinados = (ganadorReal.estadisticasExtra.jefesAsesinados || 0) + 1;
        let idJefe = perdedorReal.nombre.replace(/\s+/g, '_').toLowerCase();
        ganadorReal.estadisticasExtra[`jefeAsesinado_${idJefe}`] = (ganadorReal.estadisticasExtra[`jefeAsesinado_${idJefe}`] || 0) + 1;
    }

    // --- 1. MASCOTAS (Victorias y Derrotas) ---
    if (ganadorReal.mascotas && ganadorReal.mascotas.length > 0) {
        ganadorReal.estadisticasExtra.partidasConMascota = (ganadorReal.estadisticasExtra.partidasConMascota || 0) + 1;
        let idMascota = ganadorReal.mascotas[0].nombre.replace(/\s+/g, '_').toLowerCase();
        ganadorReal.estadisticasExtra[`victoriasMascota_${idMascota}`] = (ganadorReal.estadisticasExtra[`victoriasMascota_${idMascota}`] || 0) + 1;
    }
    if (perdedorReal.mascotas && perdedorReal.mascotas.length > 0) {
        perdedorReal.estadisticasExtra.partidasConMascota = (perdedorReal.estadisticasExtra.partidasConMascota || 0) + 1;
        let idMascota = perdedorReal.mascotas[0].nombre.replace(/\s+/g, '_').toLowerCase();
        perdedorReal.estadisticasExtra[`derrotasMascota_${idMascota}`] = (perdedorReal.estadisticasExtra[`derrotasMascota_${idMascota}`] || 0) + 1;
    }

    // --- 2. ARMAS (Cualquiera y Específicas) ---
    if (ganadorReal.armaEquipada) {
        ganadorReal.estadisticasExtra.victoriasCualquierArma = (ganadorReal.estadisticasExtra.victoriasCualquierArma || 0) + 1;
        let idArma = ganadorReal.armaEquipada.nombre.replace(/\s+/g, '_').toLowerCase();
        ganadorReal.estadisticasExtra[`victoriasArma_${idArma}`] = (ganadorReal.estadisticasExtra[`victoriasArma_${idArma}`] || 0) + 1;
    }
    if (perdedorReal.armaEquipada) {
        let idArma = perdedorReal.armaEquipada.nombre.replace(/\s+/g, '_').toLowerCase();
        perdedorReal.estadisticasExtra[`derrotasArma_${idArma}`] = (perdedorReal.estadisticasExtra[`derrotasArma_${idArma}`] || 0) + 1;
    }

    // --- 3. ARMADURAS (Cualquiera y Específicas) ---
    if (ganadorReal.armaduraEquipada) {
        ganadorReal.estadisticasExtra.victoriasCualquierArmadura = (ganadorReal.estadisticasExtra.victoriasCualquierArmadura || 0) + 1;
        let idArma = ganadorReal.armaduraEquipada.nombre.replace(/\s+/g, '_').toLowerCase();
        ganadorReal.estadisticasExtra[`victoriasArmadura_${idArma}`] = (ganadorReal.estadisticasExtra[`victoriasArmadura_${idArma}`] || 0) + 1;
    }
    if (perdedorReal.armaduraEquipada) {
        let idArma = perdedorReal.armaduraEquipada.nombre.replace(/\s+/g, '_').toLowerCase();
        perdedorReal.estadisticasExtra[`derrotasArmadura_${idArma}`] = (perdedorReal.estadisticasExtra[`derrotasArmadura_${idArma}`] || 0) + 1;
    }

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
    // 3. REPRODUCCIÓN VISUAL (JUICE MAXIMIZADO + COMBOS)
    // =======================================================
    let hpAnteriorA = clonA.vidaActual;
    let hpAnteriorB = clonB.vidaActual;
    let comboA = 0; // 👈 Contadores de combo
    let comboB = 0;

for (let accion of lineaDeTiempo) {
        escribirLog(accion.msg, accion.tipo);

        let esCritico = accion.msg.includes("CRÍTICO");
        let atacoMascota = accion.msg.includes("🐾");
        let atacoArma = accion.msg.includes("🗡️") || accion.msg.includes("🎒");
        let esquive = accion.msg.includes("falla") || accion.msg.includes("esquiva");
        let bloqueoEscudo = accion.msg.includes("🛡️") && accion.msg.includes("absorb");
        
        let huboImpacto = false;

        // --- JUGADOR 1 (A) RECIBE DAÑO ---
        if (accion.hpA < hpAnteriorA) {
            let daño = hpAnteriorA - accion.hpA;
            mostrarTextoFlotante(1, `-${Math.floor(daño)}`, esCritico ? 'float-crit' : 'float-dmg');
            animarAvatar(1, 'anim-daño');
            animarAvatar(2, 'anim-atacar-der'); 
            huboImpacto = true;
            
            // 🎵 SONIDO: Si es crítico suena el trueno eléctrico, si no, el golpe seco
            if (esCritico) SFX.critico();
            else SFX.golpe();
            
            comboB++; comboA = 0;
            if (comboB >= 2) mostrarCombo(2, comboB);

            if (atacoMascota) mostrarVFX(1, '🐾');
            else if (atacoArma) mostrarVFX(1, '💥');

            if (bloqueoEscudo) mostrarVFX(1, '🛡️');
        } 
        // JUGADOR 1 SE CURA
        else if (accion.hpA > hpAnteriorA) {
            let cura = accion.hpA - hpAnteriorA;
            mostrarTextoFlotante(1, `+${Math.floor(cura)}`, 'float-heal');
            animarAvatar(1, 'anim-cura');
            mostrarVFX(1, '✨');
            
            // 🎵 SONIDO: Campanita de curación
            SFX.cura();
        }

        // --- JUGADOR 2 (B) RECIBE DAÑO ---
        if (accion.hpB < hpAnteriorB) {
            let daño = hpAnteriorB - hpAnteriorB; // Nota: Aquí tenías un typo en tu código original (hpAnteriorB - hpB), lo corregí a: hpAnteriorB - accion.hpB
            daño = hpAnteriorB - accion.hpB; 
            mostrarTextoFlotante(2, `-${Math.floor(daño)}`, esCritico ? 'float-crit' : 'float-dmg');
            animarAvatar(2, 'anim-daño');
            animarAvatar(1, 'anim-atacar-izq'); 
            huboImpacto = true;

            // 🎵 SONIDO: Lo mismo para el rival
            if (esCritico) SFX.critico();
            else SFX.golpe();

            comboA++; comboB = 0;
            if (comboA >= 2) mostrarCombo(1, comboA);

            if (atacoMascota) mostrarVFX(2, '🐾');
            else if (atacoArma) mostrarVFX(2, '💥');

            if (bloqueoEscudo) mostrarVFX(2, '🛡️');
        } 
        // JUGADOR 2 SE CURA
        else if (accion.hpB > hpAnteriorB) {
            let cura = accion.hpB - hpAnteriorB;
            mostrarTextoFlotante(2, `+${Math.floor(cura)}`, 'float-heal');
            animarAvatar(2, 'anim-cura');
            mostrarVFX(2, '✨');
            
            // 🎵 SONIDO: Campanita de curación
            SFX.cura();
        }

        // --- FINTAS Y ESQUIVES (MATRIX) ---
        if (esquive) {
            comboA = 0; comboB = 0; 
            
            // 🎵 SONIDO: Swoosh de esquive
            SFX.esquive();

            if (accion.tipo === 'jugador') {
                animarAvatar(1, 'anim-atacar-izq');
                animarAvatar(2, 'anim-esquivar-der'); 
                mostrarVFX(2, '💨');
                mostrarTextoFlotante(2, '¡FALLÓ!', 'float-miss');
            } 
            if (accion.tipo === 'enemigo') {
                animarAvatar(2, 'anim-atacar-der');
                animarAvatar(1, 'anim-esquivar-izq'); 
                mostrarVFX(1, '💨');
                mostrarTextoFlotante(1, '¡FALLÓ!', 'float-miss');
            }
        }

        // --- HIT-STOP Y DESTELLOS PARA CRÍTICOS ---
        if (esCritico && huboImpacto) {
            flashCritico();
            animarShake();
            await pausar(250); 
        }

        // --- MUERTES DRAMÁTICAS ---
        if (accion.hpA <= 0 && hpAnteriorA > 0) {
            animarAvatar(1, 'anim-muerte');
            SFX.muerte(); // 🎵 SONIDO: Game Over para el jugador A
        }
        if (accion.hpB <= 0 && hpAnteriorB > 0) {
            animarAvatar(2, 'anim-muerte');
            SFX.muerte(); // 🎵 SONIDO: Caída para el jugador B
        }

        // Actualizamos estado para el siguiente frame
        hpAnteriorA = accion.hpA;
        hpAnteriorB = accion.hpB;
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