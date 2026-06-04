// ==========================================
// 1. CLASES BASE (Con Precios)
// ==========================================

export class Mascota {
    constructor(nombre, fuerza, agilidad, precio = 100) {
        this.nombre = nombre; this.fuerza = fuerza; this.agilidad = agilidad; this.precio = precio;
    }
    atacar(defensor) {
        let chance = (this.agilidad / (this.agilidad + defensor.obtenerAgilidadActual())) * 100;
        if (Math.floor(Math.random() * 100) + 1 <= Math.max(20, Math.min(90, chance))) {
            let daño = this.fuerza + Math.floor(Math.random() * 3) + 1;
            if (defensor.armaduraEquipada) daño = Math.max(1, Math.floor(daño * (1 - defensor.armaduraEquipada.mitigacion)));
            defensor.vidaActual -= daño;
            if (defensor.vidaActual < 0) defensor.vidaActual = 0;
            return daño;
        }
        return 0;
    }
}

export class Armadura {
    constructor(nombre, mitigacion, penalidadAgilidad, precio = 100) {
        this.nombre = nombre; this.mitigacion = mitigacion; this.penalidadAgilidad = penalidadAgilidad; this.precio = precio;
    }
}

export class Arma {
    constructor(nombre, bonoDaño, penalidadAgilidad, efecto = null, precio = 100) {
        this.nombre = nombre; this.bonoDaño = bonoDaño; this.penalidadAgilidad = penalidadAgilidad; this.efecto = efecto; this.precio = precio;
    }
}

// ==========================================
// 2. DICCIONARIOS DE EQUIPAMIENTO Y PASIVAS
// ==========================================

export const Bestiario = {
    lobo: new Mascota("Lobo Salvaje", 6, 15, 300),
    oso: new Mascota("Oso Pardo", 12, 5, 800),
    gorda: new Mascota("Gorda", 10, 12, 1200),
    halcon: new Mascota("Halcón Peregrino", 3, 30, 600),
    chancho: new Mascota("Chancho Encerado", 1, 45, 500),
    tigre: new Mascota("Tigre Dientes de Sable", 14, 10, 1500),
    diablo: new Mascota("Diablo Viejo", 15, 25, 2000),
    carnotaurus: new Mascota("Carnotaurus", 18, 20, 2200),
    patagotitan: new Mascota("Cría de Patagotitan", 22, 2, 2500),
    zorro: new Mascota("Zorro de Udaondo", 8, 18, 900),
};

export const Armeria = {
    tunica: new Armadura("Túnica de Sombras", 0.10, 0, 150),
    cuero: new Armadura("Peto de Cuero", 0.15, 1, 200),
    malla: new Armadura("Cota de Mallas", 0.25, 3, 500),
    espinas: new Armadura("Capa de Espinas", 0.20, 2, 800),
    placas: new Armadura("Placas de Acero", 0.40, 6, 1000),
    medjed: new Armadura("Sábana de Medjed", 0.05, -10, 2200),
    aerodinamico: new Armadura("Alerón de Fibra de Carbono", 0.30, -5, 2500),
    juggernaut: new Armadura("Armadura Juggernaut", 0.65, 15, 3000),
    burbuja: new Armadura("Escudo de Burbujas Y2K", 0.50, 4, 1800),
    corazaAmarga: new Armadura("Coraza de Amargasaurus", 0.35, 2, 1400),
};

export const Arsenal = {
    daga: new Arma("Daga Oculta", 4, 0, null, 150),
    espada: new Arma("Espada Corta", 8, 2, null, 300),
    mazo: new Arma("Mazo de Hierro", 15, 6, null, 600),
    
    // 🌟 ARMA CON HOOK: Lanza + Cualquier mascota
    lanza: Object.assign(new Arma("Lanza de Caballería", 12, 4, null, 800), {
        modificarDañoBruto: (luchador, dañoBase, logs) => {
            if (luchador.mascotaActiva) {
                logs.push(` <span style="color:#aaa;">¡Carga de Caballería! (+6 dmg)</span>`);
                return dañoBase + 6;
            }
            return dañoBase;
        }
    }),

    garra: new Arma("Garra Jurásica", 11, 3, null, 900),
    hacha: new Arma("Hacha de Verdugo", 20, 10, null, 1200),
    sierra: new Arma("Sierra Dentada", 7, 3, { tipo: 'sangrado', dañoTurno: 3, turnos: 5 }, 1800),
    cable: new Arma("Cable MIDI de 5 Patitas", 5, 0, { tipo: 'locura', dañoTurno: 5, turnos: 3 }, 800),
    criptex: new Arma("Criptex de Da Vinci", 8, 2, null, 1000),
    
    // 🌟 ARMA CON HOOK: Teclado (50% chance de meter un acorde letal)
    teclado: Object.assign(new Arma("Yamaha PSR-E323", 18, 8, null, 1500), {
        modificarDañoBruto: (luchador, dañoBase, logs) => {
            if (Math.random() > 0.5) {
                logs.push(` <span style="color:#00e5ff;">¡Acorde Perfecto! (+5 dmg)</span>`);
                return dañoBase + 5;
            }
            return dañoBase;
        }
    }),

    latigo: new Arma("Látigo Ígneo", 6, 1, { tipo: 'quemadura', dañoTurno: 4, turnos: 3 }, 1500),
    cuchillo: new Arma("Cuchillo Ponzoñoso", 5, 0, { tipo: 'veneno', dañoTurno: 5, turnos: 4 }, 1500),
    
    // 🌟 ARMA CON HOOK: Cáliz + Carnotaurus (Chau Independiente, hola dinosaurios)
    caliz: Object.assign(new Arma("Cáliz del Primer Monarca", 10, 4, null, 1967), {
        modificarDañoBruto: (luchador, dañoBase, logs) => {
            if (luchador.mascotaActiva && luchador.mascotaActiva.nombre === "Carnotaurus") {
                luchador.vidaActual = Math.max(0, luchador.vidaActual - 2);
                logs.push(` <span style="color:#ff3333;">🩸 Sacrificio de sangre... (-2 HP, +10 Daño)</span>`);
                return dañoBase + 10;
            }
            return dañoBase;
        }
    }),

    codice: new Arma("Códice Críptico", 2, 1, { tipo: 'locura', dañoTurno: 8, turnos: 2 }, 2500),
    
    // 🌟 ARMA CON HOOK: Tronco + Zorro
    rama: Object.assign(new Arma("Tronco de Parque Leloir", 14, 5, null, 400), {
        modificarDañoBruto: (luchador, dañoBase, logs) => {
            if (luchador.mascotaActiva && luchador.mascotaActiva.nombre === "Zorro de Udaondo") {
                logs.push(` <span style="color:#2ecc71;">🍃 ¡Sinergia del Bosque! (+5 dmg)</span>`);
                return dañoBase + 5;
            }
            return dañoBase;
        }
    }),

    orbe: new Arma("Orbe Frutiger Aero", 7, 0, null, 1100),
    figura: new Arma("Figura de Porcelana", 9, 1, { tipo: 'maldicion', dañoTurno: 2, turnos: 10 }, 1600),

};

