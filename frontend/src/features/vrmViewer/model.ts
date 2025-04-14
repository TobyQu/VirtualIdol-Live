import * as THREE from "three";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMAnimation } from "../../lib/VRMAnimation/VRMAnimation";
import { VRMLookAtSmootherLoaderPlugin } from "@/lib/VRMLookAtSmootherLoaderPlugin/VRMLookAtSmootherLoaderPlugin";
import { LipSync } from "../lipSync/lipSync";
import { EmoteController } from "../emoteController/emoteController";
import { Screenplay, EmotionType } from "../messages/messages";
import { loadMixamoAnimation } from "../mixamo/loadMixamoAnimation";
import { buildUrl } from "@/utils/buildUrl";




/**
 * 3Dキャラクターを管理するクラス
 */
export class Model {
  public vrm?: VRM | null;
  public mixer?: THREE.AnimationMixer;
  public emoteController?: EmoteController;
  public clipMap: Map<string, THREE.AnimationClip> = new Map();
  public blendTime: number = 0.5; // 这是混合时间，可以根据需要调整
  public current_clipMap: Map<string, THREE.AnimationClip> = new Map();
  public modelScale: number = 1.0; // 添加模型缩放属性，默认为1.0

  private _lookAtTargetParent: THREE.Object3D;
  private _lipSync?: LipSync;

  constructor(lookAtTargetParent: THREE.Object3D) {
    this._lookAtTargetParent = lookAtTargetParent;
    this._lipSync = new LipSync(new AudioContext());
  }

  public async loadVRM(url: string, scale: number = 1.0): Promise<void> {
    const loader = new GLTFLoader();
    loader.register(
      (parser) =>
        new VRMLoaderPlugin(parser, {
          lookAtPlugin: new VRMLookAtSmootherLoaderPlugin(parser),
        })
    );

    try {
      // 检查URL是否有效
      if (!url || url.trim() === '') {
        throw new Error("Empty or invalid URL provided");
      }
      
      const gltf = await loader.loadAsync(url);

      if (!gltf || !gltf.userData) {
        throw new Error("Failed to load VRM model: Invalid GLTF");
      }

      const vrm = (this.vrm = gltf.userData.vrm);
      
      if (!vrm) {
        throw new Error("Failed to load VRM model: Missing VRM data");
      }
      
      vrm.scene.name = "VRMRoot";

      VRMUtils.rotateVRM0(vrm);
      this.mixer = new THREE.AnimationMixer(vrm.scene);
      
      // 设置模型缩放
      this.modelScale = scale;
      console.log(`初始化模型缩放: ${scale}`);
      
      // 应用场景级别的缩放，简单直接
      vrm.scene.scale.set(scale, scale, scale);
      
      // 调整物理系统参数以适应缩放
      if (vrm.springBoneManager) {
        const gravity = vrm.springBoneManager.gravity;
        if (gravity) {
          // 设置与缩放相适应的重力
          const baseGravity = -9.8 * scale;
          gravity.y = baseGravity;
          console.log(`初始化物理重力为: ${gravity.y}`);
        }
        
        // 调整弹簧骨骼参数 - 注意检查API结构
        try {
          if (vrm.springBoneManager.springBones && Array.isArray(vrm.springBoneManager.springBones)) {
            vrm.springBoneManager.springBones.forEach(springBone => {
              // 检查springBone.settings是否存在且是数组
              if (springBone.settings && Array.isArray(springBone.settings)) {
                springBone.settings.forEach(setting => {
                  // 保持适当的刚度感觉
                  if (setting.stiffness) {
                    setting.stiffnessForce *= (1.0 / scale);
                  }
                  
                  // 确保头发和衣服的碰撞半径也适当调整
                  if (setting.colliders) {
                    setting.radius *= scale;
                  }
                });
              } else if (springBone.stiffness) {
                // 有些版本可能直接在springBone上有stiffness属性
                springBone.stiffnessForce *= (1.0 / scale);
              }
            });
          }
          console.log(`物理系统参数已根据缩放调整完成`);
        } catch (error) {
          console.warn("调整弹簧骨骼参数时出错:", error);
          // 继续执行，不要因为物理系统调整失败而阻止模型加载
        }
      }
      
      // 确保模型的所有关键部分都已缩放
      const keyParts = ['Root', 'Head', 'Body', 'Armature', 'Hips', 'Spine'];
      vrm.scene.traverse((child) => {
        if (child instanceof THREE.Object3D) {
          for (const part of keyParts) {
            if (child.name.includes(part)) {
              console.log(`初始化 - ${child.name} 缩放: X=${child.scale.x}, Y=${child.scale.y}, Z=${child.scale.z}`);
              break;
            }
          }
        }
      });

      this.emoteController = new EmoteController(vrm, this._lookAtTargetParent);
    } catch (error) {
      console.error("Error loading VRM model:", error);
      this.vrm = null;
      throw error;
    }
  }

  public unLoadVrm() {
    if (this.vrm) {
      VRMUtils.deepDispose(this.vrm.scene);
      this.vrm = null;
    }
  }

