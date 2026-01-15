import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { Bone, 
  // Euler, 
  Quaternion, type Group, type Object3D } from "three";

import rhinoGLB from "./models/Rhino_3.glb?url";

import "./App.css";
function RhinoModel() {
  const group = useRef<Group>(null!)
  const gltf = useGLTF(rhinoGLB)

  const frontLegL = useRef<Bone | null>(null)
  // const restQuat = useRef(new Quaternion())
  // const rotatedQuat = useRef(new Quaternion())

useEffect(() => {
  if (!group.current) return;

  // Locate the leg bone once
  gltf.scene.traverse((child: Object3D) => {
    if (child.name === "Front_leg_1_L" && child instanceof Bone) {
      frontLegL.current = child;
    }
  });

  if (!frontLegL.current) return;

  // ------------------------------------
  // Your dialed-in quaternions
  // ------------------------------------
  const forwardPushQuat = new Quaternion(
    0.21999455335665816,
    -0.743410441411675,
    0.32971252127517225,
    0.5387328057093801
  );

  const backwardPushQuat = new Quaternion(
    0.4438966780080853,
    -0.507168815564922,
    0.635727318591868,
    0.37627965492102067
  );

  // ------------------------------------
  // GSAP Leg Animation
  // ------------------------------------
  const tl = gsap.timeline({ repeat: -1 });

  // Move forward
  tl.to(
    { t: 0 },
    {
      t: 1,
      duration: 0.4,
      ease: "sine.out",
      onUpdate() {
        frontLegL.current!.quaternion.slerpQuaternions(
          backwardPushQuat,
          forwardPushQuat,
          this.targets()[0].t
        );
        frontLegL.current!.updateMatrixWorld(true);
      },
    }
  );

  // Move backward
  tl.to(
    { t: 0 },
    {
      t: 1,
      duration: 0.4,
      ease: "sine.inOut",
      onUpdate() {
        frontLegL.current!.quaternion.slerpQuaternions(
          forwardPushQuat,
          backwardPushQuat,
          this.targets()[0].t
        );
        frontLegL.current!.updateMatrixWorld(true);
      },
    }
  );
}, [gltf]);



  return <primitive ref={group} object={gltf.scene} scale={[0.3, 0.3, 0.3]} />
}


// Preload the GLB
useGLTF.preload(rhinoGLB);

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100%" }}>
      <Canvas
        orthographic
        camera={{
          zoom: 50, // adjust to fit your scene
          position: [0, 5, 10], // initial camera position
          near: 0.1,
          far: 1000,
        }}
      >
        <OrbitControls />

        <ambientLight intensity={1} />
        <directionalLight position={[0, 5, 5]} intensity={2.2} />

        <RhinoModel />
      </Canvas>
    </div>
  );
}
