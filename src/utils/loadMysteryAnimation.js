import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { mixamoVRMRigMap } from "./mixamoVRMRigMap.js";

/**
 * Load Mixamo animation, convert for three-vrm use, and return it.
 *
 * @param {string} url A url of mixamo animation data
 * @param {VRM} vrm A target VRM
 * @returns {Promise<THREE.AnimationClip>} The converted AnimationClip
 */
export async function loadMixamoAnimation(url, vrm) {
  const loader = new FBXLoader(); // A loader which loads FBX
  return loader.loadAsync(url).then((asset) => {
    // Debug: Log the loaded asset structure
    // console.log("Loaded FBX asset:", asset);
    // console.log(
    //   "Asset children:",
    //   asset.children.map((child) => child.name)
    // );

    // Try to find the hips bone - Mixamo usually names it "mixamorigHips"
    // const hipsObject = asset.getObjectByName("mixamorigHips");

    // if (!hipsObject) {
    //   console.error("Could not find mixamorigHips in the FBX file");
    //   console.log("Available objects in FBX:");
    //   asset.traverse((child) => {
    //     if (child.name) {
    //       console.log(`- ${child.name} (${child.type})`);
    //     }
    //   });
    //   throw new Error("Invalid Mixamo FBX: missing hip bone");
    // }

    const clip = THREE.AnimationClip.findByName(asset.animations, "mixamo.com"); // extract the AnimationClip

    if (!clip) {
      console.error("No animation clip found in FBX");
      console.log(
        "Available animations:",
        asset.animations.map((a) => a.name)
      );
      throw new Error("No animation found in FBX file");
    }

    const tracks = []; // KeyframeTracks compatible with VRM will be added here

    const restRotationInverse = new THREE.Quaternion();
    const parentRestWorldRotation = new THREE.Quaternion();
    const _quatA = new THREE.Quaternion();
    const _vec3 = new THREE.Vector3();

    // Adjust with reference to hips height.
    const motionHipsHeight = asset.getObjectByName("mixamorigHips").position.y;
    const vrmHipsHeight = vrm.humanoid.normalizedRestPose.hips.position[1];
    const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

    clip.tracks.forEach((track) => {
      // Convert each tracks for VRM use, and push to `tracks`
      const trackSplitted = track.name.split(".");
      const mixamoRigName = trackSplitted[0];
      const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
      const vrmNodeName =
        vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
      const mixamoRigNode = asset.getObjectByName(mixamoRigName);

      if (vrmNodeName != null) {
        const propertyName = trackSplitted[1];

        // Store rotations of rest-pose.
        mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
        mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);

        if (track instanceof THREE.QuaternionKeyframeTrack) {
          // Retarget rotation of mixamoRig to NormalizedBone.
          for (let i = 0; i < track.values.length; i += 4) {
            const flatQuaternion = track.values.slice(i, i + 4);

            _quatA.fromArray(flatQuaternion);

            // 親のレスト時ワールド回転 * トラックの回転 * レスト時ワールド回転の逆
            _quatA
              .premultiply(parentRestWorldRotation)
              .multiply(restRotationInverse);

            _quatA.toArray(flatQuaternion);

            flatQuaternion.forEach((v, index) => {
              track.values[index + i] = v;
            });
          }

          tracks.push(
            new THREE.QuaternionKeyframeTrack(
              `${vrmNodeName}.${propertyName}`,
              track.times,
              track.values.map((v, i) =>
                vrm.meta?.metaVersion === "0" && i % 2 === 0 ? -v : v
              )
            )
          );
        } else if (track instanceof THREE.VectorKeyframeTrack) {
          const value = track.values.map(
            (v, i) =>
              (vrm.meta?.metaVersion === "0" && i % 3 !== 1 ? -v : v) *
              hipsPositionScale
          );
          tracks.push(
            new THREE.VectorKeyframeTrack(
              `${vrmNodeName}.${propertyName}`,
              track.times,
              value
            )
          );
        }
      }
    });

    return new THREE.AnimationClip("vrmAnimation", clip.duration, tracks);
  });
}

// // Add this temporary debug function
// async function debugFBX(url) {
//   const loader = new FBXLoader();
//   const asset = await loader.loadAsync(url);
//   console.log("=== FBX Debug Info ===");
//   console.log("Asset:", asset);
//   console.log("Animations:", asset.animations);
//   asset.traverse((child) => {
//     if (child.name) {
//       console.log(`${child.name} - Type: ${child.type}`);
//     }
//   });
// }

// // Call it in your code
// debugFBX("/animations/idle.fbx");
