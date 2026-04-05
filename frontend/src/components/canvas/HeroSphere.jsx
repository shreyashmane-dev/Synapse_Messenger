import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';

export function HeroSphere() {
  const sphereRef = useRef();

  useFrame((state) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      sphereRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 5, 2]} intensity={2} color="#BC13FE" />
      <directionalLight position={[-2, -5, -2]} intensity={1} color="#b90afc" />
      
      <Sphere ref={sphereRef} visible args={[1, 100, 200]} scale={2}>
        <MeshDistortMaterial 
          color="#1f1f25" 
          attach="material" 
          distort={0.4} 
          speed={1.5} 
          roughness={0.2}
          metalness={0.8}
          transparent={true}
          opacity={0.9}
        />
      </Sphere>
      <Particles />
    </group>
  );
}

function Particles() {
  const ref = useRef();
  const sphere = random.inSphere(new Float32Array(5000), { radius: 3.5 });

  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / 10;
    ref.current.rotation.y -= delta / 15;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#BC13FE"
          size={0.02}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}
