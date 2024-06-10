import * as THREE from 'three';  // Importa todo el módulo de THREE.js

import Stats from 'three/addons/libs/stats.module.js';  // Importa el módulo de estadísticas para mostrar FPS y otros datos de rendimiento

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';  // Importa los controles de órbita para permitir la interacción del usuario con la cámara
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';  // Importa el cargador FBX para cargar modelos en formato FBX
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';  // Importa la interfaz gráfica de usuario (GUI) para controlar parámetros

// Declaración de variables globales
let camera, scene, renderer, stats, object, loader, guiMorphsFolder;
const clock = new THREE.Clock();  // Crea un reloj para controlar la animación
let mixer;  // Mezclador de animaciones

// Parámetros iniciales
const params = {
    asset: 'Samba Dancing'  // Modelo FBX inicial a cargar
};

// Lista de activos disponibles
const assets = [
    'Samba Dancing',
    'morph_test'
];

init();  // Llama a la función de inicialización

// Función de inicialización
function init() {
    const container = document.createElement('div');  // Crea un contenedor HTML
    document.body.appendChild(container);  // Agrega el contenedor al cuerpo del documento

    // Configuración de la cámara
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(100, 200, 300);  // Posición de la cámara

    // Configuración de la escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);  // Color de fondo
    scene.fog = new THREE.Fog(0xa0a0a0, 200, 1000);  // Nieblas en la escena

    // Configuración de la luz hemisférica
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 5);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    // Configuración de la luz direccional
    const dirLight = new THREE.DirectionalLight(0x84e6e8, 5);
    dirLight.position.set(0, 200, 100);
    dirLight.castShadow = true; //sombra para todos los objetos que toque la luz
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -120;
    dirLight.shadow.camera.right = 120;
    scene.add(dirLight);

    // Opcional: Agrega un ayudante de cámara para la luz direccional
    // scene.add(new THREE.CameraHelper(dirLight.shadow.camera));

    // Configuración del suelo
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;  // Rota el plano para que sea horizontal
    mesh.receiveShadow = true;  // El suelo recibe sombras
    scene.add(mesh);

    // Configuración de la cuadrícula
    const grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;  // Hacer la cuadrícula parcialmente transparente
    grid.material.transparent = true;
    scene.add(grid);

    // Cargar el modelo FBX inicial
    loader = new FBXLoader();
    loadAsset(params.asset);

    // Configuración del renderizador
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);  // Establecer el bucle de animación
    renderer.shadowMap.enabled = true;  // Habilitar sombras
    container.appendChild(renderer.domElement);

    // Configuración de los controles de órbita
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 100, 0);  // Establecer el punto de interés de la cámara
    controls.update();

    // Agregar event listener para redimensionar la ventana
    window.addEventListener('resize', onWindowResize);

    // Configuración de las estadísticas
    stats = new Stats();
    container.appendChild(stats.dom);

    // Configuración de la GUI
    const gui = new GUI();
    gui.add(params, 'asset', assets).onChange(function (value) {
        loadAsset(value);  // Cargar el modelo seleccionado en la GUI
    });

    guiMorphsFolder = gui.addFolder('Morphs').hide();  // Crear una carpeta para los controles de morfología
}

// Función para cargar el modelo FBX
function loadAsset(asset) {
    loader.load('models/fbx/' + asset + '.fbx', function (group) {
        if (object) {  // Si ya hay un objeto cargado, eliminarlo de la escena y liberar sus recursos
            object.traverse(function (child) {
                if (child.material) child.material.dispose();
                if (child.material && child.material.map) child.material.map.dispose();
                if (child.geometry) child.geometry.dispose();
            });
            scene.remove(object);
        }

        object = group;  // Asignar el nuevo objeto cargado

        if (object.animations && object.animations.length) {  // Si el objeto tiene animaciones
            mixer = new THREE.AnimationMixer(object);
            const action = mixer.clipAction(object.animations[0]);
            action.play();  // Reproducir la animación
        } else {
            mixer = null;  // Si no hay animaciones, establecer el mezclador en null
        }

        guiMorphsFolder.children.forEach((child) => child.destroy());  // Destruir controles de morfología anteriores
        guiMorphsFolder.hide();  // Ocultar la carpeta de morfología

        object.traverse(function (child) {  // Configurar el objeto cargado
            if (child.isMesh) {  // Si el niño es una malla
                child.castShadow = true;  // La malla proyecta sombras
                child.receiveShadow = true;  // La malla recibe sombras

                if (child.morphTargetDictionary) {  // Si la malla tiene objetivos de morfología
                    guiMorphsFolder.show();  // Mostrar la carpeta de morfología
                    const meshFolder = guiMorphsFolder.addFolder(child.name || child.uuid);
                    Object.keys(child.morphTargetDictionary).forEach((key) => {
                        meshFolder.add(child.morphTargetInfluences, child.morphTargetDictionary[key], 0, 1, 0.01);  // Agregar controles de morfología
                    });
                }
            }
        });

        scene.add(object);  // Agregar el objeto a la escena
    });
}

// Función para manejar el redimensionamiento de la ventana
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Función de animación
function animate() {
    const delta = clock.getDelta();  // Obtener el tiempo transcurrido desde la última llamada

    if (mixer) mixer.update(delta);  // Actualizar el mezclador de animaciones si existe

    renderer.render(scene, camera);  // Renderizar la escena desde la perspectiva de la cámara

    stats.update();  // Actualizar las estadísticas
}