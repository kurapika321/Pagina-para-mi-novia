// 1. CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = 'https://gccgwhbkjfftsscnvseb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ImP3NXlYLYeefTbY74q3sw_pe7JfxAB'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let modoAdminActivado = false;
let splideInstance = null;

// 2. EFECTO DE PÉTALOS (Visual)
function crearPetalos() {
    const container = document.getElementById('petals-container');
    for (let i = 0; i < 15; i++) {
        const petal = document.createElement('div');
        petal.className = 'petal';
        const size = Math.random() * 15 + 10 + 'px';
        petal.style.width = size;
        petal.style.height = size;
        petal.style.left = Math.random() * 100 + 'vw';
        petal.style.animationDuration = Math.random() * 5 + 5 + 's';
        petal.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(petal);
        petal.addEventListener('animationiteration', () => {
            petal.style.left = Math.random() * 100 + 'vw';
        });
    }
}

// 3. NAVEGACIÓN
function cambiarSeccion(seccion, evento) {
    document.querySelectorAll('.seccion-vista').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`vista-${seccion}`).classList.add('active');
    evento.currentTarget.classList.add('active');

    if (seccion === 'galeria' && splideInstance) {
        setTimeout(() => splideInstance.refresh(), 100);
    }
}

// 4. SEGURIDAD: VALIDAR ACCESO
async function validarAcceso() {
    const { value: password } = await Swal.fire({
        title: 'Acceso Admin',
        input: 'password',
        inputPlaceholder: 'Clave secreta...',
        confirmButtonColor: '#ff4d6d',
        showCancelButton: true
    });

    if (password === 'amor2023') {
        modoAdminActivado = true;
        document.getElementById('btn-admin-tab').style.display = 'flex';
        // Recargamos el contenido para que el renderizador ahora SI incluya los botones X
        cargarContenido(); 
        Swal.fire('¡Hola!', 'Modo edición activado.', 'success');
    } else if (password) {
        Swal.fire('Error', 'Clave incorrecta ❤️', 'error');
    }
}

// 5. CARGAR CONTENIDO (Renderizado condicional de botones)
async function cargarContenido() {
    try {
        const { data: config } = await _supabase.from('configuracion').select('*').eq('id', 1).single();
        if (config) {
            document.getElementById('texto-carta').innerText = config.contenido_carta;
            document.getElementById('mensaje-personalizado').innerText = config.mensaje_corto || "Eres mi vida";
            document.getElementById('nueva-carta').value = config.contenido_carta;
            document.getElementById('nuevo-mensaje').value = config.mensaje_corto || "";
        }

        const { data: fotos } = await _supabase.from('imagenes_collage').select('*').order('creado_en', { ascending: false });

        if (fotos) {
            // Llenar Carrusel
            const carruselList = document.getElementById('carrusel-fotos');
            carruselList.innerHTML = '';
            fotos.slice(0, 6).forEach(foto => {
                const li = document.createElement('li');
                li.className = 'splide__slide';
                li.innerHTML = `<img src="${foto.url_imagen}">`;
                carruselList.appendChild(li);
            });
            if (splideInstance) splideInstance.destroy();
            splideInstance = new Splide('.splide', { type: 'fade', rewind: true, autoplay: true, arrows: false }).mount();

            // Llenar Collage
            const collageDiv = document.getElementById('collage');
            collageDiv.innerHTML = '';
            fotos.forEach(foto => {
                const frame = document.createElement('div');
                frame.className = 'foto-frame';
                frame.style.transform = `rotate(${(Math.random() * 6 - 3).toFixed(1)}deg)`;

                // SEGURIDAD: Solo inyectamos el botón de eliminar si el admin está validado
                if (modoAdminActivado) {
                    const btnDel = document.createElement('button');
                    btnDel.innerHTML = '✕';
                    btnDel.className = 'btn-eliminar';
                    btnDel.style.display = 'block'; // Aseguramos visibilidad
                    btnDel.onclick = (e) => {
                        e.stopPropagation();
                        eliminarFoto(foto.id);
                    };
                    frame.appendChild(btnDel);
                }

                const img = document.createElement('img');
                img.src = foto.url_imagen;
                img.loading = "lazy";
                
                frame.appendChild(img);
                collageDiv.appendChild(frame);
            });
        }
    } catch (e) { console.error("Error:", e); }
}

// 6. FUNCIONES DE BASE DE DATOS
async function subirFoto() {
    const fileInput = document.getElementById('input-foto');
    const file = fileInput.files[0];
    if (!file) return Swal.fire('Aviso', 'Selecciona una imagen primero.', 'warning');

    Swal.fire({ title: 'Subiendo recuerdo...', didOpen: () => { Swal.showLoading(); } });

    const fileName = `${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
    
    try {
        const { error: storageError } = await _supabase.storage.from('fotos_galeria').upload(fileName, file);
        if (storageError) throw storageError;

        const { data: urlData } = _supabase.storage.from('fotos_galeria').getPublicUrl(fileName);
        await _supabase.from('imagenes_collage').insert([{ url_imagen: urlData.publicUrl }]);

        Swal.fire('¡Listo!', 'Foto añadida ❤️', 'success').then(() => {
            fileInput.value = ""; // Limpiar input
            cargarContenido();
        });
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
}

async function eliminarFoto(id) {
    const result = await Swal.fire({
        title: '¿Eliminar este recuerdo?',
        text: "No podrás deshacer esta acción",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff4d6d'
    });

    if (result.isConfirmed) {
        await _supabase.from('imagenes_collage').delete().eq('id', id);
        cargarContenido();
        Swal.fire('Borrado', 'La foto ha sido quitada.', 'success');
    }
}

async function actualizarTodo() {
    const { error } = await _supabase.from('configuracion').update({ 
        contenido_carta: document.getElementById('nueva-carta').value, 
        mensaje_corto: document.getElementById('nuevo-mensaje').value,
        ultima_edicion: new Date() 
    }).eq('id', 1);

    if (!error) Swal.fire('¡Actualizado!', 'Los textos han cambiado.', 'success').then(() => cargarContenido());
}

// 7. UTILIDADES
function actualizarContador() {
    const fechaInicio = new Date(2023, 10, 7); 
    const ahora = new Date();
    const dif = ahora - fechaInicio;
    const d = Math.floor(dif / (1000 * 60 * 60 * 24));
    const h = Math.floor((dif / (1000 * 60 * 60)) % 24);
    const m = Math.floor((dif / 1000 / 60) % 60);
    const s = Math.floor((dif / 1000) % 60);
    document.getElementById('contador').innerHTML = `${d}d, ${h}h, ${m}m y ${s}s`;
}

function toggleModoLectura() {
    document.body.classList.toggle('modo-noche');
}

// INICIO
document.addEventListener('DOMContentLoaded', () => {
    crearPetalos();
    cargarContenido();
    setInterval(actualizarContador, 1000);
    actualizarContador();
});