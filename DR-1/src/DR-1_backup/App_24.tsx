import {
  Canvas,
  useThree,
  //  useFrame
} from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useRef, useEffect, type JSX } from "react";


import {
  // Bone,
  // Quaternion,
  Group,
  //type Object3D,
  Mesh,
  // DirectionalLight,
  // SpotLight,
  MeshStandardMaterial,
} from "three";

import rhinoGLB from "./models/Rhino_3.glb?url";

import flagGLB from "./models/Flag_only2.glb?url";

interface ViewportLayout {
  leftEdge: number;
  rightEdge: number;
  viewportWidth: number;
}


interface FlagModelProps extends ViewportLayout {}

export function FlagModel({
  leftEdge,
  rightEdge,
  
  screenWidth,
}: FlagModelProps) {
  const group = useRef<Group>(null);
  const flagRef = useRef<Mesh | null>(null);
  const gltf = useGLTF(flagGLB);

  useEffect(() => {
    if (!group.current) return;

    let flagGroup = gltf.scene.getObjectByName("Flag");

    if (!(flagGroup instanceof Group)) {
      gltf.scene.traverse((obj) => {
        if (obj instanceof Group && obj.name === "Flag") {
          flagGroup = obj;
        }
      });
    }

    if (!(flagGroup instanceof Group)) {
      console.warn("🚩 Flag group not found in GLTF");
      return;
    }

    // Local GLTF offsets (MODEL SPACE)
    flagGroup.position.set(0, 0.2, 0);

    // World placement (VIEWPORT SPACE)
    const inset = 0.8; // distance from edge
    let xPos: number;

    if (screenWidth < 800) {
      xPos = leftEdge + inset; // clamp to left edge
    } else {
      xPos = rightEdge - inset; // normal right edge position
    }

    group.current.position.set(xPos, -0.1, 0);
    group.current.scale.set(0.6, 0.6, 0.3);
    group.current.rotation.set(Math.PI / 48, 0, 0);

    // Enable render layer
    flagGroup.traverse((obj) => obj.layers?.enable(1));

    // Find meshes + juice emissive
    const meshes: Mesh[] = [];
    flagGroup.traverse((obj) => {
      if (obj instanceof Mesh) meshes.push(obj);
    });

    meshes.forEach((mesh) => {
      const mat = mesh.material as
        | MeshStandardMaterial
        | MeshStandardMaterial[];

      if (!Array.isArray(mat) && mat.name === "DR_white") {
        mat.color.set("#ffffff");
        mat.emissive.set("#ffffff");
        mat.emissiveIntensity = 5.6;
        mat.needsUpdate = true;
      }
    });

    flagRef.current = meshes[0] ?? null;
  }, [gltf, rightEdge, leftEdge, screenWidth]); // <-- added leftEdge & screenWidth

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}


useGLTF.preload(flagGLB);



/* ------------------------------------------------------------------ */
/* RHINO MODEL                                                         */
/* ------------------------------------------------------------------ */

interface RhinoModelProps extends ViewportLayout {}

function RhinoModel({ leftEdge, rightEdge, viewportWidth, screenWidth }: RhinoModelProps) {
  const rhinoRef = useRef<Group>(null);
  const gltf = useGLTF(rhinoGLB);
  

  useEffect(() => {
    if (!rhinoRef.current) return;
    
    console.log(screenWidth)

    const inset = 0.6;

    rhinoRef.current.position.set(leftEdge + inset, -0.9, -3);

    rhinoRef.current.scale.set(0.3, 0.3, 0.3);
    rhinoRef.current.rotation.set(0, Math.PI, 0);
  }, [leftEdge, rightEdge, viewportWidth]);

  return (
    <group ref={rhinoRef}>
      <primitive object={gltf.scene} />
    </group>
  );
}


useGLTF.preload(rhinoGLB);

interface ViewportLayout {
  viewportWidth: number;
  leftEdge: number;
  rightEdge: number;
  screenWidth: number; // window.innerWidth for CSS-like breakpoints
}

function SceneLayout({
  children,
}: {
  children: (layout: ViewportLayout) => JSX.Element;
}) {
  const { viewport } = useThree();

  const layout: ViewportLayout = {
    leftEdge: -viewport.width / 2,
    rightEdge: viewport.width / 2, // full right edge in world space
    viewportWidth: viewport.width,
    screenWidth: window.innerWidth, // NEW
  };

  return children(layout);
}



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
      <OrbitControls />

      <ambientLight intensity={0.5} />
      <hemisphereLight args={[0x87ceeb, 0xffffff, 2.2]} />

      <directionalLight intensity={0.1} position={[-19, 0, 1]} layers={1} />

      <spotLight
        intensity={0.35}
        angle={Math.PI / 4}
        penumbra={0.3}
        decay={2}
        position={[-11, 0.5, 2]}
        castShadow
      />

      <SceneLayout>
        {({ leftEdge, rightEdge, viewportWidth, screenWidth }) => (
          <>
            <RhinoModel
              leftEdge={leftEdge}
              rightEdge={rightEdge}
              viewportWidth={viewportWidth}
              screenWidth={screenWidth}
            />
            <FlagModel
              leftEdge={leftEdge}
              rightEdge={rightEdge}
              viewportWidth={viewportWidth}
              screenWidth={screenWidth}
            />
          </>
        )}
      </SceneLayout>
    </Canvas>
  );
}
