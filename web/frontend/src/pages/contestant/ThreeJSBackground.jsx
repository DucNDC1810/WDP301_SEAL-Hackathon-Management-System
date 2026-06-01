import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeJSBackground = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 25;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Clear previous canvas if it exists (for HMR)
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // Glowing Wireframe Cube
    const geometry = new THREE.BoxGeometry(10, 10, 10);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x00f3ff, 
        wireframe: true,
        transparent: true,
        opacity: 0.9
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Particle Field
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 2000;
    const posArray = new Float32Array(particlesCount * 3);

    for(let i = 0; i < particlesCount * 3; i++) {
        // Spread particles in a wider volume
        posArray[i] = (Math.random() - 0.5) * 80;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.15,
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Parallax Camera Movement
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const onMouseMove = (event) => {
        mouseX = (event.clientX - windowHalfX);
        mouseY = (event.clientY - windowHalfY);
    };

    document.addEventListener('mousemove', onMouseMove);

    // Animation Loop
    const clock = new THREE.Clock();
    let animationId;

    const animate = () => {
        animationId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Slow rotation of the core cube
        cube.rotation.x += 0.002;
        cube.rotation.y += 0.003;

        // Subtle flow of particles
        particlesMesh.rotation.y = elapsedTime * 0.05;
        particlesMesh.rotation.x = elapsedTime * 0.02;

        // Camera easing for parallax
        targetX = mouseX * 0.002;
        targetY = mouseY * 0.002;

        camera.position.x += (targetX * 5 - camera.position.x) * 0.05;
        camera.position.y += (-targetY * 5 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const onWindowResize = () => {
        if (!containerRef.current) return;
        camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', onWindowResize);

    // Cleanup
    return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', onWindowResize);
        document.removeEventListener('mousemove', onMouseMove);
        
        geometry.dispose();
        material.dispose();
        particlesGeometry.dispose();
        particlesMaterial.dispose();
        renderer.dispose();
        
        if (containerRef.current && renderer.domElement && containerRef.current.contains(renderer.domElement)) {
            containerRef.current.removeChild(renderer.domElement);
        }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none', // Let clicks pass through
        opacity: 0.6 // Slightly dim it to match cyberpunk dark theme
      }} 
    />
  );
};

export default ThreeJSBackground;
