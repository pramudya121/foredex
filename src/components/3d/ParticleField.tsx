import { memo, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Floating particles with mouse interaction - using function declaration to avoid forwardRef issues
function Particles({ count = 300 }: { count?: number }) {
  const meshRef = useRef<THREE.Points>(null);

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      
      vel[i * 3] = (Math.random() - 0.5) * 0.01;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    
    return [pos, vel];
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const positionAttribute = meshRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positionAttribute.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      // Apply velocity
      posArray[i * 3] += velocities[i * 3];
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3 + 2] += velocities[i * 3 + 2];
      
      // Wrap around boundaries
      if (Math.abs(posArray[i * 3]) > 10) posArray[i * 3] *= -0.9;
      if (Math.abs(posArray[i * 3 + 1]) > 10) posArray[i * 3 + 1] *= -0.9;
      if (Math.abs(posArray[i * 3 + 2]) > 5) posArray[i * 3 + 2] *= -0.9;
    }
    
    positionAttribute.needsUpdate = true;
    
    // Gentle rotation
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.02;
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
        size={0.05}
        color="#dc2626"
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Connection lines between nearby particles - using function declaration
function ConnectionLines() {
  const lineRef = useRef<THREE.LineSegments>(null);
  
  useFrame((state) => {
    if (lineRef.current) {
      lineRef.current.rotation.y = state.clock.getElapsedTime() * 0.01;
    }
  });

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    
    // Create random connection lines
    for (let i = 0; i < 50; i++) {
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
      <lineBasicMaterial color="#dc2626" transparent opacity={0.1} />
    </lineSegments>
  );
}

// Scene component - using function declaration
function Scene() {
  return (
    <>
      <Particles count={200} />
      <ConnectionLines />
    </>
  );
}

export const ParticleField = memo(function ParticleField({ className = "" }: { className?: string }) {
  return (
    <div 
      className={`fixed inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ 
          antialias: false,
          alpha: true,
          powerPreference: "low-power"
        }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
});

export default ParticleField;
