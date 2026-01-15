import { Canvas, 
  //useFrame
 } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { Bone, Group, Quaternion, DirectionalLight, 
  //Object3D 
} from "three";

import rhinoGLB from "./models/Rhino_3.glb?url";

/* ------------------------------------------------------------------ */
/* RHINO MODEL                                                         */
/* ------------------------------------------------------------------ */
export interface RhinoController extends Group {
  walkOut?: () => void;
}


interface RhinoModelProps {
  rhinoRef: React.RefObject<RhinoController>;
  lightRef?: React.RefObject<DirectionalLight>;
}



function RhinoModel({ rhinoRef, 
//  lightRef 
}: RhinoModelProps) {
  const group = rhinoRef;
  const gltf = useGLTF(rhinoGLB);

  const bones = useRef<Record<string, Bone>>({});

 useEffect(() => {
   if (!group.current) return;

   // ---------- collect bones ----------
   const foundBones: Record<string, Bone> = {};
   gltf.scene.traverse((child) => {
     if (child instanceof Bone) {
       foundBones[child.name] = child;
       child.layers?.enable(1);
     }
   });
   bones.current = foundBones;

   const frontLeg1L = bones.current["Front_leg_1_L"];
   const backLeg1L = bones.current["Back_leg_1_L"];
   const frontLeg1R = bones.current["Front_leg_1_R"];
   const backLeg1R = bones.current["Back_leg_1_R"];
   const neckBone = bones.current["Neck_mover_bone"];

   if (!frontLeg1L || !backLeg1L || !frontLeg1R || !backLeg1R) {
     console.warn("🦏 Missing leg bones");
     return;
   }

   // ---------- define leg quaternions ----------
   const forwardFrontL = new Quaternion(0.2105, -0.749, 0.3166, 0.5424);
   const backwardFrontL = new Quaternion(0.4372, -0.5181, 0.6267, 0.3839);
   const forwardBackL = new Quaternion(0.2923, -0.7221, 0.4124, 0.4721);
   const backwardBackL = new Quaternion(0.4645, -0.4801, 0.679, 0.3043);
   const forwardFrontR = new Quaternion(0.3166, -0.5478, 0.2093, 0.7455);
   const backwardFrontR = new Quaternion(0.6251, -0.3892, 0.4386, 0.5151);
   const forwardBackR = new Quaternion(0.4884, -0.5147, 0.291, 0.6416);
   const backwardBackR = new Quaternion(0.6968, -0.3641, 0.4658, 0.4058);

   // ---------- leg animation ----------
   const legTl = gsap.timeline({ repeat: -1, paused: true });
   const step = { t: 0 };

   legTl.to(step, {
     t: 1,
     duration: 0.5,
     ease: "sine.inOut",
     onUpdate: () => {
       const t = step.t;
       frontLeg1L.quaternion.slerpQuaternions(backwardFrontL, forwardFrontL, t);
       backLeg1L.quaternion.slerpQuaternions(forwardBackL, backwardBackL, t);
       frontLeg1R.quaternion.slerpQuaternions(forwardFrontR, backwardFrontR, t);
       backLeg1R.quaternion.slerpQuaternions(backwardBackR, forwardBackR, t);
     },
   });

   legTl.to(step, {
     t: 0,
     duration: 0.5,
     ease: "sine.inOut",
     onUpdate: () => {
       const t = step.t;
       frontLeg1L.quaternion.slerpQuaternions(forwardFrontL, backwardFrontL, t);
       backLeg1L.quaternion.slerpQuaternions(backwardBackL, forwardBackL, t);
       frontLeg1R.quaternion.slerpQuaternions(backwardFrontR, forwardFrontR, t);
       backLeg1R.quaternion.slerpQuaternions(forwardBackR, backwardBackR, t);
     },
   });

   // ---------- START STATE ----------
   group.current.position.set(-35, -0.9, -3);
   group.current.scale.set(0.3, 0.3, 0.3);
   group.current.rotation.set(0, Math.PI / 1, 0);

   // ---------- BODY TIMELINE (initial walk-in) ----------
   const bodyTl = gsap.timeline({ paused: true });
   bodyTl.call(() => {
     legTl.play();
   });
   bodyTl.to(group.current.position, {
     x: 0,
     duration: 4,
     ease: "power2.inOut",
   });
   bodyTl.call(() => {
     legTl.pause();
   });

   // Optional: rotate neck
   if (neckBone) {
     const startQuat = neckBone.quaternion.clone();
     const lookAtViewerQuat = new Quaternion(-0.3826, -0.0012, 0.0031, 0.9238);
     const neckStep = { t: 0 };
     bodyTl.to(neckStep, {
       t: 1,
       duration: 1.8,
       ease: "power2.out",
       onUpdate: () => {
         neckBone.quaternion.slerpQuaternions(
           startQuat,
           lookAtViewerQuat,
           neckStep.t
         );
       },
     });
   }
   // WALK-OUT TIMELINE
   const walkOutTl = gsap.timeline({ paused: true });
   walkOutTl.call(() => {
     // Pre-spin rhino to face left (walking off screen)
     group.current.position.x = 0;
     group.current.rotation.y = Math.PI; // facing -X
     legTl.play();
   });
   walkOutTl.to(group.current.position, {
     x: -20,
     duration: 4,
     ease: "power2.in",
   });
   walkOutTl.call(() => {
     legTl.pause();
   });

   // WALK-BACK-IN TIMELINE
   const walkBackInTl = gsap.timeline({ paused: true });
   walkBackInTl.call(() => {
     // Ensure rhino is at start for walk back in
     group.current.position.x = -20;
     group.current.rotation.y = Math.PI;
     legTl.play();
   });
   walkBackInTl.to(group.current.position, {
     x: 0,
     duration: 4,
     ease: "power2.inOut",
   });
   walkBackInTl.call(() => {
     legTl.pause();
   });

   // ---------- SCREEN WIDTH STATE ----------
   const prevWidth = { current: window.innerWidth };
   const handleResize = () => {
     const newWidth = window.innerWidth;

     // Shrinking → walk out
     if (newWidth < prevWidth.current) {
       console.log("🦏 Window shrank → walk off");
       walkOutTl.restart();
     }

     // Expanding → walk back in
     if (newWidth > prevWidth.current) {
       console.log("🦏 Window expanded → walk back in");
       walkBackInTl.restart();
     }

     prevWidth.current = newWidth;
   };

   window.addEventListener("resize", handleResize);

   // ---------- START INITIAL WALK-IN ----------
   bodyTl.play();
   legTl.play();

   return () => {
     window.removeEventListener("resize", handleResize);
     legTl.kill();
     bodyTl.kill();
     walkOutTl.kill();
     walkBackInTl.kill();
   };
 }, [gltf]);






  return <primitive ref={group} object={gltf.scene} />;

  
}

useGLTF.preload(rhinoGLB);

function WorldOriginMarker() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* APP                                                                 */
/* ------------------------------------------------------------------ */
export default function App() {
  const rhinoRef = useRef<Group>(null!);
  const lightRef = useRef<DirectionalLight>(null!);

  return (
    <Canvas
      orthographic
      camera={{
        zoom: 50,
        position: [0, 1.4, 10],
        near: 0.1,
        far: 1000,
      }}
    >
      <ambientLight intensity={0.5} />
      <hemisphereLight args={[0x87ceeb, 0xffffff, 2.2]} />
      <directionalLight
        ref={lightRef}
        intensity={0.1}
        position={[-19, 0, 1]}
        layers={1}
      />
      <WorldOriginMarker />

      <RhinoModel rhinoRef={rhinoRef} lightRef={lightRef} />
    </Canvas>
  );
}
