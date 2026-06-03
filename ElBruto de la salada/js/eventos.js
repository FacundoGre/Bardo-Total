import { db, collection, getDocs, doc, getDoc, setDoc, updateDoc, onSnapshot, increment } from "./firebase.js";
import { miGladiador } from "./auth.js";
import { cambiarVista, renderizarMiHub, pausar, escribirLog } from "./ui.js";
import { guardarProgresoDB } from "./db.js";
import { Luchador, Arma, renderizarBestiaSVG, renderizarSVG } from "./motor.js";
import { verificarObjetivos } from "./objetivos.js";

let jefeActual = null;
let unsubscribeJefe = null;
let peleandoContraJefe = false; // 👈 1. Bandera agregada para controlar el estado de la animación

const NUCLEOS_BESTIA = [
    { base: "Giganotosaurus", hp: 5000, fue: 25, agi: 10 },
    { base: "Dragón", hp: 8000, fue: 35, agi: 15 },
    { base: "Leviatán", hp: 10000, fue: 25, agi: 5 },
    { base: "Titán", hp: 15000, fue: 20, agi: 2 }
];
const PREFIJOS = ["Rabioso", "Ancestral", "Corrupto", "No-Muerto", "Mecánico", "Ígneo"];

function generarColorRaro() { return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'); }

async function generarNuevoJefe(jefeRef) {
    const nucleo = NUCLEOS_BESTIA[Math.floor(Math.random() * NUCLEOS_BESTIA.length)];
    const prefijo = PREFIJOS[Math.floor(Math.random() * PREFIJOS.length)];

    const snapLuchadores = await getDocs(collection(db, "luchadores"));
    let totalJugadores = snapLuchadores.size || 1;
    let sumaNiveles = 0; snapLuchadores.forEach(doc => sumaNiveles += (doc.data().nivel || 1));
    let promedioNivel = sumaNiveles / totalJugadores;

    let multiplicadorPoblacion = 1 + (totalJugadores * 0.2); let multiplicadorNivel = 1 + (promedioNivel * 0.5);
    let hpFinal = Math.floor(nucleo.hp * multiplicadorPoblacion * multiplicadorNivel);
    let fueFinal = Math.floor(nucleo.fue * (1 + (promedioNivel * 0.2)));

    if (prefijo === "Ancestral") hpFinal = Math.floor(hpFinal * 1.5);
    if (prefijo === "Mecánico") fueFinal = Math.floor(fueFinal * 1.3);

    let d = new Date(); d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    let semanaActual = d.toISOString().split('T')[0];

    jefeActual = {
        nombre: `${nucleo.base} ${prefijo}`, semanaGenerada: semanaActual, estado: 'vivo',
        avatarBestia: { body: Math.floor(Math.random() * 3) + 1, head: Math.floor(Math.random() * 3) + 1, tail: Math.floor(Math.random() * 3) + 1, colorBase: generarColorRaro(), colorDetalle: generarColorRaro() },
        vidaMaxima: hpFinal, vidaActual: hpFinal, fuerza: fueFinal, agilidad: nucleo.agi,
        participantes: {}, asesino: null
    };
    await setDoc(jefeRef, jefeActual);
}

export async function initEvento() {
    cambiarVista('vista-evento');
    document.getElementById('log-jefe').innerHTML = "<p style='color:#888; text-align:center;'>Entrando a la guarida...</p>";

    let hoy = new Date().toDateString();
    if (miGladiador && miGladiador.fechaUltimoIntento !== hoy) {
        miGladiador.intentosJefe = 5; miGladiador.fechaUltimoIntento = hoy;
        await guardarProgresoDB(miGladiador);
    }

    if (miGladiador) {
        document.getElementById("jefe-player-nombre").innerText = miGladiador.nombre;
        document.getElementById("jefe-player-avatar").innerHTML = renderizarSVG(miGladiador.avatar);
        actualizarHpVisual('jefe-player', miGladiador.vidaActual, miGladiador.vidaMaxima);
    }

    const jefeRef = doc(db, "servidor", "jefeMundial");
    if (!unsubscribeJefe) {
        unsubscribeJefe = onSnapshot(jefeRef, async (snap) => {
            if (!snap.exists()) {
                await generarNuevoJefe(jefeRef);
            } else {
                jefeActual = snap.data();
                let d = new Date(); d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
                let semanaActual = d.toISOString().split('T')[0];

                if (jefeActual.estado === 'muerto' && jefeActual.semanaGenerada !== semanaActual) {
                    await generarNuevoJefe(jefeRef);
                } else { renderizarJefeUI(); }
            }
        });
    }
}

function actualizarHpVisual(prefijo, vidaRestante, vidaMax) {
    const pct = Math.max(0, (vidaRestante / vidaMax) * 100);
    document.getElementById(`${prefijo}-hp-bar`).style.width = `${pct}%`;
    // ACÁ ESTÁ EL CAMBIO (Math.max):
    document.getElementById(`${prefijo}-hp-text`).innerText = `${Math.max(0, Math.floor(vidaRestante))} / ${vidaMax} HP`;
}

function renderizarJefeUI() {
    if (!jefeActual) return;
    document.getElementById("jefe-nombre").innerText = jefeActual.nombre;
    document.getElementById("jefe-avatar").innerHTML = renderizarBestiaSVG(jefeActual.avatarBestia);
    document.getElementById("jefe-stats").innerText = `Fuerza: ${jefeActual.fuerza} | Agilidad: ${jefeActual.agilidad}`;
    actualizarHpVisual('jefe', jefeActual.vidaActual, jefeActual.vidaMaxima);

    const btnAtacar = document.getElementById("btn-atacar-jefe");
    const divIntentos = document.getElementById("jefe-intentos-text");

    if (jefeActual.estado === 'vivo') {
        btnAtacar.style.display = 'inline-block';
        // 👈 2. MODIFICACIÓN: Bloquea el botón si ya estás peleando O si no te quedan intentos
        btnAtacar.disabled = peleandoContraJefe || (miGladiador.intentosJefe <= 0);
        divIntentos.innerText = `INTENTOS HOY: ${miGladiador.intentosJefe} / 5`;
    } else {
        btnAtacar.style.display = 'none';
        let participe = jefeActual.participantes && jefeActual.participantes[miGladiador.id];
        if (participe && !participe.reclamado) {
            divIntentos.innerHTML = `<h3 style="color:gold;">¡BESTIA ABATIDA!</h3><button id="btn-reclamar-loot" class="btn-accion btn-campeon">RECLAMAR RECOMPENSA</button>`;
            document.getElementById("btn-reclamar-loot").onclick = () => reclamarRecompensa(participe.daño, jefeActual.asesino === miGladiador.id);
        } else if (participe && participe.reclamado) {
            divIntentos.innerHTML = `<h3 style="color:#aaa;">Ya reclamaste tu botín.</h3>`;
        } else { divIntentos.innerHTML = `<h3 style="color:#aaa;">La bestia ya está muerta.</h3>`; }
    }
}

export async function pelearContraJefe() {
    if (!miGladiador || !jefeActual || jefeActual.estado !== 'vivo') return;
    if (miGladiador.intentosJefe <= 0) return;

    peleandoContraJefe = true; // 👈 3. MODIFICACIÓN: Bloqueamos el botón encendiendo la bandera
    document.getElementById("btn-atacar-jefe").disabled = true;
    miGladiador.intentosJefe--; await guardarProgresoDB(miGladiador);
    renderizarJefeUI();

    let clon = new Luchador(miGladiador.nombre, miGladiador.vidaMaxima, miGladiador.fuerza, miGladiador.agilidadBase, miGladiador.velocidad);
    clon.vidaActual = miGladiador.vidaMaxima; clon.armaEquipada = miGladiador.armaEquipada; clon.armaduraEquipada = miGladiador.armaduraEquipada; clon.mascotaActiva = miGladiador.mascotaActiva; clon.pasivas = miGladiador.pasivas;

    let bossCombate = { vidaActual: jefeActual.vidaActual, agilidad: jefeActual.agilidad, fuerza: jefeActual.fuerza, estados: [], obtenerAgilidadActual: function () { return this.agilidad; } };
    let dañoTotalInfligido = 0;

    document.getElementById("log-jefe").innerHTML = "";
    escribirLog(`🔥 ¡${miGladiador.nombre.toUpperCase()} SE ABALANZA SOBRE EL ${jefeActual.nombre.toUpperCase()}! 🔥`, 'sistema', 'log-jefe');
    await pausar(1000);

    while (clon.vidaActual > 0 && bossCombate.vidaActual > 0) {

        // 1. Estados del Boss (Veneno / Sangrado)
        for (let i = bossCombate.estados.length - 1; i >= 0; i--) {
            let estado = bossCombate.estados[i];
            bossCombate.vidaActual -= estado.dañoTurno; dañoTotalInfligido += estado.dañoTurno;
            let icono = estado.tipo === 'veneno' ? '☠️' : '🔥';
            escribirLog(`${icono} La bestia sufre ${estado.dañoTurno} de daño por ${estado.tipo}.`, 'sistema', 'log-jefe');
            estado.turnos--; if (estado.turnos <= 0) bossCombate.estados.splice(i, 1);
            actualizarHpVisual('jefe', bossCombate.vidaActual, jefeActual.vidaMaxima); await pausar(600);
        }
        if (bossCombate.vidaActual <= 0) break;

        // 2. Tu Ataque
        if (clon.intentarSacarArma()) { escribirLog(`🎒 ¡Sacas tu ${clon.armaEquipada.nombre}!`, 'sistema', 'log-jefe'); await pausar(600); }
        let armaTxt = clon.armaEquipada ? ` con ${clon.armaEquipada.nombre}` : " a puño limpio";
        let mensajeTurno = `⚔️ Atacas${armaTxt}...`;

        let chanceGolpeJugador = (clon.obtenerAgilidadActual() / (clon.obtenerAgilidadActual() + bossCombate.agilidad)) * 100;
        let aciertaJugador = Math.floor(Math.random() * 100) + 1 <= Math.max(20, Math.min(90, chanceGolpeJugador));

        if (!aciertaJugador) {
            escribirLog(mensajeTurno + ` <span style="color:#aaa;">💨 ¡Pero la bestia lo esquiva!</span>`, 'jugador', 'log-jefe');
        } else {
            let daño = clon.calcularDaño();

            // 🌟 PASIVA BERSERKER: Aplicamos aumento al pegar a la bestia
            if (clon.pasivas.includes('berserker') && clon.vidaActual <= 25) {
                daño = Math.floor(daño * 1.5);
                mensajeTurno += ` <span style="color:#ff3333; font-weight:bold;">(😡 ¡BERSERKER!)</span>`;
            }

            if (clon.esCritico()) { daño = Math.floor(daño * 1.5); mensajeTurno += ` <span style="color:gold;">💥 ¡CRÍTICO!</span>`; }

            bossCombate.vidaActual -= daño; dañoTotalInfligido += daño;
            mensajeTurno += `<br>🩸 Impacto de <strong>${daño}</strong> daño.`;

            if (clon.pasivas.includes('vampirismo') && daño > 0) {
                let cura = Math.max(1, Math.floor(daño * 0.3)); clon.vidaActual = Math.min(clon.vidaMaxima, clon.vidaActual + cura);
                mensajeTurno += `<br>🧛‍♂️ Absorbes ${cura} HP!`; actualizarHpVisual('jefe-player', clon.vidaActual, clon.vidaMaxima);
            }
            if (clon.armaEquipada && clon.armaEquipada.efecto) {
                bossCombate.estados.push({ ...clon.armaEquipada.efecto });
                mensajeTurno += `<br>✨ ¡Aplicas ${clon.armaEquipada.efecto.tipo}!`;
            }
            escribirLog(mensajeTurno, 'jugador', 'log-jefe');
            actualizarHpVisual('jefe', bossCombate.vidaActual, jefeActual.vidaMaxima);
        }
        await pausar(800); if (bossCombate.vidaActual <= 0) break;

        // 3. Mascota
        if (clon.mascotaActiva) {
            let dañoMascota = clon.mascotaActiva.atacar(bossCombate);
            if (dañoMascota > 0) {
                bossCombate.vidaActual -= dañoMascota; dañoTotalInfligido += dañoMascota;
                actualizarHpVisual('jefe', bossCombate.vidaActual, jefeActual.vidaMaxima);
                escribirLog(`🐺 ${clon.mascotaActiva.nombre} muerde por <strong>${dañoMascota}</strong>.`, 'mascota', 'log-jefe');
            } else {
                escribirLog(`💨 ${clon.mascotaActiva.nombre} ataca, pero falla.`, 'mascota', 'log-jefe');
            }
            await pausar(800);
        }
        if (bossCombate.vidaActual <= 0) break;

        // 4. Turno del Jefe (Contra vos)
        let chanceGolpeBoss = (bossCombate.agilidad / (bossCombate.agilidad + clon.obtenerAgilidadActual())) * 100;
        let aciertaBoss = Math.floor(Math.random() * 100) + 1 <= Math.max(20, Math.min(90, chanceGolpeBoss));

        if (!aciertaBoss) {
            escribirLog(`💨 ¡Esquivas el ataque de la bestia!`, 'jugador', 'log-jefe');
        } else {
            let dañoBrutoJefe = bossCombate.fuerza + Math.floor(Math.random() * 20);
            let dañoFinalJefe = dañoBrutoJefe; let txtArmadura = "";

            if (clon.armaduraEquipada) {
                dañoFinalJefe = Math.max(1, Math.floor(dañoBrutoJefe * (1 - clon.armaduraEquipada.mitigacion)));
                if (dañoFinalJefe < dañoBrutoJefe) txtArmadura = ` <span style="color:#aaa;">(🛡️ Tu armadura absorbió ${dañoBrutoJefe - dañoFinalJefe} dmg)</span>`;
            }
            clon.vidaActual -= dañoFinalJefe;

            let logJefeAtaca = `💥 La bestia te aplasta por <strong>${dañoFinalJefe}</strong> daño.${txtArmadura}`;

            // 🌟 PASIVA ESPINAS: El jefe se pincha al hacerte daño
            if (clon.pasivas.includes('espinas') && dañoFinalJefe > 0) {
                bossCombate.vidaActual -= 3;
                dañoTotalInfligido += 3;
                logJefeAtaca += `<br>🌵 ¡La bestia se pincha con tus espinas por 3 dmg!`;
                actualizarHpVisual('jefe', bossCombate.vidaActual, jefeActual.vidaMaxima);
            }

            // 🌟 PASIVA SANGRE FRÍA: Placeholder para la inmunidad.
            // Si en el futuro le damos efectos al Jefe, verificamos acá si el jugador es inmune.
            if (jefeActual.habilidadEfecto) {
                if (clon.pasivas.includes('sangre_fria')) {
                    logJefeAtaca += `<br>❄️ ¡Sangre Fría te vuelve inmune a su efecto de ${jefeActual.habilidadEfecto.tipo}!`;
                } else {
                    // Lógica para aplicar el efecto del jefe al jugador
                }
            }

            escribirLog(logJefeAtaca, 'enemigo', 'log-jefe');
            actualizarHpVisual('jefe-player', clon.vidaActual, clon.vidaMaxima);
        }
        await pausar(1000);

        // 5. Contraataque
        if (clon.vidaActual > 0 && clon.pasivas.includes('contraataque') && Math.random() <= 0.25) {
            let dañoContra = Math.max(1, Math.floor(clon.fuerza * 0.8)); bossCombate.vidaActual -= dañoContra; dañoTotalInfligido += dañoContra;
            escribirLog(`💢 ¡CONTRAATAQUE por ${dañoContra} daño!`, 'jugador', 'log-jefe');
            actualizarHpVisual('jefe', bossCombate.vidaActual, jefeActual.vidaMaxima); await pausar(1000);
        }
    }

    // --- ACTUALIZACIÓN EN FIREBASE ---
    const jefeRef = doc(db, "servidor", "jefeMundial");
    const snapDb = await getDoc(jefeRef);

    if (snapDb.exists() && snapDb.data().estado === 'vivo') {
        let vidaReal = snapDb.data().vidaActual;
        let esAsesino = (vidaReal - dañoTotalInfligido) <= 0;

        let updates = { vidaActual: increment(-dañoTotalInfligido), [`participantes.${miGladiador.id}.daño`]: increment(dañoTotalInfligido), [`participantes.${miGladiador.id}.reclamado`]: false, [`participantes.${miGladiador.id}.nombre`]: miGladiador.nombre };

        if (esAsesino) {
            updates.estado = 'muerto'; updates.asesino = miGladiador.id; updates.vidaActual = 0;
            escribirLog(`🏆 ¡HAS DADO EL GOLPE DE GRACIA AL ${jefeActual.nombre.toUpperCase()}!`, 'sistema', 'log-jefe');
            escribirLog(`El gremio está analizando el cadáver. Reclama tu botín.`, 'sistema', 'log-jefe');
        } else {
            escribirLog(`💀 Caíste... pero lograste infligir <strong>${dañoTotalInfligido}</strong> de daño.`, 'sistema', 'log-jefe');
        }
        await updateDoc(jefeRef, updates);
    } else {
        escribirLog(`Llegaste tarde. Alguien mató a la bestia mientras peleabas.`, 'sistema', 'log-jefe');
    }

    peleandoContraJefe = false; // 👈 4. MODIFICACIÓN: Apagamos la bandera para permitir volver a atacar en el próximo intento
    renderizarJefeUI(); // Forzamos el renderizado limpio para que el botón se reactive si quedan intentos
}

async function reclamarRecompensa(daño, esAsesino) {
    let oroGanado = Math.floor(daño * 0.5); let xpGanada = Math.floor(daño * 0.2); let buffs = 5;

    if (esAsesino) {
        oroGanado += 5000; xpGanada += 2000; buffs = 15;
        let itemRaro = new Arma(`Trofeo de ${jefeActual.nombre}`, 25, 2, { tipo: 'sangrado', dañoTurno: 5, turnos: 4 }, 10000);
        miGladiador.inventario.push(itemRaro);

        // 👈 DROP EXCLUSIVO COSMÉTICO
        if (!miGladiador.cosmeticos.includes('face_6')) miGladiador.cosmeticos.push('face_6');

        // Borrá el alert() feo y poné esto:
        mostrarAlerta("¡HAS DADO EL GOLPE DE GRACIA!<br>Recibes el arma mítica: Trofeo de Leviatán Mecánico<br>💀 Has conseguido el Cráneo de la Bestia.", "¡A CELEBRAR!");
    }

    miGladiador.oro += oroGanado; miGladiador.ganarXP(xpGanada); miGladiador.buffPartidas += buffs;
    await verificarObjetivos(miGladiador);
    await guardarProgresoDB(miGladiador);
    const jefeRef = doc(db, "servidor", "jefeMundial"); await updateDoc(jefeRef, { [`participantes.${miGladiador.id}.reclamado`]: true });

    mostrarAlerta(`Recompensa cobrada:<br>💰 +${oroGanado} Oro<br>🌟 +${xpGanada} XP<br>🔥 +15 peleas de FURIA x2`, "Aceptar botín");
    renderizarJefeUI();
}

export function salirEvento() {
    if (unsubscribeJefe) { unsubscribeJefe(); unsubscribeJefe = null; }
    cambiarVista('vista-hub'); if (miGladiador) renderizarMiHub(miGladiador);
}