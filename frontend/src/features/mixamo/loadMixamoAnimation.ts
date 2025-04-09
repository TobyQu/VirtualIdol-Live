import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { mixamoVRMRigMap } from './mixamoVRMRigMap';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';

/**
 * Load Mixamo animation, convert for three-vrm use, and return it.
 *
 * @param {string} url A url of mixamo animation data
 * @param {VRM} vrm A target VRM
 * @returns {Promise<THREE.AnimationClip>} The converted AnimationClip
 */
export function loadMixamoAnimation(url: string, vrm: VRM) {
	// 检查VRM模型是否已完全加载
	if (!vrm || !vrm.humanoid) {
		console.warn('VRM模型或humanoid属性未定义，无法加载动画:', url);
		return Promise.resolve(new THREE.AnimationClip('empty', 0, [])); // 返回空动画
	}
	
	// 检查URL是否有效
	if (!url || url.trim() === '') {
		console.error('无效的动画URL');
		return Promise.resolve(new THREE.AnimationClip('empty', 0, []));
	}
	
	const loader = new FBXLoader(); // A loader which loads FBX
	return loader.loadAsync(url)
		.then((asset: THREE.Group) => {
			try {
				if (!asset || !asset.animations || asset.animations.length === 0) {
					console.warn('动画文件中没有动画:', url);
					return new THREE.AnimationClip('empty', 0, []);
				}
				
				const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com'); // extract the AnimationClip
				
				if (!clip) {
					console.warn('无法找到mixamo.com动画:', url);
					return new THREE.AnimationClip('empty', 0, []);
				}

				const tracks: THREE.KeyframeTrack[] = []; // KeyframeTracks compatible with VRM will be added here

				const restRotationInverse = new THREE.Quaternion();
				const parentRestWorldRotation = new THREE.Quaternion();
				const _quatA = new THREE.Quaternion();
				const _vec3 = new THREE.Vector3();

				// Adjust with reference to hips height.
				let motionHipsHeight = asset.getObjectByName('mixamorigHips')?.position.y;
				if(motionHipsHeight == null){
					motionHipsHeight = 1
				}
				let vrmHipsY = vrm.humanoid?.getNormalizedBoneNode('hips')?.getWorldPosition(_vec3).y;
				if(vrmHipsY == null){
					vrmHipsY = 1
				}
				const vrmRootY = vrm.scene?.getWorldPosition(_vec3).y;
				const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
				const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

				clip.tracks.forEach((track) => {
					try {
						// Convert each tracks for VRM use, and push to `tracks`
						const trackSplitted = track.name.split('.');
						const mixamoRigName = trackSplitted[0];
						const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
						
						// 确保humanoid存在
						if (!vrm.humanoid) return;
						
						const vrmNodeName = vrm.humanoid.getNormalizedBoneNode(vrmBoneName as VRMHumanBoneName)?.name;
						const mixamoRigNode = asset.getObjectByName(mixamoRigName);

						if (vrmNodeName != null) {
							const propertyName = trackSplitted[1];

							// Store rotations of rest-pose.
							mixamoRigNode?.getWorldQuaternion(restRotationInverse).invert();
							mixamoRigNode?.parent?.getWorldQuaternion(parentRestWorldRotation);

							if (track instanceof THREE.QuaternionKeyframeTrack) {
								// Retarget rotation of mixamoRig to NormalizedBone.
								for (let i = 0; i < track.values.length; i += 4) {
									const flatQuaternion = track.values.slice(i, i + 4);
									_quatA.fromArray(flatQuaternion);
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
										track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? - v : v)),
									),
								);
							} else if (track instanceof THREE.VectorKeyframeTrack) {
								const value = track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? - v : v) * hipsPositionScale);
								tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, value));
							}
						}
					} catch (trackError) {
						console.warn('处理动画轨道时出错:', trackError);
						// 继续处理下一个轨道
					}
				});

				// 检查是否成功创建了轨道
				if (tracks.length === 0) {
					console.warn('没有成功创建动画轨道:', url);
					return new THREE.AnimationClip('empty', 0, []);
				}

				return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
			} catch (error) {
				console.error('处理动画时发生错误:', error);
				return new THREE.AnimationClip('empty', 0, []);
			}
		})
		.catch(error => {
			// 处理网络错误、文件不存在等问题
			console.error('加载FBX文件失败:', url, error);
			if (error.message && error.message.includes('404')) {
				console.warn('动画文件不存在:', url);
			} else if (error.message && error.message.includes('NetworkError')) {
				console.warn('加载动画时发生网络错误:', url);
			}
			return new THREE.AnimationClip('empty', 0, []);
		});
}