export const PasivasDisponibles = {
    vampirismo: { 
        id: "vampirismo", nombre: "Vampirismo", desc: "Cura un 30% del daño infligido",
        alHacerDaño: (luchador, dañoFinal, defensor, logs) => {
            if (dañoFinal > 0 && luchador.vidaActual > 0) {
                let cura = Math.max(1, Math.floor(dañoFinal * 0.3)); 
                luchador.vidaActual = Math.min(luchador.vidaMaxima, luchador.vidaActual + cura);
                logs.push(`<br>🧛‍♂️ Absorbe ${cura} HP!`);
            }
        }
    },
    contraataque: { 
        id: "contraataque", nombre: "Contraataque", desc: "25% de devolver el golpe al ser atacado",
        despuesDeSerAtacado: (luchador, atacante, logs) => {
            if (luchador.vidaActual > 0 && Math.random() <= 0.25) {
                let dañoContra = Math.max(1, Math.floor(luchador.fuerza * 0.8)); 
                atacante.vidaActual -= dañoContra; 
                if (atacante.vidaActual < 0) atacante.vidaActual = 0;
                logs.push(`💢 ¡CONTRAATAQUE de ${luchador.nombre} por ${dañoContra} daño!`);
            }
        }
    },
    berserker: { 
        id: "berserker", nombre: "Furia Berserker", desc: "Aumenta el daño un 50% si tu salud baja a 25 HP o menos",
        modificarDañoBruto: (luchador, dañoBruto, logs) => {
            if (luchador.vidaActual <= 25) {
                logs.push(`<span style="color:#ff3333; font-weight:bold;">😡 ¡MODO BERSERKER!</span><br>`);
                return Math.floor(dañoBruto * 1.5);
            }
            return dañoBruto;
        }
    },
    evasion: { 
        id: "evasion", nombre: "Paso Fantasma", desc: "+15% permanente a la evasión",
        modificarChanceEvasion: (luchador, chanceRival) => chanceRival - 15 // Le resta 15% a la chance de impacto del rival
    },
    aireSucio: { 
        id: "aireSucio", nombre: "Estela de Aire Sucio", desc: "Corta la aerodinámica del rival",
        modificarAgilidadRival: (luchador, agiRival) => {
            let reduccion = (luchador.armaduraEquipada && luchador.armaduraEquipada.nombre === "Alerón de Fibra de Carbono") ? 0.75 : 0.9;
            return Math.floor(agiRival * reduccion);
        }
    },
    correo: { 
        id: "correo", nombre: "Correo Líquido", desc: "Te vuelves tan escurridizo como un mail temporal",
        modificarVelocidad: (luchador, vel) => vel + 5,
        modificarAgilidad: (luchador, agi) => agi + 3
    },
    efectoSuelo: { 
        id: "efectoSuelo", nombre: "Efecto Suelo", desc: "Tu armadura pesada te da agarre en lugar de frenarte",
        modificarAgilidad: (luchador, agi) => {
            if (luchador.armaduraEquipada && luchador.armaduraEquipada.penalidadAgilidad > 0) {
                // Sumamos la penalidad para anularla, y le sumamos un 50% extra de bonus
                return agi + luchador.armaduraEquipada.penalidadAgilidad + Math.floor(luchador.armaduraEquipada.penalidadAgilidad / 2);
            }
            return agi;
        }
    },
    firebase: { 
        id: "firebase", nombre: "Sync Realtime", desc: "La nube te regenera 2 HP al principio de tu turno",
        alInicioTurno: (luchador, logs) => {
            luchador.vidaActual = Math.min(luchador.vidaMaxima, luchador.vidaActual + 2);
        }
    },
    espinas: { 
        id: "espinas", nombre: "Piel de Espinas", desc: "Devuelve 3 de daño al atacante cada vez que te golpean",
        alRecibirDaño: (luchador, dañoFinal, atacante, logs) => {
            if (dañoFinal > 0) {
                atacante.vidaActual -= 3; 
                if (atacante.vidaActual < 0) atacante.vidaActual = 0;
                logs.push(`<br>🌵 ¡${atacante.nombre} se pincha con espinas por 3 dmg!`);
            }
        },
        alRecibirDañoMascota: (luchador, dañoFinal, atacante, logs) => {
            if (dañoFinal > 0) {
                atacante.vidaActual -= 3; 
                if (atacante.vidaActual < 0) atacante.vidaActual = 0;
                logs.push(`<br>🌵 ¡Tu mascota se pincha con espinas! (-3 HP a ${atacante.nombre})`);
            }
        }
    },
    sangre_fria: { 
        id: "sangre_fria", nombre: "Sangre Fría", desc: "Inmunidad total a los efectos de estado",
        esInmuneEstados: (luchador, inmune) => true
    },

        bendicion_animal: { 
        id: "bendicion_animal", 
        nombre: "Bendición Animal", 
        desc: "Al iniciar un turno con menos del 25% de tu vida y tener una mascota activa, tienes una probabilidad del 50% de curarte un 20% de tu vida máxima.",
        alInicioTurno: (luchador, dañoFinal, rival, logs) => {
            if (((luchador.vidaActual <= (luchador.vidaMaxima * 0.25)) && (luchador.mascotaActiva)) && (Math.random() <= 0.50)) {
                let cantidad = Math.floor(luchador.vidaMaxima * 0.20);
                logs.push(`<span style='color:#ffaa00;'>🐺 ¡Tu mascota te reanima! (+${cantidad} HP)</span><br>`);
                luchador.vidaActual = Math.min(luchador.vidaMaxima, luchador.vidaActual + cantidad);
            }
            
        }
    },
};

