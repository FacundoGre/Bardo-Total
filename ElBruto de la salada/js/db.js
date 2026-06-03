import { db, collection, addDoc, getDocs, doc, updateDoc, increment, query, where, getDoc, setDoc, deleteDoc, getCountFromServer} from "./firebase.js";
import { Luchador, Mascota, Armadura, Arma, calcularDivision, actualizarElo } from "./motor.js";

export function instanciarLuchadorDesdeDB(docu) {
    const data = docu.data();
    let victorias = data.estadisticas?.victorias || 0; let derrotas = data.estadisticas?.derrotas || 0;
    let elo = data.estadisticas?.elo || 1200; let division = data.estadisticas?.division || "Plata";
    let rachaActual = data.estadisticas?.rachaActual || 0;
    let avatar = data.avatar || '👤';
    
    let oro = data.oro || 0; let xp = data.xp || 0; let nivel = data.nivel || 1; let puntosStat = data.puntosStat || 0;
    let buffPartidas = data.buffPartidas || 0;
    
    let intentosJefe = data.intentosJefe !== undefined ? data.intentosJefe : 5;
    let fechaUltimoIntento = data.fechaUltimoIntento || new Date().toDateString();
    let cosmeticos = data.cosmeticos || [];
    let logros = data.logros || []; 
    
    let luchador = new Luchador(data.nombre, data.vidaMaxima, data.fuerza, data.agilidad, data.velocidad, victorias, derrotas, docu.id, elo, division, rachaActual, avatar, oro, xp, nivel, puntosStat, buffPartidas, intentosJefe, fechaUltimoIntento, cosmeticos, logros);
    
    if (data.inventario) luchador.inventario = data.inventario.map(a => new Arma(a.nombre, a.bonoDaño, a.penalidadAgilidad, a.efecto, a.precio));
    if (data.armaduras) luchador.armaduras = data.armaduras.map(a => new Armadura(a.nombre, a.mitigacion, a.penalidadAgilidad, a.precio));
    if (data.mascotas) luchador.mascotas = data.mascotas.map(m => new Mascota(m.nombre, m.fuerza, m.agilidad, m.precio));
    
    if (data.armaduraEquipada) luchador.armaduraEquipada = new Armadura(data.armaduraEquipada.nombre, data.armaduraEquipada.mitigacion, data.armaduraEquipada.penalidadAgilidad, data.armaduraEquipada.precio);
    if (data.armaEquipada) luchador.armaEquipada = new Arma(data.armaEquipada.nombre, data.armaEquipada.bonoDaño, data.armaEquipada.penalidadAgilidad, data.armaEquipada.efecto, data.armaEquipada.precio);
    if (data.mascotaActiva) luchador.mascotaActiva = new Mascota(data.mascotaActiva.nombre, data.mascotaActiva.fuerza, data.mascotaActiva.agilidad, data.mascotaActiva.precio);
    
    if (data.pasivas) luchador.pasivas = data.pasivas;

    luchador.eloAnterior = data.estadisticas?.eloAnterior || null;
    luchador.divisionAnterior = data.estadisticas?.divisionAnterior || null;
    luchador.timestampUltimaPelea = data.timestampUltimaPelea || 0;

    return luchador;
}

export async function obtenerMiGladiador(uid) {
    try {
        const q = query(collection(db, "luchadores"), where("userId", "==", uid));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        
        let docData = snap.docs[0];
        let luchador = instanciarLuchadorDesdeDB(docData);

        const configSnap = await getDoc(doc(db, "servidor", "configAdmin"));
        if (configSnap.exists()) {
            const reglas = configSnap.data();
            // Solo dejamos el decaimiento de Élite. Eliminamos la barrera anti-f5 de este archivo.
            if (reglas.decay && luchador.elo > 2000) {
                const diasInactivo = Math.floor((Date.now() - luchador.timestampUltimaPelea) / (1000 * 60 * 60 * 24));
                if (diasInactivo >= 7) {
                    let multa = (diasInactivo - 6) * 15; 
                    let nuevoElo = Math.max(2000, luchador.elo - multa); 
                    if (nuevoElo < luchador.elo) {
                        luchador.elo = nuevoElo;
                        luchador.division = calcularDivision(nuevoElo);
                        luchador.timestampUltimaPelea = Date.now(); 
                        await updateDoc(doc(db, "luchadores", docData.id), {
                            "estadisticas.elo": luchador.elo, "estadisticas.division": luchador.division, "timestampUltimaPelea": luchador.timestampUltimaPelea
                        });
                        alert(`⚠️ CASTIGO DIVINO ⚠️\nPor tu cobardía e inactividad de ${diasInactivo} días, los Dioses te han restado ${multa} puntos de Elo.`);
                    }
                }
            }
        }
        return luchador;
    } catch(e) { console.error("Error obteniendo gladiador:", e); return null; }
}

