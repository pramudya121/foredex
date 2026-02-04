import { memo, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, Sphere, Ring, Html } from '@react-three/drei';
import * as THREE from 'three';

// Token data for orbits
const ORBIT_TOKENS = [
  { symbol: 'WETH', logo: '/tokens/weth.png', color: '#627EEA', glowColor: 'rgba(98, 126, 234, 0.6)' },
  { symbol: 'USDC', logo: '/tokens/usdc.png', color: '#2775CA', glowColor: 'rgba(39, 117, 202, 0.6)' },
  { symbol: 'FRDX', logo: '/tokens/frdx.png', color: '#FF4444', glowColor: 'rgba(255, 68, 68, 0.6)' },
  { symbol: 'XRP', logo: '/tokens/xrp.png', color: '#23292F', glowColor: 'rgba(35, 41, 47, 0.6)' },
  { symbol: 'LINK', logo: '/tokens/link.png', color: '#2A5ADA', glowColor: 'rgba(42, 90, 218, 0.6)' },
  { symbol: 'TRX', logo: '/tokens/trx.png', color: '#FF0013', glowColor: 'rgba(255, 0, 19, 0.6)' },
  { symbol: 'DOGE', logo: '/tokens/doge.png', color: '#C2A633', glowColor: 'rgba(194, 166, 51, 0.6)' },
  { symbol: 'MON', logo: '/tokens/mon.png', color: '#8B5CF6', glowColor: 'rgba(139, 92, 246, 0.6)' },
];

// Glowing core sphere with NEX logo
function CoreSphere() {
  const glowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
      glowRef.current.scale.setScalar(scale);
    }
    if (outerGlowRef.current) {
      const scale = 1.1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      outerGlowRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group>
      {/* NEX Logo - fills the core circle with pulse animation */}
      <Html
        center
        distanceFactor={3.5}
        style={{
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          animation: 'pulse-glow 2s ease-in-out infinite',
        }}>
          <img 
            src="/tokens/nex.jpg" 
            alt="NEX"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '50%',
              border: '4px solid #ff4444',
              boxShadow: '0 0 50px rgba(255, 68, 68, 0.9), 0 0 100px rgba(255, 68, 68, 0.5), inset 0 0 30px rgba(255, 68, 68, 0.3)',
            }}
          />
        </div>
        <style>{`
          @keyframes pulse-glow {
            0%, 100% { 
              transform: scale(1); 
              filter: brightness(1) drop-shadow(0 0 25px rgba(255, 68, 68, 0.7));
            }
            50% { 
              transform: scale(1.08); 
              filter: brightness(1.3) drop-shadow(0 0 50px rgba(255, 68, 68, 1));
            }
          }
        `}</style>
      </Html>
      
      {/* Inner glow ring */}
      <Sphere ref={glowRef} args={[1.2, 32, 32]}>
        <meshBasicMaterial
          color="#ff4444"
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Outer glow */}
      <Sphere ref={outerGlowRef} args={[1.5, 32, 32]}>
        <meshBasicMaterial
          color="#ff4444"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Core glow effect */}
      <pointLight color="#ff4444" intensity={3} distance={8} />
    </group>
  );
}

// Orbital ring component
function OrbitalRing({ 
  radius, 
  tilt, 
  rotationY,
  color,
  speed = 1,
}: { 
  radius: number; 
  tilt: number; 
  rotationY: number;
  color: string;
  speed?: number;
}) {
  const ringRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = tilt;
      ringRef.current.rotation.y = rotationY + state.clock.elapsedTime * speed * 0.1;
    }
  });

  return (
    <group ref={ringRef}>
      <Ring args={[radius - 0.02, radius + 0.02, 128]}>
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </Ring>
    </group>
  );
}

