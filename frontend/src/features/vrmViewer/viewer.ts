import * as THREE from "three";
import {Model} from "./model";
import {loadVRMAnimation} from "@/lib/VRMAnimation/loadVRMAnimation";
import {buildUrl} from "@/utils/buildUrl";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {loadMixamoAnimation} from "../mixamo/loadMixamoAnimation";
import { GlobalConfig } from "../config/configApi";

type EventCallback = () => void;
type EventMap = {
  [key: string]: EventCallback[];
};

/**
 * three.jsを使った3Dビューワー
 *
 * setup()でcanvasを渡してから使う
 */
export class Viewer {
    public isReady: boolean;
    public model?: Model;
    private config?: GlobalConfig;

    private _renderer?: THREE.WebGLRenderer;
    private _clock: THREE.Clock;
    private _scene: THREE.Scene;
    private _camera?: THREE.PerspectiveCamera;
    private _cameraControls?: OrbitControls;
    private _events: EventMap = {};
    private _animationFrameId?: number;

    constructor(config?: GlobalConfig) {
        this.isReady = false;
        this.config = config;

        // scene
        const scene = new THREE.Scene();
        this._scene = scene;

        // light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1.0, 1.0, 1.0).normalize();
        scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        // animate
        this._clock = new THREE.Clock();
        this._clock.start();
    }

    // 事件系统
    public on(eventName: string, callback: EventCallback): void {
        if (!this._events[eventName]) {
            this._events[eventName] = [];
        }
        this._events[eventName].push(callback);
    }

    public off(eventName: string, callback: EventCallback): void {
        if (!this._events[eventName]) return;
        this._events[eventName] = this._events[eventName].filter(cb => cb !== callback);
    }

    private emit(eventName: string): void {
        if (!this._events[eventName]) return;
        this._events[eventName].forEach(callback => callback());
    }

    public loadVrm(url: string) {
        if (this.model?.vrm) {
            this.unloadVRM();
        }

        console.log("Loading VRM model:", url);
        
        if (!url || url.trim() === '') {
            console.error("Invalid VRM model URL provided");
            return;
        }

        this.model = new Model(this._camera || new THREE.Object3D());
        this.model.loadVRM(url).then(async () => {
            if (!this.model?.vrm) {
                console.error("Failed to load VRM model:", url);
                return;
            }

            // 在这里设置模型面向相机
            if (this._camera) {
                const cameraDirection = new THREE.Vector3();
                this._camera.getWorldDirection(cameraDirection);

                this.model.vrm.scene.rotation.y = this.model.vrm.scene.rotation.y + 0.1
                this.model.vrm.scene.rotation.x = this.model.vrm.scene.rotation.x + 0.2
            }

            this.model.vrm.scene.traverse((obj) => {
                obj.frustumCulled = false;
            });

            this._scene.add(this.model.vrm.scene);
            this.emit('vrmLoaded');

            try {
                console.log("开始加载模型动画...");
                await this.loadAnimationSafely("idle_01", "/assets/animations/daily/idle_01.fbx");
                
                if (this.model && this.model.clipMap.has("idle_01")) {
                    this.model.loadFBX("idle_01");
                }
                
                this.emit('animationsLoaded');
                this.loadRemainingAnimations();
            } catch (error) {
                console.error("加载动画时出错:", error);
                this.emit('animationsLoaded');
            }

            requestAnimationFrame(() => {
                this.resetCamera();
            });
        }).catch(error => {
            console.error("加载VRM模型失败:", error);
            this.emit('vrmLoaded');
            this.emit('animationsLoaded');
        });
    }

    public unloadVRM(): void {
        if (this.model?.vrm) {
            this._scene.remove(this.model.vrm.scene);
            this.model?.unLoadVrm();
        }
    }

    /**
     * Reactで管理しているCanvasを後から設定する
     */
    public setup(canvas: HTMLCanvasElement) {
        const parentElement = canvas.parentElement;
        const width = parentElement?.clientWidth || canvas.width;
        const height = parentElement?.clientHeight || canvas.height;

        // renderer
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: true,
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputEncoding = THREE.sRGBEncoding;
        this._renderer = renderer;

        // camera
        const camera = new THREE.PerspectiveCamera(20.0, width / height, 0.1, 20.0);
        // 从配置中获取相机距离，如果没有则使用默认值 8.0
        const cameraDistance = this.config?.characterConfig?.cameraDistance ?? 8.0;
        camera.position.set(0, 1.3, cameraDistance);
        this._camera = camera;

        // controls
        const cameraControls = new OrbitControls(camera, renderer.domElement);
        cameraControls.target.set(0, 1.3, 0);
        cameraControls.screenSpacePanning = true;
        cameraControls.minDistance = 4.0;
        cameraControls.maxDistance = 15;
        cameraControls.update();
        
        this._cameraControls = cameraControls;

        // 初始化为就绪状态
        this.isReady = true;

        // 窗口调整大小时重置相机
        window.addEventListener("resize", () => {
            this.resize();
        });

        // Start animation loop
        this.update();
    }

    /**
     * canvasの親要素を参照してサイズを変更する
     */
    public resize() {
        if (!this._renderer) return;

        const parentElement = this._renderer.domElement.parentElement;
        if (!parentElement) return;

        this._renderer.setSize(
            parentElement.clientWidth,
            parentElement.clientHeight
        );

        if (!this._camera) return;
        this._camera.aspect =
            parentElement.clientWidth / parentElement.clientHeight;
        this._camera.updateProjectionMatrix();
    }

