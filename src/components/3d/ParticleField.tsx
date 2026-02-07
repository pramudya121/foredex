import { memo, useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Check if device is low-power (mobile or low RAM)
const isLowPowerDevice = () => {
  if (typeof window === 'undefined') return false;
  // Check for mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return isMobile || prefersReducedMotion;
};

// Floating particles with mouse interaction
function Particles({ count = 150 }: { count?: number }) {
  const meshRef = useRef<THREE.Points>(null);

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      
      vel[i * 3] = (Math.random() - 0.5) * 0.008;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.008;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.008;
    }
    
    return [pos, vel];
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const positionAttribute = meshRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positionAttribute.array as Float32Array;
    
    // Update every 2nd frame for performance
    if (Math.floor(state.clock.getElapsedTime() * 30) % 2 !== 0) return;
    
    for (let i = 0; i < count; i++) {
      posArray[i * 3] += velocities[i * 3];
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3 + 2] += velocities[i * 3 + 2];
      
      if (Math.abs(posArray[i * 3]) > 10) posArray[i * 3] *= -0.9;
      if (Math.abs(posArray[i * 3 + 1]) > 10) posArray[i * 3 + 1] *= -0.9;
      if (Math.abs(posArray[i * 3 + 2]) > 5) posArray[i * 3 + 2] *= -0.9;
    }
    
    positionAttribute.needsUpdate = true;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.015;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#dc2626"
        transparent
        opacity={0.35}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Connection lines between nearby particles
function ConnectionLines() {
  const lineRef = useRef<THREE.LineSegments>(null);
  
  useFrame((state) => {
    if (lineRef.current) {
      lineRef.current.rotation.y = state.clock.getElapsedTime() * 0.008;
    }
  });

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    
    for (let i = 0; i < 30; i++) {
      const x1 = (Math.random() - 0.5) * 15;
      const y1 = (Math.random() - 0.5) * 15;
      const z1 = (Math.random() - 0.5) * 8;
      
      const x2 = x1 + (Math.random() - 0.5) * 3;
      const y2 = y1 + (Math.random() - 0.5) * 3;
      const z2 = z1 + (Math.random() - 0.5) * 2;
      
      positions.push(x1, y1, z1, x2, y2, z2);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }, []);

  return (
    <lineSegments ref={lineRef} geometry={lineGeometry}>
      <lineBasicMaterial color="#dc2626" transparent opacity={0.08} />
    </lineSegments>
  );
}

function Scene({ particleCount }: { particleCount: number }) {
  return (
    <>
      <Particles count={particleCount} />
      <ConnectionLines />
    </>
  );
}

export const ParticleField = memo(function ParticleField({ className = "" }: { className?: string }) {
  const [shouldRender, setShouldRender] = useState(true);
  const [particleCount, setParticleCount] = useState(150);
  
  useEffect(() => {
    const isLowPower = isLowPowerDevice();
    // Disable on very low power or if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShouldRender(false);
    } else if (isLowPower) {
      setParticleCount(80); // Reduced for mobile
    }
  }, []);
  
  if (!shouldRender) {
    return null;
  }

  return (
    <div 
      className={`fixed inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        dpr={1}
        gl={{ 
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
          stencil: false,
          depth: false,
        }}
        style={{ background: 'transparent' }}
      >
        <Scene particleCount={particleCount} />
      </Canvas>
    </div>
  );
});

export default ParticleField;