// ==========================================
// 3. DICCIONARIOS SVG
// ==========================================

export const SVGs = {
    body: `<line x1="33" y1="42" x2="20" y2="65" stroke="{skinColor}" stroke-width="9" stroke-linecap="round"/><line x1="67" y1="42" x2="80" y2="65" stroke="{skinColor}" stroke-width="9" stroke-linecap="round"/><line x1="42" y1="65" x2="42" y2="90" stroke="{skinColor}" stroke-width="10" stroke-linecap="round"/><line x1="58" y1="65" x2="58" y2="90" stroke="{skinColor}" stroke-width="10" stroke-linecap="round"/><path d="M 33 40 L 67 40 L 62 70 L 38 70 Z" fill="{skinColor}" /><path d="M 38 46 Q 50 52 62 46" stroke="#000" stroke-opacity="0.15" fill="none" stroke-width="1.5"/> <circle cx="50" cy="22" r="15" fill="{skinColor}" />`,
    face: {
        1: `<circle cx="43" cy="19" r="2.5"/><circle cx="57" cy="19" r="2.5"/><line x1="38" y1="15" x2="46" y2="17" stroke="#000" stroke-width="2"/><line x1="62" y1="15" x2="54" y2="17" stroke="#000" stroke-width="2"/><path d="M 45 28 Q 50 25 55 28 Q 50 32 45 28" fill="#000"/>`,
        2: `<circle cx="43" cy="19" r="2"/><circle cx="57" cy="19" r="2"/><line x1="40" y1="19" x2="46" y2="19" stroke="#000" stroke-width="2.5"/><line x1="54" y1="19" x2="60" y2="19" stroke="#000" stroke-width="2.5"/><line x1="46" y1="28" x2="54" y2="29" stroke="#000" stroke-width="1.5"/>`,
        3: `<circle cx="43" cy="18" r="3"/><circle cx="57" cy="19" r="2"/><rect x="45" y="26" width="10" height="7" rx="2" fill="#000"/><rect x="46" y="26" width="8" height="2" fill="#fff"/>`,
        4: `<circle cx="50" cy="17" r="6" fill="#fff"/><circle cx="50" cy="17" r="2" fill="#f00"/><line x1="42" y1="10" x2="58" y2="10" stroke="#000" stroke-width="3"/><path d="M 47 28 Q 50 32 53 28" stroke="#000" stroke-width="2" fill="none"/>`,
        5: `<path d="M 38 18 Q 43 14 46 18" stroke="#000" fill="none" stroke-width="2"/><path d="M 62 18 Q 57 14 54 18" stroke="#000" fill="none" stroke-width="2"/><circle cx="43" cy="20" r="1.5" fill="#c00"/><circle cx="57" cy="20" r="1.5" fill="#c00"/><path d="M 42 28 Q 50 34 58 28 Q 50 26 42 28 Z" fill="#000"/><path d="M 44 28 L 46 31 L 48 28 Z" fill="#fff"/>`,
        6: `<path d="M 35 25 Q 50 10 65 25 L 60 40 L 55 35 L 50 40 L 45 35 L 40 40 Z" fill="#ddd" stroke="#111" stroke-width="1.5"/><circle cx="43" cy="22" r="3.5" fill="#000"/><circle cx="57" cy="22" r="3.5" fill="#000"/><path d="M 47 32 L 50 28 L 53 32 Z" fill="#000"/>`,
        7: `<circle cx="43" cy="19" r="3.5" fill="#fff" filter="drop-shadow(0 0 3px cyan)"/><circle cx="57" cy="19" r="3.5" fill="#fff" filter="drop-shadow(0 0 3px cyan)"/><path d="M 45 28 Q 50 32 55 28" stroke="#fff" stroke-width="1.5" fill="none"/>`,
        8: `<circle cx="43" cy="19" r="2"/><circle cx="57" cy="19" r="2"/><line x1="40" y1="19" x2="46" y2="19" stroke="#000" stroke-width="2.5"/><line x1="54" y1="19" x2="60" y2="19" stroke="#000" stroke-width="2.5"/><line x1="46" y1="28" x2="54" y2="29" stroke="#000" stroke-width="1.5"/><line x1="55" y1="10" x2="40" y2="35" stroke="#8b0000" stroke-width="2" opacity="0.8"/>`
    },
    hairFront: {
        1: ``,
        2: `<path d="M 33 15 C 40 5 60 5 67 15 Q 50 10 33 15 Z" fill="{hairColor}"/>`,
        3: `<path d="M 45 8 L 50 -10 L 55 8 L 52 2 L 50 8 L 48 2 Z" fill="{hairColor}"/>`,
        4: `<circle cx="50" cy="5" r="10" fill="{hairColor}"/><circle cx="40" cy="8" r="8" fill="{hairColor}"/><circle cx="60" cy="8" r="8" fill="{hairColor}"/>`,
        5: `<path d="M 35 15 C 45 5 55 5 65 15 Z" fill="#000" opacity="0.4"/> <rect x="47" y="-5" width="6" height="15" fill="{hairColor}"/> <line x1="45" y1="0" x2="55" y2="0" stroke="#c00" stroke-width="2"/>`,
        6: `<path d="M 35 25 C 30 5 65 5 60 15 L 45 28 Z" fill="{hairColor}"/>`,
        7: `<path d="M 32 15 L 38 0 L 50 12 L 62 0 L 68 15 L 68 25 L 32 25 Z" fill="gold" stroke="#8b6508" stroke-width="1.5"/><circle cx="40" cy="15" r="2.5" fill="#c00"/><circle cx="50" cy="15" r="3" fill="#00c"/><circle cx="60" cy="15" r="2.5" fill="#0c0"/>`
    },
    hairBack: { 1: ``, 2: `<path d="M 35 15 C 20 20 20 55 30 65 L 70 65 C 80 55 80 20 65 15 Z" fill="{hairColor}"/>`, 3: ``, 4: `<circle cx="35" cy="15" r="12" fill="{hairColor}"/><circle cx="65" cy="15" r="12" fill="{hairColor}"/>`, 5: ``, 6: `<path d="M 35 15 C 25 25 30 50 35 55 L 65 55 C 70 50 75 25 65 15 Z" fill="{hairColor}"/>`, 7: `` },
    clothes: { 1: ``, 2: `<path d="M 37 45 L 63 45 L 60 70 L 40 70 Z" fill="{clothesColor}" /><line x1="39" y1="40" x2="42" y2="46" stroke="{clothesColor}" stroke-width="5" stroke-linecap="round"/><line x1="61" y1="40" x2="58" y2="46" stroke="{clothesColor}" stroke-width="5" stroke-linecap="round"/>`, 3: `<path d="M 28 40 L 72 40 L 75 48 L 63 70 L 37 70 L 25 48 Z" fill="{clothesColor}" stroke="#222" stroke-width="2"/><line x1="35" y1="50" x2="65" y2="50" stroke="#222" stroke-width="2"/><circle cx="50" cy="55" r="5" fill="#fff" opacity="0.5"/>`, 4: `<path d="M 30 40 L 70 40 L 85 85 L 15 85 Z" fill="{clothesColor}" opacity="0.9"/> <path d="M 35 40 Q 50 50 65 40" stroke="#ff0" stroke-width="3" fill="none"/>`, 5: `<path d="M 25 45 L 50 75 L 75 45 L 65 38 L 35 38 Z" fill="{clothesColor}" stroke="#111" stroke-width="1"/> <line x1="30" y1="48" x2="45" y2="65" stroke="#fff" stroke-width="2" stroke-dasharray="2,2"/> <line x1="70" y1="48" x2="55" y2="65" stroke="#fff" stroke-width="2" stroke-dasharray="2,2"/>`, 6: `<path d="M 35 40 L 65 70 M 65 40 L 35 70 M 35 55 L 65 55" stroke="#888" stroke-width="3" stroke-dasharray="4,2"/>` },
    pants: { 1: `<path d="M 37 68 L 63 68 L 64 80 L 53 77 L 50 70 L 47 77 L 36 80 Z" fill="{pantsColor}" />`, 2: `<path d="M 37 68 L 63 68 L 64 92 L 53 90 L 50 70 L 47 90 L 36 92 Z" fill="{pantsColor}" /><line x1="39" y1="82" x2="45" y2="82" stroke="{skinColor}" stroke-width="2"/>`, 3: `<path d="M 35 66 L 65 66 L 62 72 L 38 72 Z" fill="#4a3018"/><path d="M 43 70 L 57 70 L 53 85 L 47 85 Z" fill="{pantsColor}"/>`, 4: `<path d="M 35 68 L 65 68 Q 75 80 62 90 L 52 85 L 50 70 L 48 85 L 38 90 Q 25 80 35 68 Z" fill="{pantsColor}" stroke="#111" stroke-width="1"/>`, 5: `<path d="M 36 68 L 64 68 L 68 85 L 32 85 Z" fill="{pantsColor}"/> <line x1="42" y1="68" x2="42" y2="85" stroke="#111" stroke-width="2"/> <line x1="58" y1="68" x2="58" y2="85" stroke="#111" stroke-width="2"/>`, 6: `<path d="M 38 70 L 46 70 L 46 92 L 38 92 Z" fill="{pantsColor}" stroke="#222"/><path d="M 54 70 L 62 70 L 62 92 L 54 92 Z" fill="{pantsColor}" stroke="#222"/>` },
    shoes: { 1: ``, 2: `<path d="M 36 84 L 48 84 L 48 94 L 34 94 Z" fill="{shoesColor}" stroke="#111" stroke-width="1"/><path d="M 52 84 L 64 84 L 66 94 L 52 94 Z" fill="{shoesColor}" stroke="#111" stroke-width="1"/>`, 3: `<path d="M 36 84 L 48 92 M 48 84 L 36 92 M 36 88 L 48 94" stroke="#ddd" stroke-width="2"/><path d="M 52 84 L 64 92 M 64 84 L 52 92 M 52 88 L 64 94" stroke="#ddd" stroke-width="2"/>`, 4: `<path d="M 36 90 L 48 90 L 48 95 L 32 95 Z" fill="{shoesColor}" rx="2"/><path d="M 52 90 L 64 90 L 68 95 L 52 95 Z" fill="{shoesColor}" rx="2"/> <line x1="38" y1="92" x2="45" y2="92" stroke="#fff" stroke-width="1"/><line x1="55" y1="92" x2="62" y2="92" stroke="#fff" stroke-width="1"/>`, 5: `<path d="M 34 95 L 48 95" stroke="{shoesColor}" stroke-width="2"/><path d="M 45 90 L 41 95 M 45 90 L 47 95" stroke="{shoesColor}" stroke-width="1"/><path d="M 52 95 L 66 95" stroke="{shoesColor}" stroke-width="2"/><path d="M 55 90 L 53 95 M 55 90 L 59 95" stroke="{shoesColor}" stroke-width="1"/>` },
    details: {
        1: ``,
        2: `<path d="M 40 12 L 48 26 M 39 19 L 45 17" stroke="#900" stroke-width="1.5" />`,
        3: `<path d="M 23 58 Q 28 55 24 50 T 26 45" stroke="#111" fill="none" stroke-width="2"/>`,
        4: `<path d="M 35 12 L 55 22" stroke="#000" stroke-width="1.5"/><circle cx="43" cy="19" r="4" fill="#000"/>`,
        5: `<path d="M 38 23 L 46 25 M 54 25 L 62 23 M 38 25 L 46 27 M 54 27 L 62 25" stroke="#c00" stroke-width="1.5"/>`,
        6: `<path d="M 15 90 Q 5 40 30 10 Q 50 80 80 10 Q 95 40 85 90 Z" fill="rgba(255, 60, 0, 0.3)" filter="blur(2px)"/><path d="M 25 90 Q 20 50 40 20 Q 50 70 70 20 Q 80 50 75 90 Z" fill="rgba(255, 200, 0, 0.4)" filter="blur(1px)"/>`,
        7: `<path d="M 50 50 Q 20 20 5 30 Q 10 50 30 50 Q 15 70 5 90 Q 30 80 50 60" fill="none" stroke="#8b0000" stroke-width="3"/><path d="M 50 50 Q 80 20 95 30 Q 90 50 70 50 Q 85 70 95 90 Q 70 80 50 60" fill="none" stroke="#8b0000" stroke-width="3"/>`
    }
};

