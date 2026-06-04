import { db, collection, getDocs, doc, setDoc, updateDoc, getDoc } from "./firebase.js";
import { cambiarVista, mostrarConfirmacion, mostrarAlerta, mostrarPrompt } from "./ui.js";
import { trasplantarAlma } from "./db.js"; 
import { calcularDivision } from "./motor.js"; 

let todosLosGladiadores = [];
let jugadorEditandoID = null;

// ==========================================
// 1. INGRESO SEGURO
// ==========================================
export async function abrirPanelAdmin() {
    const claveInput = await mostrarPrompt("El Ojo de Dios requiere un sacrificio:", "Escribí la clave divina...");
    if (!claveInput) return; 

    try {
        const configRef = doc(db, "servidor", "configAdmin");
        const configSnap = await getDoc(configRef);
        let claveReal = configSnap.exists() && configSnap.data().clave ? configSnap.data().clave : "bardo";
        if (!configSnap.exists()) await setDoc(configRef, { clave: "bardo" });

        if (claveInput !== claveReal) return mostrarAlerta("Contraseña incorrecta.");

        cambiarVista('vista-admin');
        cargarMetricas();
    } catch (e) { alert("Error divino."); }
}

// ==========================================
// 2. CÁLCULO DE MÉTRICAS Y CARGA DE DATOS
// ==========================================
async function cargarMetricas() {
    try {
        const snapLuchadores = await getDocs(collection(db, "luchadores"));
        const snapCombates = await getDocs(collection(db, "combates"));

        document.getElementById("adm-tot-glad").innerText = snapLuchadores.size;
        document.getElementById("adm-tot-comb").innerText = snapCombates.size;
        
        let armasMeta = {}; let armadurasMeta = {}; let mascotasMeta = {};
        let ligas = { Hierro:0, Bronce:0, Plata:0, Oro:0, Platino:0, Diamante:0, Leyenda:0 };
        let campeon = { nombre: "-", elo: 0 };
        
        todosLosGladiadores = []; 

        snapLuchadores.forEach(d => {
            let data = d.data();
            data.id = d.id; 
            todosLosGladiadores.push(data);
            
            let div = data.estadisticas?.division || "Plata";
            if(ligas[div] !== undefined) ligas[div]++;
            
            let elo = data.estadisticas?.elo || 1200;
            if(elo > campeon.elo) { campeon.nombre = data.nombre; campeon.elo = elo; }

            if(data.armaEquipada) armasMeta[data.armaEquipada.nombre] = (armasMeta[data.armaEquipada.nombre] || 0) + 1;
            if(data.armaduraEquipada) armadurasMeta[data.armaduraEquipada.nombre] = (armadurasMeta[data.armaduraEquipada.nombre] || 0) + 1;
            if(data.mascotaActiva) mascotasMeta[data.mascotaActiva.nombre] = (mascotasMeta[data.mascotaActiva.nombre] || 0) + 1;
        });

        let getTop = (obj) => Object.keys(obj).length === 0 ? "Ninguna" : Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b);
        
        document.getElementById("adm-camp-nombre").innerText = campeon.nombre;
        document.getElementById("adm-camp-elo").innerText = `(${campeon.elo} Elo)`;
        document.getElementById("adm-meta-arma").innerText = getTop(armasMeta);
        document.getElementById("adm-meta-mascota").innerText = getTop(mascotasMeta);
        
        let metaArmaduraUI = document.getElementById("adm-meta-armadura");
        if(metaArmaduraUI) metaArmaduraUI.innerText = getTop(armadurasMeta);
        
        for (let liga in ligas) {
            let el = document.getElementById(`adm-liga-${liga.toLowerCase()}`);
            if(el) el.innerText = ligas[liga];
        }

        document.getElementById("admin-loading").style.display = "none"; 
        document.getElementById("admin-data").style.display = "block";
    } catch (e) { document.getElementById("admin-loading").innerText = "Error cruzando los datos."; }
}

