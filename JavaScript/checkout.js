document.addEventListener("DOMContentLoaded", () => {
  // 1. CARGAR DATOS DEL CARRITO
  const carrito = JSON.parse(localStorage.getItem("carritoTechStore")) || [];
  const contCheckoutItems = document.getElementById("checkout-items");
  const totalElement = document.getElementById("checkout-total");

  // Variable global para usarla al final en la base de datos
  let totalCalculado = 0;

  function formatearDinero(cantidad) {
    return cantidad.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (carrito.length === 0) {
    contCheckoutItems.innerHTML =
      "<p>Tu carrito está vacío. Regresa al catálogo.</p>";
    document.getElementById("btn-confirmar-pago").disabled = true;
  } else {
    contCheckoutItems.innerHTML = carrito
      .map((item) => {
        let subtotal = item.precio * item.cantidad;
        totalCalculado += subtotal;
        return `
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px; align-items:center;">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <img src="${item.imagen}" style="width:50px; height:50px; object-fit:contain; border-radius:4px; background:var(--bg-color);">
                        <span style="font-size: 0.9rem;">${item.cantidad}x ${item.nombre}</span>
                    </div>
                    <strong style="color: var(--primary-color);">$${formatearDinero(subtotal)}</strong>
                </div>`;
      })
      .join("");
    totalCalculado += 150; // Envío fijo estándar
    totalElement.textContent = `$${formatearDinero(totalCalculado)}`;
  }

  // 2. INICIALIZAR EL MAPA "DE MUESTRA" (LEAFLET)
  const map = L.map("mapaCheckout", {
    dragging: false,
    touchZoom: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    zoomControl: false,
  }).setView([20.6534, -105.2253], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);

  let marker;

  const inputCalle = document.getElementById("chk-calle");
  const inputCP = document.getElementById("chk-cp");
  const datalistColonias = document.getElementById("lista-colonias");
  const inputColonia = document.getElementById("chk-colonia");
  const inputCiudad = document.getElementById("chk-ciudad");

  // --- GEOCODIFICACIÓN DIRECTA ---
  async function actualizarMapaDesdeDatos() {
    const calle = inputCalle.value.trim();
    const cp = inputCP.value.trim();
    const colonia = inputColonia.value.trim();
    const ciudad = inputCiudad.value.trim();

    if (calle.length < 3 || cp.length !== 5 || ciudad.length < 3) return;

    let consulta = `${calle}, ${colonia}, ${ciudad}, Mexico`;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(consulta)}&limit=1`,
      );
      const resultados = await response.json();

      if (resultados && resultados.length > 0) {
        const lat = resultados[0].lat;
        const lon = resultados[0].lon;

        map.flyTo([lat, lon], 16);

        if (marker) {
          marker.setLatLng([lat, lon]);
        } else {
          marker = L.marker([lat, lon]).addTo(map);
        }

        inputCalle.classList.remove("invalido");
        inputCalle.classList.add("valido");
      } else {
        console.log("Dirección no encontrada exactamente en el mapa.");
      }
    } catch (error) {
      console.error("Error en la geocodificación directa:", error);
    }
  }

  inputCalle.addEventListener("blur", actualizarMapaDesdeDatos);
  inputColonia.addEventListener("change", actualizarMapaDesdeDatos);

  // --- AUTOCOMPLETADO POR CÓDIGO POSTAL ---
  inputCP.addEventListener("input", async (e) => {
    let cp = e.target.value.replace(/\D/g, "");
    e.target.value = cp;

    if (cp.length === 5) {
      try {
        e.target.style.opacity = "0.5";
        const response = await fetch(`https://api.zippopotam.us/mx/${cp}`);

        if (!response.ok) throw new Error("CP no encontrado");

        const data = await response.json();
        const colonias = data.places;

        datalistColonias.innerHTML = colonias
          .map((c) => `<option value="${c["place name"]}">`)
          .join("");

        if (colonias.length === 1) {
          inputColonia.value = colonias[0]["place name"];
        } else {
          inputColonia.value = "";
          inputColonia.placeholder = "Selecciona tu colonia...";
        }

        inputCiudad.value = colonias[0]["state"];
        inputCiudad.classList.add("valido");
        inputColonia.classList.add("valido");

        e.target.classList.remove("invalido");
        e.target.classList.add("valido");

        actualizarMapaDesdeDatos();
      } catch (error) {
        console.error(error);
        e.target.classList.remove("valido");
        e.target.classList.add("invalido");
        inputColonia.value = "";
        inputCiudad.value = "";
        datalistColonias.innerHTML = "";
      } finally {
        e.target.style.opacity = "1";
      }
    } else {
      e.target.classList.remove("valido", "invalido");
    }
  });

  // 3. VALIDACIONES INTELIGENTES DE FORMULARIO
  const inputCorreo = document.getElementById("chk-correo");
  const inputTarjeta = document.getElementById("chk-tarjeta");
  const inputFecha = document.getElementById("chk-fecha");

  inputCorreo.addEventListener("input", (e) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (regex.test(e.target.value)) {
      e.target.classList.remove("invalido");
      e.target.classList.add("valido");
      document.getElementById("error-correo").style.display = "none";
    } else {
      e.target.classList.remove("valido");
      e.target.classList.add("invalido");
      document.getElementById("error-correo").style.display = "block";
    }
  });

  inputTarjeta.addEventListener("input", (e) => {
    let valor = e.target.value.replace(/\D/g, "");
    e.target.value = valor.replace(/(.{4})/g, "$1 ").trim();
    if (valor.length >= 15) {
      if (validarLuhn(valor)) {
        e.target.classList.remove("invalido");
        e.target.classList.add("valido");
        document.getElementById("error-tarjeta").style.display = "none";
      } else {
        e.target.classList.remove("valido");
        e.target.classList.add("invalido");
        document.getElementById("error-tarjeta").style.display = "block";
      }
    } else {
      e.target.classList.remove("valido", "invalido");
      document.getElementById("error-tarjeta").style.display = "none";
    }
  });

  inputFecha.addEventListener("input", (e) => {
    let valor = e.target.value.replace(/\D/g, "");
    if (valor.length > 2) {
      valor = valor.slice(0, 2) + "/" + valor.slice(2, 4);
    }
    e.target.value = valor;
  });

  function validarLuhn(numero) {
    let suma = 0;
    let numAlterno = false;
    for (let i = numero.length - 1; i >= 0; i--) {
      let n = parseInt(numero.charAt(i), 10);
      if (numAlterno) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      suma += n;
      numAlterno = !numAlterno;
    }
    return suma % 10 == 0;
  }

  // 4. ENVÍO DE PEDIDO A LA BASE DE DATOS FIREBASE
  const form = document.getElementById("form-pago-pro");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (document.querySelectorAll(".invalido").length > 0) {
      alert("Por favor, corrige los errores en rojo antes de continuar.");
      return;
    }

    const btn = document.getElementById("btn-confirmar-pago");
    btn.textContent = "Procesando pago y guardando pedido...";
    btn.style.opacity = "0.7";
    btn.disabled = true;

    try {
      // Verificamos si Firebase está activo y el usuario tiene sesión
      if (typeof firebase !== "undefined" && firebase.auth) {
        const user = firebase.auth().currentUser;

        if (user) {
          // 1. Crear el objeto del Pedido
          const nuevoPedido = {
            userId: user.uid,
            items: carrito,
            total: totalCalculado,
            fecha: new Date(),
            estado: "Pendiente de envío", // El estado inicial
            direccion: {
              calle: inputCalle.value,
              cp: inputCP.value,
              colonia: inputColonia.value,
              ciudad: inputCiudad.value,
            },
          };

          // 2. Subir el pedido a Firestore (Colección "pedidos")
          await firebase.firestore().collection("pedidos").add(nuevoPedido);

          // 3. Vaciar el carrito en la cuenta del usuario en Firestore
          await firebase.firestore().collection("usuarios").doc(user.uid).set(
            {
              carrito: [],
              ultimaActualizacion: new Date(),
            },
            { merge: true },
          );
        }
      }

      // Finalizar UI: Mostrar éxito y vaciar carrito local
      document.getElementById("correo-confirmacion").textContent =
        inputCorreo.value;
      document.getElementById("modalExito").classList.add("activo");
      localStorage.removeItem("carritoTechStore");
    } catch (error) {
      console.error("Error al procesar el pedido:", error);
      alert(
        "Ocurrió un error de conexión al guardar tu pedido. Intenta de nuevo.",
      );
      btn.textContent = "Confirmar Pedido y Pagar";
      btn.style.opacity = "1";
      btn.disabled = false;
    }
  });
});