export const SVGsBestias = {
    body: {
        1: `<path d="M 20 80 C 10 30 70 30 80 80 Z" fill="{colorBase}"/>`,
        2: `<path d="M 30 80 Q 40 40 70 50 Q 60 90 30 80 Z" fill="{colorBase}"/>`,
        3: `<ellipse cx="50" cy="60" rx="35" ry="25" fill="{colorBase}"/>`
    },
    head: {
        1: `<polygon points="60,60 95,45 70,75" fill="{colorBase}"/><polygon points="70,55 90,48 80,60" fill="{colorDetalle}"/>`,
        2: `<circle cx="75" cy="50" r="18" fill="{colorBase}"/><circle cx="85" cy="50" r="5" fill="{colorDetalle}"/>`,
        3: `<rect x="60" y="35" width="30" height="25" rx="5" fill="{colorBase}"/><polygon points="80,35 85,15 90,35" fill="{colorDetalle}"/>`
    },
    tail: {
        1: `<polygon points="30,60 5,85 20,75" fill="{colorBase}"/>`,
        2: `<path d="M 30 60 Q 0 60 10 30 Q 20 50 30 50 Z" fill="{colorDetalle}"/>`,
        3: `<circle cx="15" cy="70" r="10" fill="{colorBase}"/><circle cx="5" cy="75" r="5" fill="{colorDetalle}"/>`
    }
};

