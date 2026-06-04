import { guardarProgresoDB } from "./db.js";
import { mostrarAlerta } from "./ui.js"; 

export const ListaObjetivos = [
    // --- NIVELES ---
    { id: 'nvl5_vampiro', tipo: 'jugador', clave: 'nivel', valorRequerido: 5, recompensa: { tipo: 'pasiva', id: 'vampirismo', msg: '🧛‍♂️ PASIVA DESBLOQUEADA: Vampirismo (Te curas el 30% del daño que haces)' } },
    { id: 'nvl10_contra', tipo: 'jugador', clave: 'nivel', valorRequerido: 10, recompensa: { tipo: 'pasiva', id: 'contraataque', msg: '⚔️ PASIVA DESBLOQUEADA: Contraataque (25% chance de devolver golpe al esquivar)' } },
    { id: 'nvl15_espinas', tipo: 'jugador', clave: 'nivel', valorRequerido: 15, recompensa: { tipo: 'pasiva', id: 'espinas', msg: '🌵 PASIVA DESBLOQUEADA: Espinas (Devuelves 3 de daño fijo al ser golpeado)' } },
    { id: 'nvl20_sangre_fria', tipo: 'jugador', clave: 'nivel', valorRequerido: 20, recompensa: { tipo: 'pasiva', id: 'sangre_fria', msg: '🧊 PASIVA DESBLOQUEADA: Sangre Fría (Inmunidad a Veneno y Sangrado)' } },
    
    // --- RACHAS ---
    { id: 'racha_fuego', tipo: 'jugador', clave: 'rachaActual', valorRequerido: 5, recompensa: { tipo: 'cosmetico', id: 'details_6', msg: '🔥 COSMÉTICO: Aura Ígnea (Disponible en Sastrería)' } },
    { id: 'racha_demonio', tipo: 'jugador', clave: 'rachaActual', valorRequerido: 10, recompensa: { tipo: 'cosmetico', id: 'details_7', msg: '🦇 COSMÉTICO: Alas de Demonio (Disponible en Sastrería)' } },
    
    // --- CONSTANCIA (Partidas) ---
    { id: 'veterano_50', tipo: 'jugador', clave: 'victorias', valorRequerido: 50, recompensa: { tipo: 'cosmetico', id: 'face_8', msg: '⚔️ COSMÉTICO: Cicatriz de Guerra (Disponible en Sastrería)' } },
    { id: 'resiliencia_20', tipo: 'jugador', clave: 'derrotas', valorRequerido: 20, recompensa: { tipo: 'pasiva', id: 'berserker', msg: '😡 PASIVA DESBLOQUEADA: Furia Berserker (+50% Daño cuando estás por morir)' } },

    // --- LIGAS (ELO) ---
    { id: 'liga_oro', tipo: 'jugador', clave: 'elo', valorRequerido: 1400, recompensa: { tipo: 'cosmetico', id: 'clothes_4', msg: '👑 COSMÉTICO: Capa de Oro (Disponible en Sastrería)' } },
    { id: 'liga_platino', tipo: 'jugador', clave: 'elo', valorRequerido: 1700, recompensa: { tipo: 'cosmetico', id: 'face_7', msg: '👁️ COSMÉTICO: Ojos Ascendidos (Disponible en Sastrería)' } },
    { id: 'liga_leyenda', tipo: 'jugador', clave: 'elo', valorRequerido: 2000, recompensa: { tipo: 'cosmetico', id: 'hairFront_7', msg: '👑 COSMÉTICO: Corona de Rey (Disponible en Sastrería)' } },

    // 🔥 --- LOS NUEVOS LOGROS ESPECÍFICOS (Leen de estadisticasExtra) --- 🔥
    { id: 'amigo_fiel', tipo: 'extra', clave: 'partidasConMascota', valorRequerido: 20, recompensa: { tipo: 'pasiva', id: 'bendicion_animal', msg: '🐾 PASIVA DESBLOQUEADA: Bendición Animal' } },
    { id: 'furia_jurasica', tipo: 'extra', clave: 'victoriasCarnotaurus', valorRequerido: 10, recompensa: { tipo: 'arma', id: 'garra_jurasica', msg: '🦖 ARMA DESBLOQUEADA: Garra Jurásica' } },
    { id: 'hijo_del_bosque', tipo: 'extra', clave: 'victoriasZorro', valorRequerido: 5, recompensa: { tipo: 'arma', id: 'rama', msg: '🍃 ARMA DESBLOQUEADA: Tronco de Parque Leloir' } }
];

export async function verificarObjetivos(jugador) {
    // 🛡️ BLINDAJE: Inicializamos arrays si no existen (Compatibilidad con cuentas viejas)
    if (!jugador.logros) jugador.logros = [];
    if (!jugador.cosmeticos) jugador.cosmeticos = [];
    if (!jugador.pasivas) jugador.pasivas = [];
    if (!jugador.inventario) jugador.inventario = []; // Por si la recompensa es un arma
    if (!jugador.estadisticasExtra) jugador.estadisticasExtra = {}; // La nueva caja negra de telemetría

    let huboCambios = false;
    let mensajes = []; 

    for (let obj of ListaObjetivos) {
        
        let yaTieneElLogro = jugador.logros.includes(obj.id);

        // 🛠️ EL SANADOR DE INVENTARIOS
        if (yaTieneElLogro) {
            if (obj.recompensa.tipo === 'pasiva' && !jugador.pasivas.includes(obj.recompensa.id)) {
                jugador.pasivas.push(obj.recompensa.id);
                huboCambios = true;
            }
            if (obj.recompensa.tipo === 'cosmetico' && !jugador.cosmeticos.includes(obj.recompensa.id)) {
                jugador.cosmeticos.push(obj.recompensa.id);
                huboCambios = true;
            }
            // Agregamos chequeo por si el premio era un arma que desapareció
            if (obj.recompensa.tipo === 'arma' && !jugador.inventario.some(a => a.nombre === obj.recompensa.id)) {
                jugador.inventario.push({ nombre: obj.recompensa.id }); 
                huboCambios = true;
            }
            continue; 
        }

        // 🎯 EVALUADOR UNIVERSAL DE OBJETIVOS
        let cumplido = false;
        
        // Si es un stat normal (nivel, oro, victorias)
        if (obj.tipo === 'jugador' && jugador[obj.clave] !== undefined) {
            if (jugador[obj.clave] >= obj.valorRequerido) cumplido = true;
        }
        
        // Si es un stat súper específico de telemetría
        if (obj.tipo === 'extra' && jugador.estadisticasExtra[obj.clave] !== undefined) {
            if (jugador.estadisticasExtra[obj.clave] >= obj.valorRequerido) cumplido = true;
        }

        if (cumplido) {
            jugador.logros.push(obj.id); 
            
            if (obj.recompensa.tipo === 'pasiva') jugador.pasivas.push(obj.recompensa.id);
            if (obj.recompensa.tipo === 'cosmetico') jugador.cosmeticos.push(obj.recompensa.id);
            if (obj.recompensa.tipo === 'arma') jugador.inventario.push({ nombre: obj.recompensa.id });

            huboCambios = true;
            mensajes.push(obj.recompensa.msg);
        }
    }

    if (huboCambios) {
        await guardarProgresoDB(jugador);
        if (mensajes.length > 0) {
            setTimeout(() => mostrarAlerta(`🏆 ¡HITOS ALCANZADOS!\n\n${mensajes.join("\n\n")}`, "¡ÉPICO!"), 1500);
        }
    }
}