import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useRef, useEffect, useState } from "react";
import { Bone, Euler, Quaternion, Group, Object3D } from "three";

import rhinoGLB from "./models/Rhino_3.glb?url";


function RhinoModel({
  angles,
  //axis,
  boneName,
}: {
  angles: { x: number; y: number; z: number };
  axis: "x" | "y" | "z";
  boneName: string;
}) {
  const group = useRef<Group>(null!);
  const gltf = useGLTF(rhinoGLB);

  const targetBone = useRef<Bone | null>(null);
  const restQuat = useRef(new Quaternion());

  // Find bone
  useEffect(() => {
    targetBone.current = null;

    gltf.scene.traverse((child: Object3D) => {
      if (child.name === boneName && child instanceof Bone) {
        targetBone.current = child;
        restQuat.current.copy(child.quaternion);
        console.log(`📌 Found bone: ${boneName}`);
      }
    });

    if (!targetBone.current) {
      console.warn(`⚠ Bone not found: "${boneName}"`);
    }
  }, [gltf, boneName]);

  // Apply rotation whenever angles change
  useEffect(() => {
    if (!targetBone.current) return;

    const euler = new Euler(
      (angles.x * Math.PI) / 180,
      (angles.y * Math.PI) / 180,
      (angles.z * Math.PI) / 180
    );

    const deltaQuat = new Quaternion().setFromEuler(euler);
    const finalQuat = new Quaternion().multiplyQuaternions(
      restQuat.current,
      deltaQuat
    );

    targetBone.current.quaternion.copy(finalQuat);
    targetBone.current.updateMatrixWorld(true);

    console.log("🔄 Quaternion:", finalQuat);
  }, [angles]);

  return <primitive ref={group} object={gltf.scene} scale={[0.3, 0.3, 0.3]} />;
}

export default function App() {
  const [boneName, setBoneName] = useState("Front_leg_1_L");

  // Separate X/Y/Z rotation angles
  const [angles, setAngles] = useState({ x: 0, y: 0, z: 0 });

  // Which axis is currently “active” for step buttons
  const [axis, setAxis] = useState<"x" | "y" | "z">("x");

  // Step buttons modify only the selected axis
  const step = (amount: number) => {
    setAngles((prev) => ({
      ...prev,
      [axis]: prev[axis] + amount,
    }));
  };

  // Slider modifies only the selected axis
  const updateSlider = (val: number) => {
    setAngles((prev) => ({
      ...prev,
      [axis]: val,
    }));
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* === CONTROL PANEL === */}
      <div
        style={{
          width: "300px",
          padding: "20px",
          background: "#222",
          color: "white",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <h2>Bone Quaternion Tester</h2>

        {/* Bone selector */}
        <label>
          Bone Name:
          <input
            type="text"
            value={boneName}
            onChange={(e) => setBoneName(e.target.value)}
            style={{
              width: "100%",
              padding: "6px",
              marginTop: "4px",
              borderRadius: "4px",
            }}
          />
        </label>

        {/* Axis select */}
        <label>
          Axis:
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            {["x", "y", "z"].map((ax) => (
              <button
                key={ax}
                onClick={() => setAxis(ax as "x" | "y" | "z")}
                style={{
                  padding: "6px 12px",
                  background: axis === ax ? "#0af" : "#444",
                  borderRadius: "4px",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {ax.toUpperCase()}
              </button>
            ))}
          </div>
        </label>

        {/* Slider (controls active axis) */}
        <label>
          {axis.toUpperCase()} Angle: {angles[axis]}°
          <input
            type="range"
            min={-180}
            max={180}
            value={angles[axis]}
            onChange={(e) => updateSlider(Number(e.target.value))}
          />
        </label>

        {/* Step buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => step(-5)}
            style={{ padding: "10px", flexGrow: 1 }}
          >
            –5°
          </button>
          <button
            onClick={() => step(5)}
            style={{ padding: "10px", flexGrow: 1 }}
          >
            +5°
          </button>
        </div>

        <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
          Open devtools to copy the quaternion values.
        </p>
      </div>

      {/* === 3D PANEL === */}
      <div style={{ flexGrow: 1 }}>
        <Canvas
          orthographic
          camera={{
            zoom: 50,
            position: [0, 1, 10],
            near: 0.1,
            far: 1000,
          }}
        >
          <OrbitControls />

          <ambientLight intensity={1} />
          <directionalLight position={[0, 5, 5]} intensity={2.2} />

          <RhinoModel angles={angles} axis={axis} boneName={boneName} />
        </Canvas>
      </div>
    </div>
  );
}