    /**
     * VRMのheadノードを参照してカメラ位置を調整する
     */
    public resetCamera() {
        const headNode = this.model?.vrm?.humanoid.getNormalizedBoneNode("head");

        if (headNode) {
            const headWPos = headNode.getWorldPosition(new THREE.Vector3());
            this._cameraControls?.target.set(headWPos.x, headWPos.y, headWPos.z);
            this._camera?.position.set(
                this._camera.position.x,
                headWPos.y,
                this._camera.position.z
            );
            this._cameraControls?.update();
        }
    }

    public update = () => {
        this._animationFrameId = requestAnimationFrame(this.update);
        const delta = this._clock.getDelta();
        
        // 更新相机控制
        this._cameraControls?.update();
        
        // update vrm components
        if (this.model) {
            this.model.update(delta);
        }

        if (this._renderer && this._camera) {
            this._renderer.render(this._scene, this._camera);
        }
    };

    // 安全地加载动画的辅助方法
    public async loadAnimationSafely(animName: string, animPath: string): Promise<void> {
        if (!this.model || !this.model.vrm) {
            console.warn(`无法加载动画 ${animName}：VRM模型未加载`);
            return;
        }
        
        try {
            console.log(`开始加载动画 ${animName}，路径：${animPath}`);
            const animation = await loadMixamoAnimation(animPath, this.model.vrm);
            if (animation) {
                this.model.clipMap.set(animName, animation);
                console.log(`动画 ${animName} 加载成功，已添加到 clipMap`);
            } else {
                const error = new Error(`动画 ${animName} 加载失败：返回了空动画`);
                console.error(error);
                throw error;
            }
        } catch (error) {
            console.error(`加载动画 ${animName} 时出错:`, error);
            throw error;  // 重新抛出错误，让上层处理
        }
    }

    // 新增：稳定物理系统的方法
    private stabilizePhysics(scale: number) {
        if (!this.model?.vrm?.springBoneManager) return;

        try {
            let updateCount = 0;
            const maxUpdates = 60; // 增加更新次数以确保稳定性
            const timeStep = 0.016; // 16ms时间步长
            
            const stabilizeFrame = () => {
                if (updateCount < maxUpdates && this.model?.vrm) {
                    try {
                        // 在每一帧中多次更新物理系统
                        for (let i = 0; i < 3; i++) {
                            this.model.vrm.update(timeStep);
                        }
                        
                        // 如果是缩放操作，每隔一定帧数重新应用一次物理参数
                        if (updateCount % 10 === 0 && scale !== 1.0) {
                            // 移除不存在的setScale调用
                            // this.model.setScale(scale);
                        }
                        
                        updateCount++;
                        requestAnimationFrame(stabilizeFrame);
                    } catch (err) {
                        console.warn("物理系统更新时出错:", err);
                    }
                }
            };
            
            stabilizeFrame();
        } catch (error) {
            console.warn("初始化物理稳定过程时出错:", error);
        }
    }

    // 将动画加载逻辑抽取为单独的方法
    private async loadRemainingAnimations() {
        console.log("开始加载剩余动画...");
        const animationPromises = [
            // 日常动作
            this.loadAnimationSafely("idle_02", "/assets/animations/daily/idle_02.fbx"),
            this.loadAnimationSafely("idle_03", "/assets/animations/daily/idle_03.fbx"),
            this.loadAnimationSafely("idle_happy_01", "/assets/animations/daily/idle_happy_01.fbx"),
            this.loadAnimationSafely("idle_happy_02", "/assets/animations/daily/idle_happy_02.fbx"),
            this.loadAnimationSafely("idle_happy_03", "/assets/animations/daily/idle_happy_03.fbx"),
            this.loadAnimationSafely("standing_greeting", "/assets/animations/daily/standing_greeting.fbx"),
            this.loadAnimationSafely("thinking", "/assets/animations/daily/thinking.fbx"),
            this.loadAnimationSafely("kiss_01", "/assets/animations/daily/kiss_01.fbx"),
            this.loadAnimationSafely("sitting", "/assets/animations/daily/sitting.fbx"),
            this.loadAnimationSafely("talking_01", "/assets/animations/daily/talking_01.fbx"),
            this.loadAnimationSafely("talking_02", "/assets/animations/daily/talking_02.fbx"),
            
            // 表情动作
            this.loadAnimationSafely("excited", "/assets/animations/emote/excited.fbx"),
            this.loadAnimationSafely("angry", "/assets/animations/emote/angry.fbx"),
            
            // 舞蹈动作
            this.loadAnimationSafely("silly_dancing", "/assets/animations/dance/silly_dancing.fbx"),
            this.loadAnimationSafely("rumba_dancing", "/assets/animations/dance/rumba_dancing.fbx"),
            this.loadAnimationSafely("bboy_hip_hop", "/assets/animations/dance/bboy_hip_hop.fbx"),
            this.loadAnimationSafely("flair", "/assets/animations/dance/flair.fbx")
        ];
        
        try {
            await Promise.all(animationPromises);
            console.log("所有动画加载完成，当前clipMap中的动画：", Array.from(this.model?.clipMap.keys() || []));
        } catch (error) {
            console.error("加载动画时发生错误：", error);
            // 尽管有错误，我们仍然继续执行，因为部分动画可能已经成功加载
        }
    }

    // 添加公共方法
    public setCameraDistance(distance: number) {
        if (this._camera) {
            this._camera.position.z = distance;
            this._cameraControls?.update();
        }
    }

    public getCameraDistance(): number {
        return this._camera?.position.z || 0;
    }
}