export function renderizarSVG(state) {
    if (!state || typeof state === 'string') return `<div style="font-size:3.5em; filter:grayscale(20%)">${state || '👤'}</div>`;
    const getT = (item) => `transform="translate(${item.x}, ${item.y}) scale(${item.scale})" style="transform-origin: 50px 50px;"`;
    return `<svg viewBox="0 0 100 100" width="100%" height="100%">
        <g ${getT(state.items.hair)}>${SVGs.hairBack[state.items.hair.id].replaceAll('{hairColor}', state.colors.hair)}</g>
        <g>${SVGs.body.replaceAll('{skinColor}', state.skinColor)}</g>
        <g ${getT(state.items.details)}>${SVGs.details[state.items.details.id]}</g>
        <g ${getT(state.items.pants)}>${SVGs.pants[state.items.pants.id].replaceAll('{pantsColor}', state.colors.pants).replaceAll('{skinColor}', state.skinColor)}</g>
        <g ${getT(state.items.shoes)}>${SVGs.shoes[state.items.shoes.id].replaceAll('{shoesColor}', state.colors.shoes)}</g>
        <g ${getT(state.items.clothes)}>${SVGs.clothes[state.items.clothes.id].replaceAll('{clothesColor}', state.colors.clothes).replaceAll('{skinColor}', state.skinColor)}</g>
        <g>${SVGs.face[state.items.face.id]}</g>
        <g ${getT(state.items.hair)}>${SVGs.hairFront[state.items.hair.id].replaceAll('{hairColor}', state.colors.hair)}</g>
    </svg>`;
}