// ==========================================
// 3. BUSCADOR Y EDITOR EN VIVO
// ==========================================
export function bindAdminEvents() {
    const searchInput = document.getElementById("admin-search-input");
    const searchResults = document.getElementById("admin-search-results");
    const editorPanel = document.getElementById("admin-editor-panel");

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        searchResults.innerHTML = "";
        
        if (query.length < 1) { searchResults.style.display = "none"; return; }
        
        const filtrados = todosLosGladiadores.filter(g => g.nombre.toLowerCase().includes(query)).slice(0, 5);
        
        if (filtrados.length > 0) {
            searchResults.style.display = "block";
            filtrados.forEach(g => {
                const li = document.createElement("li");
                li.className = "admin-result-item";
                li.innerText = `🗡️ ${g.nombre} (Nvl ${g.nivel || 1})`;
                li.onclick = () => cargarEditor(g);
                searchResults.appendChild(li);
            });
        } else {
            searchResults.style.display = "none";
        }
    });

    // ==========================================
    // TRASPLANTE DE ALMA
    // ==========================================
    const btnTrasplante = document.getElementById("btn-ejecutar-trasplante");
    if(btnTrasplante) {
        btnTrasplante.onclick = async () => {
            const nombreNuevo = document.getElementById("admin-nuevo-nombre").value.trim().toLowerCase();

            if (!jugadorEditandoID) return mostrarAlerta("Primero seleccioná al gladiador VIEJO.");
            if (!nombreNuevo) return mostrarAlerta("Escribí el nombre del gladiador NUEVO.");

            const gladiadorDestino = todosLosGladiadores.find(g => 
                g.nombre.toLowerCase() === nombreNuevo && g.id !== jugadorEditandoID
            );

            if (!gladiadorDestino) return mostrarAlerta("No encontré al gladiador nuevo.");

            if (confirm(`¿Transferir datos de ${jugadorEditandoID} a ${gladiadorDestino.nombre}?`)) {
                let exito = await trasplantarAlma(jugadorEditandoID, gladiadorDestino.userId);
                if (exito) {
                    mostrarAlerta("¡ÉXITO!");
                    location.reload();
                } else {
                    mostrarAlerta("Error. Revisá la consola.");
                }
            }
        };
    }

    // ==========================================
    // MANIPULAR INVENTARIO (DAR / QUITAR)
    // ==========================================
    const btnDarItem = document.getElementById("btn-admin-dar-item");
    const btnQuitarItem = document.getElementById("btn-admin-quitar-item");

    if (btnDarItem) {
        btnDarItem.addEventListener("click", async () => {
            if (!jugadorEditandoID) return mostrarAlerta("Seleccioná un gladiador primero.");
            const tipo = document.getElementById("admin-item-tipo").value;
            const idItem = document.getElementById("admin-item-id").value.trim();
            if (!idItem) return mostrarAlerta("Escribí el ID del ítem.");

            const jugadorDestino = todosLosGladiadores.find(g => g.id === jugadorEditandoID);
            if (!jugadorDestino) return;

            let inventarioArray = jugadorDestino.inventario || [];
            let armadurasArray = jugadorDestino.armaduras || [];
            let mascotasArray = jugadorDestino.mascotas || [];
            let pasivasArray = jugadorDestino.pasivas || [];
            let cosmeticosArray = jugadorDestino.cosmeticos || [];

            let huboCambios = false;

            if (tipo === 'arma' && !inventarioArray.some(a => a.nombre === idItem)) { inventarioArray.push({nombre: idItem}); huboCambios = true; }
            if (tipo === 'armadura' && !armadurasArray.some(a => a.nombre === idItem)) { armadurasArray.push({nombre: idItem}); huboCambios = true; }
            if (tipo === 'mascota' && !mascotasArray.some(a => a.nombre === idItem)) { mascotasArray.push({nombre: idItem}); huboCambios = true; }
            if (tipo === 'pasiva' && !pasivasArray.includes(idItem)) { pasivasArray.push(idItem); huboCambios = true; }
            if (tipo === 'cosmetico' && !cosmeticosArray.includes(idItem)) { cosmeticosArray.push(idItem); huboCambios = true; }

            if (huboCambios) {
                try {
                    await updateDoc(doc(db, "luchadores", jugadorEditandoID), {
                        inventario: inventarioArray, armaduras: armadurasArray, mascotas: mascotasArray, pasivas: pasivasArray, cosmeticos: cosmeticosArray
                    });
                    mostrarAlerta(`🎁 Se le entregó [${idItem}] a ${jugadorDestino.nombre}.`);
                    cargarMetricas();
                } catch (e) { mostrarAlerta("Error al entregar ítem en la Base de Datos."); }
            } else {
                mostrarAlerta("El jugador ya tiene ese ítem en su inventario.");
            }
        });
    }

    if (btnQuitarItem) {
        btnQuitarItem.addEventListener("click", async () => {
            if (!jugadorEditandoID) return mostrarAlerta("Seleccioná un gladiador primero.");
            const tipo = document.getElementById("admin-item-tipo").value;
            const idItem = document.getElementById("admin-item-id").value.trim();
            if (!idItem) return mostrarAlerta("Escribí el ID del ítem.");

            const jugadorDestino = todosLosGladiadores.find(g => g.id === jugadorEditandoID);
            if (!jugadorDestino) return;

            let inventarioArray = (jugadorDestino.inventario || []).filter(a => a.nombre !== idItem);
            let armadurasArray = (jugadorDestino.armaduras || []).filter(a => a.nombre !== idItem);
            let mascotasArray = (jugadorDestino.mascotas || []).filter(a => a.nombre !== idItem);
            let pasivasArray = (jugadorDestino.pasivas || []).filter(p => p !== idItem);
            let cosmeticosArray = (jugadorDestino.cosmeticos || []).filter(c => c !== idItem);

            // También desequipamos si le sacamos algo que tenía puesto
            let updates = {
                inventario: inventarioArray, armaduras: armadurasArray, mascotas: mascotasArray, pasivas: pasivasArray, cosmeticos: cosmeticosArray
            };

            if (tipo === 'arma' && jugadorDestino.armaEquipada?.nombre === idItem) updates.armaEquipada = null;
            if (tipo === 'armadura' && jugadorDestino.armaduraEquipada?.nombre === idItem) updates.armaduraEquipada = null;
            if (tipo === 'mascota' && jugadorDestino.mascotaActiva?.nombre === idItem) updates.mascotaActiva = null;

            try {
                await updateDoc(doc(db, "luchadores", jugadorEditandoID), updates);
                mostrarAlerta(`🗑️ Se le quitó [${idItem}] a ${jugadorDestino.nombre}.`);
                cargarMetricas();
            } catch (e) { mostrarAlerta("Error al quitar ítem en la Base de Datos."); }
        });
    }

    // ==========================================
    // EDITOR DE ESTADÍSTICAS (AMPLIADO)
    // ==========================================
    function cargarEditor(jugadorData) {
        jugadorEditandoID = jugadorData.id;
        document.getElementById("edit-nombre").innerText = jugadorData.nombre;
        
        document.getElementById("edit-oro").value = jugadorData.oro || 0;
        document.getElementById("edit-nivel").value = jugadorData.nivel || 1;
        document.getElementById("edit-vida").value = jugadorData.vidaMaxima || 100;
        document.getElementById("edit-intentos").value = jugadorData.intentosJefe !== undefined ? jugadorData.intentosJefe : 5;
        document.getElementById("edit-fuerza").value = jugadorData.fuerza || 5;
        document.getElementById("edit-agilidad").value = jugadorData.agilidadBase || jugadorData.agilidad || 5; 
        document.getElementById("edit-velocidad").value = jugadorData.velocidad || 5;
        document.getElementById("edit-puntos").value = jugadorData.puntosStat || 0;

        let editElo = document.getElementById("edit-elo");
        if(editElo) editElo.value = jugadorData.estadisticas?.elo || 1200;
        let editVic = document.getElementById("edit-victorias");
        if(editVic) editVic.value = jugadorData.estadisticas?.victorias || 0;
        let editDer = document.getElementById("edit-derrotas");
        if(editDer) editDer.value = jugadorData.estadisticas?.derrotas || 0;

        searchResults.style.display = "none";
        searchInput.value = "";
        editorPanel.style.display = "block";
    }

    document.getElementById("btn-guardar-admin").addEventListener("click", async () => {
        if (!jugadorEditandoID) return;
        
        let updates = {
            oro: parseInt(document.getElementById("edit-oro").value),
            nivel: parseInt(document.getElementById("edit-nivel").value),
            vidaMaxima: parseInt(document.getElementById("edit-vida").value),
            intentosJefe: parseInt(document.getElementById("edit-intentos").value),
            fuerza: parseInt(document.getElementById("edit-fuerza").value),
            agilidadBase: parseInt(document.getElementById("edit-agilidad").value), 
            velocidad: parseInt(document.getElementById("edit-velocidad").value),
            puntosStat: parseInt(document.getElementById("edit-puntos").value)
        };

        let editElo = document.getElementById("edit-elo");
        let editVic = document.getElementById("edit-victorias");
        let editDer = document.getElementById("edit-derrotas");
        
        if (editElo || editVic || editDer) {
            let nuevoElo = editElo ? parseInt(editElo.value) : 1200;
            updates["estadisticas.elo"] = nuevoElo;
            updates["estadisticas.division"] = calcularDivision(nuevoElo);
            if (editVic) updates["estadisticas.victorias"] = parseInt(editVic.value);
            if (editDer) updates["estadisticas.derrotas"] = parseInt(editDer.value);
        }

        try {
            await updateDoc(doc(db, "luchadores", jugadorEditandoID), updates);
            mostrarAlerta("¡Datos del jugador actualizados con éxito!");
            editorPanel.style.display = "none";
            cargarMetricas();
        } catch (e) {
            mostrarAlerta("Error al intentar guardar los datos.");
        }
    });

    // ==========================================
    // HERRAMIENTAS DE DESARROLLADOR
    // ==========================================
    document.getElementById("dev-bestia").addEventListener("click", async () => {
        if(!mostrarConfirmacion("Esto destruirá a la bestia actual. ¿Proceder?")) return;
        const jefeRef = doc(db, "servidor", "jefeMundial");
        await setDoc(jefeRef, {
            nombre: "Bestia de Testeo", estado: "vivo", semanaGenerada: "DEV", vidaMaxima: 100000, vidaActual: 100000, fuerza: 15, agilidad: 5,
            avatarBestia: { body: 1, head: 1, tail: 1, colorBase: "#ff0000", colorDetalle: "#000000" }, participantes: {}, asesino: null
        });
        mostrarAlerta("Nueva bestia generada.");
    });

    document.getElementById("dev-matar-bestia").addEventListener("click", async () => {
        const jefeRef = doc(db, "servidor", "jefeMundial");
        await updateDoc(jefeRef, { vidaActual: 1 });
        mostrarAlerta("El Jefe Mundial quedó a 1 HP.");
    });

    // ==========================================
    // REGLAS DEL SERVIDOR (FEATURE FLAGS)
    // ==========================================
    const configRef = doc(db, "servidor", "configAdmin");

    async function cargarSwitches() {
        const snap = await getDoc(configRef);
        if(snap.exists()) {
            const data = snap.data();
            
            let f5Activo = data.antiF5 || false;
            let decayActivo = data.decay || false;
            let seasonActiva = data.seasonActiva || false;
            let fechaSeason = data.fechaSeason || ""; 

            const btnF5 = document.getElementById("toggle-f5");
            btnF5.innerText = f5Activo ? "🟢 PRENDIDO" : "🔴 APAGADO";
            btnF5.style.borderColor = f5Activo ? "#00ff00" : "#ff3333";
            btnF5.onclick = async () => { await updateDoc(configRef, { antiF5: !f5Activo }); cargarSwitches(); };

            const btnDecay = document.getElementById("toggle-decay");
            btnDecay.innerText = decayActivo ? "🟢 PRENDIDO" : "🔴 APAGADO";
            btnDecay.style.borderColor = decayActivo ? "#00ff00" : "#ff3333";
            btnDecay.onclick = async () => { await updateDoc(configRef, { decay: !decayActivo }); cargarSwitches(); };

            const btnSeason = document.getElementById("toggle-temporada");
            btnSeason.innerText = seasonActiva ? "🟢 PRENDIDO" : "🔴 APAGADO";
            btnSeason.style.borderColor = seasonActiva ? "#00ff00" : "#ff3333";
            btnSeason.onclick = async () => { await updateDoc(configRef, { seasonActiva: !seasonActiva }); cargarSwitches(); };

            const inputFecha = document.getElementById("admin-fecha-season");
            inputFecha.value = fechaSeason;

            document.getElementById("btn-guardar-fecha").onclick = async () => {
                const nuevaFecha = inputFecha.value;
                if(!nuevaFecha) return mostrarAlerta("Elegí una fecha válida en el calendario.");
                await updateDoc(configRef, { fechaSeason: nuevaFecha });
                mostrarAlerta("📅 Fecha de fin de temporada guardada en los servidores.");
            };
        }
    }
    
    cargarSwitches();

    // ==========================================
    // BOTÓN NUCLEAR: SOFT-RESET (NUEVA TEMPORADA)
    // ==========================================
    document.getElementById("btn-ejecutar-reset").onclick = async () => {
        if(mostrarConfirmacion("⚠️ ¿Estás seguro? Esto comprimirá los Elos de TODOS los jugadores hacia 1200. ESTO ES IRREVERSIBLE.")) {
            
            const btnReset = document.getElementById("btn-ejecutar-reset");
            btnReset.innerText = "⚡ COMPRIMIENDO...";
            btnReset.disabled = true;

            try {
                const snapLuchadores = await getDocs(collection(db, "luchadores"));
                let promesasDeActualizacion = [];

                snapLuchadores.forEach((documento) => {
                    let data = documento.data();
                    let eloViejo = data.estadisticas?.elo || 1200;
                    let nuevoElo = Math.round(1200 + ((eloViejo - 1200) * 0.5));
                    let nuevaDivision = calcularDivision(nuevoElo);

                    const refDoc = doc(db, "luchadores", documento.id);
                    const actualizacion = updateDoc(refDoc, {
                        "estadisticas.eloAnterior": eloViejo,
                        "estadisticas.divisionAnterior": data.estadisticas?.division || "Plata",
                        "estadisticas.elo": nuevoElo,
                        "estadisticas.division": nuevaDivision,
                        "estadisticas.rachaActual": 0
                    });

                    promesasDeActualizacion.push(actualizacion);
                });

                await Promise.all(promesasDeActualizacion);

                mostrarAlerta("🟢 ¡BAM! La nueva temporada ha comenzado. Todos los rangos fueron comprimidos.");
                btnReset.innerText = "INICIAR TEMP.";
                btnReset.disabled = false;
                
            } catch (error) {
                console.error("Falla en el detonador:", error);
                mostrarAlerta("🔴 Hubo un error al procesar la temporada.");
                btnReset.innerText = "INICIAR TEMP.";
                btnReset.disabled = false;
            }
        }
    };
}