  /**
   * VRMアニメーションを読み込む
   *
   * https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm_animation-1.0/README.ja.md
   */
  public async loadAnimation(vrmAnimation: VRMAnimation): Promise<void> {
    const { vrm, mixer } = this;
    if (vrm == null || mixer == null) {
      throw new Error("You have to load VRM first");
    }

    const clip = vrmAnimation.createAnimationClip(vrm);
    const action = mixer.clipAction(clip);
    action.play();
  }

  // mixamo animation
  public async loadFBX(animationUrl: string) {
    const { vrm, mixer, clipMap, blendTime, current_clipMap } = this;

    // 检查基本前提条件
    if (vrm == null || mixer == null) {
      console.warn("VRM模型或混合器未加载，无法播放动画");
      return;
    }

    // 获取动画剪辑
    const animationClip = clipMap.get(animationUrl);
    if (animationClip == null) {
      console.warn(`动画 ${animationUrl} 未找到或尚未加载完成，请稍后再试`);
      return;
    }

    // 获取当前剪辑
    const currentClip = current_clipMap.get("current");
    
    // 播放动画
    if (currentClip != null) {
      // 平滑过渡到新动画，使用更长的过渡时间以提高流畅度
      const currentClipAction = mixer.clipAction(currentClip);
      const animationClipAction = mixer.clipAction(animationClip);
      
      // 设置更好的动画混合参数，提高过渡流畅度
      this.crossPlay(currentClipAction, animationClipAction);
    } else {
      // 直接播放新动画
      const action = mixer.clipAction(animationClip);
      action.reset();
      action.setEffectiveTimeScale(1.0); // 确保正常速度
      action.setEffectiveWeight(1.0);    // 确保权重正确
      action.play();
    }
    
    // 更新当前动画引用
    current_clipMap?.set("current", animationClip);
  }

  // 恢复原始crossPlay方法
  public async crossPlay(curAction: THREE.AnimationAction, newAction: THREE.AnimationAction) {
    curAction.fadeOut(1);
    newAction.reset();
    newAction.setEffectiveWeight(1);
    newAction.play();
    newAction.fadeIn(1);
  }

  /**
   * 音声を再生し、リップシンクを行う
   */
  public async speak(buffer: ArrayBuffer, screenplay: Screenplay) {
    this.emoteController?.playEmotion(screenplay.expression);
    await new Promise((resolve) => {
      this._lipSync?.playFromArrayBuffer(buffer, () => {
        resolve(true);
        this.emoteController?.playEmotion("neutral" as EmotionType);
      });
    });
  }

  public async emote(emotionType: EmotionType) {
    this.emoteController?.playEmotion(emotionType);
  }

  public update(delta: number): void {
    if (this._lipSync) {
      const { volume } = this._lipSync.update();
      this.emoteController?.lipSync("aa", volume);
    }

    this.emoteController?.update(delta);
    this.mixer?.update(delta);
    this.vrm?.update(delta);
  }

  // 添加设置模型缩放的方法
  public setScale(scale: number): void {
    if (!this.vrm) return;
    
    // 验证缩放值
    if (isNaN(scale) || scale <= 0) {
      console.warn(`缩放值不正确: ${scale}，将使用默认值 1.0`);
      scale = 1.0;
    }
    
    // 更新缩放值
    this.modelScale = scale;
    
    // 只修改缩放，不调整位置
    this.vrm.scene.scale.set(scale, scale, scale);
    
    // 更新物理系统参数以适应新的缩放比例
    // 对于VRM模型，物理组件包括SpringBone或其他物理系统
    if (this.vrm.springBoneManager) {
      // 如果模型有弹簧骨骼系统(用于头发和衣服的物理效果)
      // 尝试更新重力和其他物理参数
      const gravity = this.vrm.springBoneManager.gravity;
      if (gravity) {
        // 保持重力方向，但调整大小与缩放成比例
        // 注意：这里的处理是近似的，可能需要根据具体模型调整
        const baseGravity = -9.8 * scale;
        gravity.y = baseGravity;
        
        console.log(`已调整物理重力为: ${gravity.y}`);
      }
      
      // 安全地更新弹簧骨骼参数
      try {
        // 可能需要更新其他物理参数
        if (this.vrm.springBoneManager.springBones && Array.isArray(this.vrm.springBoneManager.springBones)) {
          this.vrm.springBoneManager.springBones.forEach(springBone => {
            // 检查springBone结构
            if (springBone.settings && Array.isArray(springBone.settings)) {
              // 调整弹簧骨骼的刚度和阻尼以适应新的缩放
              springBone.settings.forEach(setting => {
                if (setting.stiffness) {
                  // 保持物理感觉一致
                  setting.stiffnessForce *= (1.0 / scale);
                }
              });
            } else if (springBone.stiffness) {
              // 有些版本可能直接在springBone上有stiffness属性
              springBone.stiffnessForce *= (1.0 / scale);
            }
          });
        }
      } catch (error) {
        console.warn("更新物理参数时出错:", error);
        // 继续执行，不要因为物理系统更新失败而阻止缩放操作
      }
    }
    
    // 强制更新一次模型状态，确保物理效果立即应用
    this.vrm.update(0.016); // 假设16ms的时间步长 (60fps)
    
    console.log(`模型缩放已设置为: ${scale}，物理系统已更新`);
  }
}
