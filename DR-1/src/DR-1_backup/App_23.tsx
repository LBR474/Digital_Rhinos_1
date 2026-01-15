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
   const rhinoState = { current: "in" as "in" | "out" | "moving" };
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
   group.current.rotation.set(0, Math.PI, 0);

   // ---------- BODY TIMELINE ----------
   const bodyTl = gsap.timeline();

   bodyTl.call(() => {
     {
       rhinoState.current = "moving";
       legTl.play();
     }
   });

   bodyTl.to(group.current.position, {
     x: 0,
     duration: 4,
     ease: "power2.inOut",
   });

   bodyTl.call(() => {
     {
       legTl.pause();
       rhinoState.current = "in";
     }
   });

   // ---------- neck animation helper ----------
   const animateNeckToLook = () => {
     if (!neckBone) return;

     const currentQuat = neckBone.quaternion.clone();
     const targetQuat = new Quaternion(-0.3826, -0.0012, 0.0031, 0.9238);
     const neckStep = { t: 0 };

     return gsap.to(neckStep, {
       t: 1,
       duration: 1.8,
       ease: "power2.out",
       onUpdate: () => {
         neckBone.quaternion.slerpQuaternions(
           currentQuat,
           targetQuat,
           neckStep.t
         );
       },
     });
   };

   // ---------- apply neck animation on first entrance ----------
   animateNeckToLook();

   // ---------- TURN AND WALK OUT TIMELINE ----------
   const turnAndWalkOutTl = gsap.timeline({ paused: true });

   turnAndWalkOutTl.call(() => {
     {
       rhinoState.current = "moving";
       legTl.play();
     }
   });

   // ---------- Neck looks toward turn direction first ----------
   if (neckBone) {
     const currentQuat = neckBone.quaternion.clone();
     const turnQuat = new Quaternion(0.0, 0.707, 0.0, 0.707); // roughly look toward -X
     const neckStep = { t: 0 };

     turnAndWalkOutTl.to(neckStep, {
       t: 1,
       duration: 0.6, // matches body rotation duration
       ease: "power2.inOut",
       onUpdate: () => {
         neckBone.quaternion.slerpQuaternions(
           turnQuat,
           currentQuat,
           neckStep.t
         );
       },
     });
   }

   // ---------- body turns ----------
   turnAndWalkOutTl.to(group.current.rotation, {
     y: 0, // turn to -X
     duration: 0.6,
     ease: "power2.inOut",
   });

   // ---------- walk off ----------
   turnAndWalkOutTl.to(group.current.position, {
     x: -20,
     duration: 4,
     ease: "power2.in",
   });

   // ---------- turn back to +X for next walk-in ----------
   turnAndWalkOutTl.to(group.current.rotation, {
     y: Math.PI,
     duration: 0.6,
     ease: "power2.inOut",
   });

   // ---------- Reset leg animation & state ----------
   turnAndWalkOutTl.call(() => {
     {
       legTl.pause();
       rhinoState.current = "out";
     }
   });

   // ---------- HANDLE RESIZE ----------
   const handleResize = () => {
     if (rhinoState.current === "moving") return;

     if (rhinoState.current === "in") {
       console.log("🦏 Rhino IN → walking OUT");
       turnAndWalkOutTl.restart();
       return;
     }

     if (rhinoState.current === "out") {
       console.log("🦏 Rhino OUT → walking BACK IN");
       bodyTl.restart();
       animateNeckToLook(); // smooth slerp from current position
     }
   };

   window.addEventListener("resize", handleResize);

   // ---------- CLEANUP ----------
   return () => {
     legTl.kill();
     bodyTl.kill();
     turnAndWalkOutTl.kill();
     window.removeEventListener("resize", handleResize);
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
