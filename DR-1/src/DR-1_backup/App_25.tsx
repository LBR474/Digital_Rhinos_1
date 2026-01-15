import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useRef, useEffect } from "react";
import { Bone, Group, Quaternion } from "three";

import rhinoGLB from "./models/Rhino_3.glb?url";

import { gsap } from "gsap";

/* ------------------------------------------------------------------ */
/* RHINO MODEL                                                         */
/* ------------------------------------------------------------------ */

function RhinoModel() {
  const rhinoRef = useRef<Group>(null);
  const gltf = useGLTF(rhinoGLB);

  const bones = useRef<Record<string, Bone>>({});
  const legTl = useRef<gsap.core.Timeline | null>(null);
  const bodyTl = useRef<gsap.core.Timeline | null>(null);
  const jumpTl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!rhinoRef.current) return;
    const rhino = rhinoRef.current;

    /* -------------------------------------------------- */
    /* COLLECT BONES                                      */
    /* -------------------------------------------------- */
    const foundBones: Record<string, Bone> = {};
    gltf.scene.traverse((obj) => {
      if (obj instanceof Bone) foundBones[obj.name] = obj;
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

    /* -------------------------------------------------- */
    /* LEG QUATERNIONS                                    */
    /* -------------------------------------------------- */
    const forwardFrontL = new Quaternion(0.2105, -0.749, 0.3166, 0.5424);
    const backwardFrontL = new Quaternion(0.4372, -0.5181, 0.6267, 0.3839);
    const forwardBackL = new Quaternion(0.2923, -0.7221, 0.4124, 0.4721);
    const backwardBackL = new Quaternion(0.4645, -0.4801, 0.679, 0.3043);

    const forwardFrontR = new Quaternion(0.3166, -0.5478, 0.2093, 0.7455);
    const backwardFrontR = new Quaternion(0.6251, -0.3892, 0.4386, 0.5151);
    const forwardBackR = new Quaternion(0.4884, -0.5147, 0.291, 0.6416);
    const backwardBackR = new Quaternion(0.6968, -0.3641, 0.4658, 0.4058);

    const step = { t: 0 };
    const neckLookQuat = new Quaternion(-0.3826, -0.0012, 0.0031, 0.9238);

    /* -------------------------------------------------- */
    /* LEG TIMELINE (walk cycle)                          */
    /* -------------------------------------------------- */
    legTl.current = gsap.timeline({ repeat: -1, paused: true });
    legTl.current
      .to(step, {
        t: 1,
        duration: 0.4,
        ease: "sine.inOut",
        onUpdate: () => {
          const t = step.t;
          frontLeg1L.quaternion.slerpQuaternions(
            backwardFrontL,
            forwardFrontL,
            t
          );
          backLeg1L.quaternion.slerpQuaternions(forwardBackL, backwardBackL, t);
          frontLeg1R.quaternion.slerpQuaternions(
            forwardFrontR,
            backwardFrontR,
            t
          );
          backLeg1R.quaternion.slerpQuaternions(backwardBackR, forwardBackR, t);
        },
      })
      .to(step, {
        t: 0,
        duration: 0.4,
        ease: "sine.inOut",
        onUpdate: () => {
          const t = step.t;
          frontLeg1L.quaternion.slerpQuaternions(
            forwardFrontL,
            backwardFrontL,
            t
          );
          backLeg1L.quaternion.slerpQuaternions(backwardBackL, forwardBackL, t);
          frontLeg1R.quaternion.slerpQuaternions(
            backwardFrontR,
            forwardFrontR,
            t
          );
          backLeg1R.quaternion.slerpQuaternions(forwardBackR, backwardBackR, t);
        },
      });

    /* -------------------------------------------------- */
    /* BODY SETUP                                         */
    /* -------------------------------------------------- */
    rhino.position.set(-15, -0.9, -3);
    rhino.scale.set(0.3, 0.3, 0.3);
    rhino.rotation.set(0, Math.PI, 0);

    /* -------------------------------------------------- */
    /* BODY TIMELINE                                      */
    /* -------------------------------------------------- */
    bodyTl.current = gsap.timeline({ delay: 0.6 });
    bodyTl.current.call(() => {
      legTl.current?.play();
    });

    bodyTl.current.to(rhino.position, {
      x: 2,
      duration: 4,
      ease: "power1.inOut",
    });

    bodyTl.current.to(rhino.rotation, {
      y: 0,
      duration: 0.6,
      ease: "power2.inOut",
    });

    bodyTl.current.to(rhino.position, {
      x: -3,
      duration: 3,
      ease: "power1.inOut",
    });

    bodyTl.current.to(rhino.rotation, {
      y: Math.PI,
      duration: 0.6,
      ease: "power2.inOut",
    });

    /* Add neck turn at end of bodyTL */
    bodyTl.current.call(() => {
      {
        legTl.current?.pause();
      }

      if (neckBone) {
        const startQuat = neckBone.quaternion.clone();
        const neckStep = { t: 0 };

        gsap.to(neckStep, {
          t: 1,
          duration: 1.4,
          ease: "power2.out",
          onUpdate: () => {
            neckBone.quaternion.slerpQuaternions(
              startQuat,
              neckLookQuat,
              neckStep.t
            );
          },
        });
      }
    });
    /* -------------------------------------------------- */
    /* JUMP TIMELINE (triggered on resize)               */
    /* -------------------------------------------------- */
    const frontLegSplayR = new Quaternion(
      0.38010727033822267,
      -0.5923337154054379,
      0.6113438768106563,
      0.36182573374248217
    );

    // Commented out for future use
    // const frontLegSplayL = new Quaternion(-0.3801, -0.5923, -0.6113, 0.3618);
    // const backLegSplayL = new Quaternion(-0.3, -0.5, 0.4, 0.7);
    // const backLegSplayR = new Quaternion(0.3, -0.5, -0.4, 0.7);

    jumpTl.current = gsap.timeline({ paused: true });

    // Smooth step object for slerping
    

    jumpTl.current

      // Jump up and splay right front leg
      // .to(step, {
      //   t: 1,
      //   duration: 0.6,
      //   ease: "power1.out",
      //   onUpdate: () => {
      //     if (!frontLeg1R) return;
      //     frontLeg1R.quaternion.slerpQuaternions(
      //       forwardFrontR,
      //       frontLegSplayR,
      //       step.t
      //     );
      //   },
      // })

      .to(
        rhino.position,
        {
          y: -0.7,
          duration: 0.6,
          ease: "power1.out",
            onUpdate: () => {
          if (!frontLeg1R) return;
          frontLeg1R.quaternion.slerpQuaternions(
            forwardFrontR,
            frontLegSplayR,
            step.t
          );
        },
        },
        "<"
      ) // "<" sync with step tween

      // Land (back to normal right front leg)
      .to(
        {},
        {
          duration: 0.6,
          ease: "power1.in",
          onStart: () => {
            if (!frontLeg1R) return;

            gsap.to(frontLeg1R.quaternion, {
              x: frontLegSplayR.x,
              y: frontLegSplayR.y,
              z: frontLegSplayR.z,
              w: frontLegSplayR.w,
              duration: 0.6,
              ease: "power1.in",
              onUpdate: () => {
                frontLeg1R.quaternion.normalize();
              },
            });
          },
        }
      )

      .to(
        rhino.position,
        {
          y: -0.9,
          duration: 0.6,
          ease: "bounce.out",
        },
        "<"
      ) // "<" sync with step tween

      // Turn rhino 180° to face forward
      .to(rhino.rotation, {
        y: rhino.rotation.y + Math.PI,
        duration: 0.6,
        ease: "power2.inOut",
      })
      // Start leg TL
      .call(() => {
        legTl.current?.play();
      })

      // Walk off after landing and turn
      .to(rhino.position, { x: -15, duration: 2, ease: "power1.in" })
      .call(() => {
        legTl.current?.pause();
      });

    /* -------------------------------------------------- */
    /* HANDLE RESIZE                                      */
    /* -------------------------------------------------- */
    const handleResize = () => {
      console.log("screen size changed");
      jumpTl.current?.restart();
    };

    window.addEventListener("resize", handleResize);

    /* -------------------------------------------------- */
    /* CLEANUP                                           */
    /* -------------------------------------------------- */
    return () => {
      window.removeEventListener("resize", handleResize);
      legTl.current?.kill();
      bodyTl.current?.kill();
      jumpTl.current?.kill();
    };
  }, [gltf]);






  return (
    <group ref={rhinoRef}>
      <primitive object={gltf.scene} />
    </group>
  );
}



useGLTF.preload(rhinoGLB);

/* ------------------------------------------------------------------ */
/* APP                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
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
      {/* Controls (can be removed later if needed) */}
      <OrbitControls enablePan={false} enableZoom={false} />

      {/* Lights */}
      <ambientLight intensity={0.5} />
      <hemisphereLight args={[0x87ceeb, 0xffffff, 2.2]} />

      <directionalLight intensity={0.15} position={[-19, 0, 1]} />

      <spotLight
        intensity={0.35}
        angle={Math.PI / 4}
        penumbra={0.3}
        decay={2}
        position={[-11, 0.5, 2]}
        castShadow
      />

      {/* Scene */}
      <RhinoModel />
    </Canvas>
  );
}
