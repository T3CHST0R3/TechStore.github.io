// 1. PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE (La del Paso 1)
const firebaseConfig = {
  apiKey: "AIzaSyDqI7yxH21HVBRF2C5iAJlKrgc53AuLd7Q",
  authDomain: "techstore-bb5da.firebaseapp.com",
  projectId: "techstore-bb5da",
  storageBucket: "techstore-bb5da.firebasestorage.app",
  messagingSenderId: "491466180302",
  appId: "1:491466180302:web:2f37ab3d009414bbdeb29f",
};
// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

document.addEventListener("DOMContentLoaded", () => {
  // --- LÓGICA DEL LOGIN CON GOOGLE ---
  const btnGoogle = document.getElementById("btn-login-google");
  if (btnGoogle) {
    btnGoogle.addEventListener("click", () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth
        .signInWithPopup(provider)
        .then(() => (window.location.href = "index.html"))
        .catch((error) => console.error("Error Google:", error.message));
    });
  }

  // --- LÓGICA DEL FORMULARIO HÍBRIDO (CORREO Y CONTRASEÑA) ---
  let modoRegistro = false;

  const formAuth = document.getElementById("form-auth");
  const toggleAuthMode = document.getElementById("toggle-auth-mode");
  const titleAuth = document.getElementById("auth-title");
  const descAuth = document.getElementById("auth-desc");
  const btnAuthAction = document.getElementById("btn-auth-action");
  const switchText = document.getElementById("auth-switch-text");
  const db = firebase.firestore(); // Esto activa el acceso a la base de datos
  if (toggleAuthMode) {
    toggleAuthMode.addEventListener("click", (e) => {
      e.preventDefault();
      modoRegistro = !modoRegistro;

      if (modoRegistro) {
        titleAuth.textContent = "Crear Cuenta Nueva";
        descAuth.textContent = "Regístrate para guardar tu carrito y envíos.";
        btnAuthAction.textContent = "Registrarme Ahora";
        switchText.textContent = "¿Ya tienes una cuenta?";
        toggleAuthMode.textContent = "Inicia sesión aquí";
      } else {
        titleAuth.textContent = "Bienvenido de nuevo";
        descAuth.textContent = "Inicia sesión para acceder a tus pedidos.";
        btnAuthAction.textContent = "Iniciar Sesión";
        switchText.textContent = "¿No tienes cuenta?";
        toggleAuthMode.textContent = "Regístrate aquí";
      }
    });
  }

  if (formAuth) {
    formAuth.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = document.getElementById("auth-email").value;
      const pass = document.getElementById("auth-pass").value;

      const textoOriginal = btnAuthAction.textContent;
      btnAuthAction.textContent = "Procesando...";
      btnAuthAction.disabled = true;

      if (modoRegistro) {
        // 1. CREAR CUENTA
        auth
          .createUserWithEmailAndPassword(email, pass)
          .then((userCredential) => {
            // 2. ENVIAR CORREO DE VERIFICACIÓN
            return userCredential.user.sendEmailVerification();
          })
          .then(() => {
            alert(
              "¡Cuenta creada! Te hemos enviado un enlace de verificación a tu correo. Por favor, revísalo (y checa la carpeta de SPAM).",
            );
            window.location.href = "index.html";
          })
          .catch((error) => {
            alert("Error: " + error.message);
            btnAuthAction.textContent = textoOriginal;
            btnAuthAction.disabled = false;
          });
      } else {
        // INICIAR SESIÓN NORMAL
        auth
          .signInWithEmailAndPassword(email, pass)
          .then(() => (window.location.href = "index.html"))
          .catch(() => {
            alert("Correo o contraseña incorrectos. Verifica tus datos.");
            btnAuthAction.textContent = textoOriginal;
            btnAuthAction.disabled = false;
          });
      }
    });
  }

  // --- CERRAR SESIÓN DE FORMA SEGURA ---
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => {
      e.preventDefault();
      // Desconectarse de los servidores de Google
      auth
        .signOut()
        .then(() => {
          localStorage.removeItem("techstore_user");
          alert("Has cerrado sesión exitosamente.");
          window.location.href = "login.html";
        })
        .catch((error) => {
          console.error("Error al cerrar sesión", error);
        });
    });
  }

  // --- MANTENER LA SESIÓN ACTIVA GLOBALMENTE ---
  auth.onAuthStateChanged(async (user) => {
    const btnLoginHeader = document.getElementById("btn-login-header");
    const btnProfile = document.getElementById("user-profile-btn");

    if (user) {
      const userData = {
        nombre: user.displayName || user.email.split("@")[0],
        correo: user.email,
        foto: user.photoURL || "https://www.svgrepo.com/show/5125/avatar.svg",
        verificado: user.emailVerified,
      };
      localStorage.setItem("techstore_user", JSON.stringify(userData));

      // 2. SINCRONIZAR CARRITO DESDE LA NUBE
      const db = firebase.firestore();
      try {
        const doc = await db.collection("usuarios").doc(user.uid).get();
        if (doc.exists && doc.data().carrito) {
          const carritoNube = doc.data().carrito;
          localStorage.setItem("carritoTechStore", JSON.stringify(carritoNube));

          // ¡NUEVO! Enviamos la señal de radio a toda la página
          window.dispatchEvent(new Event("actualizarVistaCarrito"));
        }
      } catch (error) {
        console.error("Error al recuperar carrito:", error);
      }

      if (btnLoginHeader && btnProfile) {
        btnLoginHeader.style.display = "none";
        btnProfile.style.display = "flex";
        document.getElementById("user-avatar").src = userData.foto;
        document.getElementById("user-name-display").textContent =
          userData.nombre;
      }
    } else {
      // AL CERRAR SESIÓN
      localStorage.removeItem("techstore_user");
      localStorage.removeItem("carritoTechStore"); // Vacía la memoria

      // ¡NUEVO! Enviamos la señal de radio para que la pantalla se limpie
      window.dispatchEvent(new Event("actualizarVistaCarrito"));

      if (btnLoginHeader && btnProfile) {
        btnLoginHeader.style.display = "inline-block";
        btnProfile.style.display = "none";
      }
      const cartCount = document.getElementById("cartCount");
      if (cartCount) cartCount.textContent = "0";
    }
  });
});
