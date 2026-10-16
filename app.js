const API = 'https://api.github.com';

const form = document.querySelector('#form-buscar');
const input = document.querySelector('#input-usuario');
const boton = document.querySelector('#btn-buscar');
const estado = document.querySelector('#estado');
const perfil = document.querySelector('#perfil');
const titulo = document.querySelector('#titulo-repos');
const repos = document.querySelector('#repos');

const selectOrden = document.querySelector('#select-orden');
const resumenLenguajes = document.querySelector('#resumen-lenguajes');
const listaLenguajes = document.querySelector('#lista-lenguajes');

// Referencias para la Actividad 3
const btnCargarMas = document.querySelector('#btn-cargar-mas');
const peticionesRestantes = document.querySelector('#peticiones-restantes');

// Variables de control para la paginación
let paginaActual = 1;
let usuarioActual = '';

// Función para contar lenguajes
function contarLenguajes(repositorios) {
    const conteo = {};
    repositorios.forEach(repo => {
        const lenguaje = repo.language ?? 'Sin lenguaje';
        conteo[lenguaje] = (conteo[lenguaje] || 0) + 1;
    });
    return conteo;
}

// Función para mostrar el resumen
function mostrarResumenLenguajes(conteo) {
    listaLenguajes.innerHTML = '';
    Object.entries(conteo)
        .sort((a, b) => b[1] - a[1]) // Ordenar de mayor a menor
        .forEach(([lenguaje, cantidad]) => {
            const li = document.createElement('li');
            li.textContent = `${lenguaje}: ${cantidad} repositorio(s)`;
            listaLenguajes.append(li);
        });
    resumenLenguajes.classList.remove('oculto');
}

// 1. Petición genérica con traducción de errores HTTP
// Ahora devuelve la respuesta completa (Response), no solo el JSON
async function obtenerRespuesta(url) {
    const res = await fetch(url);
    if (res.status === 404) throw new Error('Usuario no encontrado');
    if (res.status === 403) throw new Error('Límite de peticiones alcanzado');
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
    return res; // Devolvemos la respuesta completa
}

// Función para actualizar el pie de página con las peticiones restantes
function actualizarPeticionesRestantes(res) {
    const restantes = res.headers.get('x-ratelimit-remaining');
    if (restantes !== null) {
        peticionesRestantes.textContent = `Peticiones restantes: ${restantes}`;
    }
}

// 2. Pintar el perfil
function mostrarPerfil(u) {
    const img = document.createElement('img');
    img.src = u.avatar_url;
    img.alt = `Avatar de ${u.login}`;

    const nombre = document.createElement('h2');
    // si el usuario no registró un nombre, se muestra su login
    nombre.textContent = u.name ?? u.login;

    const datos = document.createElement('p');
    datos.textContent = `${u.public_repos} repositorios · ${u.followers} seguidores`;

    const enlace = document.createElement('a');
    enlace.href = u.html_url;
    enlace.target = '_blank';
    enlace.textContent = 'Ver en GitHub';

    const info = document.createElement('div');
    info.append(nombre, datos, enlace);
    perfil.replaceChildren(img, info);
    perfil.classList.remove('oculto');
}

// 3. Pintar la lista de repositorios
function mostrarRepos(lista) {
    repos.innerHTML = '';
    lista.forEach(r => {
        const a = document.createElement('a');
        a.href = r.html_url;
        a.target = '_blank';
        a.textContent = r.name;
        const li = document.createElement('li');
        const lenguaje = r.language ?? 'sin lenguaje';
        li.append(a, ` - ${lenguaje} - ★ ${r.stargazers_count}`);
        repos.append(li);
    });
    titulo.classList.remove('oculto');
}

// 4. Evento submit: dos peticiones en paralelo
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Asignar el valor directamente a usuarioActual
    usuarioActual = encodeURIComponent(input.value.trim());
    if (!usuarioActual) return;

    // Reiniciar paginación
    paginaActual = 1;
    btnCargarMas.classList.add('oculto');
    repos.innerHTML = ''; // Limpiar lista anterior
    resumenLenguajes.classList.add('oculto'); // Ocultar resumen anterior

    // Usar el valor del select para el ordenamiento
    const sortValue = selectOrden.value;
    const params = new URLSearchParams({ sort: sortValue, per_page: 5, page: paginaActual });

    boton.disabled = true;
    estado.className = '';
    estado.textContent = 'Buscando...';

    try {
        // Usamos obtenerRespuesta en lugar de obtenerJSON
        const [resUsuario, resRepos] = await Promise.all([
            obtenerRespuesta(`${API}/users/${usuarioActual}`),
            obtenerRespuesta(`${API}/users/${usuarioActual}/repos?${params}`)
        ]);

        const datosUsuario = await resUsuario.json();
        const datosRepos = await resRepos.json();

        mostrarPerfil(datosUsuario);
        mostrarRepos(datosRepos);

        // Mostrar botón si hay exactamente 5 repos (puede haber más)
        if (datosRepos.length === 5) {
            btnCargarMas.classList.remove('oculto');
        }

        // Calcular y mostrar el resumen de lenguajes
        const conteoLenguajes = contarLenguajes(datosRepos);
        mostrarResumenLenguajes(conteoLenguajes);

        // Actualizar peticiones restantes
        actualizarPeticionesRestantes(resUsuario);

        estado.textContent = '';
    } catch (error) {
        perfil.classList.add('oculto');
        titulo.classList.add('oculto');
        repos.innerHTML = '';
        estado.className = 'error';
        estado.textContent = error.message;
    } finally {
        boton.disabled = false;
    }
});

// Evento para el botón "Cargar más"
btnCargarMas.addEventListener('click', async () => {
    paginaActual++;
    const sortValue = selectOrden.value;
    const params = new URLSearchParams({ sort: sortValue, per_page: 5, page: paginaActual });

    btnCargarMas.disabled = true;
    estado.textContent = 'Cargando más...';

    try {
        const res = await obtenerRespuesta(`${API}/users/${usuarioActual}/repos?${params}`);
        const datosRepos = await res.json();

        if (datosRepos.length > 0) {
            // Agregar a la lista existente (NO borrar)
            datosRepos.forEach(r => {
                const a = document.createElement('a');
                a.href = r.html_url;
                a.target = '_blank';
                a.textContent = r.name;
                const li = document.createElement('li');
                const lenguaje = r.language ?? 'sin lenguaje';
                li.append(a, ` - ${lenguaje} - ★ ${r.stargazers_count}`);
                repos.append(li);
            });
        }

        // Ocultar botón si ya no hay más resultados (menos de 5)
        if (datosRepos.length < 5) {
            btnCargarMas.classList.add('oculto');
        }

        actualizarPeticionesRestantes(res);
        estado.textContent = '';
    } catch (error) {
        estado.className = 'error';
        estado.textContent = error.message;
    } finally {
        btnCargarMas.disabled = false;
    }
});