document.addEventListener("DOMContentLoaded", () => {
  // --- 0. FUNCIÓN PARA FORMATEAR DINERO ---
  function formatearDinero(cantidad) {
    return cantidad.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // --- 1. TEMA OSCURO ---
  const themeToggleBtn = document.getElementById("themeToggle");
  const temaGuardado = localStorage.getItem("theme") || "light";
  const iconoSol = "☀️";
  const iconoLuna = "🌙";

  function aplicarTema(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("theme", tema);
    if (themeToggleBtn) {
      themeToggleBtn.textContent = tema === "dark" ? iconoSol : iconoLuna;
    }
  }
  aplicarTema(temaGuardado);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const nuevoTema =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "light"
          : "dark";
      themeToggleBtn.style.transform = "scale(0.8)";
      setTimeout(() => {
        themeToggleBtn.style.transform = "scale(1)";
      }, 150);
      aplicarTema(nuevoTema);
    });
  }

  // --- 2. GESTIÓN GLOBAL DEL CARRITO ---
  let carrito = JSON.parse(localStorage.getItem("carritoTechStore")) || [];
  const cartCountElement = document.getElementById("cartCount");
  const drawerItems = document.getElementById("listaCarritoLateral");
  const drawerTotal = document.getElementById("totalCarritoLateral");

  function actualizarCarritoUI() {
    if (cartCountElement) {
      cartCountElement.textContent = carrito.reduce(
        (sum, item) => sum + item.cantidad,
        0,
      );
      cartCountElement.parentElement.classList.remove("cart-bump");
      void cartCountElement.parentElement.offsetWidth;
      cartCountElement.parentElement.classList.add("cart-bump");
    }

    if (drawerItems) {
      if (carrito.length === 0) {
        drawerItems.innerHTML =
          '<p style="text-align:center; color:gray; margin-top:2rem;">Tu carrito está vacío</p>';
        drawerTotal.textContent = "$0.00";
      } else {
        let total = 0;
        drawerItems.innerHTML = carrito
          .map((item) => {
            total += item.precio * item.cantidad;
            return `
                <div class="item-carrito fade-in">
                    <img src="${item.imagen}" alt="${item.nombre}">
                    <div class="item-info">
                        <h4 style="font-size: 0.9rem;">${item.nombre}</h4>
                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                            <p style="color: var(--primary-color); font-weight: bold; margin: 0;">$${formatearDinero(item.precio)}</p>
                            <span style="color: var(--text-muted); font-size: 0.8rem;">x</span>
                            <input type="number" class="cart-qty-input" data-id="${item.id}" value="${item.cantidad}" min="0" style="width: 50px; padding: 0.2rem; text-align: center; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-main);">
                        </div>
                    </div>
                    <button class="btn-eliminar" data-id="${item.id}" title="Eliminar">🗑️</button>
                </div>
            `;
          })
          .join("");
        drawerTotal.textContent = `$${formatearDinero(total)}`;
      }
    }
    localStorage.setItem("carritoTechStore", JSON.stringify(carrito));
  }

  function agregarAlCarrito(productoId, cantidad = 1) {
    const producto = inventario.find((p) => p.id === productoId);
    if (!producto) return;
    const itemExistente = carrito.find((item) => item.id === productoId);
    if (itemExistente) {
      itemExistente.cantidad += cantidad;
    } else {
      carrito.push({ ...producto, cantidad: cantidad });
    }
    actualizarCarritoUI();
  }

  function eliminarDelCarrito(productoId) {
    carrito = carrito.filter((item) => item.id !== productoId);
    actualizarCarritoUI();
  }
  actualizarCarritoUI();

  // --- ESCUCHADOR DE EVENTOS DE FIREBASE (¡La magia de la sincronización!) ---
  window.addEventListener("actualizarVistaCarrito", () => {
    const nuevoCarrito =
      JSON.parse(localStorage.getItem("carritoTechStore")) || [];
    carrito.length = 0; // Vaciar carrito actual de forma segura
    nuevoCarrito.forEach((item) => carrito.push(item)); // Rellenar con los datos de la nube
    actualizarCarritoUI(); // Forzar dibujo en pantalla
  });

  // --- 3. EVENTOS DEL CARRITO Y SINCRONIZACIÓN CON FIREBASE ---
  async function guardarCarritoEnNube(carritoActualizado) {
    if (typeof firebase !== "undefined" && firebase.auth) {
      const user = firebase.auth().currentUser;
      if (user) {
        try {
          await firebase
            .firestore()
            .collection("usuarios")
            .doc(user.uid)
            .set(
              { carrito: carritoActualizado, ultimaActualizacion: new Date() },
              { merge: true },
            );
        } catch (error) {
          console.error("Error de sincronización:", error);
        }
      }
    }
  }

  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("cart-qty-input")) {
      const id = parseInt(e.target.dataset.id);
      const nuevaCantidad = parseInt(e.target.value);

      if (nuevaCantidad <= 0) {
        if (
          confirm(
            "¿Estás seguro de que deseas eliminar este componente del carrito?",
          )
        ) {
          eliminarDelCarrito(id);
          guardarCarritoEnNube(carrito);
        } else {
          const item = carrito.find((i) => i.id === id);
          if (item) e.target.value = item.cantidad;
        }
      } else {
        const item = carrito.find((i) => i.id === id);
        if (item) {
          item.cantidad = nuevaCantidad;
          actualizarCarritoUI();
          guardarCarritoEnNube(carrito);
        }
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-add-cart")) {
      const id = parseInt(e.target.dataset.id);
      agregarAlCarrito(id);
      guardarCarritoEnNube(carrito);

      const btn = e.target;
      const textoOriginal = btn.textContent;
      btn.textContent = "¡Añadido!";
      btn.style.backgroundColor = "#10B981";
      setTimeout(() => {
        btn.textContent = textoOriginal;
        btn.style.backgroundColor = "";
      }, 1000);
      document.getElementById("carritoLateral")?.classList.add("abierto");
      document.getElementById("fondoOscuro")?.classList.add("activo");
    }

    if (e.target.classList.contains("btn-eliminar")) {
      if (
        confirm(
          "¿Estás seguro de que deseas eliminar este producto del carrito?",
        )
      ) {
        eliminarDelCarrito(parseInt(e.target.dataset.id));
        guardarCarritoEnNube(carrito);
      }
    }
  });

  // --- 4. CONTROLES DEL MENÚ LATERAL ---
  const btnAbrirCarrito = document.getElementById("abrirCarrito");
  const btnCerrarCarrito = document.getElementById("cerrarCarrito");
  const fondoOscuro = document.getElementById("fondoOscuro");

  if (btnAbrirCarrito)
    btnAbrirCarrito.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("carritoLateral")?.classList.add("abierto");
      fondoOscuro?.classList.add("activo");
    });
  if (btnCerrarCarrito)
    btnCerrarCarrito.addEventListener("click", () => {
      document.getElementById("carritoLateral")?.classList.remove("abierto");
      fondoOscuro?.classList.remove("activo");
    });
  if (fondoOscuro)
    fondoOscuro.addEventListener("click", () => {
      document.getElementById("carritoLateral")?.classList.remove("abierto");
      fondoOscuro.classList.remove("activo");
      document.getElementById("modalVistaRapida")?.classList.remove("activo");
    });

  // --- 5. RENDERIZADO Y FILTROS DEL CATÁLOGO ---
  function crearHTMLProducto(p) {
    return `
        <div class="card fade-in">
            <img src="${p.imagen}" alt="${p.nombre}" class="product-image">
            <h3 style="flex-grow:1; font-size:1.1rem; margin-bottom:10px;">${p.nombre}</h3>
            <p style="color: var(--primary-color); font-size: 1.3rem; font-weight: bold; margin-bottom: 15px;">$${formatearDinero(p.precio)}</p>
            <button class="btn-primary btn-add-cart" data-id="${p.id}">Añadir al carrito</button>
            <button class="btn-secondary" onclick="window.location.href='producto.html?id=${p.id}'">Ver detalles</button>
        </div>
    `;
  }

  const contDestacados = document.getElementById("contenedor-destacados");
  if (contDestacados) {
    contDestacados.innerHTML = inventario
      .filter((p) => p.destacado)
      .map(crearHTMLProducto)
      .join("");
  }

  const contCatalogo = document.getElementById("contenedor-catalogo");
  if (contCatalogo) {
    const filtroPrecio = document.getElementById("filtro-precio");
    const precioValor = document.getElementById("precio-valor");
    const checkboxesCat = document.querySelectorAll(".filtro-cat");
    const tituloCatalogo = contCatalogo.previousElementSibling;

    function aplicarFiltros() {
      let productosFiltrados = inventario;
      const parametrosURL = new URLSearchParams(window.location.search);
      const busqueda = parametrosURL.get("q");
      if (busqueda) {
        const termino = busqueda.toLowerCase().trim();
        productosFiltrados = productosFiltrados.filter(
          (p) =>
            p.nombre.toLowerCase().includes(termino) ||
            p.categoria.toLowerCase().includes(termino),
        );
        if (tituloCatalogo)
          tituloCatalogo.textContent = `Resultados para: "${busqueda}"`;
      }
      const categoriasSeleccionadas = Array.from(checkboxesCat)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value);
      if (categoriasSeleccionadas.length > 0) {
        productosFiltrados = productosFiltrados.filter((p) =>
          categoriasSeleccionadas.includes(p.categoria),
        );
      }
      if (filtroPrecio) {
        const precioMax = parseFloat(filtroPrecio.value);
        productosFiltrados = productosFiltrados.filter(
          (p) => p.precio <= precioMax,
        );
      }
      if (productosFiltrados.length > 0) {
        contCatalogo.innerHTML = productosFiltrados
          .map(crearHTMLProducto)
          .join("");
      } else {
        contCatalogo.innerHTML = `<p style="grid-column: 1/-1; text-align:center; font-size:1.2rem; color:var(--text-muted); padding: 2rem;">No hay productos que coincidan.</p>`;
      }
    }
    if (filtroPrecio) {
      filtroPrecio.addEventListener("input", (e) => {
        precioValor.textContent = formatearDinero(parseFloat(e.target.value));
        aplicarFiltros();
      });
    }
    if (checkboxesCat.length > 0) {
      checkboxesCat.forEach((cb) => {
        cb.addEventListener("change", aplicarFiltros);
      });
    }
    aplicarFiltros();
  }

  // --- 6. ARMA TU PC ---
  const contSeleccionPC = document.getElementById("contenedor-seleccion-pc");
  if (contSeleccionPC) {
    let ensamble = {
      cpu: null,
      motherboard: null,
      ram: null,
      gpu: null,
      storage: null,
      psu: null,
      case: null,
      mouse: null,
      keyboard: null,
      extras: [],
    };
    const pasos = document.querySelectorAll(".builder-steps li");
    const resumenCont = document.getElementById("resumen-ensamble");
    const categoriasPaso = {
      "1. Procesador": "cpu",
      "2. Motherboard": "motherboard",
      "3. Memoria RAM": "ram",
      "4. Tarjeta Gráfica": "gpu",
      "5. Almacenamiento": "storage",
      "6. Fuente de Poder": "psu",
      "7. Gabinete": "case",
      "8. Mouse": "mouse",
      "9. Teclado": "keyboard",
      "10. Monitor y Extras": "extras",
    };

    function renderizarOpcionesPaso(categoria) {
      let opciones = [];
      if (categoria === "extras") {
        opciones = inventario.filter(
          (p) => p.categoria === "accessory" || p.categoria === "mic",
        );
      } else {
        opciones = inventario.filter((p) => p.categoria === categoria);
      }
      if (categoria === "motherboard" && ensamble.cpu) {
        const nombreCPU = ensamble.cpu.nombre.toLowerCase();
        const esIntel = nombreCPU.includes("intel");
        const esAMD = nombreCPU.includes("amd") || nombreCPU.includes("ryzen");
        opciones = opciones.filter((placa) => {
          const nomPlaca = placa.nombre.toLowerCase();
          if (esIntel)
            return nomPlaca.includes("z790") || nomPlaca.includes("b760");
          if (esAMD)
            return nomPlaca.includes("x670") || nomPlaca.includes("b650");
          return true;
        });
      }

      contSeleccionPC.innerHTML = opciones
        .map((p) => {
          let isSelected = false;
          if (categoria === "extras") {
            isSelected = ensamble.extras.some((ex) => ex.id === p.id);
          } else {
            isSelected = ensamble[categoria]?.id === p.id;
          }
          return `
                <div class="card fade-in">
                    <img src="${p.imagen}" alt="${p.nombre}" class="product-image" style="height:120px;">
                    <h4 style="font-size:0.9rem; flex-grow:1;">${p.nombre}</h4>
                    <p style="color: var(--primary-color); font-weight: bold; margin: 10px 0;">$${formatearDinero(p.precio)}</p>
                    <button class="btn-primary btn-seleccionar-pc" data-id="${p.id}" data-cat="${categoria}">
                        ${isSelected ? "✅ Seleccionado" : "Seleccionar"}
                    </button>
                    <button class="btn-secondary" onclick="window.location.href='producto.html?id=${p.id}'">Ver Info</button>
                </div>
            `;
        })
        .join("");
    }

    function actualizarResumenPC() {
      let total = 0;
      let html = `<h3 style="margin-bottom:1rem;">Tu Ensamble</h3>`;
      let piezasSeleccionadas = [];
      const mostrarEnResumen = [
        "cpu",
        "motherboard",
        "ram",
        "gpu",
        "storage",
        "psu",
        "case",
        "mouse",
        "keyboard",
      ];

      mostrarEnResumen.forEach((cat) => {
        const item = ensamble[cat];
        html += `<div style="margin-bottom: 12px; font-size: 0.85rem; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;"><strong style="color:var(--text-muted); text-transform:uppercase; font-size:0.7rem;">${cat}</strong><br>`;
        if (item) {
          html += `${item.nombre} <br><span style="color:var(--primary-color); font-weight:bold;">$${formatearDinero(item.precio)}</span>`;
          total += item.precio;
          piezasSeleccionadas.push(item);
        } else {
          html += `<em style="color:var(--text-muted);">Pendiente</em>`;
        }
        html += `</div>`;
      });

      html += `<div style="margin-bottom: 12px; font-size: 0.85rem; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;"><strong style="color:var(--text-muted); text-transform:uppercase; font-size:0.7rem;">Extras Adicionales</strong><br>`;
      if (ensamble.extras.length > 0) {
        ensamble.extras.forEach((ext) => {
          html += `<div style="margin-top: 5px;">- ${ext.nombre} <br><span style="color:var(--primary-color); font-weight:bold;">$${formatearDinero(ext.precio)}</span></div>`;
          total += ext.precio;
          piezasSeleccionadas.push(ext);
        });
      } else {
        html += `<em style="color:var(--text-muted);">Ninguno</em>`;
      }
      html += `</div>`;

      html += `<div style="font-size: 1.2rem; font-weight: bold; margin-top:1rem;">Total: <span style="color: var(--primary-color);">$${formatearDinero(total)}</span></div>
               <button class="btn-primary" id="btn-agregar-ensamble" style="margin-top:15px; padding:1rem;" ${total === 0 ? "disabled" : ""}>Añadir todo al Carrito</button>`;

      resumenCont.innerHTML = html;
      const btnFinal = document.getElementById("btn-agregar-ensamble");
      if (btnFinal) {
        btnFinal.addEventListener("click", () => {
          piezasSeleccionadas.forEach((pieza) => agregarAlCarrito(pieza.id));
          document.getElementById("carritoLateral")?.classList.add("abierto");
          document.getElementById("fondoOscuro")?.classList.add("activo");
          guardarCarritoEnNube(carrito); // Sincroniza el ensamble nuevo
        });
      }
    }

    pasos.forEach((paso) => {
      paso.addEventListener("click", () => {
        pasos.forEach((p) => p.classList.remove("active"));
        paso.classList.add("active");
        renderizarOpcionesPaso(categoriasPaso[paso.textContent.trim()]);
      });
    });

    contSeleccionPC.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-seleccionar-pc")) {
        const id = parseInt(e.target.dataset.id);
        let cat = e.target.dataset.cat;
        const producto = inventario.find((p) => p.id === id);

        if (cat === "extras") {
          const indexExistente = ensamble.extras.findIndex(
            (ex) => ex.id === id,
          );
          if (indexExistente >= 0) {
            ensamble.extras.splice(indexExistente, 1);
          } else {
            ensamble.extras.push(producto);
          }
        } else {
          ensamble[cat] = producto;
          if (cat === "cpu") ensamble["motherboard"] = null;
        }

        actualizarResumenPC();
        renderizarOpcionesPaso(cat);

        if (cat !== "extras") {
          const pasosArray = Array.from(pasos);
          const pasoActualIndex = pasosArray.findIndex((p) =>
            p.classList.contains("active"),
          );
          if (pasoActualIndex < pasosArray.length - 1) {
            setTimeout(() => {
              pasosArray[pasoActualIndex + 1].click();
            }, 400);
          }
        }
      }
    });

    renderizarOpcionesPaso("cpu");
    actualizarResumenPC();
  }

  // --- 7. BÚSQUEDA GLOBAL ---
  const inputsBusqueda = document.querySelectorAll(".search-bar input");
  const botonesBusqueda = document.querySelectorAll(".search-bar button");
  function ejecutarBusqueda(inputElement) {
    const query = inputElement.value.trim();
    if (query) {
      window.location.href = `catalogo.html?q=${encodeURIComponent(query)}`;
    }
  }
  inputsBusqueda.forEach((input, index) => {
    const boton = botonesBusqueda[index];
    boton.addEventListener("click", () => ejecutarBusqueda(input));
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") ejecutarBusqueda(input);
    });
  });

  // --- LÓGICA PÁGINA DETALLES (producto.html) ---
  const contDetalleDinamico = document.getElementById(
    "detalle-producto-dinamico",
  );
  if (contDetalleDinamico) {
    const urlParams = new URLSearchParams(window.location.search);
    const idProducto = parseInt(urlParams.get("id"));
    const p = inventario.find((prod) => prod.id === idProducto);
    if (p) {
      contDetalleDinamico.innerHTML = `
        <div class="card" style="padding: 2rem;">
            <img src="${p.imagen}" alt="${p.nombre}" style="width: 100%; max-height: 400px; object-fit: contain;">
        </div>
        <div class="info-detallada">
            <p style="color: var(--primary-color); font-weight: bold; text-transform: uppercase; font-size: 0.8rem; margin-bottom: 0.5rem;">Categoría: ${p.categoria}</p>
            <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">${p.nombre}</h1>
            <p style="font-size: 2rem; color: var(--text-main); font-weight: 800; margin-bottom: 1.5rem;">$${formatearDinero(p.precio)}</p>
            <div class="card" style="margin-bottom: 2rem; background: var(--bg-color);">
                <h4 style="margin-bottom: 0.5rem;">Descripción</h4>
                <p style="color: var(--text-muted); line-height: 1.8;">Rendimiento extremo garantizado para este componente de gama alta. Componente de grado profesional para armar la computadora de tus sueños.</p>
            </div>
            <button class="btn-primary btn-add-cart" data-id="${p.id}" style="padding: 1.2rem;">Añadir al carrito</button>
        </div>`;
      document.title = `TechStore | ${p.nombre}`;
    }
  }

  // --- 8. GESTIÓN DE SESIÓN GLOBAL (UI DEL HEADER) ---
  function verificarSesionUI() {
    const usuarioLogueado = JSON.parse(localStorage.getItem("techstore_user"));
    const btnLoginHeader = document.getElementById("btn-login-header");
    const btnProfile = document.getElementById("user-profile-btn");
    const avatarImg = document.getElementById("user-avatar");
    const nameDisplay = document.getElementById("user-name-display");
    const emailDisplay = document.getElementById("user-email-display");

    if (usuarioLogueado && btnLoginHeader && btnProfile) {
      btnLoginHeader.style.display = "none";
      btnProfile.style.display = "flex";
      avatarImg.src =
        usuarioLogueado.foto || "https://www.svgrepo.com/show/5125/avatar.svg";
      nameDisplay.textContent = usuarioLogueado.nombre || "Usuario";
      emailDisplay.textContent = usuarioLogueado.correo;
    }
  }
  verificarSesionUI();

  // Controlar el clic para abrir/cerrar el menú desplegable del perfil
  const btnProfileToggle = document.getElementById("user-profile-btn");
  const dropdownMenu = document.getElementById("user-dropdown");

  if (btnProfileToggle && dropdownMenu) {
    btnProfileToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("activo");
    });

    document.addEventListener("click", (e) => {
      if (
        !dropdownMenu.contains(e.target) &&
        !btnProfileToggle.contains(e.target)
      ) {
        dropdownMenu.classList.remove("activo");
      }
    });
  }
});
