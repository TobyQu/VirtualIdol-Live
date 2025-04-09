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

  private _lookAtTargetParent: THREE.Object3D;
  private _lipSync?: LipSync;

  constructor(lookAtTargetParent: THREE.Object3D) {
    this._lookAtTargetParent = lookAtTargetParent;
    this._lipSync = new LipSync(new AudioContext());
  }

  public async loadVRM(url: string): Promise<void> {
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
}
