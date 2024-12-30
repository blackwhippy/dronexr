import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Text } from 'troika-three-text';

// Setup scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

// Set the clear color to fully transparent
renderer.setClearColor(0x000000, 0); // RGB: Black, Alpha: 0

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Add a virtual cube as the environment
const cubeGeometry = new THREE.BoxGeometry(40, 40, 40);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.BackSide, transparent: true, opacity: 0, });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);

// Ship
const shipGeometry = new THREE.BufferGeometry();
const shipVertices = new Float32Array([
    0, 2, 0, -1, -1, 0, 1, -1, 0, 0, 2, 0,
]);
shipGeometry.setAttribute('position', new THREE.BufferAttribute(shipVertices, 3));
const shipMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const ship = new THREE.Line(shipGeometry, shipMaterial);
scene.add(ship);
ship.position.z = -15; // Position ship in front of the player

const shipState = { velocity: new THREE.Vector2(0, 0), rotation: 0, thrusting: false };

// Score and Lives display
const scoreText = new Text();
scoreText.text = "Score: 0";
scoreText.fontSize = 1;
scoreText.position.set(-15, 18, -20);
scene.add(scoreText);

const livesText = new Text();
livesText.text = "Lives: 3";
livesText.fontSize = 1;
livesText.position.set(15, 18, -20);
scene.add(livesText);

let score = 0;
let lives = 3;

// Asteroids array
const asteroids = [];

// Bullets array
const bullets = [];
const bulletGeometry = new THREE.BufferGeometry();
bulletGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
const bulletMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });


function createAsteroid(size, x, y) {
    const points = [];
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const r = size * (1 + Math.random() * 0.4 - 0.2);
        points.push(new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const asteroid = new THREE.Line(geometry, material);
    asteroid.position.set(x, y, -15);
    asteroid.velocity = new THREE.Vector2(Math.random() * 0.1 - 0.05, Math.random() * 0.1 - 0.05);
    asteroid.size = size;
    scene.add(asteroid);
    asteroids.push(asteroid);
}

function initAsteroids() {
    for (let i = 0; i < 10; i++) {
        createAsteroid(2, Math.random() * 20 - 10, Math.random() * 20 - 10);
    }
}

function wrapPosition(obj) {
    if (obj.position.x > 20) obj.position.x = -20;
    if (obj.position.x < -20) obj.position.x = 20;
    if (obj.position.y > 20) obj.position.y = -20;
    if (obj.position.y < -20) obj.position.y = 20;
}

// Check collision
function checkCollision(obj1, obj2) {
    const distance = obj1.position.distanceTo(obj2.position);
    return distance < (obj1.size || 0.5) + (obj2.size || 0.5);
}

// Shoot function - spawns bullets from base center through tip
function shoot() {
    const bullet = new THREE.Points(bulletGeometry, bulletMaterial);
    
    // Calculate the base center in world coordinates
    const baseCenter = new THREE.Vector3(0, -1, 0);
    baseCenter.applyMatrix4(ship.matrixWorld);
    
    // Set bullet position to base center
    bullet.position.copy(baseCenter);
    
    // Get direction vector
    const direction = getDirectionVector();
    
    // Set bullet velocity
    bullet.velocity = new THREE.Vector2(
        direction.x * 0.5,
        direction.y * 0.5
    );
    
    bullet.lifeTime = 60; // frames
    scene.add(bullet);
    bullets.push(bullet);
}


initAsteroids();

// Input handling for ship movement
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

function getDirectionVector() {
    const direction = new THREE.Vector3(0, 1, 0);
    direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), ship.rotation.z);
    return direction;
}

function updateGame() {
    // Ship controls
    if (keys['z']) ship.rotation.z += 0.05;
    if (keys['x']) ship.rotation.z -= 0.05;
    // check shift key
    if (keys['Shift']) {
        const direction = getDirectionVector();
        shipState.velocity.x += direction.x * 0.01;
        shipState.velocity.y += direction.y * 0.01;
    }

    ship.position.x += shipState.velocity.x;
    ship.position.y += shipState.velocity.y;
    shipState.velocity.multiplyScalar(0.99);

    // Wrap position
    wrapPosition(ship);

    // Shoot
    if (keys[' '] && bullets.length < 5) {
        shoot();
        keys[' '] = false;
    }


    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.x += bullet.velocity.x;
        bullet.position.y += bullet.velocity.y;
        wrapPosition(bullet);
                
        bullet.lifeTime--;
        if (bullet.lifeTime <= 0) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }

    // Update asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        asteroid.position.x += asteroid.velocity.x;
        asteroid.position.y += asteroid.velocity.y;
        wrapPosition(asteroid);

        // Check bullet collisions
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            if (checkCollision(asteroid, bullet)) {
                // Split asteroid or remove
                if (asteroid.size > 1) {
                    createAsteroid(asteroid.size / 2, asteroid.position.x, asteroid.position.y);
                    createAsteroid(asteroid.size / 2, asteroid.position.x, asteroid.position.y);
                }
                scene.remove(asteroid);
                asteroids.splice(i, 1);
                scene.remove(bullet);
                bullets.splice(j, 1);
                score += 100;
                document.getElementById('score').textContent = `Score: ${score}`;
                break;
            }
        }


        // Check ship collision
        //if (checkCollision(asteroid, ship)) {
        //    lives--;
        //    document.getElementById('lives').textContent = `Lives: ${lives}`;
        //    if (lives <= 0) {
        //        gameOver = true;
        //       alert('Game Over! Score: ' + score);
        //    } else {
        //        // Reset ship position
        //        ship.position.set(0, 0, 0);
        //        shipState.velocity.set(0, 0);
        //    }
        //}
    }
}
// Animation loop
renderer.setAnimationLoop(() => {
    updateGame();
    renderer.render(scene, camera);
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
