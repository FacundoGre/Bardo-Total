import { cambiarVista, mostrarAlerta } from "./ui.js";
import { miGladiador } from "./auth.js";
import { Luchador, SVGs, SVGsBestias } from "./motor.js";
import { simularCombateVisual } from "./combates.js";

// ==========================================
// 🌌 ESTADO DE LA EXPEDICIÓN (RUN STATE)
// ==========================================
export let expedicion = {
    activa: false,
    piso: 1,
    clon: null,     // Tu gladiador, pero no se cura al 100%
    oroGanado: 0,
    xpGanada: 0
};

// 🛡️ Clona al jugador para que si muere acá, no se muera en la base de datos hasta que decidamos
function crearClonPurgatorio(luchador) {
    let c = new Luchador(luchador.nombre, luchador.vidaMaxima, luchador.fuerza, luchador.agilidadBase, luchador.velocidad);
    c.id = luchador.id; c.avatar = luchador.avatar; c.division = luchador.division; c.elo = luchador.elo;

    // Copiamos su equipamiento inicial
    c.armaEquipada = luchador.armaEquipada;
    c.armaduraEquipada = luchador.armaduraEquipada;
    c.mascotaActiva = luchador.mascotaActiva;
    c.pasivas = [...luchador.pasivas];

    c.vidaActual = c.vidaMaxima; // Entra fresquito al piso 1
    return c;
}

// ==========================================
// 👹 GENERADOR PROCEDURAL DE ENEMIGOS
// ==========================================
function generarEnemigoPurgatorio(piso) {
    // 1. Escalar Stats matemáticamente por piso
    let hp = 80 + (piso * 15);
    let fue = 4 + (piso * 2);
    let agi = 4 + Math.floor(piso * 1.5);
    let vel = 5 + piso;

    // 2. ¿Humanoide o Bestia? (30% chance de que sea una bestia rara)
    let esBestia = Math.random() < 0.3;
    let nombre = esBestia ? `Mutante del Abismo (Nv. ${piso})` : `Alma Perdida (Nv. ${piso})`;

    let enemigo = new Luchador(nombre, hp, fue, agi, vel);

    // 3. Generar un Avatar Aleatorio Rápido
    if (esBestia) {
        enemigo.avatar = {
            esBestia: true, // Marca custom para saber cómo renderizarlo después
            body: Math.floor(Math.random() * 3) + 1,
            head: Math.floor(Math.random() * 3) + 1,
            tail: Math.floor(Math.random() * 3) + 1,
            colorBase: '#' + Math.floor(Math.random() * 16777215).toString(16),
            colorDetalle: '#' + Math.floor(Math.random() * 16777215).toString(16)
        };
    } else {
        enemigo.avatar = {
            skinColor: '#555',
            colors: { hair: '#222', clothes: '#330000', pants: '#111', shoes: '#000' },
            items: {
                face: { id: Math.floor(Math.random() * 8) + 1 },
                hair: { id: Math.floor(Math.random() * 6) + 1, x: 0, y: 0, scale: 1 },
                clothes: { id: Math.floor(Math.random() * 5) + 1, x: 0, y: 0, scale: 1 },
                pants: { id: Math.floor(Math.random() * 5) + 1, x: 0, y: 0, scale: 1 },
                shoes: { id: Math.floor(Math.random() * 4) + 1, x: 0, y: 0, scale: 1 },
                details: { id: Math.floor(Math.random() * 6) + 1, x: 0, y: 0, scale: 1 }
            }
        };
    }

    return enemigo;
}

// ==========================================
// 🚀 INICIO Y CONTROL DE LA EXPEDICIÓN
// ==========================================
export function iniciarPurgatorio() {
    if (!miGladiador) return;

    // Reseteamos el estado
    expedicion.activa = true;
    expedicion.piso = 1;
    expedicion.oroGanado = 0;
    expedicion.xpGanada = 0;
    expedicion.clon = crearClonPurgatorio(miGladiador);

    prepararPiso();
}

// ... import { ..., simularCombateVisual } from "./combates.js";

async function prepararPiso() {
    cambiarVista('vista-arena');

    // Cambiamos el título dinámicamente para que no diga "Pelea Rápida"
    const img = document.getElementById("titulo-arena-img");
    if (img) img.src = "recursos/purgatorio-titulo.svg"; // O el nombre de archivo que quieras ponerle

    document.getElementById("log-combate").innerHTML = `<p style='text-align:center; color:#ff3333;'>--- PISO ${expedicion.piso} ---</p>`;

    let rival = generarEnemigoPurgatorio(expedicion.piso);

    // Le decimos al motor de UI que este es el rival (avatar 2)
    document.getElementById("nombre2").innerText = rival.nombre;

    // Lanzamos la simulación usando tu motor de combate maestro
    await simularCombateVisual(expedicion.clon, rival);

    // Al terminar el combate, si sigue vivo, abrimos el Limbo
    if (expedicion.clon.vidaActual > 0) {
        abrirLimbo();
    } else {
        mostrarAlerta("Has muerto en las profundidades del Purgatorio.");
        expedicion.activa = false;
        cambiarVista('vista-hub');
    }
}

// ==========================================
// 🃏 LÓGICA DE LAS CARTAS (EL LIMBO)
// ==========================================
export function abrirLimbo() {
    document.getElementById("limbo-piso-actual").innerText = expedicion.piso;
    cambiarVista('vista-limbo');
}

export async function elegirCarta(tipo) {
    if (!expedicion.activa || !expedicion.clon) return;

    // Efecto de la carta
    if (tipo === 'cura') {
        let cura = Math.floor(expedicion.clon.vidaMaxima * 0.30);
        expedicion.clon.vidaActual = Math.min(expedicion.clon.vidaMaxima, expedicion.clon.vidaActual + cura);
    }
    else if (tipo === 'buff') {
        expedicion.clon.fuerza += 5;
        expedicion.clon.agilidadBase += 5;
    }
    else if (tipo === 'item') {
        // Acá podemos poner la lógica de dar un arma aleatoria temporal
        mostrarAlerta("¡Encontraste un arma antigua en el polvo!");
    }

    // Avanzamos de piso y preparamos el combate
    expedicion.piso++;
    prepararPiso();
}

// Enchufamos los clics de las cartas
document.addEventListener("DOMContentLoaded", () => {
    const cartaCura = document.getElementById("carta-limbo-cura");
    const cartaBuff = document.getElementById("carta-limbo-buff");
    const cartaItem = document.getElementById("carta-limbo-item");

    if (cartaCura) cartaCura.addEventListener("click", () => elegirCarta('cura'));
    if (cartaBuff) cartaBuff.addEventListener("click", () => elegirCarta('buff'));
    if (cartaItem) cartaItem.addEventListener("click", () => elegirCarta('item'));
});