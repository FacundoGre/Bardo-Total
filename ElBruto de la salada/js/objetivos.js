import { guardarProgresoDB } from "./db.js";
import { mostrarAlerta } from "./ui.js"; 

export const ListaObjetivos = [
    // --- NIVELES ---
    { id: 'nvl5_vampiro', tipo: 'nivel', valorRequerido: 5, recompensa: { tipo: 'pasiva', id: 'vampirismo', msg: '🧛‍♂️ PASIVA DESBLOQUEADA: Vampirismo (Te curas el 30% del daño que haces)' } },
    { id: 'nvl10_contra', tipo: 'nivel', valorRequerido: 10, recompensa: { tipo: 'pasiva', id: 'contraataque', msg: '⚔️ PASIVA DESBLOQUEADA: Contraataque (25% chance de devolver golpe al esquivar)' } },
    { id: 'nvl15_espinas', tipo: 'nivel', valorRequerido: 15, recompensa: { tipo: 'pasiva', id: 'espinas', msg: '🌵 PASIVA DESBLOQUEADA: Espinas (Devuelves 3 de daño fijo al ser golpeado)' } },
    { id: 'nvl20_sangre_fria', tipo: 'nivel', valorRequerido: 20, recompensa: { tipo: 'pasiva', id: 'sangre_fria', msg: '🧊 PASIVA DESBLOQUEADA: Sangre Fría (Inmunidad a Veneno y Sangrado)' } },
    
    // --- RACHAS ---
    { id: 'racha_fuego', tipo: 'racha', valorRequerido: 5, recompensa: { tipo: 'cosmetico', id: 'details_6', msg: '🔥 COSMÉTICO: Aura Ígnea (Disponible en Sastrería)' } },
    { id: 'racha_demonio', tipo: 'racha', valorRequerido: 10, recompensa: { tipo: 'cosmetico', id: 'details_7', msg: '🦇 COSMÉTICO: Alas de Demonio (Disponible en Sastrería)' } },
    
    // --- CONSTANCIA (Partidas) ---
    { id: 'veterano_50', tipo: 'victorias', valorRequerido: 50, recompensa: { tipo: 'cosmetico', id: 'face_8', msg: '⚔️ COSMÉTICO: Cicatriz de Guerra (Disponible en Sastrería)' } },
    { id: 'resiliencia_20', tipo: 'derrotas', valorRequerido: 20, recompensa: { tipo: 'pasiva', id: 'berserker', msg: '😡 PASIVA DESBLOQUEADA: Furia Berserker (+50% Daño cuando estás por morir)' } },

    // --- LIGAS (ELO) ---
    { id: 'liga_oro', tipo: 'elo', valorRequerido: 1400, recompensa: { tipo: 'cosmetico', id: 'clothes_4', msg: '👑 COSMÉTICO: Capa de Oro (Disponible en Sastrería)' } },
    { id: 'liga_platino', tipo: 'elo', valorRequerido: 1700, recompensa: { tipo: 'cosmetico', id: 'face_7', msg: '👁️ COSMÉTICO: Ojos Ascendidos (Disponible en Sastrería)' } },
    { id: 'liga_leyenda', tipo: 'elo', valorRequerido: 2000, recompensa: { tipo: 'cosmetico', id: 'hairFront_7', msg: '👑 COSMÉTICO: Corona de Rey (Disponible en Sastrería)' } }
];

export async function verificarObjetivos(jugador) {
    // 🛡️ BLINDAJE: Nos aseguramos de que existan los arrays antes de recorrerlos
    if (!jugador.logros) jugador.logros = [];
    if (!jugador.cosmeticos) jugador.cosmeticos = [];
    if (!jugador.pasivas) jugador.pasivas = [];

    let huboCambios = false;
    let mensajes = []; 

    for (let obj of ListaObjetivos) {
        
        let yaTieneElLogro = jugador.logros.includes(obj.id);

        // 🛠️ EL SANADOR DE INVENTARIOS:
        if (yaTieneElLogro) {
            // Ya tiene el logro, pero revisamos si realmente tiene el premio en el bolsillo
            if (obj.recompensa.tipo === 'pasiva' && !jugador.pasivas.includes(obj.recompensa.id)) {
                jugador.pasivas.push(obj.recompensa.id);
                huboCambios = true;
            }
            if (obj.recompensa.tipo === 'cosmetico' && !jugador.cosmeticos.includes(obj.recompensa.id)) {
                jugador.cosmeticos.push(obj.recompensa.id);
                huboCambios = true;
            }
            continue; // Ahora sí, saltamos al siguiente
        }

        let cumplido = false;
        if (obj.tipo === 'nivel' && jugador.nivel >= obj.valorRequerido) cumplido = true;
        if (obj.tipo === 'racha' && jugador.rachaActual >= obj.valorRequerido) cumplido = true;
        if (obj.tipo === 'elo' && jugador.elo >= obj.valorRequerido) cumplido = true;
        if (obj.tipo === 'victorias' && jugador.victorias >= obj.valorRequerido) cumplido = true;
        if (obj.tipo === 'derrotas' && jugador.derrotas >= obj.valorRequerido) cumplido = true;

        if (cumplido) {
            jugador.logros.push(obj.id); 
            
            if (obj.recompensa.tipo === 'pasiva') {
                if(!jugador.pasivas.includes(obj.recompensa.id)) jugador.pasivas.push(obj.recompensa.id);
            }
            if (obj.recompensa.tipo === 'cosmetico') {
                if(!jugador.cosmeticos.includes(obj.recompensa.id)) jugador.cosmeticos.push(obj.recompensa.id);
            }

            huboCambios = true;
            mensajes.push(obj.recompensa.msg);
        }
    }

    if (huboCambios) {
        await guardarProgresoDB(jugador);
        // Retrasamos un poquito y lanzamos UN SOLO CARTEL con los logros "nuevos" (los curados van en silencio)
        if (mensajes.length > 0) {
            setTimeout(() => mostrarAlerta(`🏆 ¡HITOS ALCANZADOS!\n\n${mensajes.join("\n\n")}`, "¡ÉPICO!"), 1500);
        }
    }
}