export function renderizarBestiaSVG(avatarBestia) {
    return `<svg viewBox="0 0 100 100" width="100%" height="100%">
        <g>${SVGsBestias.tail[avatarBestia.tail].replaceAll('{colorBase}', avatarBestia.colorBase).replaceAll('{colorDetalle}', avatarBestia.colorDetalle)}</g>
        <g>${SVGsBestias.body[avatarBestia.body].replaceAll('{colorBase}', avatarBestia.colorBase)}</g>
        <g>${SVGsBestias.head[avatarBestia.head].replaceAll('{colorBase}', avatarBestia.colorBase).replaceAll('{colorDetalle}', avatarBestia.colorDetalle)}</g>
    </svg>`;
}

// ==========================================
// 4. CLASE LUCHADOR (Motor Principal)
// ==========================================

export class Luchador {
    constructor(nombre, vida, fuerza, agilidad, velocidad, victorias = 0, derrotas = 0, id = null, elo = 1200, division = "Plata", rachaActual = 0, avatar = null, oro = 0, xp = 0, nivel = 1, puntosStat = 0, buffPartidas = 0, intentosJefe = 5, fechaUltimoIntento = new Date().toDateString(), cosmeticos = [], logros = []) {
        this.nombre = nombre; this.vidaMaxima = vida; this.vidaActual = vida; this.fuerza = fuerza;
        this.agilidadBase = agilidad; this.velocidad = velocidad; this.victorias = victorias; this.derrotas = derrotas;
        this.id = id; this.elo = elo; this.division = division; this.rachaActual = rachaActual;
        this.oro = oro; this.xp = xp; this.nivel = nivel; this.puntosStat = puntosStat;
        this.buffPartidas = buffPartidas;
        this.intentosJefe = intentosJefe;
        this.fechaUltimoIntento = fechaUltimoIntento;
        
        this.eloAnterior = null;
        this.divisionAnterior = null;
        this.timestampUltimaPelea = 0;

        // 🛡️ BLINDAJE EXTRA: Por si la BD devuelve null
        this.cosmeticos = cosmeticos || [];
        this.logros = logros || [];

        this.avatar = avatar || { skinColor: '#8d5524', colors: { hair: '#111111', clothes: '#aa0000', pants: '#3b4d61', shoes: '#d0006e' }, items: { face: { id: 1 }, hair: { id: 6, x: 0, y: 0, scale: 1 }, clothes: { id: 1, x: 0, y: 0, scale: 1 }, pants: { id: 2, x: 0, y: 0, scale: 1 }, shoes: { id: 2, x: 0, y: 0, scale: 1 }, details: { id: 1, x: 0, y: 0, scale: 1 } } };

        this.inventario = []; this.armaduras = []; this.mascotas = [];
        this.armaEquipada = null; this.mascotaActiva = null; this.armaduraEquipada = null;
        this.pasivas = []; this.estados = [];
    }

