import { auth, googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "./firebase.js";
import { cambiarVista, renderizarMiHub, mostrarAlerta, mostrarConfirmacion } from "./ui.js";
import { obtenerMiGladiador } from "./db.js";
import { renderizarArmario } from "./rpg.js";
import { verificarObjetivos } from "./objetivos.js"; // 👈 1. IMPORTAMOS EL MOTOR DE LOGROS

export let miGladiador = null; 

onAuthStateChanged(auth, async (user) => {
    try {
        if (user) {
            miGladiador = await obtenerMiGladiador(user.uid);
            if (miGladiador) {
                // 👈 2. ESCANEO RETROACTIVO: Revisa si tenés premios pendientes apenas entrás
                await verificarObjetivos(miGladiador); 
                
                cambiarVista('vista-hub');      
                renderizarMiHub(miGladiador); 
                renderizarArmario(miGladiador); 
            } else { 
                cambiarVista('vista-forja'); 
            }
        } else { 
            miGladiador = null; 
            cambiarVista('vista-login'); 
        }
    } catch (e) {
        console.error(e);
        mostrarAlerta("El tejido de la realidad se ha rasgado. Recarga la página.", "ENTENDIDO");
    }
});

export async function loginGoogle() {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { mostrarAlerta("Los dioses de Google rechazaron tu ofrenda.", "ENTENDIDO"); }
}

export async function registrarEmailReal(email, pass) {
    if(pass.length < 6) return mostrarAlerta("La contraseña debe tener al menos 6 caracteres.", "OK");
    try {
        await createUserWithEmailAndPassword(auth, email, pass);
        mostrarAlerta("¡Cuenta creada! Prepárate para la forja.", "FORJAR DESTINO");
    } catch (error) { mostrarAlerta("El correo ya está en uso o es inválido.", "OK"); }
}

export async function registrarFantasma(nombreGladiador, pass) {
    if(nombreGladiador.length < 3) return mostrarAlerta("El nombre debe tener al menos 3 letras.", "OK");
    if(pass.length < 6) return mostrarAlerta("La contraseña debe tener al menos 6 caracteres.", "OK");
    
    mostrarConfirmacion("⚠️ ADVERTENCIA ⚠️\nEstás por crear una cuenta sin email. Si olvidas tu contraseña, perderás a tu gladiador.\n\n¿Anotaste bien tu clave?", async () => {
        const fakeEmail = `${nombreGladiador.toLowerCase().replace(/\s+/g, '')}@bardo.local`;
        try {
            await createUserWithEmailAndPassword(auth, fakeEmail, pass);
            mostrarAlerta(`¡Bienvenido, ${nombreGladiador}! Que tu sangre riegue la arena.`, "A LA ARENA");
        } catch (error) { mostrarAlerta("Ese nombre ya está siendo usado por otro gladiador.", "OK"); }
    });
}

export async function loginGenerico(identificador, pass) {
    let emailFinal = identificador;
    if (!identificador.includes('@')) emailFinal = `${identificador.toLowerCase().replace(/\s+/g, '')}@bardo.local`;
    
    try { 
        await signInWithEmailAndPassword(auth, emailFinal, pass); 
    } catch (error) { 
        mostrarAlerta("Las credenciales no coinciden con ningún alma de la arena.", "REINTENTAR"); 
    }
}

export function cerrarSesion() {
    signOut(auth);
}