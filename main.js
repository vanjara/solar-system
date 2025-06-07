import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuration ---
const SHOW_HELPERS = false; // Set to true to see axis helpers

// --- Scene, Camera, Renderer setup ---
let scene, camera, renderer, controls;
let sun, planets = [], moons = [];
let asteroidBelt;
let isPaused = false;
const textureLoader = new THREE.TextureLoader();

// --- Planet Data ---
const planetData = [
    { name: 'Mercury', size: 0.38, distance: 8, speed: 0.040, texture: 'mercury.jpg' },
    { name: 'Venus', size: 0.95, distance: 11, speed: 0.035, texture: 'venus.jpg' },
    { name: 'Earth', size: 1.0, distance: 15, speed: 0.030, texture: 'earth.jpg', moon: { size: 0.27, distance: 1.5, speed: 0.1, texture: 'moon.jpg'} },
    { name: 'Mars', size: 0.53, distance: 20, speed: 0.024, texture: 'mars.jpg' },
    { name: 'Jupiter', size: 3.5, distance: 28, speed: 0.013, texture: 'jupiter.jpg' },
    { name: 'Saturn', size: 3.0, distance: 35, speed: 0.009, texture: 'saturn.jpg', ring: { inner: 3.5, outer: 5, texture: 'saturn_ring.png'} },
    { name: 'Uranus', size: 1.8, distance: 42, speed: 0.007, texture: 'uranus.jpg' },
    { name: 'Neptune', size: 1.7, distance: 48, speed: 0.005, texture: 'neptune.jpg' }
];

// --- Initialization ---
function init() {
    // Scene
    scene = new THREE.Scene();
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 40, 70);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 10;
    controls.maxDistance = 300;
    
    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);
    
    const sunLight = new THREE.PointLight(0xffffff, 3.5, 1000, 0.01);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // --- Create Celestial Bodies ---
    createSun();
    createPlanets();
    createAsteroidBelt();
    createStarfield();

    // --- Helpers ---
    if (SHOW_HELPERS) {
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);
    }
    
    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', onKeyDown, false);
    
    // --- Start Animation ---
    animate();
}

// --- Object Creation Functions ---

function createSun() {
    const sunGeometry = new THREE.SphereGeometry(4, 64, 64);
    const sunTexture = textureLoader.load('assets/textures/sun.jpg');
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        map: sunTexture,
        emissive: 0xffff00,
        emissiveMap: sunTexture,
        emissiveIntensity: 0.8
    });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
}

function createPlanets() {
    planetData.forEach(data => {
        // Planet
        const planet = createCelestialBody(data.size, data.texture, data.name, true);
        planet.userData = { ...data, angle: Math.random() * Math.PI * 2 };
        scene.add(planet);
        planets.push(planet);
        
        // Orbit
        createOrbitLine(data.distance);
        
        // Moon
        if (data.moon) {
            const moon = createCelestialBody(data.moon.size, data.moon.texture, `${data.name} Moon`, true);
            moon.userData = { ...data.moon, parent: planet, angle: Math.random() * Math.PI * 2 };
            scene.add(moon);
            moons.push(moon);
        }

        // Ring
        if (data.ring) {
            const ring = createSaturnRing(data.ring.inner, data.ring.outer, data.ring.texture);
            ring.userData = { parent: planet }; // Link ring to planet
            planet.add(ring); // Attach ring to the planet
        }
    });
}

function createCelestialBody(size, texturePath, name, castsShadow) {
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        map: textureLoader.load(`assets/textures/${texturePath}`),
        metalness: 0.1,
        roughness: 0.8
    });
    const body = new THREE.Mesh(geometry, material);
    body.name = name;
    if (castsShadow) body.castShadow = true;
    body.receiveShadow = true;
    return body;
}

function createSaturnRing(innerRadius, outerRadius, texturePath) {
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const ringTexture = textureLoader.load(`assets/textures/${texturePath}`);
    const material = new THREE.MeshBasicMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2; // Tilt the ring
    return ring;
}

function createOrbitLine(distance) {
    const geometry = new THREE.BufferGeometry().setFromPoints(
        new THREE.Path().absellipse(0, 0, distance, distance, 0, Math.PI * 2, false).getPoints(128)
    );
    const material = new THREE.LineBasicMaterial({ color: 0x444444 });
    const orbitLine = new THREE.Line(geometry, material);
    orbitLine.rotation.x = Math.PI / 2;
    scene.add(orbitLine);
}

function createAsteroidBelt() {
    const asteroidCount = 1500;
    const beltGeometry = new THREE.BufferGeometry();
    const positions = [];
    
    for (let i = 0; i < asteroidCount; i++) {
        const dist = THREE.MathUtils.randFloat(22, 26);
        const angle = Math.random() * Math.PI * 2;
        const y = THREE.MathUtils.randFloat(-0.5, 0.5);

        positions.push(
            Math.cos(angle) * dist,
            y,
            Math.sin(angle) * dist
        );
    }
    beltGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    const asteroidMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.03,
        transparent: true,
        opacity: 0.6
    });

    asteroidBelt = new THREE.Points(beltGeometry, asteroidMaterial);
    scene.add(asteroidBelt);
}

function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i++) {
        positions[i] = THREE.MathUtils.randFloatSpread(1000);
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    if (!isPaused) {
        const time = Date.now() * 0.0001;
        
        // Sun rotation
        sun.rotation.y += 0.001;

        // Planet orbits and rotations
        planets.forEach(planet => {
            const data = planet.userData;
            planet.position.x = Math.cos(time * data.speed + data.angle) * data.distance;
            planet.position.z = Math.sin(time * data.speed + data.angle) * data.distance;
            planet.rotation.y += 0.01;
        });

        // Moon orbits
        moons.forEach(moon => {
            const data = moon.userData;
            moon.position.x = data.parent.position.x + Math.cos(time * data.speed + data.angle) * data.distance;
            moon.position.z = data.parent.position.z + Math.sin(time * data.speed + data.angle) * data.distance;
            moon.rotation.y += 0.05;
        });

        // Asteroid belt rotation
        asteroidBelt.rotation.y += 0.0001;
    }
    
    controls.update();
    renderer.render(scene, camera);
}

// --- Event Handlers ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    if (event.code === 'Space') {
        event.preventDefault();
        isPaused = !isPaused;
    }
}

// --- Run ---
init();

console.log('🚀 Solar System Milestone 2 Complete!');
console.log('✅ Realistic textures for all planets, Sun, and Moon');
console.log('✅ Saturn has its iconic rings');
console.log('✅ Earth has an orbiting Moon');
console.log('✅ Asteroid belt added between Mars and Jupiter');
console.log('✅ Enhanced lighting and materials'); 