    static random(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ==========================================
    // 🎯 MOTOR DE HOOKS (Eventos Data-Driven)
    // ==========================================
    ejecutarHookRetorno(nombreHook, valorInicial, ...args) {
        let resultado = valorInicial;
        
        // 1. Revisar pasivas
        this.pasivas.forEach(pId => {
            let pasiva = PasivasDisponibles[pId];
            if (pasiva && pasiva[nombreHook]) resultado = pasiva[nombreHook](this, resultado, ...args);
        });

        // 2. Revisar Equipamiento Activo
        let arma = this.obtenerArmaOficial();
        if (arma && arma[nombreHook]) resultado = arma[nombreHook](this, resultado, ...args);

        let armadura = this.obtenerArmaduraOficial();
        if (armadura && armadura[nombreHook]) resultado = armadura[nombreHook](this, resultado, ...args);

        // 3. Revisar Mascota Activa (¡CORREGIDO!)
        let mascota = this.obtenerMascotaOficial();
        if (mascota && mascota[nombreHook]) resultado = mascota[nombreHook](this, resultado, ...args);

        return resultado;
    }

    ejecutarHookAccion(nombreHook, ...args) {
        // 1. Revisar pasivas
        this.pasivas.forEach(pId => {
            let pasiva = PasivasDisponibles[pId];
            if (pasiva && pasiva[nombreHook]) pasiva[nombreHook](this, ...args);
        });

        // 2. Revisar Equipamiento Activo
        let arma = this.obtenerArmaOficial();
        if (arma && arma[nombreHook]) arma[nombreHook](this, ...args);

        let armadura = this.obtenerArmaduraOficial();
        if (armadura && armadura[nombreHook]) armadura[nombreHook](this, ...args);

        // 3. Revisar Mascota Activa (¡CORREGIDO!)
        let mascota = this.obtenerMascotaOficial();
        if (mascota && mascota[nombreHook]) mascota[nombreHook](this, ...args);
    }

    // ==========================================
    // 🔍 BUSCADORES DE STATS OFICIALES
    // ==========================================
    obtenerArmaOficial() {
        if (!this.armaEquipada) return null;
        return Object.values(Arsenal).find(a => a.nombre === this.armaEquipada.nombre) || null;
    }

    obtenerArmaduraOficial() {
        if (!this.armaduraEquipada) return null;
        return Object.values(Armeria).find(a => a.nombre === this.armaduraEquipada.nombre) || null;
    }

    obtenerMascotaOficial() {
        if (!this.mascotaActiva) return null;
        return Object.values(Bestiario).find(m => m.nombre === this.mascotaActiva.nombre) || null;
    }

    // ==========================================
    // MÉTODO DE COMBATE (Con Hooks integrados)
    // ==========================================
    calcularIniciativa() {
        let velReal = this.ejecutarHookRetorno('modificarVelocidad', this.velocidad);
        return velReal + Luchador.random(1, 20);
    }

    ganarXP(cantidad) {
        this.xp += cantidad; let xpNecesaria = this.nivel * 100; let subio = false;
        while (this.xp >= xpNecesaria) {
            this.xp -= xpNecesaria; this.nivel++; this.puntosStat++; this.vidaMaxima += 5;
            xpNecesaria = this.nivel * 100; subio = true;
        } return subio;
    }

    obtenerAgilidadActual() {
        let agilidadReal = this.agilidadBase;
        
        let armaOficial = this.obtenerArmaOficial();
        let armaduraOficial = this.obtenerArmaduraOficial();

        if (armaOficial) agilidadReal -= armaOficial.penalidadAgilidad;
        if (armaduraOficial) agilidadReal -= armaduraOficial.penalidadAgilidad; 

        // 👉 TUS COMBOS DE ITEMS (Ahora validando que existan oficialmente)
        if (armaOficial && armaOficial.nombre === "Daga Oculta" &&
            armaduraOficial && armaduraOficial.nombre === "Túnica de Sombras") {
            agilidadReal += 8;
        }
        if (armaOficial && armaOficial.nombre === "Orbe Frutiger Aero" &&
            armaduraOficial && armaduraOficial.nombre === "Escudo de Burbujas Y2K") {
            agilidadReal += 12;
        }

        // 🌟 HOOK: Modificar Agilidad
        agilidadReal = this.ejecutarHookRetorno('modificarAgilidad', agilidadReal);

        return Math.max(1, agilidadReal);
    }

    golpea(defensor) {
        let agilidadRival = defensor.obtenerAgilidadActual();

        // 🌟 HOOK: El atacante modifica la agilidad del rival
        agilidadRival = this.ejecutarHookRetorno('modificarAgilidadRival', agilidadRival);

        let chance = (this.obtenerAgilidadActual() / (this.obtenerAgilidadActual() + agilidadRival)) * 100;
        chance = Math.max(20, Math.min(90, chance));

        // 🌟 HOOK: El defensor modifica su chance de ser evadido
        chance = defensor.ejecutarHookRetorno('modificarChanceEvasion', chance);

        return Luchador.random(1, 100) <= chance;
    }

    esCritico() {
        let armaOficial = this.obtenerArmaOficial();
        let armaduraOficial = this.obtenerArmaduraOficial();

        // 👉 TUS COMBOS
        if (armaduraOficial && armaduraOficial.nombre === "Sábana de Medjed" &&
            armaOficial && armaOficial.nombre === "Códice Críptico") {
            return Luchador.random(1, 100) <= 80;
        }

        let chanceNormal = (this.obtenerAgilidadActual() / (this.obtenerAgilidadActual() + 30)) * 50;
        return Luchador.random(1, 100) <= chanceNormal;
    }

    calcularDaño() {
        let daño = this.fuerza + Luchador.random(1, 5);
        let armaOficial = this.obtenerArmaOficial();

        if (armaOficial) {
            daño += armaOficial.bonoDaño;
        }
        
        return daño;
    }

    intentarSacarArma() {
        if (!this.armaEquipada && this.inventario.length > 0 && Luchador.random(1, 100) <= 25) {
            this.armaEquipada = this.inventario[Math.floor(Math.random() * this.inventario.length)]; return true;
        } return false;
    }

    intentarLlamarMascota() {
        if (!this.mascotaActiva && this.mascotas.length > 0 && Luchador.random(1, 100) <= 20) {
            this.mascotaActiva = this.mascotas[Math.floor(Math.random() * this.mascotas.length)]; return true;
        } return false;
    }

    procesarEstados() {
        let logs = [];

        // 🌟 HOOK: Efectos que pasan al inicio del turno
        this.ejecutarHookAccion('alInicioTurno', logs);

        for (let i = this.estados.length - 1; i >= 0; i--) {
            let estado = this.estados[i];
            this.vidaActual -= estado.dañoTurno; if (this.vidaActual < 0) this.vidaActual = 0;

            let icono = '🔥';
            if (estado.tipo === 'veneno') icono = '☠️';
            if (estado.tipo === 'sangrado') icono = '🩸';
            if (estado.tipo === 'locura') icono = '🌀';
            if (estado.tipo === 'maldicion') icono = '👻';

            logs.push(`${icono} ${this.nombre} sufre ${estado.dañoTurno} de daño por ${estado.tipo}.`);
            estado.turnos--; if (estado.turnos <= 0) this.estados.splice(i, 1);
        } return logs;
    }

    paraGuardar() {
        return {
            nombre: this.nombre, vidaMaxima: this.vidaMaxima, fuerza: this.fuerza, agilidad: this.agilidadBase, velocidad: this.velocidad,
            
            // 🧹 LIMPIEZA AUTOMÁTICA Y SINCRONIZACIÓN DE ARMAS
            inventario: this.inventario
                .filter(a => Object.values(Arsenal).some(oficial => oficial.nombre === a.nombre)) // Filtra las borradas (Chau Orto Intenso)
                .map(a => {
                    let oficial = Object.values(Arsenal).find(o => o.nombre === a.nombre);
                    return { nombre: oficial.nombre, bonoDaño: oficial.bonoDaño, penalidadAgilidad: oficial.penalidadAgilidad, efecto: oficial.efecto ? { ...oficial.efecto } : null, precio: oficial.precio };
                }), // 👈 Guarda con las stats actualizadas de motor.js
                
            // 🧹 LIMPIEZA AUTOMÁTICA Y SINCRONIZACIÓN DE ARMADURAS
            armaduras: this.armaduras
                .filter(a => Object.values(Armeria).some(oficial => oficial.nombre === a.nombre))
                .map(a => {
                    let oficial = Object.values(Armeria).find(o => o.nombre === a.nombre);
                    return { nombre: oficial.nombre, mitigacion: oficial.mitigacion, penalidadAgilidad: oficial.penalidadAgilidad, precio: oficial.precio };
                }),
                
            // 🧹 LIMPIEZA AUTOMÁTICA Y SINCRONIZACIÓN DE MASCOTAS
            mascotas: this.mascotas
                .filter(m => Object.values(Bestiario).some(oficial => oficial.nombre === m.nombre))
                .map(m => {
                    let oficial = Object.values(Bestiario).find(o => o.nombre === m.nombre);
                    return { nombre: oficial.nombre, fuerza: oficial.fuerza, agilidad: oficial.agilidad, precio: oficial.precio };
                }),
                
            // Equipamiento actual validado por los buscadores oficiales
            armaduraEquipada: this.obtenerArmaduraOficial() ? { nombre: this.obtenerArmaduraOficial().nombre, mitigacion: this.obtenerArmaduraOficial().mitigacion, penalidadAgilidad: this.obtenerArmaduraOficial().penalidadAgilidad, precio: this.obtenerArmaduraOficial().precio } : null,
            armaEquipada: this.obtenerArmaOficial() ? { nombre: this.obtenerArmaOficial().nombre, bonoDaño: this.obtenerArmaOficial().bonoDaño, penalidadAgilidad: this.obtenerArmaOficial().penalidadAgilidad, efecto: this.obtenerArmaOficial().efecto ? { ...this.obtenerArmaOficial().efecto } : null, precio: this.obtenerArmaOficial().precio } : null,
            mascotaActiva: this.obtenerMascotaOficial() ? { nombre: this.obtenerMascotaOficial().nombre, fuerza: this.obtenerMascotaOficial().fuerza, agilidad: this.obtenerMascotaOficial().agilidad, precio: this.obtenerMascotaOficial().precio } : null,
            
            pasivas: [...this.pasivas],

            estadisticas: { victorias: this.victorias, derrotas: this.derrotas, elo: this.elo, division: this.division, rachaActual: this.rachaActual, eloAnterior: this.eloAnterior, divisionAnterior: this.divisionAnterior },
            timestampUltimaPelea: this.timestampUltimaPelea,

            oro: this.oro, xp: this.xp, nivel: this.nivel, puntosStat: this.puntosStat, buffPartidas: this.buffPartidas,
            intentosJefe: this.intentosJefe, fechaUltimoIntento: this.fechaUltimoIntento, cosmeticos: this.cosmeticos, logros: this.logros,
            avatar: this.avatar, fechaCreacion: new Date().toISOString()
        };
    }
}

export function calcularDivision(elo) {
    if (elo < 800) return "Hierro"; if (elo < 1000) return "Bronce"; if (elo < 1200) return "Plata";
    if (elo < 1400) return "Oro"; if (elo < 1700) return "Platino"; if (elo < 2000) return "Diamante"; return "Leyenda";
}

export function calcularTitulo(elo) {
    if (elo < 800) return "Novato"; if (elo < 1000) return "Recluta"; if (elo < 1200) return "Gladiador";
    if (elo < 1400) return "Veterano"; if (elo < 1700) return "Campeón"; if (elo < 2000) return "Maestro"; return "Leyenda";
}

export function actualizarElo(eloA, eloB, ganaA, partidasA = 20, partidasB = 20, rachaA = 0, rachaB = 0) {

    // 1. K Dinámico
    let kA = partidasA < 20 ? 64 : (eloA >= 2000 ? 16 : 32);
    let kB = partidasB < 20 ? 64 : (eloB >= 2000 ? 16 : 32);

    const esperadoA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    const esperadoB = 1 / (1 + Math.pow(10, (eloA - eloB) / 400));

    let nuevoEloA = Math.round(eloA + kA * ((ganaA ? 1 : 0) - esperadoA));
    let nuevoEloB = Math.round(eloB + kB * ((ganaA ? 0 : 1) - esperadoB));

    // 🔥 MECÁNICAS DE JUEGO
    if (ganaA) {

        // Mecánica 1: "Imparable" (Bono racha propia)
        // Solo lo damos si el jugador A NO está en el top (elo < 2000) para evitar inflación en la cima
        if (rachaA >= 3 && eloA < 2000) {
            nuevoEloA += 5;
        }

        // Mecánica 2: "Cazarrecompensas" (Robo real de la racha rival)
        if (rachaB >= 3) {
            let recompensaBounty = Math.min(rachaB, 10);
            nuevoEloA += recompensaBounty; // A gana los puntos
            nuevoEloB -= recompensaBounty; // B PIERDE los puntos (suma cero)
        }
    }

    // 5. Blindaje: Nadie baja de 0 de Elo
    return {
        nuevoEloA: Math.max(0, nuevoEloA),
        nuevoEloB: Math.max(0, nuevoEloB)
    };
}