export async function guardarLuchadorEnDB(luchador, uid) {
    try {
        const q = query(collection(db, "luchadores"), where("nombre", "==", luchador.nombre));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) { alert(`❌ ¡El nombre "${luchador.nombre}" ya existe!`); return false; }
        
        const data = luchador.paraGuardar();
        data.userId = uid; 
        await addDoc(collection(db, "luchadores"), data); 
        return true;
    } catch (error) { 
        console.error("Error crítico guardando:", error); 
        alert("Hubo un error de conexión con la base de datos.");
        return false; 
    }
}

export async function guardarProgresoDB(jugador) {
    if (!jugador || !jugador.id) return;
    try { await updateDoc(doc(db, "luchadores", jugador.id), jugador.paraGuardar()); } 
    catch(e) { console.error("Error guardando progreso: ", e); }
}

export async function buscarOponentePorElo(miElo, miId) {
    try {
        const snap = await getDocs(collection(db, "luchadores"));
        const candidatos = []; 
        snap.forEach((docu) => { if (docu.id !== miId) candidatos.push(instanciarLuchadorDesdeDB(docu)) });
        
        if (candidatos.length === 0) return null;
        let validos = candidatos.filter(c => Math.abs(c.elo - miElo) <= 150);
        if (validos.length === 0) validos = candidatos.filter(c => Math.abs(c.elo - miElo) <= 300);
        if (validos.length === 0) validos = candidatos;
        return validos[Math.floor(Math.random() * validos.length)];
    } catch (error) { return null; }
}
export async function actualizarHistorialDB(ganador, perdedor) {
    try {
        if (!ganador.id || !perdedor.id) return;
        
        let eloGanadorAntes = ganador.elo; let eloPerdedorAntes = perdedor.elo;
        let partidasGanador = ganador.victorias + ganador.derrotas;
        let partidasPerdedor = perdedor.victorias + perdedor.derrotas;

        const resultado = actualizarElo(ganador.elo, perdedor.elo, true, partidasGanador, partidasPerdedor, ganador.rachaActual, perdedor.rachaActual);

        ganador.elo = resultado.nuevoEloA; ganador.division = calcularDivision(resultado.nuevoEloA);
        perdedor.elo = resultado.nuevoEloB; perdedor.division = calcularDivision(resultado.nuevoEloB);
        ganador.rachaActual++; perdedor.rachaActual = 0;
        ganador.victorias++; perdedor.derrotas++;
        ganador.timestampUltimaPelea = Date.now();
        perdedor.timestampUltimaPelea = Date.now();

        // 👇 FIX CRÍTICO: Ahora SÍ le impactamos los cambios a los luchadores en la base de datos
        await updateDoc(doc(db, "luchadores", ganador.id), {
            "estadisticas.elo": ganador.elo, "estadisticas.division": ganador.division,
            "estadisticas.rachaActual": ganador.rachaActual, "estadisticas.victorias": ganador.victorias,
            "timestampUltimaPelea": ganador.timestampUltimaPelea
        });

        await updateDoc(doc(db, "luchadores", perdedor.id), {
            "estadisticas.elo": perdedor.elo, "estadisticas.division": perdedor.division,
            "estadisticas.rachaActual": perdedor.rachaActual, "estadisticas.derrotas": perdedor.derrotas,
            "timestampUltimaPelea": perdedor.timestampUltimaPelea
        });

        await addDoc(collection(db, "combates"), {
            ganador: ganador.nombre, perdedor: perdedor.nombre, 
            eloGanadorAntes, eloGanadorDespues: resultado.nuevoEloA,
            eloPerdedorAntes, eloPerdedorDespues: resultado.nuevoEloB, 
            fecha: new Date().toISOString()
        });
        
    } catch(error) { console.error("❌ Error en historial: ", error); }
}
// ==========================================
// 🧬 HERRAMIENTA DE DIOS: TRASPLANTE DE ALMA
// ==========================================
export async function trasplantarAlma(idDocViejo, uidAuthNuevo) {
    try {
        // 1. Buscamos y fulminamos el "clon nivel 1" que se creó al registrar la cuenta nueva
        const q = query(collection(db, "luchadores"), where("userId", "==", uidAuthNuevo));
        const snapNuevo = await getDocs(q);
        snapNuevo.forEach(async (d) => {
            await deleteDoc(doc(db, "luchadores", d.id));
        });

        // 2. Al documento viejo, simplemente le cambiamos el "alma" (la etiqueta de dueño)
        const docRefViejo = doc(db, "luchadores", idDocViejo);
        await updateDoc(docRefViejo, { userId: uidAuthNuevo });

        return true;
    } catch (error) {
        console.error("Falla en la Matrix durante el trasplante:", error);
        return false;
    }
}

export async function obtenerMiPuestoRanking(miElo) {
    try {
        // Cuenta exactamente cuánta gente en el servidor tiene más Elo que vos
        const q = query(collection(db, "luchadores"), where("estadisticas.elo", ">", miElo));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count + 1; // Tu puesto es esa cantidad + 1
    } catch (e) { return "?"; }
}