// Glow trail component
function GlowTrail({ 
  positions, 
  color 
}: { 
  positions: THREE.Vector3[]; 
  color: string;
}) {
  const trailRef = useRef<THREE.Points>(null);
  
  const trailGeometry = useMemo(() => {
    const positionsArray = new Float32Array(positions.length * 3);
    const opacities = new Float32Array(positions.length);
    
    positions.forEach((pos, i) => {
      positionsArray[i * 3] = pos.x;
      positionsArray[i * 3 + 1] = pos.y;
      positionsArray[i * 3 + 2] = pos.z;
      opacities[i] = (i / positions.length) * 0.8;
    });
    
    return { positions: positionsArray, opacities };
  }, [positions]);

  return (
    <points ref={trailRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length}
          array={trailGeometry.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={color}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Orbiting token component with glow trail
function OrbitingToken({ 
  token, 
  radius, 
  tilt, 
  rotationY,
  speed,
  initialAngle,
}: { 
  token: typeof ORBIT_TOKENS[0];
  radius: number;
  tilt: number;
  rotationY: number;
  speed: number;
  initialAngle: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const tokenRef = useRef<THREE.Group>(null);
  const trailPositions = useRef<THREE.Vector3[]>([]);
  const [trail, setTrail] = useState<THREE.Vector3[]>([]);

  useFrame((state) => {
    if (groupRef.current && tokenRef.current) {
      const time = state.clock.elapsedTime * speed + initialAngle;
      
      // Calculate position on orbit
      const x = Math.cos(time) * radius;
      const z = Math.sin(time) * radius;
      
      // Apply tilt transformation
      const tiltedY = z * Math.sin(tilt);
      const tiltedZ = z * Math.cos(tilt);
      
      // Apply Y rotation
      const finalX = x * Math.cos(rotationY) - tiltedZ * Math.sin(rotationY);
      const finalZ = x * Math.sin(rotationY) + tiltedZ * Math.cos(rotationY);
      
      tokenRef.current.position.set(finalX, tiltedY, finalZ);
      
      // Keep token facing camera
      tokenRef.current.lookAt(0, 0, 0);
      tokenRef.current.rotateY(Math.PI);
      
      // Update trail positions
      const newPos = new THREE.Vector3(finalX, tiltedY, finalZ);
      trailPositions.current.push(newPos);
      if (trailPositions.current.length > 15) {
        trailPositions.current.shift();
      }
      
      // Update trail every few frames for performance
      if (Math.floor(state.clock.elapsedTime * 30) % 3 === 0) {
        setTrail([...trailPositions.current]);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Glow trail */}
      {trail.length > 2 && (
        <GlowTrail positions={trail} color={token.color} />
      )}
      
      <group ref={tokenRef}>
        <Float speed={2} rotationIntensity={0} floatIntensity={0.3}>
          {/* Outer glow */}
          <Sphere args={[0.4, 16, 16]}>
            <meshBasicMaterial
              color={token.color}
              transparent
              opacity={0.15}
            />
          </Sphere>
          
          {/* Inner glow */}
          <Sphere args={[0.32, 16, 16]}>
            <meshBasicMaterial
              color={token.color}
              transparent
              opacity={0.25}
            />
          </Sphere>
          
          {/* Token container */}
          <mesh>
            <circleGeometry args={[0.26, 32]} />
            <meshBasicMaterial color="#1a1a2e" />
          </mesh>
          
          {/* Token image using HTML overlay */}
          <Html
            center
            distanceFactor={8}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <img 
              src={token.logo} 
              alt={token.symbol}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
                border: `2px solid ${token.color}`,
                boxShadow: `0 0 25px ${token.glowColor}, 0 0 50px ${token.glowColor}`,
              }}
            />
          </Html>
          
          {/* Point light for each token */}
          <pointLight color={token.color} intensity={0.5} distance={2} />
        </Float>
      </group>
    </group>
  );
}

// Particle field around the globe
function ParticleField() {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(200 * 3);
    const colors = new Float32Array(200 * 3);
    
    for (let i = 0; i < 200; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 4 + Math.random() * 2;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Red-ish colors
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.2 + Math.random() * 0.3;
      colors[i * 3 + 2] = 0.2 + Math.random() * 0.3;
    }
    
    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={200}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={200}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Main globe scene
function GlobeScene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  // Create orbit configurations
  // Wider orbits - tokens further from center
  const orbits = useMemo(() => [
    { radius: 2.8, tilt: 0.3, rotationY: 0, speed: 0.4, tokenIndex: 0 },
    { radius: 2.8, tilt: 0.3, rotationY: 0, speed: 0.4, tokenIndex: 1, offset: Math.PI },
    { radius: 3.4, tilt: -0.5, rotationY: 1.2, speed: 0.35, tokenIndex: 2 },
    { radius: 3.4, tilt: -0.5, rotationY: 1.2, speed: 0.35, tokenIndex: 3, offset: Math.PI },
    { radius: 4.0, tilt: 0.8, rotationY: 2.4, speed: 0.3, tokenIndex: 4 },
    { radius: 4.0, tilt: 0.8, rotationY: 2.4, speed: 0.3, tokenIndex: 5, offset: Math.PI },
    { radius: 4.6, tilt: -0.2, rotationY: 3.6, speed: 0.25, tokenIndex: 6 },
    { radius: 4.6, tilt: -0.2, rotationY: 3.6, speed: 0.25, tokenIndex: 7, offset: Math.PI },
  ], []);

  // Get unique ring configurations
  const rings = useMemo(() => {
    const uniqueRings = new Map();
    orbits.forEach(orbit => {
      const key = `${orbit.radius}-${orbit.tilt}-${orbit.rotationY}`;
      if (!uniqueRings.has(key)) {
        uniqueRings.set(key, {
          radius: orbit.radius,
          tilt: orbit.tilt,
          rotationY: orbit.rotationY,
          speed: orbit.speed,
          color: ORBIT_TOKENS[orbit.tokenIndex].color,
        });
      }
    });
    return Array.from(uniqueRings.values());
  }, [orbits]);

  return (
    <group ref={groupRef}>
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      
      {/* Core sphere */}
      <CoreSphere />
      
      {/* Orbital rings */}
      {rings.map((ring, index) => (
        <OrbitalRing 
          key={index}
          radius={ring.radius}
          tilt={ring.tilt}
          rotationY={ring.rotationY}
          color={ring.color}
          speed={ring.speed}
        />
      ))}
      
      {/* Orbiting tokens */}
      {orbits.map((orbit, index) => (
        <OrbitingToken
          key={index}
          token={ORBIT_TOKENS[orbit.tokenIndex]}
          radius={orbit.radius}
          tilt={orbit.tilt}
          rotationY={orbit.rotationY}
          speed={orbit.speed}
          initialAngle={orbit.offset || 0}
        />
      ))}
      
      {/* Particle field */}
      <ParticleField />
    </group>
  );
}

interface TokenGlobeProps {
  className?: string;
  style?: React.CSSProperties;
}

export const TokenGlobe = memo(function TokenGlobe({ className, style }: TokenGlobeProps) {
  return (
    <div className={className} style={style}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 45 }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <GlobeScene />
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
});

export default TokenGlobe;
