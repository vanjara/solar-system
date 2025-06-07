import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as TWEEN from './assets/libs/tween.module.min.js';

// --- Configuration ---
const SHOW_HELPERS = false; // Set to true to see axis helpers

// --- Scene, Camera, Renderer setup ---
let scene, camera, renderer, controls;
let sun, planets = [], moons = [];
let asteroidBelt;
let isPaused = false;
let timeScale = 1;
const textureLoader = new THREE.TextureLoader();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let selectedObject = null;
let allClickableObjects = [];

// --- Planet & Sun Data ---
const sunData = {
    name: 'Sun',
    size: 4,
    texture: 'sun.jpg',
    info: {
        'Diameter': '1,392,700 km',
        'Mass': '1.989 × 10^30 kg',
        'Surface Temp': '5,505 °C',
        'Composition': 'Hydrogen (73%), Helium (25%)'
    }
};

const planetData = [
    { 
        name: 'Mercury', size: 0.38, distance: 8, speed: 0.040, texture: 'mercury.jpg',
        info: {
            'Diameter': '4,879 km',
            'Gravity': '3.7 m/s²',
            'Day Length': '4,222.6 hours',
            'Orbital Period': '88.0 days',
            'Fun Fact': 'A year on Mercury is just 88 Earth days long.'
        }
    },
    { 
        name: 'Venus', size: 0.95, distance: 11, speed: 0.035, texture: 'venus.jpg',
        info: {
            'Diameter': '12,104 km',
            'Gravity': '8.9 m/s²',
            'Day Length': '2,802.0 hours',
            'Orbital Period': '224.7 days',
            'Fun Fact': 'Venus rotates backwards compared to most planets.'
        }
    },
    { 
        name: 'Earth', size: 1.0, distance: 15, speed: 0.030, texture: 'earth.jpg', 
        moon: { name: 'Moon', size: 0.27, distance: 1.5, speed: 0.1, texture: 'moon.jpg'},
        info: {
            'Diameter': '12,756 km',
            'Gravity': '9.8 m/s²',
            'Day Length': '24.0 hours',
            'Orbital Period': '365.2 days',
            'Fun Fact': 'The only planet known to support life.'
        }
    },
    { 
        name: 'Mars', size: 0.53, distance: 20, speed: 0.024, texture: 'mars.jpg',
        info: {
            'Diameter': '6,792 km',
            'Gravity': '3.7 m/s²',
            'Day Length': '24.7 hours',
            'Orbital Period': '687.0 days',
            'Fun Fact': 'Home to Olympus Mons, the largest volcano in the solar system.'
        }
    },
    { 
        name: 'Jupiter', size: 3.5, distance: 28, speed: 0.013, texture: 'jupiter.jpg',
        info: {
            'Diameter': '142,984 km',
            'Gravity': '23.1 m/s²',
            'Day Length': '9.9 hours',
            'Orbital Period': '4,331 days',
            'Fun Fact': 'The Great Red Spot is a storm larger than Earth.'
        }
    },
    { 
        name: 'Saturn', size: 3.0, distance: 35, speed: 0.009, texture: 'saturn.jpg', 
        ring: { inner: 3.5, outer: 5, texture: 'saturn_ring.png'},
        info: {
            'Diameter': '120,536 km',
            'Gravity': '9.0 m/s²',
            'Day Length': '10.7 hours',
            'Orbital Period': '10,747 days',
            'Fun Fact': 'Its rings are made of ice and rock particles.'
        }
    },
    { 
        name: 'Uranus', size: 1.8, distance: 42, speed: 0.007, texture: 'uranus.jpg',
        info: {
            'Diameter': '51,118 km',
            'Gravity': '8.7 m/s²',
            'Day Length': '17.2 hours',
            'Orbital Period': '30,589 days',
            'Fun Fact': 'Uranus is tilted on its side, rotating at a nearly 98-degree angle.'
        }
    },
    { 
        name: 'Neptune', size: 1.7, distance: 48, speed: 0.005, texture: 'neptune.jpg',
        info: {
            'Diameter': '49,528 km',
            'Gravity': '11.0 m/s²',
            'Day Length': '16.1 hours',
            'Orbital Period': '59,800 days',
            'Fun Fact': 'It has the strongest winds in the solar system, reaching 2,100 km/h.'
        }
    }
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
    window.addEventListener('click', onMouseClick, false);
    setupUI();
    
    // --- Start Animation ---
    animate();
}

// --- Object Creation Functions ---

function createSun() {
    const sunGeometry = new THREE.SphereGeometry(sunData.size, 64, 64);
    const sunTexture = textureLoader.load(`assets/textures/${sunData.texture}`);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        map: sunTexture,
        emissive: 0xffff00,
        emissiveMap: sunTexture,
        emissiveIntensity: 0.8
    });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.name = sunData.name;
    sun.userData.info = sunData.info;
    scene.add(sun);
    allClickableObjects.push(sun);
}

