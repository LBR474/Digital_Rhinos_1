import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import {
  Bone,
  Quaternion,
  Group,
  type Object3D,
  Mesh,
  DirectionalLight,
  SpotLight,
  MeshStandardMaterial,
} from "three";

import rhinoGLB from "./models/Rhino_3.glb?url";

import flagGLB from "./models/Flag_only2.glb?url";

interface FlagModelProps {
  rhinoRef: React.RefObject<Group>;
  flagDetachRef: React.RefObject<(() => void) | null>;
  spotRef?: React.RefObject<SpotLight>;
  spotTargetRef?: React.RefObject<Object3D>;
}

export function FlagModel({}: FlagModelProps) {
  const group = useRef<Group>(null!);
  const flagRef = useRef<Mesh | null>(null);
  const gltf = useGLTF(flagGLB);

  const waveStrength = useRef(0);
  const isClickable = useRef(false);

  /* ---------------- setup ---------------- */
  useEffect(() => {
    const root = group.current;
    if (!root) return;

    /* 1️⃣ Find Flag group */
    const flagGroup = gltf.scene.getObjectByName("Flag");

    if (!(flagGroup instanceof Group)) {
      console.warn("🚩 Flag group not found or invalid");
      return;
    }

    flagGroup.position.set(0, 0.2, 0);

    console.group("🚩 Flag contents");
    flagGroup.traverse((obj) => {
      if (obj instanceof Mesh) {
        console.log(
          obj.name,
          "vertices:",
          obj.geometry.attributes.position.count
        );
      }
    });
    console.groupEnd();

    /* 2️⃣ Enable render layer */
    flagGroup.traverse((obj) => obj.layers.enable(1));

    /* 3️⃣ Find most subdivided mesh */
    /* 3️⃣ Find top two most subdivided meshes */
    const deformMeshes: Mesh[] = [];

    flagGroup.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;

      deformMeshes.push(obj);
      console.log(deformMeshes);

      const mat = obj.material;
      if (!Array.isArray(mat) && mat.name === "DR_white") {
        mat.color.set("#ffffff");
        mat.emissive.set("#ffffff");
        mat.emissiveIntensity = 5.6;
        mat.needsUpdate = true;
      }
    });

    deformMeshes.sort(
      (a, b) =>
        b.geometry.attributes.position.count -
        a.geometry.attributes.position.count
    );

    const primary = deformMeshes[0]; // rhino horn
    const secondary = deformMeshes[1]; // flag plane
    const tertiary = deformMeshes[2]; // flag pole
    const quaternary = deformMeshes[3]; // extra if needed
    const quincenternary = deformMeshes[4]; // extra if needed
    if (!primary || !secondary) {
      console.warn("🚩 Not enough deformable meshes found");
      return;
    }

    /* cache both */
    [primary, secondary, tertiary, quaternary, quincenternary].forEach((mesh) => {
      const geo = mesh.geometry;
      geo.computeVertexNormals();
      geo.userData.originalPositions = geo.attributes.position.array.slice();
    });

    /* store references */
    flagRef.current = primary;
    (flagRef as any).secondary = secondary;
    (flagRef as any).tertiary = tertiary;
    (flagRef as any).quaternary = quaternary;
    (flagRef as any).quincenternary = quincenternary;
    /* 6️⃣ Rotate once, then enable waving */
    gsap.to(root.rotation, {
      y: Math.PI * 2,
      duration: 4,
      ease: "power2.inOut",
      onComplete: () => {
        waveStrength.current = 5;

        gsap.to(waveStrength, {
          current: 0,
          duration: 5,
          ease: "power2.out",
          onComplete: () => {
            isClickable.current = true;
          },
        });
      },
    });
  }, [gltf]);

  const Mat_Black = new MeshStandardMaterial({ color: 0x000000 });

  /* ---------------- wave animation ---------------- */
  useFrame(({ clock }) => {
    if (waveStrength.current <= 0) return;

    const primary = flagRef.current;
    const secondary = (flagRef as any).secondary as Mesh | undefined;
    const tertiary = (flagRef as any).tertiary as Mesh | undefined;
    const quaternary = (flagRef as any).quaternary as Mesh | undefined;
    const quincenternary = (flagRef as any).quincenternary as
      | Mesh
      | undefined;
    if (!primary || !secondary) return;

    const time = clock.getElapsedTime();
    const waveSpeed = 4.2;
    const waveHeight = 0.15 * waveStrength.current;
    const waveLength = 2.0;
    const width = 4;

    const rippleMesh = (mesh: Mesh) => {
      const geo = mesh.geometry;
      const pos = geo.attributes.position;
      const original = geo.userData.originalPositions;
      if (!original) return;

      for (let i = 0; i < pos.count; i++) {
        const ix = i * 3;
        const x = original[ix];
        const y = original[ix + 1];
        const z = original[ix + 2];

        const edgeFactor = Math.min(Math.max((x + width / 2) / width, 0), 1);

        const wave =
          Math.sin(time * waveSpeed + x * waveLength) * waveHeight * edgeFactor;

        pos.array[ix] = x;
        pos.array[ix + 1] = y + wave;
        pos.array[ix + 2] = z + wave;
      }

      pos.needsUpdate = true;
    };

    rippleMesh(primary);
    rippleMesh(secondary);
    if (tertiary) rippleMesh(tertiary);
    if (quaternary) rippleMesh(quaternary);
    if (quincenternary) rippleMesh(quincenternary);
    // Juice up emissive at the end
    [primary, secondary].forEach((mesh) => {
      const mat = mesh.material;
      if (!Array.isArray(mat)) {
        gsap.to(mat, {
          emissiveIntensity: 5.6,
          duration: 5.5,
          delay: 3,
          ease: "power2.out",
        });
      }
    });
  });
  function message_console() {
    if (flagRef.current) {
      if (flagRef.current.geometry.name === "Plane") {
        flagRef.current.material = Mat_Black;
        flagRef.current.material.needsUpdate = true; // tells Three.js to recompile shader
      }
    }
  }

  return (
    <group
      ref={group}
      position={[-10.5, -0.1, 0]}
      scale={[0.6, 0.6, 0.3]}
      rotation={[Math.PI / 48, 0, 0]}
    >
      {/* Actual flag GLTF */}
      <primitive object={gltf.scene} />

      {/* Invisible clickable hit area */}
      <mesh
        position={[0, 0, 0]} // local to flag
        visible={false}
        onPointerOver={() => {
          message_console();
          if (waveStrength.current > 0) return; // optional guard
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
        onClick={() => {
          if (waveStrength.current > 0) return;
          window.location.href = "https://digitalrhinos.com";
        }}
      >
        <boxGeometry args={[6, 3, 0.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

useGLTF.preload(flagGLB);

/* ------------------------------------------------------------------ */
/* RHINO MODEL                                                         */
/* ------------------------------------------------------------------ */

interface RhinoModelProps {
  rhinoRef: React.RefObject<Group>;
  flagDetachRef: React.RefObject<(() => void) | null>;
  lightRef?: React.RefObject<DirectionalLight>;
  flagSpotRef: React.RefObject<SpotLight>;
  flagSpotTargetRef: React.RefObject<Object3D>;
}

function RhinoModel({
  rhinoRef,

  lightRef: _lightRef,
  flagSpotRef: _flagSpotRef,
  flagSpotTargetRef: _flagSpotTargetRef,
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
      }
      child.layers?.enable(1);
    });
    bones.current = foundBones;

    const frontLeg1L = bones.current["Front_leg_1_L"];
    const backLeg1L = bones.current["Back_leg_1_L"];
    const frontLeg1R = bones.current["Front_leg_1_R"];
    const backLeg1R = bones.current["Back_leg_1_R"];

    const neckBone = bones.current["Neck_mover_bone"];

    const lookAtViewerQuat = new Quaternion(
      -0.3826812549074975,
      -0.0012971686512075215,
      0.0031314363856131937,
      0.9238742409459028
    );

    if (!neckBone) {
      console.warn("🦏 Neck_mover_bone not found");
    }

    if (!frontLeg1L || !backLeg1L || !frontLeg1R || !backLeg1R) {
      console.warn("🦏 Missing leg bones");
      return;
    }

    // ---------- quaternions (UNCHANGED) ----------
    const forwardFrontL = new Quaternion(
      0.2105577234701947,
      -0.7490538817867567,
      0.3166884659892685,
      0.5424870461252903
    );

    const backwardFrontL = new Quaternion(
      0.43725962297372956,
      -0.5181884477809773,
      0.6267806912284278,
      0.38396714995369796
    );

    const forwardBackL = new Quaternion(
      0.2923585826261666,
      -0.7221053563528358,
      0.41249857984350696,
      0.47216017797188514
    );

    const backwardBackL = new Quaternion(
      0.46451037371875004,
      -0.4801202747394801,
      0.6790255855492136,
      0.3043663700300849
    );

    const forwardFrontR = new Quaternion(
      0.31663267436445885,
      -0.5478111952176493,
      0.20930112921304217,
      0.7455465778785493
    );

    const backwardFrontR = new Quaternion(
      0.6251117107370124,
      -0.3892699585317157,
      0.43860342871477914,
      0.515103192924535
    );

    const forwardBackR = new Quaternion(
      0.48848472496773976,
      -0.5147301606915479,
      0.2910137458299352,
      0.6416749151988816
    );

    const backwardBackR = new Quaternion(
      0.6968593983529858,
      -0.36418252110954535,
      0.46584034808699476,
      0.40589530946959085
    );

    // ---------- leg animation ----------
    const legTl = gsap.timeline({ repeat: -1, paused: true });

    legTl.to(
      { t: 0 },
      {
        t: 1,
        duration: 0.5,
        ease: "sine.inOut",
        onUpdate() {
          const t = this.targets()[0].t;
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
      }
    );

    legTl.to(
      { t: 0 },
      {
        t: 1,
        duration: 0.5,
        ease: "sine.inOut",
        onUpdate() {
          const t = this.targets()[0].t;
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
      }
    );

    // ---------- START STATE ----------
    group.current.position.set(-15, -0.9, -3);
    group.current.scale.set(0.3, 0.3, 0.3);
    group.current.rotation.set(0, Math.PI / 1, 0); // face +X

    // ---------- BODY TIMELINE ----------

    const bodyTl = gsap.timeline();

    // 1️⃣ Wait for flag animation to finish
    bodyTl.to({}, { duration: 5 });

    // 2️⃣ Start walking (legs + body move together)
    bodyTl.call(() => {
      legTl.play();
    });

    bodyTl.to(group.current.position, {
      x: -9.5,
      duration: 4,
      ease: "power2.inOut",
    });

    // 3️⃣ Stop legs once arrived
    bodyTl.call(() => {
      legTl.pause();
    });

    // 4️⃣ Look toward viewer (after fully stopped)
    if (neckBone) {
      const startQuat = neckBone.quaternion.clone();

      bodyTl.to(
        { t: 0 },
        {
          t: 1,
          duration: 1.8,
          ease: "power2.out",
          onUpdate() {
            const t = this.targets()[0].t;
            neckBone.quaternion.slerpQuaternions(
              startQuat,
              lookAtViewerQuat,
              t
            );
          },
        }
      );
    }

    return () => {
      legTl.kill();
      bodyTl.kill();
    };
  }, [gltf]);

  return <primitive ref={group} object={gltf.scene} />;
}

useGLTF.preload(rhinoGLB);

/* ------------------------------------------------------------------ */
/* APP                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const rhinoRef = useRef<Group>(null!);
  const lightRef = useRef<DirectionalLight>(null!);
  const flagSpotRef = useRef<SpotLight>(null!);
  const flagSpotTargetRef = useRef<Object3D>(null!);
  const flagDetachRef = useRef<(() => void) | null>(null);

  return (
    <div className="app-root">
      {/* <MainNav /> */}

      <Canvas
        orthographic
        camera={{ zoom: 50, position: [0, 1, 10], near: 0.1, far: 1000 }}
      >
        <OrbitControls />

        <ambientLight intensity={0.5} />
        <hemisphereLight args={[0x87ceeb, 0xffffff, 2.2]} />

        <directionalLight
          ref={lightRef}
          intensity={0.1}
          position={[-19, 0, 1]}
          layers={1}
        />

        <spotLight
          ref={flagSpotRef}
          intensity={0.35}
          angle={Math.PI / 4}
          penumbra={0.3}
          decay={2}
          position={[-11, 0.5, 2]}
          castShadow
        />

        <object3D ref={flagSpotTargetRef} />

        <RhinoModel
          rhinoRef={rhinoRef}
          lightRef={lightRef}
          flagSpotRef={flagSpotRef}
          flagSpotTargetRef={flagSpotTargetRef}
          flagDetachRef={flagDetachRef}
        />
        <FlagModel
          rhinoRef={rhinoRef}
          spotRef={flagSpotRef}
          spotTargetRef={flagSpotTargetRef}
          flagDetachRef={flagDetachRef}
        />
      </Canvas>
    </div>
  );
}