function createPlanets() {
    planetData.forEach(data => {
        // Planet
        const planet = createCelestialBody(data.size, data.texture, data.name, true);
        planet.userData = { ...data, angle: Math.random() * Math.PI * 2 };
        scene.add(planet);
        planets.push(planet);
        allClickableObjects.push(planet);
        
        // Orbit
        createOrbitLine(data.distance);
        
        // Moon
        if (data.moon) {
            const moon = createCelestialBody(data.moon.size, data.moon.texture, `${data.name} Moon`, true);
            moon.userData = { ...data.moon, parent: planet, angle: Math.random() * Math.PI * 2 };
            scene.add(moon);
            moons.push(moon);
            allClickableObjects.push(moon);
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
function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(); // TWEEN uses its own internal clock

    if (!isPaused) {
        const timeFactor = Date.now() * 0.0001; // Use a consistent time source for orbits
        
        // Sun rotation
        sun.rotation.y += 0.001 * timeScale;

        // Planet orbits and rotations
        planets.forEach(planet => {
            const data = planet.userData;
            planet.position.x = Math.cos(timeFactor * data.speed * timeScale + data.angle) * data.distance;
            planet.position.z = Math.sin(timeFactor * data.speed * timeScale + data.angle) * data.distance;
            planet.rotation.y += 0.01 * timeScale;
        });

        // Moon orbits
        moons.forEach(moon => {
            const data = moon.userData;
            const parentPosition = data.parent.position;
            moon.position.x = parentPosition.x + Math.cos(timeFactor * data.speed * 5 * timeScale + data.angle) * data.distance; // Speed up moon orbit for visibility
            moon.position.z = parentPosition.z + Math.sin(timeFactor * data.speed * 5 * timeScale + data.angle) * data.distance;
            moon.rotation.y += 0.05 * timeScale;
        });

        // Asteroid belt rotation
        asteroidBelt.rotation.y += 0.0001 * timeScale;
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
        togglePause();
    }
}

function onMouseClick(event) {
    // Don't trigger clicks if interacting with UI
    if (event.target.closest('.ui-panel')) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(allClickableObjects);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        if (selectedObject !== clickedObject) {
            selectedObject = clickedObject;
            showInfoFor(clickedObject);
            focusOn(clickedObject, clickedObject.geometry.parameters.radius * 5);
        }
    }
}

// --- Interactivity & UI ---

function setupUI() {
    // Time controls
    document.getElementById('time-slower').addEventListener('click', () => setTimeScale(timeScale / 2));
    document.getElementById('time-pause').addEventListener('click', togglePause);
    document.getElementById('time-normal').addEventListener('click', () => setTimeScale(1));
    document.getElementById('time-faster').addEventListener('click', () => setTimeScale(timeScale * 2));
    
    // Info panel
    document.getElementById('close-btn').addEventListener('click', () => {
        document.getElementById('info-panel').classList.remove('visible');
        focusOn(sun, 100); // Return focus to the sun
        selectedObject = null;
    });
}

function showInfoFor(object) {
    const info = object.userData.info;
    const panel = document.getElementById('info-panel');
    const nameEl = document.getElementById('planet-name');
    const contentEl = document.getElementById('planet-info-content');
    const funFactEl = document.getElementById('planet-fun-fact');

    if (!info) {
        panel.classList.remove('visible');
        return;
    }

    nameEl.textContent = object.name;
    contentEl.innerHTML = '';
    
    for (const [key, value] of Object.entries(info)) {
        if (key !== 'Fun Fact') {
            contentEl.innerHTML += `
                <div class="info-item">
                    <span>${key}</span>
                    <span>${value}</span>
                </div>
            `;
        }
    }
    funFactEl.textContent = info['Fun Fact'] || '';
    panel.classList.add('visible');
}

function focusOn(targetObject, distance) {
    const targetPosition = new THREE.Vector3();
    targetObject.getWorldPosition(targetPosition);

    const cameraPosition = new THREE.Vector3().copy(camera.position);
    const newCameraPosition = new THREE.Vector3()
        .copy(targetPosition)
        .add(new THREE.Vector3(0, 0.5, 1).normalize().multiplyScalar(distance));

    // Smoothly animate camera position
    new TWEEN.Tween(cameraPosition)
        .to(newCameraPosition, 1500)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => camera.position.copy(cameraPosition))
        .start();

    // Smoothly animate camera target (lookAt)
    const targetLookAt = new THREE.Vector3().copy(controls.target);
    new TWEEN.Tween(targetLookAt)
        .to(targetPosition, 1500)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => controls.target.copy(targetLookAt))
        .start();
}

function setTimeScale(newScale) {
    timeScale = Math.max(0.125, Math.min(16, newScale)); // Clamp scale
    updateTimeControlsUI();
}

function togglePause() {
    isPaused = !isPaused;
    updateTimeControlsUI();
}

function updateTimeControlsUI() {
    const pauseButton = document.getElementById('time-pause');
    const timeScaleLabel = document.getElementById('time-scale-label');
    
    pauseButton.innerHTML = isPaused ? '&#9654;' : '&#10074;&#10074;'; // Play or Pause icon
    timeScaleLabel.textContent = `Time Scale: ${timeScale}x`;
    
    // Update active button state
    document.querySelectorAll('#time-controls button').forEach(b => b.classList.remove('active'));
    if (timeScale === 1) document.getElementById('time-normal').classList.add('active');
}

// --- Run ---
init();

console.log('🚀 Solar System Milestone 2 Complete!');
console.log('✅ Realistic textures for all planets, Sun, and Moon');
console.log('✅ Saturn has its iconic rings');
console.log('✅ Earth has an orbiting Moon');
console.log('✅ Asteroid belt added between Mars and Jupiter');
console.log('✅ Enhanced lighting and materials');
console.log('✅ Click on planets to see info and focus');
console.log('✅ Use time controls to change simulation speed'); 